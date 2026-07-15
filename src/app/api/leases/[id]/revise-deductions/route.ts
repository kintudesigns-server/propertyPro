import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

const VALID_CATEGORIES = ["DAMAGE", "CLEANING", "UNPAID_RENT", "UNPAID_FEE", "OTHER"];

// POST /api/leases/[id]/revise-deductions
// OWNER only. After a tenant disputes, owner revises deductions and sends back for re-review.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: leaseId } = await params;
  const { deductions, inspectionNotes } = await req.json();

  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { tenant: true, unit: { include: { property: true } } },
    });

    if (!lease || lease.unit.property.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    if (lease.moveOutStatus !== "TENANT_DISPUTED") {
      return NextResponse.json({ error: "Deductions can only be revised after a tenant dispute." }, { status: 400 });
    }

    // Validate category on each deduction
    if (deductions && Array.isArray(deductions)) {
      for (const d of deductions) {
        if (!d.category || !VALID_CATEGORIES.includes(d.category)) {
          return NextResponse.json({
            error: `Deduction "${d.description || "Unknown"}" must have a category. Valid: ${VALID_CATEGORIES.join(", ")}.`
          }, { status: 400 });
        }
      }
    }

    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        moveOutStatus: "INSPECTION_COMPLETED",
        deductions,
        inspectionNotes,
        inspectionDate: new Date(),
      },
    });

    // Notify tenant to review revised report
    await notify({
      userId: lease.tenantId,
      title: "Revised Deduction Report — Please Review",
      message: `Your landlord has revised the deduction list for ${lease.unit?.property?.name}. Please review the updated report and accept or submit a final dispute within 72 hours.`,
      type: "LEASE",
      priority: "HIGH",
      relatedEntityId: lease.id,
    });

    return NextResponse.json(updatedLease);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to revise deductions" }, { status: 500 });
  }
}
