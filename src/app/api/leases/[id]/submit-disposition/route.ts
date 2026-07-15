import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

const VALID_CATEGORIES = ["DAMAGE", "CLEANING", "UNPAID_RENT", "UNPAID_FEE", "OTHER"];

// POST /api/leases/[id]/submit-disposition
// OWNER only. Submits the final priced disposition statement to the tenant.
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
      include: {
        tenant: true,
        unit: {
          include: {
            property: true
          }
        }
      },
    });

    if (!lease || lease.unit.property.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    // Must be in OWNER_REVIEWING state (inspection walkthrough is complete)
    if (lease.moveOutStatus !== "OWNER_REVIEWING") {
      return NextResponse.json({ error: "Statement can only be submitted for review while in Owner Review stage." }, { status: 400 });
    }

    // Validate that each deduction has a valid category and a positive amount
    if (deductions && Array.isArray(deductions)) {
      for (const d of deductions) {
        if (!d.category || !VALID_CATEGORIES.includes(d.category)) {
          return NextResponse.json({
            error: `Each deduction must have a valid category. "${d.description || "Unknown item"}" is missing a category. Valid values: ${VALID_CATEGORIES.join(", ")}.`
          }, { status: 400 });
        }
        if (d.amount === undefined || isNaN(Number(d.amount)) || Number(d.amount) < 0) {
          return NextResponse.json({ error: `Deduction "${d.description}" must have a non-negative amount.` }, { status: 400 });
        }
      }
    }

    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        moveOutStatus: "INSPECTION_COMPLETED",
        deductions,
        inspectionNotes: inspectionNotes || lease.inspectionNotes,
        inspectionDate: new Date(), // Set the date the statement was officially generated/sent
      },
    });

    // Notify tenant to review — give them 72 hours
    await notify({
      userId: lease.tenantId,
      title: "Disposition Statement Ready — Action Required",
      message: `Your final move-out statement and refund estimate are ready. Please review the itemized deductions and accept or dispute them within 72 hours.`,
      type: "LEASE",
      priority: "HIGH",
      relatedEntityId: lease.id,
    });

    return NextResponse.json(updatedLease, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to submit disposition" }, { status: 500 });
  }
}
