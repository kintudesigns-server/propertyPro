import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  try {
    let invoices: any[] = [];
    if (role === "SUPERADMIN") {
      invoices = await prisma.invoice.findMany({
        include: { lease: { include: { tenant: true, unit: { include: { property: true } } } } },
        orderBy: { dueDate: "desc" },
      });
    } else if (role === "OWNER") {
      invoices = await prisma.invoice.findMany({
        where: { lease: { unit: { property: { ownerId: userId } } } },
        include: { lease: { include: { tenant: true, unit: { include: { property: true } } } } },
        orderBy: { dueDate: "desc" },
      });
    } else if (role === "TENANT") {
      invoices = await prisma.invoice.findMany({
        where: { lease: { tenantId: userId } },
        include: { lease: { include: { tenant: true, unit: { include: { property: true } } } } },
        orderBy: { dueDate: "desc" },
      });
    } else {
      invoices = [];
    }

    return NextResponse.json(invoices);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { leaseId, amount, dueDate, status } = await req.json();
    if (!leaseId || !amount || !dueDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify lease belongs to owner
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { unit: { include: { property: true } } },
    });

    if (!lease || lease.unit.property.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    const invoice = await prisma.invoice.create({
      data: {
        leaseId,
        amount: Number(amount),
        dueDate: new Date(dueDate),
        status: status || "UNPAID",
      },
    });

    // If created as PAID, increment owner balance
    if (invoice.status === "PAID") {
      await prisma.user.update({
        where: { id: (session.user as any).id },
        data: {
          balance: { increment: Number(amount) * 0.9 },
        },
      });
    }

    // Notify the tenant that a new invoice has been raised
    const dueDateLabel = new Date(dueDate).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
    await notify({
      userId: lease.tenantId,
      title: "New Invoice Issued",
      message: `A new invoice of $${Number(amount).toFixed(2)} has been issued for ${lease.unit?.property?.name || "your property"}. Payment due: ${dueDateLabel}.`,
      type: "PAYMENT",
      priority: "MEDIUM",
      relatedEntityId: invoice.id,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create invoice" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id, status, paymentMethod } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { lease: { include: { unit: { include: { property: true } } } } },
    });

    if (!invoice || invoice.lease.unit.property.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Invoice not found or access denied" }, { status: 404 });
    }

    const oldStatus = invoice.status;
    const amount = Number(invoice.amount);

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status,
        paymentMethod: paymentMethod || invoice.paymentMethod,
      },
    });

    // Balance update logic
    if (oldStatus !== "PAID" && status === "PAID") {
      // Credited to owner
      await prisma.user.update({
        where: { id: (session.user as any).id },
        data: {
          balance: { increment: amount * 0.9 },
        },
      });
    } else if (oldStatus === "PAID" && status !== "PAID") {
      // Debited from owner
      await prisma.user.update({
        where: { id: (session.user as any).id },
        data: {
          balance: { decrement: amount * 0.9 },
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update invoice" }, { status: 500 });
  }
}
