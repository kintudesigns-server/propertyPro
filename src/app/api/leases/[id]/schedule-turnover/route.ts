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
    const { type, scheduledDate, inspectorId, notes } = await req.json();
    const { id: leaseId } = await params;

    if (!type || !scheduledDate) {
      return NextResponse.json({ error: "Type and scheduled date are required" }, { status: 400 });
    }

    // Verify lease ownership
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { unit: { include: { property: true } } },
    });

    if (!lease || lease.unit.property.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    const title = type === "INSPECTION" ? "Move-Out Walkthrough Inspection" : "Turnover Clean";
    
    const request = await prisma.maintenanceRequest.create({
      data: {
        unitId: lease.unitId,
        tenantId: lease.tenantId,
        title,
        description: notes || `${title} scheduled for tenant move-out.`,
        category: "GENERAL",
        priority: type === "INSPECTION" ? "HIGH" : "MEDIUM",
        status: inspectorId ? "ASSIGNED" : "SUBMITTED",
        scheduledDate: new Date(scheduledDate),
        inspectorId: inspectorId || null,
        isMoveOutInspection: type === "INSPECTION",
      },
    });

    // Update lease move-out lifecycle status if scheduling an inspection
    if (type === "INSPECTION") {
      await prisma.lease.update({
        where: { id: leaseId },
        data: {
          moveOutStatus: "INSPECTION_SCHEDULED",
          inspectionDate: new Date(scheduledDate),
          moveOutInspectorId: inspectorId || null,
        },
      });
    }

    return NextResponse.json(request, { status: 201 });
  } catch (error: any) {
    console.error("Failed to schedule turnover task:", error);
    return NextResponse.json({ error: error.message || "Failed to schedule turnover task" }, { status: 500 });
  }
}
