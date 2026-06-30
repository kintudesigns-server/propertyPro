import Stripe from "stripe";
import { loadStripe, Stripe as StripeClient } from "@stripe/stripe-js";

let stripeInstance: Stripe | null = null;

export function getStripe() {
  if (stripeInstance) return stripeInstance;

  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }

  stripeInstance = new Stripe(key, {
    apiVersion: "2024-12-18.acacia" as any,
    typescript: true,
  });

  const mode = key.startsWith("sk_live_") ? "LIVE" : "TEST";
  console.log(`[Stripe] ✅ Initialized successfully in ${mode} mode`);
  return stripeInstance;
}

export function isStripeConfigured() {
  return true;
}

export function getStripePublishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
}

let stripeClientPromise: Promise<StripeClient | null> | null = null;

export function getStripeClient() {
  if (typeof window === "undefined") return null;

  if (!stripeClientPromise) {
    const pk = getStripePublishableKey();
    if (pk && pk.startsWith("pk_") && pk.length > 20) {
      stripeClientPromise = loadStripe(pk);
    }
  }
  return stripeClientPromise;
}
