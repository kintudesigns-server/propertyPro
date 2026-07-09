import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const searchParams = req.nextUrl.searchParams;
  const isEmergency = searchParams.get("emergency") === "true";
  const id = searchParams.get("id");

  try {
    if (id) {
      let request = (await prisma.maintenanceRequest.findUnique({
        where: { id },
        include: {
          unit: { include: { property: true } },
          tenant: { select: { name: true, email: true, phone: true } },
          inspector: { select: { name: true, email: true, phone: true } },
          externalVendor: true
        } as any
      })) as any;
      if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

      if (!request.vendorMagicToken) {
        const crypto = require("crypto");
        const token = crypto.randomBytes(16).toString("hex");
        request = (await prisma.maintenanceRequest.update({
          where: { id },
          data: { vendorMagicToken: token } as any,
          include: {
            unit: { include: { property: true } },
            tenant: { select: { name: true, email: true, phone: true } },
            inspector: { select: { name: true, email: true, phone: true } },
            externalVendor: true
          } as any
        })) as any;
      }

      // Attach active lease deposit info for the chargeback panel
      const activeLease = await (prisma.lease as any).findFirst({
        where: { unitId: request.unitId, tenantId: request.tenantId, status: "ACTIVE" },
        select: {
          id: true,
          securityDeposit: true,
          depositBalance: true,
          depositPaidAt: true,
          depositPaidAmount: true,
          depositStatus: true,
        },
      });

      let vendorExpenseTransaction = null;
      if (request.vendorExpenseTransactionId) {
        vendorExpenseTransaction = await prisma.transaction.findUnique({
          where: { id: request.vendorExpenseTransactionId },
          select: {
            id: true,
            type: true,
            category: true,
            amount: true,
            reference: true,
            status: true,
            createdAt: true,
          }
        });
      }

      return NextResponse.json({ ...request, activeLease, vendorExpenseTransaction });
    }

    let whereClause: any = {};

    if (role === "OWNER") {
      whereClause.unit = { property: { ownerId: userId } };
    } else if (role === "TENANT") {
      whereClause.tenantId = userId;
    } else if (role === "INSPECTOR") {
      whereClause.inspectorId = userId;
    }

    if (isEmergency) {
      whereClause.priority = { in: ["EMERGENCY", "HIGH"] };
    }

    const requests = await prisma.maintenanceRequest.findMany({
      where: whereClause,
      include: {
        unit: {
          include: { property: true }
        },
        tenant: {
          select: { name: true, email: true, phone: true }
        },
        inspector: {
          select: { name: true, email: true }
        },
        externalVendor: true
      } as any,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(requests);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch maintenance requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    
    if (!data.unitId || !data.title || !data.description) {
      return NextResponse.json({ error: "Missing required fields: unitId, title, description" }, { status: 400 });
    }

    // Use tenantId from body if provided (landlord/admin submitting on behalf of tenant),
    // otherwise use the session user's own ID (tenant submitting their own request)
    const tenantId = (data.tenantId && data.tenantId !== "") 
      ? data.tenantId 
      : (session.user as any).id;

    if (!tenantId) {
      return NextResponse.json({ error: "Could not determine tenant ID" }, { status: 400 });
    }

    const request = await prisma.maintenanceRequest.create({
      data: {
        unitId: data.unitId,
        tenantId,
        title: data.title,
        description: data.description,
        category: data.category || "GENERAL",
        priority: data.priority || "MEDIUM",
        status: data.inspectorId ? "ASSIGNED" : "SUBMITTED",
        photos: Array.isArray(data.photos) ? data.photos : [],
        entryPermission: data.entryPermission !== undefined ? Boolean(data.entryPermission) : false,
        hasPets: data.hasPets || "No",
        preferredTimes: data.preferredTimes || "",
        ...(data.inspectorId ? { inspectorId: data.inspectorId } : {}),
        ...(data.estimatedCost ? { estimatedCost: parseFloat(data.estimatedCost) } : {}),
        ...(data.scheduledDate ? { scheduledDate: new Date(data.scheduledDate) } : {}),
      } as any
    });

    // Auto-notify: find the owner of the unit's property and notify them
    try {
      const unit = await prisma.unit.findUnique({
        where: { id: data.unitId },
        include: { property: true },
      });
      if (unit?.property?.ownerId) {
        const priorityMap: Record<string, "HIGH" | "MEDIUM" | "LOW"> = {
          EMERGENCY: "HIGH", HIGH: "HIGH", MEDIUM: "MEDIUM", LOW: "LOW",
        };
        const notifPriority = priorityMap[data.priority?.toUpperCase()] ?? "MEDIUM";
        await notify({
          userId: unit.property.ownerId,
          title: `New Maintenance Request – ${data.title}`,
          message: `A new ${data.priority || "MEDIUM"} priority maintenance request has been submitted for ${unit?.property?.name || 'Property'} - ${unit?.name?.includes('Unit') ? unit.name : `Unit ${unit?.name || 'Unknown'}`}: "${data.description?.slice(0, 100)}..."`,
          type: "MAINTENANCE",
          priority: notifPriority,
          relatedEntityId: request.id,
        });
      }
    } catch (_) {/* non-fatal */}

    return NextResponse.json(request, { status: 201 });
  } catch (error: any) {
    console.error("Maintenance create error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to create request" }, { status: 500 });
  }
}


