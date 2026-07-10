import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const lease = await prisma.lease.findUnique({
      where: { id },
      include: {
        tenant: true,
        invoices: {
          orderBy: { dueDate: "asc" }
        },
        unit: {
          include: {
            property: true
          }
        },
        payoutRequests: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    if (
      role !== "SUPERADMIN" && 
      lease.unit.property.ownerId !== userId && 
      lease.tenantId !== userId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch mid-tenancy deposit deductions for the full audit trail
    const depositDeductions = await prisma.transaction.findMany({
      where: {
        tenantId: lease.tenantId,
        category: "DEPOSIT_DEDUCTION",
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        amount: true,
        reference: true,
        createdAt: true,
        status: true,
      },
    });

    return NextResponse.json({ ...lease, depositDeductions });

  } catch (error: any) {
    console.error("Error fetching lease:", error);
    return NextResponse.json({ error: "Failed to fetch lease" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const lease = await prisma.lease.findUnique({
      where: { id },
      include: { unit: { include: { property: true } } }
    });

    if (!lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    if (role !== "SUPERADMIN" && lease.unit.property.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // GUARD: Never allow deletion of financially-active leases
    const protectedStatuses = ["ACTIVE", "SIGNED", "TERMINATED"];
    if (protectedStatuses.includes(lease.status)) {
      return NextResponse.json(
        { error: `Cannot delete a lease in ${lease.status} status. Active, signed, or terminated leases are legally protected records. Use the Terminate workflow instead.` },
        { status: 400 }
      );
    }

    // Delete invoices first because of foreign key constraints
    await prisma.invoice.deleteMany({
      where: { leaseId: id }
    });

    // Free up the unit if it was occupied by this lease
    if (lease.unit.status === "OCCUPIED") {
      await prisma.unit.update({
        where: { id: lease.unitId },
        data: { status: "VACANT" }
      });
    }

    await auditLog({
      entityType: "LEASE",
      entityId: id,
      action: "DELETED",
      actorId: userId,
      actorRole: role,
      oldValue: { id: lease.id, status: lease.status },
      note: `Lease deleted by user.`,
    });

    await prisma.lease.delete({
      where: { id }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting lease:", error);
    return NextResponse.json({ error: "Failed to delete lease" }, { status: 500 });
  }
}
