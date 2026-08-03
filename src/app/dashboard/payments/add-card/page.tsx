"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Loader2,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Plus,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { getStripeClient } from "@/lib/stripe";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureBlockedOverlay } from "@/components/subscription/FeatureBlockedBanner";

const stripePromise = getStripeClient();

// Card brand icon helper
function CardBrandIcon({ brand }: { brand: string }) {
  const icons: Record<string, string> = {
    visa: "💳",
    mastercard: "💳",
    amex: "💳",
    discover: "💳",
  };
  const labels: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    discover: "Discover",
    card: "Card",
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl">{icons[brand] || "💳"}</span>
      <span className="font-bold text-[#1D1D1F] capitalize">{labels[brand] || brand}</span>
    </div>
  );
}

// ── Setup Form (inside Elements) ─────────────────────────────────────────────
function SetupForm({
  onSuccess,
  onCancel,
  email,
}: {
  onSuccess: (paymentMethodId: string) => void;
  onCancel: () => void;
  email?: string | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setErrorMsg(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErrorMsg(submitError.message || "Please check your card details.");
      setProcessing(false);
      return;
    }

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/payments/add-card?status=success`,
        payment_method_data: {
          billing_details: {
            email: email || "tenant@propertypro.app",
            address: {
              line1: "123 Main St",
              city: "New York",
              state: "NY",
              postal_code: "10001",
              country: "US",
            },
          },
        },
      },
    });

    if (error) {
      setErrorMsg(error.message || "Card setup failed. Please try again.");
      setProcessing(false);
      return;
    }

    if (setupIntent?.status === "succeeded" && setupIntent.payment_method) {
      onSuccess(setupIntent.payment_method as string);
    }

    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl overflow-hidden border border-[#E5E5EA] p-4 bg-white">
        <PaymentElement
          options={{
            layout: "tabs",
            fields: {
              billingDetails: {
                address: "never",
              },
            },
          }}
        />
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
        <Lock className="h-3.5 w-3.5" />
        <span>256-bit SSL encrypted · Powered by Stripe · We never store your card number</span>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 h-12 rounded-xl border-[#E5E5EA] font-semibold text-sm"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-[2] h-12 bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold rounded-xl shadow-md text-sm flex items-center justify-center gap-2"
        >
          {processing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving Card...</>
          ) : (
            <><Lock className="h-4 w-4" /> Save Card Securely</>
          )}
        </Button>
      </div>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AddCardPage() {
  const featureAccess = useFeatureAccess("add_card");
  const { data: session, status } = useSession();
  const router = useRouter();

  const [savedCard, setSavedCard] = useState<{ cardBrand: string; cardLast4: string; paymentMethodId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [removingCard, setRemovingCard] = useState(false);

  const fetchSavedCard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/saved-card");
      const data = await res.json();
      if (data.hasSavedCard) {
        setSavedCard({ cardBrand: data.cardBrand, cardLast4: data.cardLast4, paymentMethodId: data.paymentMethodId });
      } else {
        setSavedCard(null);
      }
    } catch {
      toast.error("Failed to load saved card info");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") { router.push("/auth/login"); return; }
    fetchSavedCard();
  }, [status, router, fetchSavedCard]);

  const openSetupForm = async () => {
    setLoadingSetup(true);
    try {
      const res = await fetch("/api/stripe/saved-card", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not initialize card setup");
      setClientSecret(data.clientSecret);
      setShowForm(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingSetup(false);
    }
  };

  const handleCardSaved = async (paymentMethodId: string, brand?: string, last4?: string) => {
    try {
      const res = await fetch("/api/stripe/saved-card", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId, brand, last4 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save card");
      toast.success(`✅ Card saved! ${data.cardBrand?.toUpperCase()} ending in ${data.cardLast4}`);
      setShowForm(false);
      setClientSecret(null);
      fetchSavedCard();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveCard = async () => {
    setRemovingCard(true);
    try {
      const res = await fetch("/api/stripe/saved-card", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove card");
      toast.success("Card removed successfully.");
      setSavedCard(null);
    } catch {
      toast.error("Could not remove card. Please try again.");
    } finally {
      setRemovingCard(false);
    }
  };

  const isBlocked = !featureAccess.allowed;

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#007AFF]" />
        <p className="text-[#6E6E73] font-semibold text-sm">Loading payment methods...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {isBlocked && (
        <FeatureBlockedOverlay
          featureLabel="Payment Method Storage & Cards"
          reason={featureAccess.reason}
          adminNote={featureAccess.adminNote}
          expiresAt={featureAccess.expiresAt}
        />
      )}
      <div className={isBlocked ? "pointer-events-none select-none blur-[2.5px] opacity-70" : ""}>
        <div className="w-full max-w-2xl mx-auto pt-6 pb-24 px-4 space-y-8">

          {/* ── HEADER & BREADCRUMB ── */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>Dashboard</span>
              <span>/</span>
              <span>Payments</span>
              <span>/</span>
              <span className="text-slate-900">Payment Methods</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Payment Methods</h1>
            <p className="text-slate-500 text-xs sm:text-sm font-medium">
              Save a credit or debit card for 1-click rent checkouts and automated Auto-Pay.
            </p>
          </div>

          {/* ── SAVED CARD DISPLAY WITH FRAMER MOTION NEON GLOW ── */}
          {savedCard && !showForm ? (
            <div className="bg-white border border-slate-200/80 rounded-[28px] shadow-xs p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Default Payment Method</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Used for instant 1-click checkout</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Default Card
                </span>
              </div>

              {/* Framer Motion Animated Card with Glowing Neon Gradient Border */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative rounded-[26px] p-7 text-white overflow-hidden bg-slate-950 border border-slate-800 shadow-[0_15px_40px_rgba(0,0,0,0.35)] group"
              >
                {/* Animated Neon Glow Border Accent */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-[27px] opacity-35 blur-md group-hover:opacity-75 transition-opacity duration-500 pointer-events-none" />

                {/* Glowing Mesh Flare Orbs */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

                <div className="relative z-10 space-y-6">
                  {/* Top Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px] font-extrabold uppercase tracking-widest">PropertyPro</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      </div>
                      <p className="text-white font-black text-lg tracking-tight mt-0.5">Rent Payment Card</p>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                  </div>

                  {/* Metallic Chip Simulation & Contactless Indicator */}
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-500 shadow-md border border-amber-400/40 relative overflow-hidden flex flex-col justify-around p-1">
                      <div className="w-full h-px bg-amber-600/40" />
                      <div className="w-full h-px bg-amber-600/40" />
                      <div className="w-full h-px bg-amber-600/40" />
                    </div>
                    <span className="text-xs font-mono font-bold tracking-widest text-slate-300">)))</span>
                  </div>

                  {/* Card Number */}
                  <div className="pt-1">
                    <p className="text-2xl sm:text-3xl font-mono font-extrabold tracking-widest text-white drop-shadow-md">
                      •••• •••• •••• {savedCard.cardLast4}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Card Brand</span>
                      <span className="text-xs font-black uppercase text-white tracking-wider">{savedCard.cardBrand || "Visa"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 rounded-full backdrop-blur-sm">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Verified &amp; Active</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => { setShowForm(false); openSetupForm(); }}
                  className="flex-1 h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Replace Card
                </Button>
                <Button
                  onClick={handleRemoveCard}
                  disabled={removingCard}
                  variant="outline"
                  className="flex-1 h-12 rounded-2xl border border-slate-200 hover:border-rose-200 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {removingCard ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Remove Card
                </Button>
              </div>
            </div>
          ) : !showForm ? (
            /* ── NO CARD YET ── */
            <div className="bg-white border border-slate-200/80 rounded-[28px] p-10 text-center space-y-5 shadow-xs">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-700">
                <CreditCard className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="font-black text-slate-900 text-xl tracking-tight">No saved card on file</p>
                <p className="text-slate-500 text-xs sm:text-sm max-w-sm mx-auto font-medium">Save your card once to enjoy 1-click rent payments and automated receipts.</p>
              </div>
              <Button
                onClick={openSetupForm}
                disabled={loadingSetup}
                className="bg-slate-900 hover:bg-[#007AFF] text-white font-extrabold h-12 px-8 rounded-2xl shadow-md text-xs uppercase tracking-wider flex items-center gap-2 mx-auto transition-all hover:scale-102 active:scale-98"
              >
                {loadingSetup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add a Payment Card
              </Button>
            </div>
          ) : null}

          {/* ── SETUP FORM ── */}
          {showForm && clientSecret && (
            <div className="bg-white border border-slate-200/80 rounded-[28px] shadow-sm p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="h-5 w-5 text-indigo-300" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-lg">Add New Card</h2>
                  <p className="text-xs text-slate-500 font-medium">Your card will be saved for future rent payments</p>
                </div>
              </div>

              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "#007AFF",
                      borderRadius: "12px",
                      fontFamily: "Inter, system-ui, sans-serif",
                    },
                  },
                }}
              >
                <SetupForm
                  onSuccess={handleCardSaved}
                  onCancel={() => { setShowForm(false); setClientSecret(null); }}
                  email={session?.user?.email}
                />
              </Elements>
            </div>
          )}

          {/* ── HOW IT WORKS ── */}
          {!showForm && (
            <div className="bg-slate-50/60 border border-slate-200/70 rounded-[24px] p-6 space-y-4">
              <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase tracking-wider text-slate-400">How Saved Cards Work</h3>
              <div className="space-y-3">
                {[
                  { step: "1", text: "Add your card securely via encrypted 256-Bit Stripe gateway" },
                  { step: "2", text: "When paying rent, your saved card appears automatically" },
                  { step: "3", text: "Pay with one click — no manual re-entry required" },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                      {item.step}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 font-semibold">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TRUST BADGE ── */}
          <div className="flex items-center gap-3.5 p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
            <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0" />
            <p className="text-xs text-slate-500 font-medium">
              <span className="font-extrabold text-slate-900">Secured by Stripe. </span>
              Your card details are encrypted end-to-end. PropertyPro never stores full card numbers.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