export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const { id, action, paymentMethod, referenceNote, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: "Missing request ID" }, { status: 400 });
    }

    // Fetch full request details first for validations and metadata
    const fullRequest: any = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { unit: { include: { property: { include: { owner: true } } } }, externalVendor: true } as any,
    });

    if (!fullRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const owner = fullRequest.unit.property.owner;
    const requesterRole = (session.user as any).role;

    // Handle tenant confirmation of scheduled visit
    if (updateData.tenantConfirmedSchedule === true && !fullRequest.tenantConfirmedSchedule) {
      updateData.rescheduleRequested = false;
      updateData.rescheduleReason = null;
      if (fullRequest.externalVendor) {
        try {
          const magicLink = `http://localhost:3000/vendor/ticket/${fullRequest.vendorMagicToken}`;
          await sendEmail({
            to: fullRequest.externalVendor.email,
            subject: `Tenant Confirmed Appointment: ${fullRequest.unit.property.name}`,
            html: `
              <p>Hello <strong>${fullRequest.externalVendor.name}</strong>,</p>
              <p>The tenant at <strong>${fullRequest.unit.property.name} (Unit ${fullRequest.unit.name})</strong> has confirmed they will be available for your scheduled visit on <strong>${fullRequest.scheduledDate ? new Date(fullRequest.scheduledDate).toLocaleString() : 'the scheduled time'}</strong>.</p>
              <p><a href="${magicLink}">Click here to view the ticket</a></p>
            `
          });
        } catch (_) {}
      }
    }

    // Handle tenant reschedule request
    if (updateData.rescheduleRequested === true && !fullRequest.rescheduleRequested) {
      updateData.tenantConfirmedSchedule = false;
      updateData.rescheduleReason = data.rescheduleReason || "No reason provided";
      if (fullRequest.externalVendor) {
        try {
          const magicLink = `http://localhost:3000/vendor/ticket/${fullRequest.vendorMagicToken}`;
          await sendEmail({
            to: fullRequest.externalVendor.email,
            subject: `Tenant Requested Reschedule: ${fullRequest.unit.property.name}`,
            html: `
              <p>Hello <strong>${fullRequest.externalVendor.name}</strong>,</p>
              <p>The tenant at <strong>${fullRequest.unit.property.name} (Unit ${fullRequest.unit.name})</strong> has requested to reschedule the visit scheduled for <strong>${fullRequest.scheduledDate ? new Date(fullRequest.scheduledDate).toLocaleString() : 'the scheduled time'}</strong>.</p>
              <p><strong>Tenant's Reason / Availability:</strong> ${updateData.rescheduleReason}</p>
              <p>Please click the button below to schedule a new time slot based on the tenant's preferences.</p>
              <p><a href="${magicLink}">View ticket & Reschedule</a></p>
            `
          });
        } catch (_) {}
      }
    }

    // Handle Owner payment to vendor (Direct Bank / Cash / Check)
    if (action === "PAY_VENDOR") {
      const method = paymentMethod || "CASH";
      const amount = Number(fullRequest.finalLabor || 0) + Number(fullRequest.finalMaterials || 0);

      // Only create transaction if one doesn't exist
      if (!fullRequest.vendorExpenseTransactionId) {
        const refString = `VENDOR_PAY_${id.slice(-6)}_${method}${referenceNote ? `_REF_${referenceNote}` : ""}`;
        const transaction = await prisma.transaction.create({
          data: {
            type: "EXPENSE",
            category: "MAINTENANCE",
            amount: amount,
            status: "COMPLETED",
            reference: refString.slice(0, 255), // safety limit for database VARCHAR if applicable
            tenantId: fullRequest.tenantId,
          },
        });
        updateData.vendorExpenseTransactionId = transaction.id;
      }
      
      updateData.status = "CLOSED";

      // Notify vendor via email of payment details
      if (fullRequest.externalVendor) {
        try {
          const methodLabel = method === "STRIPE" ? "Direct Deposit (ACH)" : method === "CHECK" ? "Written Check" : "Physical Cash";
          await sendEmail({
            to: fullRequest.externalVendor.email,
            subject: `Payment Disbursed: Repair Work at ${fullRequest.unit.property.name}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <title>Payment Disbursed</title>
              </head>
              <body style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 40px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                        <tr>
                          <td style="background-color: #10b981; padding: 30px 40px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Payment Disbursed</h1>
                            <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px;">Work Order: ${fullRequest.title}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 40px;">
                            <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px;">Your Payout is Confirmed</h2>
                            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello <strong>${fullRequest.externalVendor.name}</strong>,</p>
                            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">We are pleased to inform you that payment for your maintenance services on ticket "<strong>${fullRequest.title}</strong>" has been completed and disbursed by the property owner.</p>
                            
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                              <tr>
                                <td style="padding: 20px;">
                                  <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;"><strong>Disbursement Summary:</strong></p>
                                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; color: #0f172a;">
                                    <tr>
                                      <td style="padding: 4px 0; font-weight: 650;">Total Payout:</td>
                                      <td style="padding: 4px 0; text-align: right; font-weight: 800; color: #10b981;">$${amount.toFixed(2)} USD</td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 4px 0;">Payment Method:</td>
                                      <td style="padding: 4px 0; text-align: right; font-weight: 600;">${methodLabel}</td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 4px 0;">Reference Code:</td>
                                      <td style="padding: 4px 0; text-align: right; font-family: monospace; font-size: 12px; color: #64748b;">VENDOR_PAY_${id.slice(-6)}_${method}</td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                            
                            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">
                              ${method === "STRIPE" 
                                ? "Please allow 1-3 business days for electronic ACH transfers to settle in your registered bank account." 
                                : "For cash or check payments, please coordinate directly with the property owner to collect your receipt/funds offline."}
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="color: #94a3b8; font-size: 13px; margin: 0;">This is an automated message from PropertyPro. Please do not reply directly to this email.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
            `
          });
        } catch (_) {}
      }
    }

    // Process dates or numbers if present
    if (updateData.estimatedCost) {
      updateData.estimatedCost = parseFloat(updateData.estimatedCost);
      const isEmergency = (updateData.priority || fullRequest.priority) === "EMERGENCY";
      const limit = isEmergency
        ? (owner.emergencyOverrideLimit ? Number(owner.emergencyOverrideLimit) : 1500)
        : (owner.approvalThreshold ? Number(owner.approvalThreshold) : 200);

      if (updateData.estimatedCost > limit && requesterRole !== "OWNER" && requesterRole !== "SUPERADMIN") {
        updateData.status = "AWAITING_APPROVAL";
      }
    }

    if (updateData.scheduledDate) {
      updateData.scheduledDate = new Date(updateData.scheduledDate);
    }
    if (updateData.diagnosisDate) {
      updateData.diagnosisDate = new Date(updateData.diagnosisDate);
    }
    if (updateData.repairDate) {
      updateData.repairDate = new Date(updateData.repairDate);
    }

    // Auto-update status based on inspector assignment if not explicitly set
    if (updateData.inspectorId && !updateData.status) {
      updateData.status = "ASSIGNED";
    }

    // Set to PENDING_TENANT_CONFIRMATION if resolving
    if (updateData.status === "RESOLVED") {
      updateData.status = "PENDING_TENANT_CONFIRMATION";
    }

    if (action === "DISPATCH_VENDOR" && updateData.externalVendorId) {
      const vendor = await (prisma as any).externalVendor.findUnique({ where: { id: updateData.externalVendorId }});
      if (vendor) {
        // 1. Send actual email to vendor
        const magicLink = `http://localhost:3000/vendor/ticket/${fullRequest.vendorMagicToken}`;
        await sendEmail({
          to: vendor.email,
          subject: `New Maintenance Work Order: ${fullRequest.unit.property.name}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>New Work Order</title>
            </head>
            <body style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                      <tr>
                        <td style="background-color: #0f172a; padding: 30px 40px; text-align: center;">
                          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">PropertyPro</h1>
                          <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">Maintenance Dispatch</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 40px;">
                          <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px;">New Work Order Dispatched</h2>
                          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello <strong>${vendor.name}</strong>,</p>
                          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">You have been assigned a new maintenance request at <strong>${fullRequest.unit.property.name} (Unit ${fullRequest.unit.name})</strong>.</p>
                          
                          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                            <tr>
                              <td style="padding: 20px;">
                                <p style="margin: 0 0 10px 0; font-weight: 600; color: #0f172a; font-size: 16px;">Issue: ${fullRequest.title}</p>
                                <p style="margin: 0; color: #64748b; font-size: 15px; line-height: 1.5;">${fullRequest.description}</p>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">Click the secure button below to view the job details, upload an estimate, or attach your final receipts. <strong>No login required.</strong></p>
                          
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center">
                                <a href="${magicLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; font-weight: 600; border-radius: 8px; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">View Work Order</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                          <p style="color: #94a3b8; font-size: 13px; margin: 0;">This is an automated message from PropertyPro. Please do not reply directly to this email.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
        });

        // 2. Notify Owner internally
        await notify({
          userId: owner.id,
          title: "Vendor Dispatched",
          message: `Dispatched ${vendor.name} to ${fullRequest.unit.property.name}. An email with the Magic Link was sent to ${vendor.email}.`,
          type: "SYSTEM",
          priority: "MEDIUM",
        });
      }
    }

    // ── RECORD_LIABILITY_RULING: Smart chargeback with deposit-first logic ──
    if (action === "RECORD_LIABILITY_RULING") {
      const { ruling } = data; // "WEAR_AND_TEAR" | "TENANT_FAULT"

      if (ruling === "WEAR_AND_TEAR") {
        // Owner absorbs the cost — no tenant charge
        const closed = await prisma.maintenanceRequest.update({
          where: { id },
          data: {
            ownerChargebackDecision: "WEAR_AND_TEAR",
            ownerApprovedChargeback: false,
            status: "CLOSED",
          } as any,
        });
        return NextResponse.json(closed);
      }

      if (ruling === "TENANT_FAULT") {
        const repairCost =
          Number(fullRequest.finalLabor || 0) + Number(fullRequest.finalMaterials || 0);

        const activeLease: any = await (prisma.lease as any).findFirst({
          where: { unitId: fullRequest.unitId, tenantId: fullRequest.tenantId, status: "ACTIVE" },
        });

        const depositBalance = Number((activeLease as any)?.depositBalance || 0);
        const fourteenDays = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        let chargebackSource = "INVOICE";
        let chargebackDepositAmount = 0;
        let chargebackInvoiceAmount = repairCost;
        let chargebackInvoiceId: string | undefined;

        if (activeLease && depositBalance >= repairCost) {
          // ── Full cost from deposit — no invoice needed ──
          await (prisma.lease as any).update({
            where: { id: activeLease.id },
            data: { depositBalance: depositBalance - repairCost },
          });
          await prisma.transaction.create({
            data: {
              type: "EXPENSE",
              category: "DEPOSIT_DEDUCTION",
              amount: repairCost,
              reference: `DEPOSIT_DEDUCT_${id.slice(-6)}`,
              tenantId: fullRequest.tenantId,
              status: "COMPLETED",
            },
          });
          chargebackSource = "DEPOSIT";
          chargebackDepositAmount = repairCost;
          chargebackInvoiceAmount = 0;

        } else if (activeLease && depositBalance > 0) {
          // ── SPLIT: drain deposit + invoice for remainder ──
          const fromDeposit = depositBalance;
          const invoiceAmt = repairCost - fromDeposit;
          await (prisma.lease as any).update({
            where: { id: activeLease.id },
            data: { depositBalance: 0 },
          });
          await prisma.transaction.create({
            data: {
              type: "EXPENSE",
              category: "DEPOSIT_DEDUCTION",
              amount: fromDeposit,
              reference: `DEPOSIT_DEDUCT_${id.slice(-6)}`,
              tenantId: fullRequest.tenantId,
              status: "COMPLETED",
            },
          });
          const inv = await prisma.invoice.create({
            data: {
              leaseId: activeLease.id,
              amount: invoiceAmt,
              dueDate: fourteenDays,
              status: "UNPAID",
            },
          });
          chargebackSource = "SPLIT";
          chargebackDepositAmount = fromDeposit;
          chargebackInvoiceAmount = invoiceAmt;
          chargebackInvoiceId = inv.id;

        } else {
          // ── No deposit — generate full invoice ──
          if (activeLease) {
            const inv = await prisma.invoice.create({
              data: {
                leaseId: activeLease.id,
                amount: repairCost,
                dueDate: fourteenDays,
                status: "UNPAID",
              },
            });
            chargebackInvoiceId = inv.id;
          }
          chargebackSource = "INVOICE";
          chargebackInvoiceAmount = repairCost;
        }

        // ── Build the final update payload ──
        const chargebackUpdate: any = {
          ownerChargebackDecision: "TENANT_FAULT",
          ownerApprovedChargeback: true,
          chargebackSource,
          chargebackDepositAmount,
          chargebackInvoiceAmount,
          status: "CLOSED",
        };
        if (chargebackInvoiceId) chargebackUpdate.chargebackInvoiceId = chargebackInvoiceId;

        // ── Email tenant with deduction details ──
        try {
          const tenantUser = await prisma.user.findUnique({ where: { id: fullRequest.tenantId } });
          if (tenantUser?.email) {
            const depositMsg =
              chargebackSource === "DEPOSIT"
                ? `<p>The full amount of <strong>$${repairCost.toFixed(2)}</strong> has been deducted from your security deposit on file.</p>`
                : chargebackSource === "SPLIT"
                ? `<p><strong>$${chargebackDepositAmount.toFixed(2)}</strong> was deducted from your security deposit (now exhausted), and a separate invoice of <strong>$${chargebackInvoiceAmount.toFixed(2)}</strong> has been generated for the remaining balance.</p>`
                : `<p>An invoice of <strong>$${repairCost.toFixed(2)}</strong> has been generated and added to your account.</p>`;

            await sendEmail({
              to: tenantUser.email,
              subject: `Security Deposit Deduction Notice – ${fullRequest.title}`,
              html: `
                <!DOCTYPE html><html><head><meta charset="utf-8"></head>
                <body style="font-family: Arial, sans-serif; background: #f4f7f6; padding: 40px 0;">
                  <table width="100%"><tr><td align="center">
                    <table width="600" style="background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,.05);">
                      <tr><td style="background:#dc2626; padding:30px 40px; text-align:center;">
                        <h1 style="color:#fff; margin:0; font-size:22px;">Maintenance Liability Notice</h1>
                        <p style="color:#fca5a5; margin:8px 0 0; font-size:14px;">${fullRequest.title}</p>
                      </td></tr>
                      <tr><td style="padding:40px;">
                        <p style="color:#475569; font-size:15px;">Hello <strong>${tenantUser.name || "Tenant"}</strong>,</p>
                        <p style="color:#475569; font-size:15px;">The property owner has determined that the recent maintenance issue <strong>"${fullRequest.title}"</strong> was caused by tenant negligence or damage.</p>
                        <p style="color:#475569; font-size:15px;"><strong>Total Repair Cost: $${repairCost.toFixed(2)}</strong></p>
                        ${depositMsg}
                        <p style="color:#64748b; font-size:13px;">Please log in to your PropertyPro account to view the full details and your updated deposit balance.</p>
                      </td></tr>
                      <tr><td style="background:#f8fafc; padding:20px 40px; text-align:center; border-top:1px solid #e2e8f0;">
                        <p style="color:#94a3b8; font-size:12px; margin:0;">This is an automated notice from PropertyPro.</p>
                      </td></tr>
                    </table>
                  </td></tr></table>
                </body></html>
              `,
            });
          }
        } catch (_) {/* non-fatal */}

        // ── In-app notification to tenant ──
        try {
          const notifMsg =
            chargebackSource === "DEPOSIT"
              ? `$${repairCost.toFixed(2)} has been deducted from your security deposit for "${fullRequest.title}" (tenant fault ruling).`
              : chargebackSource === "SPLIT"
              ? `Your security deposit was exhausted ($${chargebackDepositAmount.toFixed(2)} deducted). An invoice of $${chargebackInvoiceAmount.toFixed(2)} has been generated for the balance.`
              : `An invoice of $${repairCost.toFixed(2)} has been issued for maintenance damage on "${fullRequest.title}".`;

          await notify({
            userId: fullRequest.tenantId,
            title: "Deposit Deduction Notice",
            message: notifMsg,
            type: "PAYMENT",
            priority: "HIGH",
            relatedEntityId: id,
          });
        } catch (_) {/* non-fatal */}

        const closed = await prisma.maintenanceRequest.update({
          where: { id },
          data: chargebackUpdate,
        });
        return NextResponse.json(closed);
      }

      return NextResponse.json({ error: "Invalid ruling value" }, { status: 400 });
    }

    // ── Guard: block CLOSED if vendor fault and ruling not yet made ──
    if (
      (updateData.status === "CLOSED" || data.status === "CLOSED") &&
      fullRequest.vendorReportedFault &&
      !fullRequest.ownerChargebackDecision &&
      action !== "PAY_VENDOR"
    ) {
      return NextResponse.json(
        { error: "Liability ruling required. Please rule 'Tenant Fault' or 'Normal Wear & Tear' in the Cost & Liability section before closing this ticket." },
        { status: 400 }
      );
    }

    const updatedRequest = await prisma.maintenanceRequest.update({
      where: { id },
      data: updateData as any,
    });

    // Auto-notify on status change → tell the tenant
    if (updateData.status) {
      try {
        const fullRequest = await prisma.maintenanceRequest.findUnique({
          where: { id },
          include: { unit: { include: { property: true } }, inspector: true },
        });
        if (fullRequest?.tenantId) {
          const statusMessages: Record<string, string> = {
            ASSIGNED: `Your maintenance request "${fullRequest.title}" has been assigned to an inspector and is being scheduled.`,
            DIAGNOSIS_SCHEDULED: `Inspector ${fullRequest.inspector?.name || "assigned"} is scheduled to come for a diagnosis visit for "${fullRequest.title}" on ${updateData.diagnosisDate ? new Date(updateData.diagnosisDate).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' }) : 'soon'}.`,
            SUBMIT_ESTIMATE: `An estimate has been submitted for "${fullRequest.title}".`,
            APPROVED: `The repair estimate for "${fullRequest.title}" has been approved. Repairs will be scheduled shortly.`,
            REPAIR_SCHEDULED: `Inspector ${fullRequest.inspector?.name || "assigned"} is scheduled to come for a repair visit for "${fullRequest.title}" on ${updateData.repairDate ? new Date(updateData.repairDate).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' }) : 'soon'}.`,
            IN_PROGRESS: `Work has started on your maintenance request "${fullRequest.title}".`,
            RESOLVED: `Your maintenance request "${fullRequest.title}" has been resolved.`,
            PENDING_TENANT_CONFIRMATION: `Your maintenance request "${fullRequest.title}" has been completed. Please confirm if it is fixed.`,
            AWAITING_APPROVAL: `Your maintenance request "${fullRequest.title}" estimate is awaiting owner cost approval.`,
            CLOSED: `Your maintenance request "${fullRequest.title}" has been closed.`,
          };
          const msg = statusMessages[updateData.status] ||
            `Your maintenance request status has been updated to ${updateData.status.replace("_", " ")}.`;
          await notify({
            userId: fullRequest.tenantId,
            title: `Maintenance Update – ${fullRequest.title}`,
            message: msg,
            type: "MAINTENANCE",
            priority: updateData.status === "RESOLVED" ? "LOW" : "MEDIUM",
            relatedEntityId: id,
          });
        }
        // Also notify inspector when assigned
        if (updateData.inspectorId && fullRequest) {
          await notify({
            userId: updateData.inspectorId,
            title: "New Maintenance Assignment",
            message: `You have been assigned to a maintenance request: "${fullRequest.title}" at ${fullRequest.unit?.property?.name || "a property"}.`,
            type: "MAINTENANCE",
            priority: "MEDIUM",
            relatedEntityId: id,
          });
        }
      } catch (_) {/* non-fatal */}
    }

    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update request" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing request ID" }, { status: 400 });
  }

  try {
    await prisma.maintenanceRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete request" }, { status: 500 });
  }
}

