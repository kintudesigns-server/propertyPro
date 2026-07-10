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

  // Pagination params — defaults to page 1, 50 per page
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;
  const statusFilter = searchParams.get("status"); // Optional filter

  try {
    let whereClause: any = {};

    if (role === "OWNER") {
      whereClause = { lease: { unit: { property: { ownerId: userId } } } };
    } else if (role === "TENANT") {
      whereClause = { lease: { tenantId: userId } };
    } else if (role !== "SUPERADMIN") {
      return NextResponse.json([]);
    }

    // Apply optional status filter
    if (statusFilter && statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }

    const [invoices, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where: whereClause,
        include: { lease: { include: { tenant: true, unit: { include: { property: true } } } } },
        orderBy: { dueDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where: whereClause }),
    ]);

    return NextResponse.json(invoices, {
      headers: {
        "X-Total-Count": total.toString(),
        "X-Page": page.toString(),
        "X-Limit": limit.toString(),
        "X-Total-Pages": Math.ceil(total / limit).toString(),
      },
    });
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
        invoiceType: "FEE",
      },
    });

    // If created as PAID, increment owner balance using platform settings fee
    if (invoice.status === "PAID") {
      const settings = await prisma.platformSettings.findFirst();
      const adminFeePercent = settings ? Number(settings.adminFeePercent) : 2.0;
      const netToOwner = Number(amount) * (1 - adminFeePercent / 100);
      await prisma.user.update({
        where: { id: (session.user as any).id },
        data: { balance: { increment: netToOwner } },
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

    // FIX #9 — Require payment method for an auditable ledger
    if (status === "PAID" && !paymentMethod) {
      return NextResponse.json(
        { error: "A payment method (e.g. STRIPE, CASH, BANK_TRANSFER) is required when marking an invoice as Paid." },
        { status: 400 }
      );
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

    // Balance update logic — use real platform fee, not hardcoded 10%
    if (oldStatus !== "PAID" && status === "PAID") {
      const settings = await prisma.platformSettings.findFirst();
      const adminFeePercent = settings ? Number(settings.adminFeePercent) : 2.0;
      const netToOwner = amount * (1 - adminFeePercent / 100);
      // Credited to owner
      await prisma.user.update({
        where: { id: (session.user as any).id },
        data: { balance: { increment: netToOwner } },
      });
      // Update invoice with fee details
      await prisma.invoice.update({
        where: { id },
        data: {
          adminFee: amount * (adminFeePercent / 100),
          netToOwner,
          grossPaid: amount,
        },
      });
    } else if (oldStatus === "PAID" && status !== "PAID") {
      const settings = await prisma.platformSettings.findFirst();
      const adminFeePercent = settings ? Number(settings.adminFeePercent) : 2.0;
      const netToOwner = amount * (1 - adminFeePercent / 100);
      // Debited from owner on reversal
      await prisma.user.update({
        where: { id: (session.user as any).id },
        data: { balance: { decrement: netToOwner } },
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update invoice" }, { status: 500 });
  }
}
