import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { sanitizeVendor } from "@/lib/utils";
import { encrypt } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const request = await (prisma as any).maintenanceRequest.findFirst({
      where: { vendorMagicToken: token },
      include: {
        unit: { include: { property: { include: { owner: true } } } },
        tenant: { select: { name: true, email: true, phone: true } },
        externalVendor: true,
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Invalid token or ticket not found" }, { status: 404 });
    }

    // FIX #10 — Check if the vendor token has expired
    if (request.vendorTokenExpiresAt && new Date() > new Date(request.vendorTokenExpiresAt)) {
      return NextResponse.json(
        { error: "This work order link has expired. Please contact the property manager for a new access link." },
        { status: 403 }
      );
    }

    let transaction = null;
    if (request.vendorExpenseTransactionId) {
      transaction = await prisma.transaction.findUnique({
        where: { id: request.vendorExpenseTransactionId }
      });
    }

    if (request.externalVendor) {
      request.externalVendor = sanitizeVendor(request.externalVendor);
    }

    return NextResponse.json({
      ...request,
      transaction
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, status, estimatedLabor, estimatedMaterials, finalLabor, finalMaterials, vendorReportedFault, inspectorNotes, receiptPhotos, scheduledDate, diagnosisPhotos, repairPhotos, bankName, routingNumber, accountNumber } = body;

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const fullRequest = await (prisma as any).maintenanceRequest.findFirst({
      where: { vendorMagicToken: token },
      include: { unit: { include: { property: { include: { owner: true } } } }, tenant: true, externalVendor: true },
    });

    if (!fullRequest) {
      return NextResponse.json({ error: "Invalid token or ticket not found" }, { status: 404 });
    }

    const owner = (fullRequest as any).unit.property.owner;

    const updateData: any = {};

    if (estimatedLabor !== undefined) updateData.estimatedLabor = parseFloat(estimatedLabor);
    if (estimatedMaterials !== undefined) updateData.estimatedMaterials = parseFloat(estimatedMaterials);
    if (finalLabor !== undefined) updateData.finalLabor = parseFloat(finalLabor);
    if (finalMaterials !== undefined) updateData.finalMaterials = parseFloat(finalMaterials);
    if (vendorReportedFault !== undefined) updateData.vendorReportedFault = Boolean(vendorReportedFault);
    if (inspectorNotes !== undefined) updateData.inspectorNotes = inspectorNotes;
    if (receiptPhotos !== undefined && Array.isArray(receiptPhotos)) updateData.receiptPhotos = receiptPhotos;
    if (diagnosisPhotos !== undefined && Array.isArray(diagnosisPhotos)) updateData.diagnosisPhotos = diagnosisPhotos;
    if (repairPhotos !== undefined && Array.isArray(repairPhotos)) updateData.repairPhotos = repairPhotos;
    if (scheduledDate) {
      updateData.scheduledDate = new Date(scheduledDate);
      // Reset tenant confirmation and reschedule flags as we scheduled a new time
      updateData.tenantConfirmedSchedule = false;
      updateData.rescheduleRequested = false;
      updateData.rescheduleReason = null;
      
      if (fullRequest.status === "SUBMITTED" || fullRequest.status === "ASSIGNED") {
        updateData.status = "DIAGNOSIS_SCHEDULED";
      } else if (fullRequest.status === "APPROVED") {
        updateData.status = "REPAIR_SCHEDULED";
      }
    }

    // Direct deposit details saving logic
    if (bankName !== undefined || routingNumber !== undefined || accountNumber !== undefined) {
      const vendorUpdate: any = {};
      if (bankName !== undefined) vendorUpdate.bankName = bankName;
      if (routingNumber !== undefined) vendorUpdate.routingNumber = encrypt(routingNumber);
      if (accountNumber !== undefined) vendorUpdate.accountNumber = encrypt(accountNumber);

      if (fullRequest.externalVendorId) {
        await prisma.externalVendor.update({
          where: { id: fullRequest.externalVendorId },
          data: vendorUpdate,
        });
      }
    }

    // Check estimate cost controls if estimates are provided/updated
    if (updateData.estimatedLabor !== undefined || updateData.estimatedMaterials !== undefined) {
      const labor = updateData.estimatedLabor !== undefined ? updateData.estimatedLabor : Number(fullRequest.estimatedLabor || 0);
      const materials = updateData.estimatedMaterials !== undefined ? updateData.estimatedMaterials : Number(fullRequest.estimatedMaterials || 0);
      const totalEstimate = labor + materials;

      const isEmergency = fullRequest.priority === "EMERGENCY";
      const limit = isEmergency
        ? (owner.emergencyOverrideLimit ? Number(owner.emergencyOverrideLimit) : 1500)
        : (owner.approvalThreshold ? Number(owner.approvalThreshold) : 200);

      if (totalEstimate > limit) {
        updateData.status = "AWAITING_APPROVAL";
      } else {
        updateData.status = "APPROVED"; // Auto-approved if under limit
      }
    }

    // Explicit status updates
    if (status) {
      if (status === "RESOLVED") {
        // Enforce approval threshold for direct resolution (Quick-fix bypass check)
        const laborCost = finalLabor !== undefined ? parseFloat(finalLabor) : Number(fullRequest.finalLabor || 0);
        const materialsCost = finalMaterials !== undefined ? parseFloat(finalMaterials) : Number(fullRequest.finalMaterials || 0);
        const finalCost = laborCost + materialsCost;
        
        const isEmergency = fullRequest.priority === "EMERGENCY";
        const limit = isEmergency
          ? (owner.emergencyOverrideLimit ? Number(owner.emergencyOverrideLimit) : 1500)
          : (owner.approvalThreshold ? Number(owner.approvalThreshold) : 200);

        if (finalCost > limit && fullRequest.status !== "APPROVED" && fullRequest.status !== "REPAIR_SCHEDULED" && fullRequest.status !== "IN_PROGRESS") {
          updateData.status = "AWAITING_APPROVAL"; // Exceeds threshold without pre-approved estimate
        } else {
          updateData.status = "PENDING_TENANT_CONFIRMATION";
        }
      } else if (status === "SUBMIT_ESTIMATE") {
        // If they just submit estimate, let the limit check handle whether it is awaiting approval or approved
        if (!updateData.status) {
          const labor = Number(updateData.estimatedLabor || fullRequest.estimatedLabor || 0);
          const materials = Number(updateData.estimatedMaterials || fullRequest.estimatedMaterials || 0);
          const totalEstimate = labor + materials;
          const isEmergency = fullRequest.priority === "EMERGENCY";
          const limit = isEmergency
            ? (owner.emergencyOverrideLimit ? Number(owner.emergencyOverrideLimit) : 1500)
            : (owner.approvalThreshold ? Number(owner.approvalThreshold) : 200);

          updateData.status = totalEstimate > limit ? "AWAITING_APPROVAL" : "APPROVED";
        }
      } else {
        updateData.status = status;
      }
    }

    const updatedRequest = await prisma.maintenanceRequest.update({
      where: { id: fullRequest.id },
      data: updateData,
    });

    // Notify owner on updates
    try {
      await notify({
        userId: owner.id,
        title: "Vendor Update on Repair",
        message: `Vendor updated request "${fullRequest.title}". Status is now ${updatedRequest.status.toLowerCase().replace(/_/g, ' ')}.`,
        type: "MAINTENANCE",
        priority: "MEDIUM",
        relatedEntityId: updatedRequest.id,
      });

      // Notify Tenant if a scheduledDate was just locked in
      if (scheduledDate && (!fullRequest.scheduledDate || new Date(scheduledDate).getTime() !== new Date(fullRequest.scheduledDate).getTime())) {
        const { sendEmail } = await import("@/lib/email");
        const tenant = (fullRequest as any).tenant;
        if (tenant && tenant.email) {
          await sendEmail({
            to: tenant.email,
            subject: `Maintenance Scheduled: ${fullRequest.title}`,
            html: `
              <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
                <h2 style="color: #0F172A;">Your Maintenance Request is Scheduled</h2>
                <p style="color: #334155; font-size: 16px;">Hello ${tenant.name},</p>
                <p style="color: #334155; font-size: 16px;">The vendor has scheduled to arrive for your maintenance request at <strong>${(fullRequest as any).unit.name}</strong>.</p>
                
                <div style="background-color: #EFF6FF; padding: 16px; border-radius: 8px; border: 1px solid #BFDBFE; margin: 24px 0;">
                  <p style="margin: 0 0 8px 0; font-weight: bold; color: #1E3A8A;">Arrival Time:</p>
                  <p style="margin: 0; font-size: 18px; color: #1E40AF;"><strong>${new Date(scheduledDate).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })}</strong></p>
                </div>
                
                <p style="color: #334155; font-size: 16px;">If you have any issues with this time and selected "Must be home", please reach out to your property manager immediately.</p>
              </div>
            `,
          });
        }
      }
    } catch (_) {}

    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
