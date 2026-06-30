import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { invoiceId } = await req.json();

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
      return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });
    }

    const amountInCents = Math.round(Number(invoice.amount) * 100);

    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe not initialized");

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      metadata: {
        invoiceId: invoice.id,
        tenantId: (session.user as any).id,
        property: invoice.lease.unit.property.name,
        unit: invoice.lease.unit.name,
      },
      description: `Rent - ${invoice.lease.unit.property.name} (${invoice.lease.unit.name})`,
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: amountInCents,
      invoiceId: invoice.id,
      propertyName: invoice.lease.unit.property.name,
      unitName: invoice.lease.unit.name,
      dueDate: invoice.dueDate,
    });
  } catch (error: any) {
    console.error("Payment Intent error:", error);
    return NextResponse.json({ error: error.message || "Failed to create payment intent" }, { status: 500 });
  }
}
