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

import { getStripeClient } from "@/lib/stripe";

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

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#007AFF]" />
        <p className="text-[#6E6E73] font-semibold text-sm">Loading payment methods...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto pt-6 pb-24 px-4 space-y-8">

      {/* ── HEADER ── */}
      <div>
        <h1 className="text-3xl font-black text-[#1D1D1F] tracking-tight">Payment Methods</h1>
        <p className="text-[#6E6E73] text-sm mt-1">
          Save a card to pay rent faster — one click, no re-entry needed
        </p>
      </div>

      {/* ── SAVED CARD DISPLAY ── */}
      {savedCard && !showForm ? (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1D1D1F]">Saved Card</h2>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-full">DEFAULT</span>
          </div>

          {/* Card visual */}
          <div className="bg-gradient-to-br from-[#007AFF] to-[#0062CC] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-10 -translate-x-10" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-white/60 text-xs font-medium">PropertyPro</p>
                  <p className="text-white font-bold mt-0.5">Rent Card</p>
                </div>
                <CreditCard className="h-8 w-8 text-white/80" />
              </div>
              <p className="text-2xl font-mono font-bold tracking-widest">
                •••• •••• •••• {savedCard.cardLast4}
              </p>
              <div className="flex items-center justify-between mt-4">
                <p className="text-white/70 text-xs font-medium uppercase tracking-wide">{savedCard.cardBrand}</p>
                <CheckCircle2 className="h-5 w-5 text-white/80" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => { setShowForm(false); openSetupForm(); }}
              variant="outline"
              className="flex-1 h-11 rounded-xl border-[#E5E5EA] font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> Replace Card
            </Button>
            <Button
              onClick={handleRemoveCard}
              disabled={removingCard}
              variant="outline"
              className="flex-1 h-11 rounded-xl border-red-200 text-red-500 hover:bg-red-50 font-semibold text-sm flex items-center justify-center gap-2"
            >
              {removingCard ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remove Card
            </Button>
          </div>
        </div>
      ) : !showForm ? (
        /* ── NO CARD YET ── */
        <div className="bg-white border-2 border-dashed border-[#E5E5EA] rounded-2xl p-10 text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center mx-auto">
            <CreditCard className="h-8 w-8 text-[#007AFF]" />
          </div>
          <div>
            <p className="font-bold text-[#1D1D1F] text-lg">No saved card yet</p>
            <p className="text-[#6E6E73] text-sm mt-1">Save your card once and pay rent with a single click</p>
          </div>
          <Button
            onClick={openSetupForm}
            disabled={loadingSetup}
            className="bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold h-12 px-8 rounded-xl shadow-md text-sm flex items-center gap-2 mx-auto"
          >
            {loadingSetup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add a Payment Card
          </Button>
        </div>
      ) : null}

      {/* ── SETUP FORM ── */}
      {showForm && clientSecret && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-[#F1F5F9]">
            <div className="h-10 w-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-[#007AFF]" />
            </div>
            <div>
              <h2 className="font-bold text-[#1D1D1F]">Add New Card</h2>
              <p className="text-xs text-[#6E6E73]">Your card will be saved for future rent payments</p>
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
        <div className="bg-slate-50 border border-[#E5E5EA] rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-[#1D1D1F]">How saved cards work</h3>
          <div className="space-y-3">
            {[
              { step: "1", text: "Add your card securely using the form above" },
              { step: "2", text: "When paying rent, your saved card appears automatically" },
              { step: "3", text: "Pay with one click — no need to re-enter card details" },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-[#007AFF]/10 text-[#007AFF] text-xs font-black flex items-center justify-center shrink-0">
                  {item.step}
                </div>
                <p className="text-sm text-[#6E6E73] font-medium">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TRUST BADGE ── */}
      <div className="flex items-center gap-3 p-4 bg-white border border-[#E5E5EA] rounded-xl">
        <ShieldCheck className="h-5 w-5 text-[#007AFF] shrink-0" />
        <p className="text-xs text-[#6E6E73]">
          <span className="font-bold text-[#1D1D1F]">Secured by Stripe. </span>
          Your card details are encrypted and stored securely by Stripe. PropertyPro never has access to your full card number.
        </p>
      </div>

    </div>
  );
}
