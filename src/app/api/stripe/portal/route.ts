import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-04-10" as any,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      // Create a Stripe customer on the fly so they can access the portal
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/dashboard/owner`,
      });
      return NextResponse.json({ url: portalSession.url });
    } catch (stripeErr: any) {
      // Auto-heal if the developer swapped API keys and the customer no longer exists in Stripe
      if (stripeErr.message?.includes("No such customer")) {
        const newCustomer = await stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          metadata: { userId: user.id },
        });
        
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: newCustomer.id, stripeSubscriptionId: null, subscriptionStatus: "Inactive" },
        });

        const newPortalSession = await stripe.billingPortal.sessions.create({
          customer: newCustomer.id,
          return_url: `${origin}/dashboard/owner`,
        });
        return NextResponse.json({ url: newPortalSession.url });
      }
      throw stripeErr;
    }
  } catch (error: any) {
    console.error("Stripe Portal Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create portal session." },
      { status: 500 }
    );
  }
}
