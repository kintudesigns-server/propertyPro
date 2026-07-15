import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// POST /api/leases/[id]/skip-inspection
// OWNER only. Skips the physical inspection and jumps to INSPECTION_COMPLETED with zero deductions.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: leaseId } = await params;

  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { unit: { include: { property: true } } },
    });

    if (!lease || lease.unit.property.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    if (lease.moveOutStatus !== "KEYS_RETURNED" && lease.moveOutStatus !== "MOVE_OUT_REQUESTED") {
      return NextResponse.json({ error: "Can only skip inspection when keys are returned or move out is requested." }, { status: 400 });
    }

    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        moveOutStatus: "INSPECTION_COMPLETED",
        deductions: [], // Empty array = no deductions
        inspectionNotes: "Inspection bypassed by owner. No deductions.",
        inspectionDate: new Date(),
      },
    });

    return NextResponse.json(updatedLease);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to skip inspection" }, { status: 500 });
  }
}
