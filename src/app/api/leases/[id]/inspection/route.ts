import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";

const VALID_CATEGORIES = ["DAMAGE", "CLEANING", "UNPAID_RENT", "UNPAID_FEE", "OTHER"];

// PUT /api/leases/[id]/inspection — Schedule Inspection
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || ((session.user as any).role !== "OWNER" && (session.user as any).role !== "INSPECTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: leaseId } = await params;
  const { inspectionDate, moveOutInspectorId, inspectionNotes, inspectionType = "FINAL" } = await req.json();

  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { tenant: true },
    });

    if (!lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    // Only allow scheduling when move-out has been requested, is in scheduled state, or keys returned
    if (!["MOVE_OUT_REQUESTED", "INSPECTION_SCHEDULED", "KEYS_RETURNED"].includes(lease.moveOutStatus)) {
      return NextResponse.json({ error: "Inspection can only be scheduled after a move-out notice has been submitted." }, { status: 400 });
    }

    let updatedLease;
    
    // Resolve SELF inspector to current user
    const resolvedInspectorId = moveOutInspectorId === "SELF" ? (session.user as any).id : (moveOutInspectorId || null);

    if (inspectionType === "PRELIMINARY") {
      updatedLease = await prisma.lease.update({
        where: { id: leaseId },
        data: {
          preliminaryInspectionStatus: "SCHEDULED",
          preliminaryInspectionDate: new Date(inspectionDate),
          preliminaryInspectorId: resolvedInspectorId,
          preliminaryInspectionNotes: inspectionNotes || null,
        },
      });

      // Notify tenant of Preliminary inspection
      const dateTimeStr = new Date(inspectionDate).toLocaleDateString() + " at " + new Date(inspectionDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      await notify({
        userId: lease.tenantId,
        title: "Preliminary Walkthrough Scheduled",
        message: `A preliminary move-out walkthrough has been scheduled for ${dateTimeStr}. This is to identify potential remedies before your final vacate date.`,
        type: "LEASE",
        priority: "MEDIUM",
        relatedEntityId: lease.id,
      });

      // Insert message into Inbox
      await prisma.message.create({
        data: {
          senderId: (session.user as any).id,
          receiverId: lease.tenantId,
          leaseId: lease.id,
          messageType: "SYSTEM",
          content: `Notice of Preliminary Walkthrough: A preliminary walkthrough has been scheduled for ${dateTimeStr}. The purpose of this walkthrough is to identify any potential deposit deductions so you have time to address them before your final move-out.`,
          conversationId: [(session.user as any).id, lease.tenantId].sort().join("_")
        }
      });
    } else {
      updatedLease = await prisma.lease.update({
        where: { id: leaseId },
        data: {
          moveOutStatus: "INSPECTION_SCHEDULED",
          inspectionDate: new Date(inspectionDate),
          moveOutInspectorId: resolvedInspectorId,
          inspectionNotes: inspectionNotes || null,
        },
      });

      // Notify tenant
      await notify({
        userId: lease.tenantId,
        title: "Move-Out Inspection Scheduled",
        message: `Your final move-out inspection has been scheduled for ${new Date(inspectionDate).toLocaleDateString()} at ${new Date(inspectionDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Please ensure the unit is accessible.`,
        type: "LEASE",
        priority: "MEDIUM",
        relatedEntityId: lease.id,
      });
    }

    // Notify Inspector if assigned
    if (moveOutInspectorId) {
      const inspector = await prisma.user.findUnique({ where: { id: moveOutInspectorId } });
      await notify({
        userId: moveOutInspectorId,
        title: "Inspection Assignment",
        message: `You have been assigned to conduct a ${inspectionType.toLowerCase()} walkthrough inspection on ${new Date(inspectionDate).toLocaleDateString()}.`,
        type: "SYSTEM",
        priority: "MEDIUM",
        relatedEntityId: lease.id,
      });

      if (inspector && inspector.email) {
        await sendEmail({
          to: inspector.email,
          subject: "New Inspection Assignment",
          html: `<p>Hi ${inspector.name},</p><p>You have been assigned to conduct a ${inspectionType.toLowerCase()} walkthrough inspection on ${new Date(inspectionDate).toLocaleDateString()}.</p><p>Please log in to PropertyPro to view the details and complete the walkthrough.</p>`,
        });
      }
    }

    return NextResponse.json(updatedLease, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to schedule inspection" }, { status: 500 });
  }
}

// POST /api/leases/[id]/inspection — Submit Inspection Results
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || ((session.user as any).role !== "OWNER" && (session.user as any).role !== "INSPECTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: leaseId } = await params;
  const { deductions, inspectionNotes, inspectionPhotos, inspectionType = "FINAL" } = await req.json();

  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { 
        tenant: true,
        unit: {
          include: {
            property: true
          }
        }
      },
    });

    if (!lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    // Preliminary walkthrough can be submitted if requested or scheduled. Final can only be submitted if requested, scheduled, disputed, or keys returned.
    if (inspectionType === "FINAL" && !["MOVE_OUT_REQUESTED", "INSPECTION_SCHEDULED", "TENANT_DISPUTED", "KEYS_RETURNED"].includes(lease.moveOutStatus)) {
      return NextResponse.json({ error: "Cannot submit final inspection results at this stage." }, { status: 400 });
    }

    // Validate that each deduction has a valid category
    if (deductions && Array.isArray(deductions)) {
      for (const d of deductions) {
        if (!d.category || !VALID_CATEGORIES.includes(d.category)) {
          return NextResponse.json({
            error: `Each deduction must have a valid category. "${d.description || "Unknown item"}" is missing a category. Valid values: ${VALID_CATEGORIES.join(", ")}.`
          }, { status: 400 });
        }
        if (d.amount === undefined || d.amount === null || isNaN(Number(d.amount)) || Number(d.amount) < 0) {
          return NextResponse.json({ error: `Deduction "${d.description}" must have a valid amount of 0 or greater.` }, { status: 400 });
        }
      }
    }

    let updatedLease;
    if (inspectionType === "PRELIMINARY") {
      updatedLease = await prisma.lease.update({
        where: { id: leaseId },
        data: {
          preliminaryInspectionStatus: "COMPLETED",
          preliminaryDeductions: deductions,
          preliminaryInspectionNotes: inspectionNotes,
          preliminaryInspectorSignedAt: new Date(),
        },
      });

      // Notify tenant about Preliminary Results
      await notify({
        userId: lease.tenantId,
        title: "Preliminary Walkthrough Results Ready",
        message: `The preliminary walkthrough report for your unit is ready. Please view the logged items so you can address them before vacating.`,
        type: "LEASE",
        priority: "MEDIUM",
        relatedEntityId: lease.id,
      });

      // Notify Owner
      await notify({
        userId: lease.unit.property.ownerId,
        title: "Preliminary Report Submitted",
        message: `The inspector has submitted the preliminary walkthrough report for ${lease.tenant.name}'s unit.`,
        type: "LEASE",
        priority: "MEDIUM",
        relatedEntityId: lease.id,
      });
    } else {
      updatedLease = await prisma.lease.update({
        where: { id: leaseId },
        data: {
          moveOutStatus: "OWNER_REVIEWING",
          deductions,
          inspectionNotes,
          inspectionPhotos,
          inspectionDate: new Date(),
          inspectorSignedAt: new Date(),
        },
      });

      // Notify tenant that inspection has been conducted
      await notify({
        userId: lease.tenantId,
        title: "Move-Out Walkthrough Conducted",
        message: `The final move-out inspection walkthrough for your unit has been completed. The property manager is compiling the final disposition statement and refund estimate. We will notify you when it is ready.`,
        type: "LEASE",
        priority: "MEDIUM",
        relatedEntityId: lease.id,
      });

      // Notify Owner
      await notify({
        userId: lease.unit.property.ownerId,
        title: "Final Walkthrough Completed — Action Required",
        message: `The inspector has submitted the walkthrough findings for ${lease.tenant.name}'s unit. Please review and assign deduction amounts to compile the final statement.`,
        type: "LEASE",
        priority: "HIGH",
        relatedEntityId: lease.id,
      });
    }

    return NextResponse.json(updatedLease, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to submit inspection" }, { status: 500 });
  }
}
