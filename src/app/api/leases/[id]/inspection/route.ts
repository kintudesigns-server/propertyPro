import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || ((session.user as any).role !== "OWNER" && (session.user as any).role !== "INSPECTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: leaseId } = await params;
  const { inspectionDate, moveOutInspectorId } = await req.json();

  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { tenant: true },
    });

    if (!lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    if (lease.moveOutStatus !== "MOVE_OUT_REQUESTED" && lease.moveOutStatus !== "TENANT_DISPUTED") {
      return NextResponse.json({ error: "Invalid move out status for scheduling inspection" }, { status: 400 });
    }

    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        moveOutStatus: "INSPECTION_SCHEDULED",
        inspectionDate: new Date(inspectionDate),
        moveOutInspectorId: moveOutInspectorId || null,
      },
    });

    // Notify tenant
    await notify({
      userId: lease.tenantId,
      title: "Move-Out Inspection Scheduled",
      message: `Your move-out inspection has been scheduled for ${new Date(inspectionDate).toLocaleDateString()}.`,
      type: "LEASE",
      priority: "MEDIUM",
      relatedEntityId: lease.id,
    });
    
    // Notify Inspector if assigned
    if (moveOutInspectorId) {
        await notify({
            userId: moveOutInspectorId,
            title: "Inspection Assigned",
            message: `You have been assigned to conduct a move-out inspection for lease ${lease.id}.`,
            type: "SYSTEM",
            priority: "MEDIUM",
            relatedEntityId: lease.id,
        });
    }

    return NextResponse.json(updatedLease, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to schedule inspection" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || ((session.user as any).role !== "OWNER" && (session.user as any).role !== "INSPECTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: leaseId } = await params;
  const { deductions, inspectionNotes, inspectionPhotos } = await req.json();

  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { tenant: true },
    });

    if (!lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    if (lease.moveOutStatus !== "INSPECTION_SCHEDULED" && lease.moveOutStatus !== "TENANT_DISPUTED") {
        return NextResponse.json({ error: "Cannot submit inspection at this stage" }, { status: 400 });
    }

    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        moveOutStatus: "INSPECTION_COMPLETED",
        deductions,
        inspectionNotes,
        inspectionPhotos,
      },
    });

    // Notify tenant to review
    await notify({
      userId: lease.tenantId,
      title: "Move-Out Inspection Completed",
      message: `Your move-out inspection report is ready. Please review the deductions and refund estimate.`,
      type: "LEASE",
      priority: "HIGH",
      relatedEntityId: lease.id,
    });

    return NextResponse.json(updatedLease, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to submit inspection" }, { status: 500 });
  }
}
