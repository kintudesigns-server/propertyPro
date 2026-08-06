import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderSaaSEmail } from "@/lib/email-template";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { notifyMany } from "@/lib/notify";
import { verifyTurnstileToken } from "@/lib/verify-turnstile";

// GET all owner applications (Admin only)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const applications = await prisma.ownerApplication.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(applications);
}

// POST - Submit new owner application (Public)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, website, entityType, portfolioSize, currentSoftware, turnstileToken } = body;
    const finalPortfolioSize = portfolioSize || "1-5 Properties";

    // Cloudflare Turnstile bot verification
    const isHuman = await verifyTurnstileToken(turnstileToken);
    if (!isHuman) {
      return NextResponse.json(
        { error: "Bot verification failed. Please refresh and try again." },
        { status: 403 }
      );
    }

    if (!name || !email || !phone || !entityType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    
    // Check for duplicate email in applications or users
    const [existingApp, existingUser] = await Promise.all([
      prisma.ownerApplication.findFirst({ where: { email: normalizedEmail, status: { in: ["PENDING", "UNDER_REVIEW", "APPROVED"] } } }),
      prisma.user.findUnique({ where: { email: normalizedEmail } }),
    ]);

    if (existingUser) {
      return NextResponse.json({ error: "This email is already registered. Please sign in instead." }, { status: 409 });
    }
    if (existingApp) {
      return NextResponse.json({ error: "An application with this email is already pending or approved." }, { status: 409 });
    }

    const application = await prisma.ownerApplication.create({
      data: { name, email: normalizedEmail, phone, website, entityType, portfolioSize: finalPortfolioSize, currentSoftware, status: "PENDING" },
    });

    // Send confirmation email to applicant
    const trackingUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/track/owner/${application.trackingId}`;
    await sendEmail({
      to: email,
      subject: "Your PropertyPro Owner Application Has Been Received",
      html: renderSaaSEmail({
        categoryBadge: "OWNER ACCESS",
        preheader: `Thank you for applying for a PropertyPro Owner account. Tracking ID: ${application.trackingId}`,
        title: "Application Received",
        subtitle: "PropertyPro Owner Portal Registration",
        statusPill: { text: "UNDER REVIEW", type: "warning" },
        greeting: `Hi ${name},`,
        bodyParagraphs: [
          "Thank you for applying for a PropertyPro Owner account. Our team is reviewing your details to ensure portfolio compatibility.",
          "Verification typically takes <strong>1-2 business days</strong>. Once approved, you will receive an email invitation to set up your password and choose your subscription plan."
        ],
        summaryCard: {
          title: "Application Details",
          items: [
            { label: "Applicant Name", value: name },
            { label: "Email Address", value: email },
            { label: "Phone Number", value: phone },
            { label: "Entity Type", value: entityType },
            { label: "Portfolio Size", value: finalPortfolioSize },
            ...(website ? [{ label: "Website", value: website }] : []),
          ],
        },
        primaryAction: {
          label: "Track Application Status →",
          url: trackingUrl,
        },
        infoNotice: {
          title: "What happens next?",
          text: "Our onboarding team will process your application. Account access is granted following admin verification.",
          type: "info",
        },
      }),
    });

    // Notify all admins via live-updating notifications and email alerts
    try {
      const admins = await prisma.user.findMany({
        where: { role: "SUPERADMIN" },
        select: { id: true, email: true }
      });
      const adminIds = admins.map(a => a.id);
      await notifyMany(adminIds, {
        title: "New Owner Application",
        message: `${name} (${entityType}) has applied for owner access. Portfolio: ${finalPortfolioSize}.`,
        type: "SYSTEM",
        priority: "HIGH",
        relatedEntityId: application.id,
      });

      const adminUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/admin/owner-applications`;
      for (const admin of admins) {
        if (admin.email) {
          await sendEmail({
            to: admin.email,
            subject: "🔔 Alert: New Owner Application Received",
            html: `
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                      <td align="center" style="background-color: #0f172a; padding: 40px 20px;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">New Owner Application</h1>
                        <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 15px;">Pending Admin Verification</p>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding: 40px 32px;">
                        <p style="margin: 0 0 16px; font-size: 16px; color: #0f172a; font-weight: 600;">Hi Admin,</p>
                        <p style="margin: 0 0 24px; color: #475569; line-height: 1.6; font-size: 15px;">
                          A new owner onboarding application has been submitted and is ready for review.
                        </p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                          <tr>
                            <td style="padding: 20px;">
                              <h3 style="margin: 0 0 16px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Applicant Details</h3>
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 120px;">Name</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${name}</td></tr>
                                <tr><td colspan="2" style="border-bottom: 1px solid #e2e8f0;"></td></tr>
                                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${email}</td></tr>
                                <tr><td colspan="2" style="border-bottom: 1px solid #e2e8f0;"></td></tr>
                                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Phone</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${phone}</td></tr>
                                <tr><td colspan="2" style="border-bottom: 1px solid #e2e8f0;"></td></tr>
                                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Entity Type</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${entityType}</td></tr>
                                <tr><td colspan="2" style="border-bottom: 1px solid #e2e8f0;"></td></tr>
                                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Portfolio Size</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${finalPortfolioSize}</td></tr>
                                ${website ? `<tr><td colspan="2" style="border-bottom: 1px solid #e2e8f0;"></td></tr><tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Website</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${website}</td></tr>` : ""}
                              </table>
                            </td>
                          </tr>
                        </table>
 
                        <!-- CTA -->
                        <div style="text-align: center;">
                          <a href="${adminUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">Review Applications →</a>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            `
          });
        }
      }
    } catch (err) {
      console.error("[owner-applications] Failed to notify admins of new owner application:", err);
    }

    return NextResponse.json({ trackingId: application.trackingId, message: "Application submitted successfully" }, { status: 201 });
  } catch (error: any) {
    console.error("Owner Application Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
