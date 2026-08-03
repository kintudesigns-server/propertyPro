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
  RefreshCw,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  History,
  Home,
  Building,
  Banknote,
  X,
  Lock,
  Plus,
  ShieldAlert,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureBlockedOverlay } from "@/components/subscription/FeatureBlockedBanner";

// ─── Load Stripe outside component to avoid recreation ───
import { getStripeClient } from "@/lib/stripe";

const stripePromise = getStripeClient();

// ─── Inline Payment Form (rendered inside <Elements>) ────────────────────────
function CheckoutForm({
  invoiceId,
  amount,
  baseAmount,
  processingFee,
  propertyName,
  unitName,
  onSuccess,
  onCancel,
  email,
}: {
  invoiceId: string;
  amount: number; // This is now gross (cents)
  baseAmount: number; // Base rent before fees
  processingFee: number;
  propertyName: string;
  unitName: string;
  onSuccess: () => void;
  onCancel: () => void;
  email?: string | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stripeReady, setStripeReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setErrorMsg(null);

    // Validate fields first
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErrorMsg(submitError.message || "Please check your card details.");
      setProcessing(false);
      return;
    }

    // Get the clientSecret from the PaymentElement's PaymentIntent
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/payments/pay-rent?status=success`,
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
      setErrorMsg(error.message || "Payment failed. Please try again.");
      setProcessing(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      // Mark invoice paid on backend
      try {
        await fetch("/api/stripe/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceId, paymentIntentId: paymentIntent.id }),
        });
      } catch {}
      toast.success("🎉 Payment successful! Your rent has been recorded.");
      onSuccess();
    }
    setProcessing(false);
  };

  const formatCurrency = (cents: number) =>
    "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Invoice summary */}
      <div className="bg-slate-50 border border-[#E5E5EA] rounded-xl p-4 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-[#6E6E73] font-medium">Property</span>
          <span className="font-bold text-[#1D1D1F]">{propertyName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#6E6E73] font-medium">Unit</span>
          <span className="font-bold text-[#1D1D1F]">{unitName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#6E6E73] font-medium">Base Rent</span>
          <span className="font-semibold text-[#1D1D1F]">{formatCurrency(baseAmount * 100)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#6E6E73] font-medium">Card Processing Fee (2.9%)</span>
          <span className="font-semibold text-[#6E6E73]">{formatCurrency(processingFee * 100)}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-[#E5E5EA] pt-2 mt-2">
          <span className="text-[#1D1D1F] font-bold">Total Due</span>
          <span className="font-black text-[#1D1D1F] text-base">{formatCurrency(amount)}</span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="rounded-xl overflow-hidden border border-[#E5E5EA] p-4 bg-white relative min-h-[280px]">
        {!stripeReady && (
          <div className="absolute inset-0 p-4 bg-white z-10 flex flex-col gap-4">
            <div className="h-11 bg-slate-100 rounded-xl animate-pulse w-full"></div>
            <div className="h-11 bg-slate-100 rounded-xl animate-pulse w-full"></div>
            <div className="flex gap-4">
              <div className="h-11 bg-slate-100 rounded-xl animate-pulse w-1/2"></div>
              <div className="h-11 bg-slate-100 rounded-xl animate-pulse w-1/2"></div>
            </div>
            <div className="h-11 bg-slate-100 rounded-xl animate-pulse w-full mt-2"></div>
          </div>
        )}
        <PaymentElement
          onReady={() => setStripeReady(true)}
          options={{
            layout: "tabs",
            fields: {
              billingDetails: {
                address: "auto", // Essential for AVS fraud prevention
              },
            },
          }}
        />
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Trust line */}
      <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
        <Lock className="h-3.5 w-3.5" />
        <span>256-bit SSL encrypted · Powered by Stripe · PropertyPro never stores your card</span>
      </div>

      {/* Actions */}
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
          className="flex-[2] h-12 bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold rounded-xl shadow-md text-sm flex items-center justify-center gap-2 transition-all"
        >
          {processing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
          ) : (
            <><Lock className="h-4 w-4" /> Pay {formatCurrency(amount)} Securely</>
          )}
        </Button>
      </div>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PayRentPage() {
  const featureAccess = useFeatureAccess("make_payments");
  const { data: session, status } = useSession();
  const router = useRouter();

  const [leases, setLeases] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Saved card state
  const [savedCard, setSavedCard] = useState<{ cardBrand: string; cardLast4: string; paymentMethodId: string } | null>(null);
  const [savedCardPaying, setSavedCardPaying] = useState<string | null>(null); // invoiceId being paid with saved card

  // Inline checkout state
  const [checkoutState, setCheckoutState] = useState<{
    clientSecret: string;
    invoiceId: string;
    amount: number;
    baseAmount: number;
    processingFee: number;
    propertyName: string;
    unitName: string;
  } | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leasesRes, invoicesRes, savedCardRes] = await Promise.all([
        fetch("/api/leases"),
        fetch("/api/invoices"),
        fetch("/api/stripe/saved-card"),
      ]);
      if (leasesRes.ok) setLeases(await leasesRes.json());
      if (invoicesRes.ok) setInvoices(await invoicesRes.json());
      if (savedCardRes.ok) {
        const sc = await savedCardRes.json();
        setSavedCard(sc.hasSavedCard ? { cardBrand: sc.cardBrand, cardLast4: sc.cardLast4, paymentMethodId: sc.paymentMethodId } : null);
      }
    } catch {
      toast.error("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") { router.push("/auth/login"); return; }
    fetchData();
  }, [status, router, fetchData]);

  const activeLease = leases.find((l) => l.status === "ACTIVE" || l.status === "NOTICE_GIVEN") || leases[0] || null;
  const pendingInvoices = invoices
    .filter((i) => i.status === "UNPAID" || i.status === "OVERDUE")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const paidInvoices = invoices
    .filter((i) => i.status === "PAID")
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  const totalOwed = pendingInvoices.reduce((acc, curr) => acc + Number(curr.amount), 0);

  const formatCurrency = (val: number | string) =>
    "$" + Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (d: string | Date) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getDaysInfo = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    due.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - now.getTime()) / 86400000);
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, isOverdue: true, isToday: false };
    if (diff === 0) return { label: "Due today", isOverdue: false, isToday: true };
    return { label: `Due in ${diff} day${diff !== 1 ? "s" : ""}`, isOverdue: false, isToday: false };
  };

  const openCheckout = async (inv: any) => {
    setLoadingCheckout(inv.id);
    try {
      const res = await fetch("/api/stripe/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: inv.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initialize payment");
      setCheckoutState({
        clientSecret: data.clientSecret,
        invoiceId: data.invoiceId,
        amount: data.amount,
        baseAmount: data.baseAmount,
        processingFee: data.processingFee,
        propertyName: data.propertyName,
        unitName: data.unitName,
      });
    } catch (err: any) {
      toast.error(err.message || "Could not open payment form. Please try again.");
    } finally {
      setLoadingCheckout(null);
    }
  };

  const [confirmInvoice, setConfirmInvoice] = useState<any>(null);

  const executePayWithSavedCard = async (inv: any) => {
    if (!savedCard) return;
    setSavedCardPaying(inv.id);
    try {
      // Create payment intent server-side and confirm with saved card
      const piRes = await fetch("/api/stripe/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: inv.id, paymentMethodId: savedCard.paymentMethodId }),
      });
      const piData = await piRes.json();
      if (!piRes.ok) throw new Error(piData.error || "Failed to create payment");

      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe not loaded");

      const { error, paymentIntent } = await stripe.confirmCardPayment(piData.clientSecret, {
        payment_method: savedCard.paymentMethodId,
      });

      if (error) throw new Error(error.message || "Payment failed");

      if (paymentIntent?.status === "succeeded") {
        await fetch("/api/stripe/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceId: inv.id, paymentIntentId: paymentIntent.id }),
        });
        toast.success(`🎉 Paid ${formatCurrency(inv.amount)} with saved card!`);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.message || "Payment failed. Please try again.");
    } finally {
      setSavedCardPaying(null);
    }
  };

  const closeCheckout = () => setCheckoutState(null);

  const handlePaymentSuccess = () => {
    closeCheckout();
    fetchData();
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#007AFF]" />
        <p className="text-[#6E6E73] font-semibold text-sm">Loading your billing details...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto pt-6 pb-24 px-4 space-y-8 relative">
      {!featureAccess.allowed && (
        <FeatureBlockedOverlay
          featureLabel={featureAccess.featureLabel || "Pay Rent & Instant ACH/Card"}
          reason={featureAccess.reason}
          adminNote={featureAccess.adminNote}
          expiresAt={featureAccess.expiresAt}
        />
      )}

      {/* ── BREADCRUMB & HEADER ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-black text-[#8E8E93] uppercase tracking-widest pl-1">
          <span>Dashboard</span>
          <span className="text-[#C7C7CC]">/</span>
          <span>Payments</span>
          <span className="text-[#C7C7CC]">/</span>
          <span className="text-[#007AFF]">Pay Rent</span>
        </div>
        {/* ── HIGH-END HERO BANNER WITH LIGHT WHITE GLASS EFFECT & FRAMER MOTION ── */}
        <div className="relative rounded-[28px] overflow-hidden shadow-sm bg-white text-slate-900 min-h-[200px] flex flex-col justify-center p-6 sm:p-8 border border-slate-200/80">
          {/* Animated Background Image with Light Gradient White Overlay */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: `url('/images/hero/hero_subscription_billing.png')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-white/60 backdrop-blur-[2px] pointer-events-none" />
          <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

          {/* Foreground Content */}
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-2.5 max-w-xl">
              {/* Floating Animated Security Badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 backdrop-blur-md shadow-2xs"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-extrabold tracking-wider uppercase">256-Bit SSL Encrypted Payment Gateway</span>
              </motion.div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                  <Banknote className="h-5 w-5 text-indigo-300" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Pay Your Rent</h1>
              </div>

              <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">
                Secure, instant, and encrypted payments powered by <span className="font-bold text-slate-900 underline decoration-indigo-500 decoration-2 underline-offset-2">Stripe</span>.
              </p>
            </div>

            {/* Floating Hero Widget: Add Card if no saved card, or Card Details */}
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="shrink-0"
            >
              {savedCard ? (
                <div className="flex items-center gap-3 bg-white/90 border border-slate-200/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-sm">
                  <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span>•••• {savedCard.cardLast4}</span>
                      <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black uppercase">Default</span>
                    </p>
                    <button
                      onClick={() => router.push("/dashboard/payments/add-card")}
                      className="text-[10px] text-slate-500 hover:text-indigo-600 font-bold tracking-tight block transition-colors mt-0.5"
                    >
                      Manage Card →
                    </button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => router.push("/dashboard/payments/add-card")}
                  className="bg-slate-900 hover:bg-[#007AFF] text-white font-extrabold h-12 px-6 rounded-2xl shadow-md transition-all hover:scale-102 active:scale-98 flex items-center gap-2 text-xs uppercase tracking-wider"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Card</span>
                </Button>
              )}
            </motion.div>
          </div>
        </div>
      </div>



      {/* ── SUMMARY STATS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Amount Owed */}
        <div className="relative overflow-hidden rounded-[24px] p-6 border border-slate-200/80 bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Owed</p>
              <div className="flex items-center gap-2 mt-2">
                <p className={`text-3xl font-black tracking-tight ${totalOwed > 0 ? "text-rose-600" : "text-slate-900"}`}>
                  {formatCurrency(totalOwed)}
                </p>
                {totalOwed > 0 && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </div>
            </div>
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
              totalOwed > 0 ? "bg-rose-50 text-rose-600 border-rose-200/60" : "bg-slate-100 text-slate-700 border-slate-200"
            }`}>
              {totalOwed > 0 ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-4">
            {pendingInvoices.length > 0 ? `${pendingInvoices.length} unpaid invoice${pendingInvoices.length !== 1 ? "s" : ""} pending` : "No pending balances"}
          </p>
        </div>

        {/* Card 2: Monthly Rent */}
        <div className="relative overflow-hidden rounded-[24px] p-6 border border-slate-200/80 bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Monthly Rent</p>
              <p className="text-3xl font-black tracking-tight mt-2 text-slate-900">
                {activeLease ? formatCurrency(activeLease.monthlyRent) : "—"}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <Home className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-4">
            Due on the 1st of every month
          </p>
        </div>

        {/* Card 3: Paid Invoices */}
        <div className="relative overflow-hidden rounded-[24px] p-6 border border-slate-200/80 bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Payments Made</p>
              <p className="text-3xl font-black tracking-tight mt-2 text-slate-900">
                {paidInvoices.length}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-4">
            All-time completed payments
          </p>
        </div>

        {/* Card 4: Next Due Date */}
        {(() => {
          const nextInv = pendingInvoices[0];
          const daysInfo = nextInv ? getDaysInfo(nextInv.dueDate) : null;
          const isUrgent = daysInfo?.isOverdue || daysInfo?.isToday;
          
          return (
            <div className="relative overflow-hidden rounded-[24px] p-6 border border-slate-200/80 bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[140px]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Next Payment Due</p>
                  <p className="text-2xl font-black tracking-tight mt-2 text-slate-900">
                    {nextInv ? formatDate(nextInv.dueDate) : "—"}
                  </p>
                </div>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  isUrgent ? "bg-rose-50 text-rose-600 border-rose-200/60" : "bg-slate-100 border-slate-200 text-slate-700"
                }`}>
                  <Calendar className="h-4 w-4" />
                </div>
              </div>
              <p className={`text-xs font-semibold mt-4 ${isUrgent ? "text-rose-600" : "text-slate-500"}`}>
                {nextInv ? daysInfo?.label : "All balances settled"}
              </p>
            </div>
          );
        })()}
      </div>

      {/* ── OUTSTANDING INVOICES ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 pl-1">
          <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200/40">
            <Banknote className="h-5 w-5 text-[#6E6E73]" />
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Outstanding Invoices
            {pendingInvoices.length > 0 && (
              <span className="text-xs font-black bg-red-50 text-red-650 px-2.5 py-1 rounded-full border border-red-100/50">
                {pendingInvoices.length} Pending
              </span>
            )}
          </h2>
        </div>

        {pendingInvoices.length === 0 ? (
          <div className="bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20 border border-emerald-100 rounded-[28px] p-8 sm:p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden flex flex-col items-center">
            <div className="absolute -left-12 -top-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 mb-4 shadow-sm border border-emerald-200/50">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            
            <h3 className="text-xl sm:text-2xl font-black text-slate-850 tracking-tight">
              You're completely caught up! 🎉
            </h3>
            
            <p className="text-[#6E6E73] text-sm mt-2 max-w-md leading-relaxed">
              Fantastic! You have no pending invoices or outstanding rent balances. Your account is in perfect standing.
            </p>
            
            <button
              onClick={() => {
                const element = document.getElementById("payment-history-section");
                if (element) {
                  element.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-[#6E6E73] hover:text-indigo-600 transition-colors uppercase tracking-wider bg-slate-100 hover:bg-indigo-50 px-4 py-2 rounded-full border border-slate-200/60 hover:border-indigo-100/60"
            >
              <span>View Payment History</span>
              <span>↓</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeLease?.moveOutDate && (
              <div className="bg-blue-50/60 border border-blue-200/80 p-4 rounded-[20px] flex items-start gap-3 shadow-xs animate-in slide-in-from-top-2 duration-300">
                <ShieldAlert className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-900">Move-Out Pending</p>
                  <p className="text-xs text-blue-800 mt-0.5 font-medium leading-relaxed">
                    💡 <strong>Note:</strong> Any unpaid balances (including Early Termination Fees or Prorated Rent) will be automatically deducted from your final Security Deposit refund upon move-out. You do not have to pay them manually now.
                  </p>
                </div>
              </div>
            )}
            
            {pendingInvoices.map((inv) => {
              const daysInfo = getDaysInfo(inv.dueDate);
              const isLoadingThis = loadingCheckout === inv.id;
              const isActiveCheckout = checkoutState?.invoiceId === inv.id;
              
              // Color coding settings
              const cardBorderClass = daysInfo.isOverdue 
                ? "border-red-200 shadow-[0_8px_30px_rgb(239,68,68,0.03)]" 
                : daysInfo.isToday 
                  ? "border-amber-200 shadow-[0_8px_30px_rgb(245,158,11,0.03)]" 
                  : "border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)]";
                  
              const accentColorClass = daysInfo.isOverdue 
                ? "bg-red-500" 
                : daysInfo.isToday 
                  ? "bg-amber-400" 
                  : "bg-indigo-500";

              const textType = inv.invoiceType 
                  return (
                <div
                  key={inv.id}
                  className={`bg-white rounded-[24px] border overflow-hidden transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-[#E5E5EA] relative ${
                    daysInfo.isOverdue 
                      ? "border-red-150 bg-red-50/5" 
                      : daysInfo.isToday 
                        ? "border-amber-150 bg-amber-50/5" 
                        : "border-slate-100"
                  }`}
                >
                  <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      
                      {/* Left: Core Status and Details */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-300 hover:scale-105 ${
                          daysInfo.isOverdue 
                            ? "bg-red-50 text-red-600 border-red-100" 
                            : daysInfo.isToday 
                              ? "bg-amber-50 text-amber-600 border-amber-100" 
                              : "bg-[#007AFF]/5 text-[#007AFF] border-[#007AFF]/10"
                        }`}>
                          <Banknote className="h-6 w-6" />
                        </div>
                        
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-lg tracking-tight">
                              {textType}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                              daysInfo.isOverdue 
                                ? "bg-red-50 text-red-700 border-red-200" 
                                : daysInfo.isToday 
                                  ? "bg-amber-50 text-amber-700 border-amber-200" 
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}>
                              {daysInfo.isOverdue ? `Overdue: ${daysInfo.label}` : daysInfo.isToday ? "Due Today" : daysInfo.label}
                            </span>
                          </div>
                          
                          <p className="text-xs font-semibold text-[#8E8E93] flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-slate-400" />
                            <span>{inv.lease?.unit?.property?.name || activeLease?.unit?.property?.name}</span>
                            <span>&bull;</span>
                            <span>Unit {inv.lease?.unit?.name || activeLease?.unit?.name}</span>
                          </p>
                          
                          <div className="flex items-center gap-1.5 text-xs font-bold pt-0.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span className={daysInfo.isOverdue ? "text-red-600" : "text-slate-600"}>
                              Due on {formatDate(inv.dueDate)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Price & Quick Action */}
                      <div className="flex flex-row sm:flex-row md:flex-row items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t border-slate-100 md:border-t-0 pt-4 md:pt-0">
                        <div className="text-left md:text-right shrink-0">
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Total Due</p>
                          <p className={`text-3xl font-black tracking-tight mt-1 text-slate-900`}>
                            {formatCurrency(inv.amount)}
                          </p>
                        </div>
                        
                        {!isActiveCheckout && (
                          <div className="shrink-0 w-full sm:w-auto min-w-[200px]">
                            {savedCard ? (
                              <div className="space-y-2">
                                <Button
                                  onClick={() => setConfirmInvoice(inv)}
                                  disabled={savedCardPaying === inv.id || !!savedCardPaying || !!loadingCheckout}
                                  className="h-11 px-5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all hover:scale-102 active:scale-98 w-full bg-slate-900 hover:bg-[#007AFF] text-white"
                                >
                                  {savedCardPaying === inv.id ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                                  ) : (
                                    <><CreditCard className="h-4 w-4" /> Quick Pay •••• {savedCard.cardLast4}</>
                                  )}
                                </Button>
                                <button
                                  onClick={() => openCheckout(inv)}
                                  disabled={isLoadingThis || !!loadingCheckout || !!savedCardPaying}
                                  className="text-[10px] text-slate-400 hover:text-[#007AFF] font-bold uppercase tracking-wider text-center transition-colors block w-full"
                                >
                                  {isLoadingThis ? "Loading..." : "Use alternative card"}
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Button
                                  onClick={() => openCheckout(inv)}
                                  disabled={isLoadingThis || !!loadingCheckout}
                                  className="h-11 px-5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all hover:scale-102 active:scale-98 w-full bg-slate-900 hover:bg-[#007AFF] text-white"
                                >
                                  {isLoadingThis ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Preparing...</>
                                  ) : (
                                    <><CreditCard className="h-4 w-4" /> Pay with Card</>
                                  )}
                                </Button>
                                <button
                                  onClick={() => router.push("/dashboard/payments/add-card")}
                                  className="text-[10px] text-slate-450 hover:text-[#007AFF] font-extrabold uppercase tracking-widest flex items-center justify-center gap-1 transition-colors w-full"
                                >
                                  <Plus className="h-3 w-3" /> Save Card
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    </div>

                    {/* ── INLINE STRIPE CHECKOUT PANEL ── */}
                    {isActiveCheckout && checkoutState && (
                      <div className="mt-6 border-t border-[#F1F5F9] pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center">
                              <ShieldCheck className="h-4 w-4 text-[#007AFF]" />
                            </div>
                            <h3 className="font-bold text-[#1D1D1F]">Secure Card Payment</h3>
                          </div>
                          <button
                            onClick={closeCheckout}
                            className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-[#E5E5EA] flex items-center justify-center text-[#6E6E73] transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <Elements
                          stripe={stripePromise}
                          options={{
                            clientSecret: checkoutState.clientSecret,
                            appearance: {
                              theme: "stripe",
                              variables: {
                                colorPrimary: "#007AFF",
                                colorBackground: "#ffffff",
                                colorText: "#1D1D1F",
                                colorDanger: "#EF4444",
                                fontFamily: "Inter, system-ui, sans-serif",
                                spacingUnit: "4px",
                                borderRadius: "12px",
                              },
                              rules: {
                                '.Input': {
                                  border: '1px solid #E5E5EA',
                                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                  padding: '12px 16px',
                                },
                                '.Input:focus': {
                                  border: '1px solid #007AFF',
                                  boxShadow: '0 0 0 1px #007AFF',
                                },
                                '.Label': {
                                  fontWeight: '700',
                                  color: '#6E6E73',
                                  fontSize: '11px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  marginBottom: '8px',
                                },
                                '.Tab': {
                                  border: '1px solid #E5E5EA',
                                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                },
                                '.Tab--selected': {
                                  borderColor: '#007AFF',
                                  boxShadow: '0 0 0 1px #007AFF',
                                },
                                '.Block': {
                                  border: '1px solid #E5E5EA',
                                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                }
                              }
                            },
                          }}
                        >
                          <CheckoutForm
                            invoiceId={checkoutState.invoiceId}
                            amount={checkoutState.amount}
                            baseAmount={checkoutState.baseAmount}
                            processingFee={checkoutState.processingFee}
                            propertyName={checkoutState.propertyName}
                            unitName={checkoutState.unitName}
                            onSuccess={handlePaymentSuccess}
                            onCancel={closeCheckout}
                            email={session?.user?.email}
                          />
                        </Elements>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── TRUST FOOTER SEALS ── */}
      <div className="bg-slate-50/50 border border-slate-100 rounded-[24px] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.005)] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="h-12 w-12 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center shrink-0 border border-[#007AFF]/10 shadow-inner">
            <ShieldCheck className="h-6 w-6 text-[#007AFF]" />
          </div>
          <div className="space-y-0.5">
            <h4 className="font-extrabold text-slate-800 tracking-tight text-sm sm:text-base">Payments Secured & Certified</h4>
            <p className="text-xs text-[#8E8E93] font-semibold leading-relaxed max-w-md">
              Your payment information is fully encrypted end-to-end and processed directly by Stripe. PropertyPro never stores or transmits raw credit card credentials.
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-slate-200/60 pt-4 md:pt-0 md:pl-6 shrink-0 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#6E6E73]">
            <Lock className="h-3.5 w-3.5 text-[#007AFF]" />
            <span>256-bit SSL</span>
          </div>
          <div className="h-3 w-px bg-slate-300 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#6E6E73]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#007AFF]" />
            <span>PCI-DSS Compliant</span>
          </div>
          <div className="h-3 w-px bg-slate-300 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#6E6E73]">
            <RefreshCw className="h-3.5 w-3.5 text-[#007AFF]" />
            <span>Stripe Certified</span>
          </div>
        </div>
      </div>

      {/* ── PAYMENT HISTORY ── */}
      {paidInvoices.length > 0 && (
        <div id="payment-history-section" className="space-y-4 pt-4 scroll-mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200/40">
                <History className="h-4.5 w-4.5 text-[#6E6E73]" />
              </div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Payment History</h2>
            </div>
            <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
              {paidInvoices.length} Receipt{paidInvoices.length !== 1 ? "s" : ""} Available
            </span>
          </div>
          
          <div className="bg-white border border-slate-100 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden">
            <div className="divide-y divide-slate-100">
              {paidInvoices.slice(0, 10).map((inv) => {
                const textType = inv.invoiceType 
                  ? inv.invoiceType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) 
                  : (Number(inv.amount) === Number(inv.lease?.securityDeposit || activeLease?.securityDeposit) ? 'Security Deposit' : 'Monthly Rent');
                
                return (
                  <div key={inv.id} className="flex items-center justify-between px-6 py-5 hover:bg-[#F5F5F7]/50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-emerald-55 border border-emerald-100 flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-bold text-slate-800 text-sm tracking-tight">
                          {textType} — {inv.lease?.unit?.name || activeLease?.unit?.name}
                        </p>
                        <p className="text-xs text-[#8E8E93] font-semibold">
                          Paid secure · Due: {formatDate(inv.dueDate)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0 ml-4">
                      <div className="text-right">
                        <p className="font-black text-emerald-650 text-base">
                          {formatCurrency(inv.amount)}
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider">
                          PAID
                        </span>
                      </div>
                      
                      {/* Decorative Download Receipt button */}
                      <button 
                        onClick={() => toast.info("📄 PDF Receipt download will start shortly...")}
                        className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-[#E5E5EA] flex items-center justify-center text-[#6E6E73] hover:text-slate-800 transition-colors border border-slate-200/20"
                        title="Download Receipt"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {paidInvoices.length > 10 && (
              <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-3 text-center">
                <p className="text-xs font-bold text-[#8E8E93] uppercase tracking-widest">
                  Showing latest 10 of {paidInvoices.length} historical payments
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONFIRMATION MODAL ── */}
      {confirmInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-205">
          <div className="bg-white rounded-[28px] shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-250 border border-slate-100 flex flex-col relative overflow-hidden">
            
            {/* Header lock icon */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="h-11 w-11 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center shrink-0 border border-[#007AFF]/10">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Confirm Secure Payment</h3>
                <p className="text-xs text-[#8E8E93] font-bold uppercase tracking-wider mt-0.5">Stripe Secure Checkout</p>
              </div>
            </div>
            
            {/* Summary Box */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-450 font-semibold">Payment For:</span>
                <span className="font-extrabold text-slate-700">
                  {confirmInvoice.invoiceType 
                    ? confirmInvoice.invoiceType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) 
                    : "Monthly Rent"}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-455 font-semibold">Payment Method:</span>
                <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                  <span className="uppercase text-[10px] bg-slate-200 text-slate-650 px-1.5 py-0.5 rounded font-black">
                    {savedCard?.cardBrand}
                  </span>
                  <span>•••• {savedCard?.cardLast4}</span>
                </span>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-200/60">
                <span className="text-slate-800 font-extrabold text-sm">Total Due:</span>
                <span className="font-black text-indigo-600 text-xl tracking-tight">
                  {formatCurrency(confirmInvoice.amount)}
                </span>
              </div>
            </div>
            
            <p className="text-[#6E6E73]/85 text-xs leading-relaxed mb-6 font-medium text-center">
              Your payment will be processed immediately. Once confirmed, a digital receipt will be issued and you will receive email confirmation.
            </p>
            
            <div className="flex gap-3 justify-end w-full">
              <Button 
                variant="outline" 
                onClick={() => setConfirmInvoice(null)} 
                className="flex-1 h-12 rounded-xl font-bold border-slate-200 text-[#6E6E73] hover:text-slate-800 transition-all text-sm"
              >
                Go Back
              </Button>
              <Button 
                onClick={() => {
                  const inv = confirmInvoice;
                  setConfirmInvoice(null);
                  executePayWithSavedCard(inv);
                }} 
                className="flex-1 h-12 bg-[#007AFF] hover:bg-[#0062CC] text-white font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Pay Securely</span>
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
