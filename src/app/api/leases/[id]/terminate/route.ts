import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { auditLog } from "@/lib/audit-log";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Verify lease exists and owner has access
    const lease = await prisma.lease.findUnique({
      where: { id },
      include: { unit: { include: { property: true } } },
    });

    if (!lease || lease.unit.property.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    if (lease.status === "TERMINATED") {
      return NextResponse.json({ error: "Lease is already terminated" }, { status: 400 });
    }

    // Update lease status to TERMINATED and unit status to VACANT
    const [updatedLease] = await prisma.$transaction([
      prisma.lease.update({
        where: { id },
        data: { status: "TERMINATED" },
      }),
      prisma.unit.update({
        where: { id: lease.unitId },
        data: { status: "VACANT" },
      }),
    ]);

    // Write audit log
    await auditLog({
      entityType: "LEASE",
      entityId: id,
      action: "TERMINATED",
      actorId: (session.user as any).id,
      actorRole: "OWNER",
      oldValue: { status: lease.status },
      newValue: { status: "TERMINATED" },
      note: `Lease manually terminated by owner.`,
    });

    // FIX #7 — Auto-invoice early termination fee if applicable
    const today = new Date();
    const earlyTermFee = Number(lease.earlyTerminationFee || 0);
    const endDate = new Date(lease.endDate);

    if (earlyTermFee > 0 && today < endDate) {
      try {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14); // Due in 14 days

        const invoice = await prisma.invoice.create({
          data: {
            leaseId: lease.id,
            amount: earlyTermFee,
            dueDate,
            status: "UNPAID",
          },
        });

        // Notify tenant of early termination fee
        await notify({
          userId: lease.tenantId,
          title: "Early Termination Fee Invoiced",
          message: `Your lease has been terminated before its end date (${endDate.toLocaleDateString()}). An early termination fee of $${earlyTermFee.toFixed(2)} has been invoiced and is due by ${dueDate.toLocaleDateString()}.`,
          type: "PAYMENT",
          priority: "HIGH",
          relatedEntityId: invoice.id,
        });

        console.log(`[TERMINATE] Early termination invoice created: $${earlyTermFee} for lease ${id}`);
      } catch (e) {
        console.error("Failed to create early termination invoice:", e);
      }
    }

    // Create system notification for tenant
    try {
      await notify({
        userId: lease.tenantId,
        title: "Lease Agreement Terminated",
        message: `Your lease agreement for Unit ${lease.unit.name} at ${lease.unit.property.name} has been terminated by the property manager.`,
        type: "LEASE",
        priority: "HIGH",
        relatedEntityId: lease.id,
      });
    } catch (err) {
      console.error("Failed to send termination notification:", err);
    }

    return NextResponse.json(updatedLease);
  } catch (error: any) {
    console.error("Failed to terminate lease:", error);
    return NextResponse.json({ error: error.message || "Failed to terminate lease" }, { status: 500 });
  }
}
