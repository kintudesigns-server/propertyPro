import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
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

    // Fetch fee metadata from Stripe to ensure security
    let processingFee = 0;
    let adminFee = 0;
    let netToOwner = Number(invoice.amount);
    let grossPaid = Number(invoice.amount);
    let category = "RENT";

    if (paymentIntentId) {
      const stripe = getStripe();
      if (stripe) {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (pi.metadata) {
          if (pi.metadata.processingFee) processingFee = Number(pi.metadata.processingFee);
          if (pi.metadata.adminFee) adminFee = Number(pi.metadata.adminFee);
          if (pi.metadata.netToOwner) netToOwner = Number(pi.metadata.netToOwner);
          if (pi.metadata.grossPaid) grossPaid = Number(pi.metadata.grossPaid);
          if (pi.metadata.category) category = pi.metadata.category;
        }
      }
    }

    // Mark invoice as PAID with financial tracking
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { 
        status: "PAID", 
        paymentMethod: "STRIPE",
        processingFee: processingFee,
        adminFee: adminFee,
        netToOwner: netToOwner,
        grossPaid: grossPaid
      },
    });

    // Credit owner balance strictly with netToOwner (after platform admin fee)
    const ownerId = invoice.lease.unit.property.ownerId;
    
    await prisma.user.update({
      where: { id: ownerId },
      data: { balance: { increment: netToOwner } },
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        category: category,
        amount: netToOwner, // Only the net amount hits the property ledger for the owner
        reference: `STRIPE_${paymentIntentId?.slice(-12) || "MANUAL"}`,
        status: "COMPLETED",
        tenantId: invoice.lease.tenantId,
        invoiceId: invoiceId,
        feeDeducted: adminFee,
      },
    });

    // Fire automatic notifications
    const unitLabel = invoice.lease.unit.name
      ? `Unit ${invoice.lease.unit.name}`
      : "your unit";
    const propertyName = invoice.lease.unit.property.name || "the property";
    const baseRentAmount = Number(invoice.amount);

    await notify({
      userId: invoice.lease.tenantId,
      title: "Payment Confirmed",
      message: `Your rent payment of $${grossPaid.toFixed(2)} (including fees) for ${unitLabel} at ${propertyName} has been successfully processed.`,
      type: "PAYMENT",
      priority: "LOW",
      relatedEntityId: invoiceId,
    });

    await notify({
      userId: ownerId,
      title: "Rent Payment Received",
      message: `A rent payment has been received for ${unitLabel} at ${propertyName}. Net earnings: $${netToOwner.toFixed(2)}.`,
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
