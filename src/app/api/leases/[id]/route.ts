import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json(lease);
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

    await prisma.lease.delete({
      where: { id }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting lease:", error);
    return NextResponse.json({ error: "Failed to delete lease" }, { status: 500 });
  }
}
