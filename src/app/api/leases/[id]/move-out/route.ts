import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { deductions } = await req.json();
    const { id: leaseId } = await params;

    // Verify lease ownership
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { unit: { include: { property: true } } },
    });

    if (!lease || lease.unit.property.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    if (lease.depositStatus !== "HELD") {
      return NextResponse.json({ error: "Deposit already processed" }, { status: 400 });
    }

    const totalDeducted = (deductions || []).reduce((sum: number, d: any) => sum + Number(d.amount), 0);
    const originalDeposit = Number(lease.securityDeposit || 0);

    if (totalDeducted > originalDeposit) {
      return NextResponse.json({ error: "Deductions cannot exceed security deposit" }, { status: 400 });
    }

    const newStatus = totalDeducted === 0 ? "REFUNDED" : (totalDeducted === originalDeposit ? "FULLY_DEDUCTED" : "PARTIALLY_REFUNDED");

    // Update lease with deductions
    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        depositStatus: newStatus,
        deductions: deductions,
        status: "EXPIRED", // Mark lease as officially moved out/expired
      },
    });

    // Also free up the unit
    await prisma.unit.update({
      where: { id: lease.unitId },
      data: { status: "VACANT" },
    });

    return NextResponse.json(updatedLease);
  } catch (error: any) {
    console.error("Failed to process move out:", error);
    return NextResponse.json({ error: error.message || "Failed to process move out" }, { status: 500 });
  }
}
