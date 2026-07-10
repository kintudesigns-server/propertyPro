import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  try {
    let leases: any[] = [];
    if (role === "SUPERADMIN") {
      leases = await prisma.lease.findMany({
        include: { tenant: true, unit: { include: { property: true } }, invoices: true },
      });
    } else if (role === "OWNER") {
      leases = await prisma.lease.findMany({
        where: { unit: { property: { ownerId: userId } } },
        include: { tenant: true, unit: { include: { property: true } }, invoices: true },
      });
    } else if (role === "TENANT") {
      leases = await prisma.lease.findMany({
        where: { tenantId: userId },
        include: { tenant: true, unit: { include: { property: true } }, invoices: true },
      });
    } else {
      leases = [];
    }

    return NextResponse.json(leases);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch leases" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const ownerId = (session.user as any).id;

  try {
    const owner = await prisma.user.findUnique({ where: { id: ownerId } });
    const subStatus = owner?.subscriptionStatus?.toLowerCase() ?? "";
    const hasActiveSubscription = subStatus === "active" || subStatus === "active (canceling)";
    if (!hasActiveSubscription) {
      return NextResponse.json({ error: "Active subscription required to create leases." }, { status: 403 });
    }

    const origin = new URL(req.url).origin;
    const loginLink = `${origin}/auth/login`;
    const { 
      unitId, tenantEmail, startDate, endDate, monthlyRent, applicationId,
      rentDueDay, securityDeposit, lateFeeAmount, gracePeriodDays, lateFeeType, 
      autoGenerateInvoices, autoEmailInvoices, renewalNoticeDays,
      earlyTerminationFee, isProratedRefundAllowed
    } = await req.json();

    if (!unitId || !tenantEmail || !startDate || !endDate || !monthlyRent) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify unit exists
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { property: true },
    });

    if (!unit || unit.property.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Unit not found or access denied" }, { status: 404 });
    }

    if (unit.property.approvalStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Cannot create a lease for a property that is pending administrative approval." },
        { status: 403 }
      );
    }

    // Find or create tenant by email
    let tenantUser = await prisma.user.findUnique({
      where: { email: tenantEmail },
    });

    let isAutoCreated = false;
    let setupToken = "";

    if (!tenantUser) {
      // Auto-create tenant with a random placeholder password (they'll set it via secure link)
      isAutoCreated = true;
      const placeholderPassword = await bcrypt.hash(Math.random().toString(36), 10);

      // We will try to fetch the name and phone from the application if it exists
      let tenantName = "New Tenant";
      let tenantPhone = null;
      if (applicationId) {
        const app = await prisma.application.findUnique({ where: { id: applicationId } });
        if (app) {
          tenantName = app.name;
          tenantPhone = app.phone;
        }
      }

      tenantUser = await prisma.user.create({
        data: {
          email: tenantEmail,
          password: placeholderPassword,
          name: tenantName,
          phone: tenantPhone,
          role: "TENANT",
        },
      });

      // Create a secure one-time setup token (expires in 7 days)
      const { randomBytes } = await import("crypto");
      setupToken = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await prisma.passwordResetToken.create({
        data: {
          token: setupToken,
          userId: tenantUser.id,
          expiresAt,
          used: false,
        },
      });
    } else if (tenantUser.role !== "TENANT") {
      return NextResponse.json({ error: "User with this email exists but is not a tenant" }, { status: 400 });
    }

    // Create lease (status PENDING_SIGNATURE) and first invoices
    // Note: Unit status remains VACANT until tenant signs
    const lease = await prisma.lease.create({
      data: {
        unitId,
        tenantId: tenantUser.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        monthlyRent: Number(monthlyRent),
        status: "PENDING_SIGNATURE",
        rentDueDay: rentDueDay ? Number(rentDueDay) : 1,
        securityDeposit: securityDeposit ? Number(securityDeposit) : null,
        lateFeeAmount: lateFeeAmount ? Number(lateFeeAmount) : null,
        gracePeriodDays: gracePeriodDays ? Number(gracePeriodDays) : 5,
        lateFeeType: lateFeeType || "FIXED",
        autoGenerateInvoices: autoGenerateInvoices !== undefined ? autoGenerateInvoices : true,
        autoEmailInvoices: autoEmailInvoices !== undefined ? autoEmailInvoices : false,
        renewalNoticeDays: renewalNoticeDays ? Number(renewalNoticeDays) : 60,
        earlyTerminationFee: earlyTerminationFee ? Number(earlyTerminationFee) : 0,
        isProratedRefundAllowed: isProratedRefundAllowed !== undefined ? isProratedRefundAllowed : false,
      },
    });

    // Prorated Rent Automation (Phase 1)
    const start = new Date(startDate);
    const startDay = start.getDate();
    let firstMonthRentAmount = Number(monthlyRent);
    
    if (startDay > 1) {
      // Calculate based on exact days in the starting month
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      const daysLived = daysInMonth - startDay + 1; // +1 to include move-in day
      const dailyRate = Number(monthlyRent) / daysInMonth;
      firstMonthRentAmount = dailyRate * daysLived;
    }

    // Generate initial invoice (Prorated if mid-month)
    await prisma.invoice.create({
      data: {
        leaseId: lease.id,
        amount: Number(firstMonthRentAmount.toFixed(2)),
        dueDate: start,
        status: "UNPAID",
        invoiceType: startDay > 1 ? "PRORATED" : "RENT",
        note: startDay > 1 ? `Prorated rent for first month (${new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate() - startDay + 1} days)` : undefined,
      },
    });

    if (securityDeposit && Number(securityDeposit) > 0) {
      await prisma.invoice.create({
        data: {
          leaseId: lease.id,
          amount: Number(securityDeposit),
          dueDate: new Date(), // Due immediately
          status: "UNPAID",
          invoiceType: "DEPOSIT",
          note: "Security deposit — due before signing",
        },
      });
    }

    // Mark application as LEASE_CREATED if provided
    if (applicationId) {
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: "LEASE_CREATED" },
      });
    }

    // 1. If auto-created, send SECURE setup-link email (no plain-text password in email)
    if (isAutoCreated && setupToken) {
      try {
        const setupLink = `${origin}/auth/set-password?token=${setupToken}`;
        await sendEmail({
          to: tenantEmail,
          subject: "Welcome to PropertyPro! Set Up Your Account",
          text: `Hello ${tenantUser.name || "Tenant"},\n\nYour tenant account has been created. Set your password here (valid 7 days):\n${setupLink}\n\nYour login email: ${tenantEmail}\n\nBest regards,\nPropertyPro Team`,
          html: `<div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:32px 20px;background:#F8FAFC;color:#1E293B;border-radius:16px;border:1px solid #E2E8F0"><div style="text-align:center;margin-bottom:28px"><div style="font-size:24px;font-weight:800;color:#2563EB">Property<span style="color:#0F172A">Pro</span></div></div><div style="background:#FFF;border-radius:12px;padding:28px;border:1px solid #E2E8F0"><h2 style="font-size:18px;font-weight:800;color:#0F172A;margin:0 0 16px 0">Welcome, ${tenantUser.name || "Tenant"}!</h2><p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 20px 0">Your property manager has created a tenant portal account for you. Click below to set your password and access your dashboard.</p><div style="background:#EFF6FF;border-radius:8px;padding:16px;border:1px solid #BFDBFE;margin-bottom:24px"><p style="font-size:13px;font-weight:600;color:#1D4ED8;margin:0">🔒 For your security, we never send passwords by email.</p></div><div style="text-align:center;margin-bottom:20px"><a href="${setupLink}" style="background:#2563EB;color:#FFF;font-weight:700;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:10px;display:inline-block">Set Up My Password →</a></div><p style="font-size:11px;color:#94A3B8;text-align:center">Link valid for 7 days. Login email: <strong>${tenantEmail}</strong></p></div><div style="text-align:center;margin-top:24px;font-size:11px;color:#94A3B8">&copy; ${new Date().getFullYear()} PropertyPro</div></div>`,
        });
        await notify({
          userId: tenantUser.id,
          title: "Welcome to PropertyPro!",
          message: "Your account is ready. Check your email to set your password and access your dashboard.",
          type: "SYSTEM",
          priority: "HIGH",
        });
      } catch (err) {
        console.error("Welcome email/notification failed:", err);
      }
    }

    // 2. Send "Lease Ready to Sign" notification (email + DB notification)
    try {
      await sendEmail({
        to: tenantEmail,
        subject: "Action Required: Your Lease Agreement is Ready to Sign",
        text: `Hello ${tenantUser.name || "Tenant"},\n\nYour draft lease agreement for Unit ${unit.name} at ${unit.property.name} is ready for review and signature.\n\nPlease log in to your tenant dashboard, review the agreement, clear the security deposit requirement, and sign the lease.\n\nBest regards,\nPropertyPro Team`,
        html: `<div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 20px; background-color: #F8FAFC; color: #1E293B; border-radius: 16px; border: 1px solid #E2E8F0;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 24px; font-weight: 800; color: #2563EB; letter-spacing: -0.5px;">Property<span style="color: #0F172A;">Pro</span></div>
            <div style="font-size: 13px; font-weight: 600; color: #64748B; margin-top: 4px;">Action Required &bull; Lease Agreement</div>
          </div>
          <div style="background-color: #FFFFFF; border-radius: 12px; padding: 28px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <h2 style="font-size: 18px; font-weight: 800; color: #0F172A; margin: 0 0 16px 0;">Your Lease Agreement is Ready to Sign</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
              Hello ${tenantUser.name || "Tenant"},<br/><br/>
              A draft lease agreement has been prepared for <strong>Unit ${unit.name}</strong> at <strong>${unit.property.name}</strong> and is ready for your review and signature.
            </p>
            <div style="background-color: #F8FAFC; border-radius: 8px; padding: 18px; border: 1px solid #E2E8F0; margin-bottom: 24px;">
              <div style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Lease Details</div>
              <div style="font-size: 14px; margin-bottom: 8px;">
                <span style="color: #64748B; font-weight: 600; width: 120px; display: inline-block;">Property:</span>
                <strong style="color: #0F172A;">${unit.property.name}</strong>
              </div>
              <div style="font-size: 14px; margin-bottom: 8px;">
                <span style="color: #64748B; font-weight: 600; width: 120px; display: inline-block;">Unit:</span>
                <strong style="color: #0F172A;">${unit.name}</strong>
              </div>
              <div style="font-size: 14px;">
                <span style="color: #64748B; font-weight: 600; width: 120px; display: inline-block;">Monthly Rent:</span>
                <strong style="color: #2563EB;">$${Number(monthlyRent).toLocaleString()} / mo</strong>
              </div>
            </div>
            <div style="margin-bottom: 24px;">
              <div style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Next Steps to Sign:</div>
              <div style="font-size: 14px; line-height: 1.5; color: #475569; margin-bottom: 8px; display: flex; align-items: center;">
                <span style="background-color: #2563EB; color: #FFFFFF; font-size: 11px; font-weight: 800; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; margin-right: 8px;">1</span>
                Log in to your Tenant Dashboard using temporary credentials.
              </div>
              <div style="font-size: 14px; line-height: 1.5; color: #475569; margin-bottom: 8px; display: flex; align-items: center;">
                <span style="background-color: #2563EB; color: #FFFFFF; font-size: 11px; font-weight: 800; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; margin-right: 8px;">2</span>
                Pay the security deposit (if requested by owner).
              </div>
              <div style="font-size: 14px; line-height: 1.5; color: #475569; display: flex; align-items: center;">
                <span style="background-color: #2563EB; color: #FFFFFF; font-size: 11px; font-weight: 800; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; margin-right: 8px;">3</span>
                Review, sign and complete the lease agreement.
              </div>
            </div>
            <div style="text-align: center;">
              <a href="${loginLink}" style="background-color: #10B981; color: #FFFFFF; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2); transition: background-color 0.2s;">
                Review & Sign Lease
              </a>
            </div>
          </div>
          <div style="text-align: center; margin-top: 24px; font-size: 11px; color: #94A3B8;">
            &copy; 2026 PropertyPro. All rights reserved.<br/>
            If you have any questions, please contact your property manager directly.
          </div>
        </div>`
      });

      await notify({
        userId: tenantUser.id,
        title: "Lease Ready for Signature",
        message: `Your draft lease agreement for unit ${unit.name} is ready. Pay your security deposit to unlock and sign the lease.`,
        type: "LEASE",
        priority: "HIGH",
        relatedEntityId: lease.id,
      });
    } catch (err) {
      console.error("Lease ready notification failed:", err);
    }

    return NextResponse.json(lease, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create lease" }, { status: 500 });
  }
}
