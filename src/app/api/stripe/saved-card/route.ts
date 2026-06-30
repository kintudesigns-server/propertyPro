import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

// GET: Fetch the saved card for the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  if (!userId) return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, defaultPaymentMethodId: true, cardBrand: true, cardLast4: true },
  });

  return NextResponse.json({
    hasSavedCard: !!(user?.defaultPaymentMethodId),
    cardBrand: user?.cardBrand || null,
    cardLast4: user?.cardLast4 || null,
    paymentMethodId: user?.defaultPaymentMethodId || null,
  });
}

// POST: Create a SetupIntent so the frontend can collect and save a card
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  if (!userId) return NextResponse.json({ error: "Session expired. Please sign out and sign in again." }, { status: 401 });

  const userEmail = session.user.email!;
  const userName = session.user.name || userEmail;

  try {
    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe not initialized");

    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    // Create Stripe Customer if not exists
    let customerId = user?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: { userId },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
    });

    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (error: any) {
    console.error("SetupIntent error:", error);
    return NextResponse.json({ error: error.message || "Failed to create setup intent" }, { status: 500 });
  }
}

// PUT: Save confirmed payment method after SetupIntent succeeds
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  try {
    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) return NextResponse.json({ error: "Missing paymentMethodId" }, { status: 400 });

    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe not initialized");

    // Fetch payment method details from Stripe
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    const cardBrand = pm.card?.brand || "card";
    const cardLast4 = pm.card?.last4 || "????";

    // Get the customer, set default payment method on Stripe Customer
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } });
    if (user?.stripeCustomerId) {
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    // Save to our database
    await prisma.user.update({
      where: { id: userId },
      data: { defaultPaymentMethodId: paymentMethodId, cardBrand, cardLast4 },
    });

    return NextResponse.json({ success: true, cardBrand, cardLast4 });
  } catch (error: any) {
    console.error("Save card error:", error);
    return NextResponse.json({ error: error.message || "Failed to save card" }, { status: 500 });
  }
}

// DELETE: Remove saved card
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  await prisma.user.update({
    where: { id: userId },
    data: { defaultPaymentMethodId: null, cardBrand: null, cardLast4: null },
  });
  return NextResponse.json({ success: true });
}
