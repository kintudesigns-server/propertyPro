import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

// Called by the frontend AFTER Stripe confirms the payment successfully
// This immediately marks the invoice as paid without waiting for webhook
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { invoiceId, paymentIntentId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lease: {
          include: {
            unit: { include: { property: true } },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "PAID") {
      return NextResponse.json({ success: true, alreadyPaid: true });
    }

    // Mark invoice as PAID
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "PAID", paymentMethod: "STRIPE" },
    });

    // Credit owner balance
    const ownerId = invoice.lease.unit.property.ownerId;
    const amount = Number(invoice.amount);

    await prisma.user.update({
      where: { id: ownerId },
      data: { balance: { increment: amount } },
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        category: "RENT",
        amount: invoice.amount,
        reference: `STRIPE_${paymentIntentId?.slice(-12) || "MANUAL"}`,
        status: "COMPLETED",
        tenantId: invoice.lease.tenantId,
      },
    });

    // Fire automatic notifications
    const unitLabel = invoice.lease.unit.name
      ? `Unit ${invoice.lease.unit.name}`
      : "your unit";
    const propertyName = invoice.lease.unit.property.name || "the property";

    await notify({
      userId: invoice.lease.tenantId,
      title: "Payment Confirmed",
      message: `Your rent payment of $${amount.toFixed(2)} for ${unitLabel} at ${propertyName} has been successfully processed.`,
      type: "PAYMENT",
      priority: "LOW",
      relatedEntityId: invoiceId,
    });

    await notify({
      userId: ownerId,
      title: "Rent Payment Received",
      message: `A rent payment of $${amount.toFixed(2)} for ${unitLabel} at ${propertyName} has been received from your tenant.`,
      type: "PAYMENT",
      priority: "MEDIUM",
      relatedEntityId: invoiceId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Confirm payment error:", error);
    return NextResponse.json({ error: error.message || "Failed to confirm payment" }, { status: 500 });
  }
}
