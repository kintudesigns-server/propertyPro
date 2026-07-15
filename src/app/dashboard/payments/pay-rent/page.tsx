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
      <div className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-4 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-medium">Property</span>
          <span className="font-bold text-[#0F172A]">{propertyName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-medium">Unit</span>
          <span className="font-bold text-[#0F172A]">{unitName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-medium">Base Rent</span>
          <span className="font-semibold text-[#0F172A]">{formatCurrency(baseAmount * 100)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-medium">Card Processing Fee (2.9%)</span>
          <span className="font-semibold text-slate-500">{formatCurrency(processingFee * 100)}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-[#E2E8F0] pt-2 mt-2">
          <span className="text-[#0F172A] font-bold">Total Due</span>
          <span className="font-black text-[#0F172A] text-base">{formatCurrency(amount)}</span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="rounded-xl overflow-hidden border border-[#E2E8F0] p-4 bg-white relative min-h-[280px]">
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
      <div className="flex items-center gap-2 text-xs text-slate-400">
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
          className="flex-1 h-12 rounded-xl border-[#E2E8F0] font-semibold text-sm"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-[2] h-12 bg-[#635BFF] hover:bg-[#4f46e5] text-white font-bold rounded-xl shadow-md text-sm flex items-center justify-center gap-2 transition-all"
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
        <Loader2 className="h-10 w-10 animate-spin text-[#635BFF]" />
        <p className="text-slate-500 font-semibold text-sm">Loading your billing details...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto pt-6 pb-24 px-4 space-y-8">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Pay Rent</h1>
          <p className="text-slate-500 text-sm mt-1">
            Secure payments powered by{" "}
            <span className="font-bold text-[#635BFF]">Stripe</span>
          </p>
        </div>
        <Button
          onClick={fetchData}
          variant="outline"
          className="h-10 px-4 rounded-xl border-[#E2E8F0] font-semibold text-sm flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* ── AUTO-PAY BANNER ── */}
      {activeLease && (
        <div className="bg-gradient-to-r from-indigo-600 to-[#635BFF] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm shrink-0">
              <RefreshCw className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Never Miss a Rent Payment</h3>
              <p className="text-indigo-100 text-sm mt-1 max-w-lg leading-relaxed">
                Set up Auto-Pay to automatically deduct your rent on the 1st of every month using your default payment method. Avoid late fees and stay stress-free.
              </p>
            </div>
          </div>
          <div className="shrink-0 w-full md:w-auto">
            {savedCard ? (
              <div className="flex items-center justify-between md:justify-end gap-4 bg-white/10 p-3 rounded-xl border border-white/20">
                <span className="text-sm font-bold">Auto-Pay is {activeLease.autoPayEnabled ? "ON" : "OFF"}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={activeLease.autoPayEnabled}
                    onChange={async (e) => {
                      const enabled = e.target.checked;
                      // Optimistic UI update could go here, but we'll rely on fetchData for simplicity in this demo
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
                  <div className="w-11 h-6 bg-white/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-400"></div>
                </label>
              </div>
            ) : (
              <Button 
                onClick={() => router.push("/dashboard/payments/add-card")}
                className="bg-white text-indigo-600 hover:bg-slate-50 font-bold h-11 px-6 rounded-xl w-full md:w-auto shadow-sm transition-all hover:scale-105"
              >
                <CreditCard className="mr-2 h-4 w-4" /> Add Card to Enable
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── SUMMARY STATS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-2xl p-5 border shadow-sm ${totalOwed > 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Amount Owed</p>
          <p className={`text-2xl font-black mt-1 ${totalOwed > 0 ? "text-red-600" : "text-emerald-600"}`}>{formatCurrency(totalOwed)}</p>
          <p className="text-xs text-slate-500 mt-1">{pendingInvoices.length} unpaid invoice{pendingInvoices.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-2xl p-5 border border-[#E2E8F0] bg-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Monthly Rent</p>
          <p className="text-2xl font-black mt-1 text-[#0F172A]">{activeLease ? formatCurrency(activeLease.monthlyRent) : "—"}</p>
          <p className="text-xs text-slate-500 mt-1">per month</p>
        </div>
        <div className="rounded-2xl p-5 border border-[#E2E8F0] bg-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Paid Invoices</p>
          <p className="text-2xl font-black mt-1 text-[#0F172A]">{paidInvoices.length}</p>
          <p className="text-xs text-slate-500 mt-1">all time payments</p>
        </div>
        <div className="rounded-2xl p-5 border border-[#E2E8F0] bg-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Next Due Date</p>
          <p className="text-2xl font-black mt-1 text-[#0F172A]">{pendingInvoices[0] ? formatDate(pendingInvoices[0].dueDate) : "—"}</p>
          <p className="text-xs text-slate-500 mt-1">{pendingInvoices[0] ? getDaysInfo(pendingInvoices[0].dueDate).label : "No pending invoices"}</p>
        </div>
      </div>

      {/* ── LEASE BANNER ── */}
      {activeLease && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Home className="h-6 w-6 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#0F172A] text-base">{activeLease.unit?.property?.name || "Your Property"}</p>
            <p className="text-sm text-slate-500 truncate">{activeLease.unit?.name} · {activeLease.unit?.property?.address}, {activeLease.unit?.property?.city}</p>
          </div>
          <div className="flex items-center gap-6 text-sm shrink-0">
            <div className="text-right">
              <p className="text-xs text-slate-500 font-medium">Lease Period</p>
              <p className="font-bold text-[#0F172A]">{formatDate(activeLease.startDate)} – {formatDate(activeLease.endDate)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 font-medium">Rent</p>
              <p className="font-black text-[#0F172A] text-lg">{formatCurrency(activeLease.monthlyRent)}<span className="text-xs text-slate-400 font-normal">/mo</span></p>
            </div>
          </div>
        </div>
      )}

      {/* ── OUTSTANDING INVOICES ── */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-[#0F172A] flex items-center gap-2">
          Outstanding Invoices
          {pendingInvoices.length > 0 && (
            <span className="text-sm font-bold bg-red-100 text-red-600 px-2.5 py-0.5 rounded-full">
              {pendingInvoices.length}
            </span>
          )}
        </h2>

        {pendingInvoices.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-lg font-bold text-emerald-800">You're all caught up! 🎉</p>
            <p className="text-sm text-emerald-600 mt-1">No outstanding rent payments. Great job staying on top of things.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeLease?.moveOutDate && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-in slide-in-from-top-2 duration-300">
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

              return (
                <div
                  key={inv.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                    daysInfo.isOverdue ? "border-red-200" : daysInfo.isToday ? "border-amber-200" : "border-[#E2E8F0]"
                  }`}
                >
                  {/* Overdue / Due Today banner */}
                  {(daysInfo.isOverdue || daysInfo.isToday) && (
                    <div className={`px-5 py-2 flex items-center justify-between text-xs font-bold ${daysInfo.isOverdue ? "bg-red-500 text-white" : "bg-amber-400 text-amber-900"}`}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {daysInfo.isOverdue ? `⚠️ OVERDUE — ${daysInfo.label}` : "⏰ Due Today"}
                      </div>
                      <span className="opacity-90 font-medium">
                        {daysInfo.isOverdue ? "A late fee has been applied." : `A $50 late fee will be applied after the ${activeLease?.gracePeriodDays || 5}-day grace period.`}
                      </span>
                    </div>
                  )}

                  <div className="p-6 border-b border-slate-100">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      {/* Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${daysInfo.isOverdue ? "bg-red-50" : "bg-blue-50"}`}>
                          <Banknote className={`h-6 w-6 ${daysInfo.isOverdue ? "text-red-500" : "text-blue-500"}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#0F172A] text-base">
                            {inv.invoiceType 
                              ? inv.invoiceType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) 
                              : (Number(inv.amount) === Number(inv.lease?.securityDeposit || activeLease?.securityDeposit) ? 'Security Deposit' : 'Monthly Rent')}
                          </p>
                          <p className="text-sm text-slate-500 mt-0.5">
                            {inv.lease?.unit?.property?.name || activeLease?.unit?.property?.name} · {inv.lease?.unit?.name || activeLease?.unit?.name}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span className={`text-xs font-semibold ${daysInfo.isOverdue ? "text-red-600" : "text-slate-500"}`}>
                              Due: {formatDate(inv.dueDate)} · {daysInfo.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Breakdown Details (Simulated for real-world feel) */}
                      <div className="hidden md:flex flex-col gap-1 text-right border-r border-slate-200 pr-6 mr-2 shrink-0">
                         <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Breakdown</p>
                         <p className="text-[11px] font-semibold text-slate-600">Base Rent: {formatCurrency(Number(inv.amount) - (daysInfo.isOverdue ? 50 : 0))}</p>
                         {daysInfo.isOverdue && <p className="text-[11px] font-semibold text-red-500">Late Fee: $50.00</p>}
                      </div>

                      {/* Amount + CTA */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-4 sm:gap-2 shrink-0">
                        <div className="text-left sm:text-right">
                          <p className="text-xs text-slate-500 font-medium">Amount Due</p>
                          <p className="text-3xl font-black text-[#0F172A]">{formatCurrency(inv.amount)}</p>
                        </div>
                        {!isActiveCheckout && (
                          <div className="flex flex-col gap-2 w-full sm:w-auto">
                            {/* Saved card one-click pay */}
                            {savedCard ? (
                              <>
                                <Button
                                  onClick={() => setConfirmInvoice(inv)}
                                  disabled={savedCardPaying === inv.id || !!savedCardPaying || !!loadingCheckout}
                                  className={`h-12 px-5 rounded-xl font-bold text-sm flex items-center gap-2 whitespace-nowrap shadow-md transition-all ${
                                    daysInfo.isOverdue ? "bg-red-500 hover:bg-red-600 text-white" : "bg-[#635BFF] hover:bg-[#4f46e5] text-white"
                                  }`}
                                >
                                  {savedCardPaying === inv.id
                                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                                    : <><CreditCard className="h-4 w-4" /> Pay · {savedCard.cardBrand?.toUpperCase()} ••••{savedCard.cardLast4}</>
                                  }
                                </Button>
                                <button
                                  onClick={() => openCheckout(inv)}
                                  disabled={isLoadingThis || !!loadingCheckout || !!savedCardPaying}
                                  className="text-xs text-slate-400 hover:text-[#635BFF] font-medium underline underline-offset-2 text-center transition-colors"
                                >
                                  {isLoadingThis ? "Loading..." : "Use a different card"}
                                </button>
                              </>
                            ) : (
                              <>
                                <Button
                                  onClick={() => openCheckout(inv)}
                                  disabled={isLoadingThis || !!loadingCheckout}
                                  className={`h-12 px-6 rounded-xl font-bold text-sm flex items-center gap-2 whitespace-nowrap shadow-md transition-all ${
                                    daysInfo.isOverdue ? "bg-red-500 hover:bg-red-600 text-white" : "bg-[#635BFF] hover:bg-[#4f46e5] text-white"
                                  }`}
                                >
                                  {isLoadingThis ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</> : <><CreditCard className="h-4 w-4" /> Pay with Card</>}
                                </Button>
                                <button
                                  onClick={() => router.push("/dashboard/payments/add-card")}
                                  className="text-xs text-[#635BFF] hover:underline font-medium flex items-center justify-center gap-1"
                                >
                                  <Plus className="h-3 w-3" /> Save a card for faster payments
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
                            <div className="h-8 w-8 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
                              <ShieldCheck className="h-4 w-4 text-[#635BFF]" />
                            </div>
                            <h3 className="font-bold text-[#0F172A]">Secure Card Payment</h3>
                          </div>
                          <button
                            onClick={closeCheckout}
                            className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
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
                                colorPrimary: "#3B82F6",
                                colorBackground: "#ffffff",
                                colorText: "#0F172A",
                                colorDanger: "#EF4444",
                                fontFamily: "Inter, system-ui, sans-serif",
                                spacingUnit: "4px",
                                borderRadius: "12px",
                              },
                              rules: {
                                '.Input': {
                                  border: '1px solid #E2E8F0',
                                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                  padding: '12px 16px',
                                },
                                '.Input:focus': {
                                  border: '1px solid #3B82F6',
                                  boxShadow: '0 0 0 1px #3B82F6',
                                },
                                '.Label': {
                                  fontWeight: '700',
                                  color: '#64748B',
                                  fontSize: '11px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  marginBottom: '8px',
                                },
                                '.Tab': {
                                  border: '1px solid #E2E8F0',
                                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                },
                                '.Tab--selected': {
                                  borderColor: '#3B82F6',
                                  boxShadow: '0 0 0 1px #3B82F6',
                                },
                                '.Block': {
                                  border: '1px solid #E2E8F0',
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

      {/* ── TRUST BADGE ── */}
      <div className="bg-slate-50 border border-[#E2E8F0] rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div className="h-12 w-12 rounded-xl bg-[#635BFF]/10 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
          <ShieldCheck className="h-6 w-6 text-[#635BFF]" />
        </div>
        <div>
          <p className="font-bold text-[#0F172A]">Payments secured by Stripe</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Your payment info is encrypted end-to-end and processed directly by Stripe. PropertyPro never sees or stores your card details.
          </p>
        </div>
      </div>

      {/* ── PAYMENT METHODS ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-slate-400" />
            <h2 className="text-xl font-black text-[#0F172A]">Payment Methods</h2>
          </div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-16 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
              {savedCard ? (
                <span className="font-black text-slate-600 tracking-wider text-sm">{savedCard.cardBrand?.toUpperCase()}</span>
              ) : (
                <CreditCard className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <div>
              <p className="font-bold text-[#0F172A]">{savedCard ? `•••• •••• •••• ${savedCard.cardLast4}` : "No payment method saved"}</p>
              <p className="text-xs text-slate-500 mt-0.5">{savedCard ? "Default payment method for rent and Auto-Pay" : "Add a card for faster checkout and Auto-Pay"}</p>
            </div>
          </div>
          <Button
            onClick={() => router.push("/dashboard/payments/add-card")}
            variant={savedCard ? "outline" : "default"}
            className={`h-10 px-6 rounded-xl font-bold shadow-sm transition-all ${!savedCard ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "border-slate-200 hover:bg-slate-50"}`}
          >
            {savedCard ? "Update Card" : "Add Card"}
          </Button>
        </div>
      </div>

      {/* ── PAYMENT HISTORY ── */}
      {paidInvoices.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-slate-400" />
            <h2 className="text-xl font-black text-[#0F172A]">Payment History</h2>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
            <div className="divide-y divide-[#F1F5F9]">
              {paidInvoices.slice(0, 12).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-[#0F172A] text-sm">{Number(inv.amount) === Number(inv.lease?.securityDeposit || activeLease?.securityDeposit) ? 'Security Deposit' : 'Monthly Rent'} — {inv.lease?.unit?.name || activeLease?.unit?.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Paid · Due {formatDate(inv.dueDate)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-black text-emerald-600 text-base">{formatCurrency(inv.amount)}</p>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">PAID</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRMATION MODAL ── */}
      {confirmInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            <h3 className="text-xl font-black text-[#0F172A] mb-2">Confirm Payment</h3>
            <p className="text-slate-500 mb-6 text-sm">
              You are about to securely charge <span className="font-bold text-[#0F172A]">{formatCurrency(confirmInvoice.amount)}</span> to your saved <span className="font-bold text-[#0F172A]">{savedCard?.cardBrand?.toUpperCase()}</span> ending in <span className="font-bold text-[#0F172A]">{savedCard?.cardLast4}</span>.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmInvoice(null)} className="rounded-xl font-semibold border-slate-200">Cancel</Button>
              <Button 
                onClick={() => {
                  const inv = confirmInvoice;
                  setConfirmInvoice(null);
                  executePayWithSavedCard(inv);
                }} 
                className="bg-[#635BFF] hover:bg-[#4f46e5] text-white font-bold rounded-xl shadow-md"
              >
                Confirm Payment
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
