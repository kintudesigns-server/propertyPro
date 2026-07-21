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
  Banknote,
  X,
  Lock,
  Plus,
  ShieldAlert,
  Download,
} from "lucide-react";
import { toast } from "sonner";

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

  const activeLease = leases.find((l) => l.status === "ACTIVE") || leases[0] || null;
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
    <div className="w-full max-w-5xl mx-auto pt-6 pb-24 px-4 space-y-8">

      {/* ── BREADCRUMB & HEADER ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-black text-[#8E8E93] uppercase tracking-widest pl-1">
          <span>Dashboard</span>
          <span className="text-[#C7C7CC]">/</span>
          <span>Payments</span>
          <span className="text-[#C7C7CC]">/</span>
          <span className="text-[#007AFF]">Pay Rent</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 rounded-[28px] text-white shadow-xl relative overflow-hidden">
          {/* Subtle glowing mesh background */}
          <div className="absolute right-0 top-0 w-80 h-80 bg-[#007AFF]/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute left-1/4 bottom-0 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl -mb-16 pointer-events-none" />
          
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                <Banknote className="h-5 w-5 text-indigo-300" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Pay Your Rent</h1>
            </div>
            <p className="text-indigo-200/70 text-sm max-w-md">
              Secure, instant, and encrypted payments powered by <span className="font-bold text-white underline decoration-indigo-400 decoration-2 underline-offset-2">Stripe</span>.
            </p>
          </div>
          
          <Button
            onClick={fetchData}
            variant="ghost"
            className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-sm flex items-center gap-2 transition-all hover:scale-102 active:scale-98 shrink-0 relative z-10"
          >
            <RefreshCw className="h-4 w-4 text-indigo-300" />
            <span>Refresh System</span>
          </Button>
        </div>
      </div>

      {/* ── AUTO-PAY BANNER ── */}
      {activeLease && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-955 to-slate-900 rounded-[24px] p-6 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-indigo-950/40">
          <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-start gap-4 relative z-10">
            <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-sm shrink-0 border border-white/10 flex items-center justify-center shadow-xs">
              <RefreshCw className="h-6 w-6 text-indigo-300" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                <span>Never Miss a Payment</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/35 text-indigo-200 uppercase tracking-widest border border-indigo-400/20">
                  Recommended
                </span>
              </h3>
              <p className="text-indigo-200/70 text-sm max-w-xl leading-relaxed">
                Enable Auto-Pay to charge your default card on the 1st of every month automatically. No late fees, no manual checkouts, completely stress-free.
              </p>
            </div>
          </div>
          
          <div className="shrink-0 w-full md:w-auto relative z-10">
            {savedCard ? (
              <div className="flex items-center justify-between md:justify-end gap-5 bg-white/5 p-4 rounded-2xl border border-white/10 shadow-inner">
                <div className="text-left">
                  <span className="text-[10px] text-[#8E8E93] font-bold block uppercase tracking-wider">Auto-Pay Settings</span>
                  <span className="text-sm font-black text-white">
                    Status: <span className={activeLease.autoPayEnabled ? "text-emerald-400" : "text-[#8E8E93]"}>
                      {activeLease.autoPayEnabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={activeLease.autoPayEnabled}
                    onChange={async (e) => {
                      const enabled = e.target.checked;
                      try {
                        const res = await fetch(`/api/leases/${activeLease.id}/auto-pay`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ autoPayEnabled: enabled })
                        });
                        if (res.ok) {
                          toast.success(`Auto-Pay successfully turned ${enabled ? 'ON' : 'OFF'}`);
                          fetchData();
                        } else {
                          toast.error("Failed to update Auto-Pay settings");
                        }
                      } catch(err) {
                        toast.error("Network error");
                      }
                    }}
                  />
                  <div className="w-12 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            ) : (
              <Button 
                onClick={() => router.push("/dashboard/payments/add-card")}
                className="bg-white hover:bg-[#F5F5F7] text-slate-900 font-bold h-12 px-6 rounded-2xl w-full md:w-auto shadow-md transition-all hover:scale-102 active:scale-98 flex items-center justify-center gap-2"
              >
                <CreditCard className="h-4 w-4 text-indigo-600" />
                <span>Add Card to Enable Auto-Pay</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── SUMMARY STATS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Amount Owed */}
        <div className={`relative overflow-hidden rounded-[24px] p-6 border shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[140px] ${
          totalOwed > 0 
            ? "bg-red-50/60 border-red-100/80" 
            : "bg-emerald-50/60 border-emerald-100/80"
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">Total Owed</p>
              <p className={`text-3xl font-black tracking-tight mt-2 ${totalOwed > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {formatCurrency(totalOwed)}
              </p>
            </div>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs border ${
              totalOwed > 0 ? "bg-red-500/10 text-red-600 border-red-200/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-200/20"
            }`}>
              {totalOwed > 0 ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-550 mt-4">
            {pendingInvoices.length} unpaid invoice{pendingInvoices.length !== 1 ? "s" : ""} pending
          </p>
        </div>

        {/* Card 2: Monthly Rent */}
        <div className="relative overflow-hidden rounded-[24px] p-6 border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">Monthly Rent</p>
              <p className="text-3xl font-black tracking-tight mt-2 text-slate-800">
                {activeLease ? formatCurrency(activeLease.monthlyRent) : "—"}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100/50 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
              <Home className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-550 mt-4">
            Due on the 1st of every month
          </p>
        </div>

        {/* Card 3: Paid Invoices */}
        <div className="relative overflow-hidden rounded-[24px] p-6 border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">Payments Made</p>
              <p className="text-3xl font-black tracking-tight mt-2 text-slate-800">
                {paidInvoices.length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100/50 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-550 mt-4">
            All-time completed payments
          </p>
        </div>

        {/* Card 4: Next Due Date */}
        {(() => {
          const nextInv = pendingInvoices[0];
          const daysInfo = nextInv ? getDaysInfo(nextInv.dueDate) : null;
          const isUrgent = daysInfo?.isOverdue || daysInfo?.isToday;
          
          return (
            <div className={`relative overflow-hidden rounded-[24px] p-6 border hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-350 flex flex-col justify-between min-h-[140px] ${
              isUrgent 
                ? "bg-amber-50/60 border-amber-100/85" 
                : "border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">Next Payment Due</p>
                  <p className={`text-2xl font-black tracking-tight mt-2 ${isUrgent ? "text-amber-700" : "text-slate-850"}`}>
                    {nextInv ? formatDate(nextInv.dueDate) : "—"}
                  </p>
                </div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs border ${
                  isUrgent ? "bg-amber-500/10 text-amber-600 border-amber-200/20" : "bg-slate-50 border-slate-205 text-[#6E6E73]"
                }`}>
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
              <p className={`text-xs font-semibold mt-4 ${isUrgent ? "text-amber-705" : "text-slate-550"}`}>
                {nextInv ? daysInfo?.label : "All balances settled"}
              </p>
            </div>
          );
        })()}
      </div>

      {/* ── LEASE BANNER ── */}
      {activeLease && (
        <div className="bg-white border border-[#F1F5F9] rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
          
          <div className="flex items-start gap-4 pl-2">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 shadow-xs border border-indigo-100/50">
              <Home className="h-7 w-7 text-indigo-600" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-[#1D1D1F] text-lg tracking-tight">
                  {activeLease.unit?.property?.name || "Your Residence"}
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                  Active Lease
                </span>
              </div>
              <p className="text-sm text-slate-550">
                {activeLease.unit?.name} · {activeLease.unit?.property?.address}, {activeLease.unit?.property?.city}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-6 md:gap-10 shrink-0 text-sm pl-2 md:pl-0 border-t border-slate-100 md:border-t-0 pt-4 md:pt-0 w-full md:w-auto">
            <div className="space-y-1 min-w-[120px]">
              <p className="text-xs text-[#8E8E93] font-bold uppercase tracking-wider">Lease Term</p>
              <p className="font-bold text-slate-700">
                {formatDate(activeLease.startDate)} – {formatDate(activeLease.endDate)}
              </p>
            </div>
            
            <div className="space-y-1 min-w-[100px]">
              <p className="text-xs text-[#8E8E93] font-bold uppercase tracking-wider">Monthly Rent</p>
              <p className="font-black text-indigo-600 text-xl">
                {formatCurrency(activeLease.monthlyRent)}
                <span className="text-xs text-[#8E8E93] font-medium"> /mo</span>
              </p>
            </div>
          </div>
        </div>
      )}

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
                ? inv.invoiceType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) 
                : (Number(inv.amount) === Number(inv.lease?.securityDeposit || activeLease?.securityDeposit) ? 'Security Deposit' : 'Monthly Rent');

              return (
                <div
                  key={inv.id}
                  className={`bg-white rounded-[24px] border overflow-hidden transition-all duration-350 relative ${cardBorderClass}`}
                >
                  {/* Accent vertical line on the left */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentColorClass}`} />

                  {/* Overdue / Due Today Banner inside the card */}
                  {(daysInfo.isOverdue || daysInfo.isToday) && (
                    <div className={`px-6 py-2.5 flex items-center justify-between text-xs font-bold pl-8 border-b ${
                      daysInfo.isOverdue 
                        ? "bg-red-50 text-red-750 border-red-100/50" 
                        : "bg-amber-50 text-amber-900 border-amber-100/50"
                    }`}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{daysInfo.isOverdue ? `OVERDUE — ${daysInfo.label}` : "DUE TODAY"}</span>
                      </div>
                      <span className="opacity-80 font-semibold hidden md:inline">
                        {daysInfo.isOverdue ? "Late penalty applied" : `Grace period of ${activeLease?.gracePeriodDays || 5} days remaining.`}
                      </span>
                    </div>
                  )}

                  <div className="p-6 md:p-8 pl-8">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                      
                      {/* Left: Invoice Core Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border ${
                          daysInfo.isOverdue 
                            ? "bg-red-50 text-red-500 border-red-100" 
                            : "bg-indigo-50 text-indigo-500 border-indigo-100"
                        }`}>
                          <Banknote className="h-6 w-6" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-800 text-lg tracking-tight">
                              {textType}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              daysInfo.isOverdue 
                                ? "bg-red-50 text-red-650 border border-red-100/50" 
                                : daysInfo.isToday 
                                  ? "bg-amber-50 text-amber-700 border border-amber-100/55" 
                                  : "bg-indigo-50 text-indigo-600 border border-indigo-100/50"
                            }`}>
                              {daysInfo.isOverdue ? "Overdue" : daysInfo.isToday ? "Due Today" : "Upcoming"}
                            </span>
                          </div>
                          <p className="text-sm text-[#6E6E73]">
                            {inv.lease?.unit?.property?.name || activeLease?.unit?.property?.name} · {inv.lease?.unit?.name || activeLease?.unit?.name}
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <Calendar className="h-3.5 w-3.5 text-[#8E8E93]" />
                            <span className={`text-xs font-semibold ${daysInfo.isOverdue ? "text-red-500" : "text-[#6E6E73]"}`}>
                              Due date: {formatDate(inv.dueDate)} ({daysInfo.label})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Breakdown info */}
                      <div className="hidden sm:flex flex-col gap-1.5 text-right border-l lg:border-l border-slate-100 px-6 shrink-0 w-full sm:w-auto items-end lg:items-end">
                        <p className="text-xs text-[#8E8E93] font-bold uppercase tracking-wider">Breakdown</p>
                        <div className="text-xs space-y-1 text-slate-555 font-semibold">
                          <div className="flex justify-between sm:justify-end gap-4">
                            <span>Base Rent:</span>
                            <span className="text-[#3C3C43]">{formatCurrency(Number(inv.amount) - (daysInfo.isOverdue ? 50 : 0))}</span>
                          </div>
                          {daysInfo.isOverdue && (
                            <div className="flex justify-between sm:justify-end gap-4 text-red-500">
                              <span>Late Fee:</span>
                              <span>+ $50.00</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Payment Amount & Action CTAs */}
                      <div className="flex flex-row sm:flex-col lg:flex-row items-center justify-between sm:justify-start lg:items-center gap-6 w-full lg:w-auto shrink-0 border-t border-slate-50 lg:border-t-0 pt-4 lg:pt-0">
                        <div className="text-left sm:text-right lg:text-right">
                          <p className="text-xs text-slate-450 font-bold uppercase tracking-wider">Amount Due</p>
                          <p className="text-3xl font-black text-slate-800 tracking-tight mt-1">
                            {formatCurrency(inv.amount)}
                          </p>
                        </div>
                        
                        {!isActiveCheckout && (
                          <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                            {/* Saved card one-click pay */}
                            {savedCard ? (
                              <>
                                <Button
                                  onClick={() => setConfirmInvoice(inv)}
                                  disabled={savedCardPaying === inv.id || !!savedCardPaying || !!loadingCheckout}
                                  className={`h-12 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap shadow-md hover:shadow-lg transition-all hover:scale-102 active:scale-98 w-full ${
                                    daysInfo.isOverdue 
                                      ? "bg-red-500 hover:bg-red-600 text-white" 
                                      : "bg-[#007AFF] hover:bg-[#0062CC] text-white"
                                  }`}
                                >
                                  {savedCardPaying === inv.id ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                                  ) : (
                                    <><CreditCard className="h-4 w-4" /> Quick Pay · {savedCard.cardBrand?.toUpperCase()} ••••{savedCard.cardLast4}</>
                                  )}
                                </Button>
                                <button
                                  onClick={() => openCheckout(inv)}
                                  disabled={isLoadingThis || !!loadingCheckout || !!savedCardPaying}
                                  className="text-xs text-[#8E8E93] hover:text-[#007AFF] font-bold underline underline-offset-2 text-center transition-colors block w-full"
                                >
                                  {isLoadingThis ? "Loading Form..." : "Use another card"}
                                </button>
                              </>
                            ) : (
                              <>
                                <Button
                                  onClick={() => openCheckout(inv)}
                                  disabled={isLoadingThis || !!loadingCheckout}
                                  className={`h-12 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap shadow-md hover:shadow-lg transition-all hover:scale-102 active:scale-98 w-full ${
                                    daysInfo.isOverdue 
                                      ? "bg-red-500 hover:bg-red-600 text-white" 
                                      : "bg-[#007AFF] hover:bg-[#0062CC] text-white"
                                  }`}
                                >
                                  {isLoadingThis ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Preparing...</>
                                  ) : (
                                    <><CreditCard className="h-4 w-4" /> Pay with Card</>
                                  )}
                                </Button>
                                <button
                                  onClick={() => router.push("/dashboard/payments/add-card")}
                                  className="text-xs text-[#007AFF] hover:text-[#0062CC] font-bold flex items-center justify-center gap-1 transition-colors w-full"
                                >
                                  <Plus className="h-3 w-3" /> Save card for faster checkout
                                </button>
                              </>
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

      {/* ── PAYMENT METHODS ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200/40">
              <CreditCard className="h-4.5 w-4.5 text-slate-505" />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Payment Methods</h2>
          </div>
        </div>
        
        <div className="bg-white border border-slate-100 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-slate-100/50 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {savedCard ? (
              <div className="h-12 w-20 bg-gradient-to-br from-slate-850 to-slate-950 rounded-xl flex flex-col justify-between p-2 shrink-0 shadow-sm border border-slate-700/30 text-white select-none">
                <div className="flex justify-between items-center">
                  <div className="h-3.5 w-4 bg-amber-400/80 rounded-[2px]" />
                  <span className="text-[7px] font-black tracking-widest text-[#8E8E93]">Pro</span>
                </div>
                <span className="font-black text-[9px] tracking-wider uppercase text-right leading-none">
                  {savedCard.cardBrand || "Card"}
                </span>
              </div>
            ) : (
              <div className="h-12 w-20 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-dashed border-slate-250">
                <CreditCard className="h-6 w-6 text-[#8E8E93]" />
              </div>
            )}
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-[#1D1D1F] tracking-tight">
                  {savedCard ? `•••• •••• •••• ${savedCard.cardLast4}` : "No Card Saved"}
                </p>
                {savedCard && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 text-indigo-650 border border-indigo-100 uppercase tracking-wide">
                    Default
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-450 font-semibold leading-relaxed">
                {savedCard 
                  ? "Used for monthly manual rent checkouts and automated Auto-Pay deductions" 
                  : "Add a credit or debit card for faster one-click checkout and auto-pay."}
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => router.push("/dashboard/payments/add-card")}
            variant={savedCard ? "outline" : "default"}
            className={`h-11 px-6 rounded-xl font-bold shadow-md transition-all hover:scale-102 active:scale-98 w-full sm:w-auto ${
              !savedCard 
                ? "bg-[#007AFF] hover:bg-[#0062CC] text-white" 
                : "border-slate-200 text-slate-700 bg-white hover:bg-[#F5F5F7]"
            }`}
          >
            {savedCard ? "Replace Payment Method" : "Add Card Details"}
          </Button>
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
