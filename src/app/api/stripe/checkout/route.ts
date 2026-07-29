import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-04-10" as any,
});

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, leaseId, successUrl, cancelUrl } = await req.json();

    if (!invoiceId && !leaseId) {
      return NextResponse.json({ error: "Missing invoiceId or leaseId" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (leaseId) {
      const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: {
          unit: {
            include: {
              property: true,
            },
          },
        },
      });

      if (!lease) {
        return NextResponse.json({ error: "Lease not found" }, { status: 404 });
      }

      const amount = Number(lease.securityDeposit || lease.monthlyRent || 0);
      const success_url = successUrl || `${appUrl}/dashboard/leases/my-leases?status=success`;
      const cancel_url = cancelUrl || `${appUrl}/dashboard/leases/my-leases?status=cancelled`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Security Deposit (Bond) - ${lease.unit.property.name} (${lease.unit.name})`,
                description: `Security deposit for lease contract starting ${new Date(lease.startDate).toLocaleDateString()}`,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        metadata: {
          leaseId: lease.id,
          category: "DEPOSIT",
          tenantId: lease.tenantId,
        },
        success_url: success_url,
        cancel_url: cancel_url,
      });

      return NextResponse.json({ url: session.url });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
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

    const success_url = successUrl || `${appUrl}/dashboard/payments/pay-rent?status=success&invoiceId=${invoice.id}`;
    const cancel_url = cancelUrl || `${appUrl}/dashboard/payments/pay-rent?status=cancelled`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Rent - ${invoice.lease.unit.property.name} (${invoice.lease.unit.name})`,
              description: `Rent payment due on ${new Date(invoice.dueDate).toLocaleDateString()}`,
            },
            unit_amount: Math.round(Number(invoice.amount) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        invoiceId: invoice.id,
        tenantId: invoice.lease.tenantId,
      },
      success_url: success_url,
      cancel_url: cancel_url,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout session error:", error);
    return NextResponse.json({ error: error.message || "Failed to create session" }, { status: 500 });
  }
}
