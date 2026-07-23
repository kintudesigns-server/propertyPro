import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { sanitizeVendor } from "@/lib/sanitization";

// ─── TENANT PORTAL GUARANTEE (F5) ───────────────────────────────────────────
// Tenant-facing actions (such as maintenance ticket submissions or rent payments)
// must NEVER enforce subscription-level blocks on the owner.
// Tenants have legal rights independent of their landlord's billing status.
// Therefore, subscription gating is bypassed for tenant-facing routes.
// ─────────────────────────────────────────────────────────────────────────────

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

      // FIX #4 — Block tenants from viewing other tenants' maintenance data
      if (role === "TENANT" && request.tenantId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (request.externalVendor) {
        const isOwnerOrAdmin = role === "OWNER" || role === "SUPERADMIN";
        request.externalVendor = sanitizeVendor(request.externalVendor, !isOwnerOrAdmin);
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
      whereClause.externalVendorId = null;
    }

    if (isEmergency) {
      whereClause.priority = { in: ["EMERGENCY", "HIGH"] };
    }

    const requests = await prisma.maintenanceRequest.findMany({
      where: whereClause,
      include: {
        unit: {
          include: { 
            property: {
              include: {
                owner: {
                  select: {
                    name: true,
                    email: true,
                    phone: true,
                    approvalThreshold: true,
                    emergencyOverrideLimit: true
                  }
                }
              }
            }
          }
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

    const sanitizedRequests = requests.map((req: any) => {
      if (req.externalVendor) {
        req.externalVendor = sanitizeVendor(req.externalVendor);
      }
      return req;
    });

    const serialized = JSON.parse(JSON.stringify(sanitizedRequests));
    return NextResponse.json(serialized);
  } catch (error: any) {
    console.error("API Error in /api/maintenance:", error);
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

    // FIX #3A — Verify the tenant has an ACTIVE lease for the unit they're filing against
    if ((session.user as any).role === "TENANT") {
      const activeLease = await prisma.lease.findFirst({
        where: {
          unitId: data.unitId,
          tenantId: (session.user as any).id,
          status: "ACTIVE",
        },
      });
      if (!activeLease) {
        return NextResponse.json(
          { error: "You can only submit maintenance requests for units you actively occupy." },
          { status: 403 }
        );
      }
    }

    // FIX #3B — Rate limit: max 5 requests per tenant per 24 hours
    if ((session.user as any).role === "TENANT") {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentCount = await prisma.maintenanceRequest.count({
        where: { tenantId: (session.user as any).id, createdAt: { gte: since } },
      });
      if (recentCount >= 5) {
        return NextResponse.json(
          { error: "You have reached the daily limit of 5 maintenance requests. For urgent issues, please contact your landlord directly." },
          { status: 429 }
        );
      }
    }

    // FIX #3C — Require at least one photo for EMERGENCY or HIGH priority tickets
    if (
      ["EMERGENCY", "HIGH"].includes((data.priority || "").toUpperCase()) &&
      (!Array.isArray(data.photos) || data.photos.length === 0)
    ) {
      return NextResponse.json(
        { error: "At least one photo is required for Emergency or High priority maintenance requests. Please upload a photo of the issue." },
        { status: 400 }
      );
    }

    // Use tenantId from body if provided (landlord/admin submitting on behalf of tenant),
    // otherwise use the session user's own ID (tenant submitting their own request)
    const tenantId = (data.tenantId && data.tenantId !== "") 
      ? data.tenantId 
      : (session.user as any).id;

    if (!tenantId) {
      return NextResponse.json({ error: "Could not determine tenant ID" }, { status: 400 });
    }

    // DUPLICATE DETECTION: Check for recent requests of same category on same unit within 7 days
    let isDuplicateSuspect = false;
    let duplicateOfId: string | null = null;

    if ((session.user as any).role === "TENANT") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const duplicateCheck = await prisma.maintenanceRequest.findFirst({
        where: {
          tenantId: (session.user as any).id,
          unitId: data.unitId,
          category: data.category || "GENERAL",
          createdAt: { gte: sevenDaysAgo },
          status: { notIn: ["CLOSED", "RESOLVED"] },
        },
        orderBy: { createdAt: "desc" },
      });

      if (duplicateCheck) {
        isDuplicateSuspect = true;
        duplicateOfId = duplicateCheck.id;
      }
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
        isDuplicateSuspect,
        duplicateOfId,
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

        if (isDuplicateSuspect) {
          await notify({
            userId: unit.property.ownerId,
            title: `⚠️ Possible Duplicate Ticket — ${data.title}`,
            message: `This maintenance request may be a duplicate of an existing open ticket (#${duplicateOfId?.slice(-6)}). Please review before assigning.`,
            type: "MAINTENANCE",
            priority: "HIGH",
            relatedEntityId: request.id,
          });
        }
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
    const { id, action, paymentMethod, referenceNote, rejectionReason, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: "Missing request ID" }, { status: 400 });
    }

    // Fetch full request details first for validations and metadata
    const fullRequest: any = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { 
        unit: { include: { property: { include: { owner: true } } } }, 
        externalVendor: true,
        inspector: true
      } as any,
    });

    if (!fullRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const owner = fullRequest.unit.property.owner;
    const requesterRole = (session.user as any).role;

    // ── ROLE GUARD: Inspectors cannot resolve/close tickets — diagnosis only ──
    if (requesterRole === "INSPECTOR") {
      const blockedStatuses = ["RESOLVED", "PENDING_TENANT_CONFIRMATION", "CLOSED"];
      if (action === "QUICK_RESOLVE" || (updateData.status && blockedStatuses.includes(updateData.status))) {
        return NextResponse.json(
          { error: "Inspectors can only submit diagnosis reports. Resolving or closing tickets is not permitted." },
          { status: 403 }
        );
      }
    }

    // Handle Quick Resolve (Owner/Superadmin only — inspectors blocked above)
    if (action === "QUICK_RESOLVE") {
      updateData.status = "RESOLVED";
      updateData.finalLabor = updateData.finalLabor !== undefined ? parseFloat(updateData.finalLabor) : 0;
      updateData.finalMaterials = updateData.finalMaterials !== undefined ? parseFloat(updateData.finalMaterials) : 0;
      updateData.inspectorNotes = updateData.inspectorNotes || "Resolved directly without preliminary estimate.";
      updateData.rescheduleRequested = false;
      updateData.tenantConfirmedSchedule = false;
    }

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
    
    if (action === "REJECT_ESTIMATE") {
      updateData.status = "DIAGNOSIS_SCHEDULED";
      updateData.estimatedLabor = null;
      updateData.estimatedMaterials = null;
      updateData.estimatedCost = null;

      const reason = rejectionReason || "No feedback provided";
      updateData.inspectorNotes = `Estimate Rejected on ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}: "${reason}"\n\nPrevious notes:\n${fullRequest.inspectorNotes || ""}`;

      if (fullRequest.externalVendor) {
        try {
          const magicLink = `http://localhost:3000/vendor/ticket/${fullRequest.vendorMagicToken}`;
          await sendEmail({
            to: fullRequest.externalVendor.email,
            subject: `Estimate Revision Requested: ${fullRequest.unit.property.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #e11d48; margin-top: 0;">Estimate Revision Requested</h2>
                <p>Hello <strong>${fullRequest.externalVendor.name}</strong>,</p>
                <p>The property owner has reviewed your estimate for the work order "<strong>${fullRequest.title}</strong>" at <strong>${fullRequest.unit.property.name} (Unit ${fullRequest.unit.name})</strong> and requested a revision.</p>
                
                <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; font-weight: bold; color: #9f1239;">Owner Rejection Feedback:</p>
                  <p style="margin: 8px 0 0 0; font-style: italic; color: #4c0519;">"${reason}"</p>
                </div>
                
                <p>Please click the button below to view the ticket details and submit a revised estimate:</p>
                <p style="margin: 25px 0; text-align: center;">
                  <a href="${magicLink}" style="background-color: #e11d48; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    Submit Revised Estimate
                  </a>
                </p>
                <p style="color: #64748b; font-size: 13px;">If you have any questions, please coordinate directly with the property owner.</p>
              </div>
            `
          });
        } catch (_) {}
      } else if (fullRequest.inspector) {
        try {
          const inspectorLink = `http://localhost:3000/dashboard/inspector/active`;
          await sendEmail({
            to: fullRequest.inspector.email,
            subject: `Estimate Revision Requested: ${fullRequest.unit.property.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #e11d48; margin-top: 0;">Estimate Revision Requested</h2>
                <p>Hello <strong>${fullRequest.inspector.name}</strong>,</p>
                <p>The property owner has reviewed your estimate for the work order "<strong>${fullRequest.title}</strong>" at <strong>${fullRequest.unit.property.name} (Unit ${fullRequest.unit.name})</strong> and requested a revision.</p>
                
                <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; font-weight: bold; color: #9f1239;">Owner Rejection Feedback:</p>
                  <p style="margin: 8px 0 0 0; font-style: italic; color: #4c0519;">"${reason}"</p>
                </div>
                
                <p>Please click the button below to log in to your dashboard and submit a revised estimate:</p>
                <p style="margin: 25px 0; text-align: center;">
                  <a href="${inspectorLink}" style="background-color: #e11d48; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    Go to Active Tasks
                  </a>
                </p>
                <p style="color: #64748b; font-size: 13px;">If you have any questions, please coordinate directly with the property owner.</p>
              </div>
            `
          });
        } catch (_) {}
      }
    }

    // Process dates or numbers if present
    const estLabor = (updateData.estimatedLabor !== undefined && updateData.estimatedLabor !== null) ? Number(updateData.estimatedLabor) : Number(fullRequest.estimatedLabor || 0);
    const estMaterials = (updateData.estimatedMaterials !== undefined && updateData.estimatedMaterials !== null) ? Number(updateData.estimatedMaterials) : Number(fullRequest.estimatedMaterials || 0);
    const totalEstimate = estLabor + estMaterials;

    if ((updateData.estimatedLabor !== undefined || updateData.estimatedMaterials !== undefined) && action !== "REJECT_ESTIMATE") {

      // ── INSPECTOR ESTIMATE: Diagnosis report only, no approval gate ──
      if (requesterRole === "INSPECTOR" || action === "SUBMIT_INSPECTOR_ESTIMATE") {
        // Store in inspector-specific reference fields (separate from vendor quote fields)
        updateData.inspectorEstimateLabor = estLabor;
        updateData.inspectorEstimateMaterials = estMaterials;
        updateData.estimateSource = "INSPECTOR";
        // Do NOT set estimatedLabor/Materials — those are reserved for vendor quotes
        delete updateData.estimatedLabor;
        delete updateData.estimatedMaterials;
        // Inspector's job is done: move to DIAGNOSIS_COMPLETE, no approval needed
        updateData.status = "DIAGNOSIS_COMPLETE";

        // Notify the property owner about the diagnosis report
        try {
          await notify({
            userId: owner.id,
            title: "Inspector Diagnosis Report Ready",
            message: `${fullRequest.inspector?.name || "Inspector"} has submitted a diagnosis report for "${fullRequest.title}" at ${fullRequest.unit.property.name}. Reference estimate: $${totalEstimate.toFixed(2)}.`,
            type: "SYSTEM",
            priority: "HIGH",
          });
        } catch (_) {}
      } else {
        // ── VENDOR / OWNER ESTIMATE: Goes through approval flow ──
        updateData.estimatedLabor = estLabor;
        updateData.estimatedMaterials = estMaterials;

        const isEmergency = (updateData.priority || fullRequest.priority) === "EMERGENCY";
        const limit = isEmergency
          ? (owner.emergencyOverrideLimit ? Number(owner.emergencyOverrideLimit) : 1500)
          : (owner.approvalThreshold ? Number(owner.approvalThreshold) : 200);

        // If frontend asks for approval but it's under the limit, auto-approve it
        if ((updateData.status === "PENDING_APPROVAL" || updateData.status === "AWAITING_APPROVAL") && requesterRole !== "OWNER" && requesterRole !== "SUPERADMIN") {
          if (totalEstimate <= limit) {
            updateData.status = "APPROVED";
          } else {
            updateData.status = "AWAITING_APPROVAL";
          }
        }
      }
    }

    if (updateData.scheduledDate) {
      updateData.scheduledDate = new Date(updateData.scheduledDate);
    }
    if (updateData.diagnosisDate) {
      updateData.diagnosisDate = new Date(updateData.diagnosisDate);
      updateData.scheduledDate = updateData.diagnosisDate; // Keep scheduledDate in sync
    }
    if (updateData.repairDate) {
      updateData.repairDate = new Date(updateData.repairDate);
      updateData.scheduledDate = updateData.repairDate; // Keep scheduledDate in sync
    }

    if (updateData.inspectorId === "none" || updateData.inspectorId === "") {
      updateData.inspectorId = null;
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
        // Set token expiry: 14 days from now (covers scheduling + completion window)
        const tokenExpiry = new Date();
        tokenExpiry.setDate(tokenExpiry.getDate() + 14);
        updateData.vendorTokenExpiresAt = tokenExpiry;

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
      action !== "PAY_VENDOR" &&
      requesterRole !== "TENANT"
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

