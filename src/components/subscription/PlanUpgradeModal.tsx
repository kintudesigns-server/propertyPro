"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Layers, ArrowRight, ShieldCheck, CheckCircle2, Sparkles, Loader2, CreditCard } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import SetupForm from "./SetupForm";
import CheckoutForm from "./CheckoutForm";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

interface PricingTier {
  id: string;
  name: string;
  price: number;
  maxUnits: number;
  features: string[];
}

interface PreviewData {
  amountDue: number;
  subtotal: number;
  nextBillingDate: number | null;
  cardBrand: string;
  cardLast4: string;
  targetTierName: string;
  targetTierPrice: number;
}

interface PlanUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pricingTiers: PricingTier[];
  currentTier: PricingTier | null;
  requestedUnits: number;
  onSuccess: (newTierId: string) => void;
}

export default function PlanUpgradeModal({
  open,
  onOpenChange,
  pricingTiers,
  currentTier,
  requestedUnits,
  onSuccess,
}: PlanUpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [targetTier, setTargetTier] = useState<PricingTier | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [showPreviewScreen, setShowPreviewScreen] = useState(false);

  // Determine the recommended next tier that can handle the unit requirements
  const currentUnitsLimit = currentTier?.maxUnits ?? 0;
  
  // Find the cheapest tier that satisfies the requested unit count
  const recommendedTier = pricingTiers
    .filter((t) => t.maxUnits >= requestedUnits && t.price > (currentTier?.price ?? 0))
    .sort((a, b) => a.price - b.price)[0] || pricingTiers.find(t => t.name === "Starter") || null;

  const handleUpgradeClick = async (tier: PricingTier) => {
    setErrorMsg("");
    setTargetTier(tier);

    const isPaidSub = currentTier && currentTier.price > 0;
    if (isPaidSub) {
      setLoading(true);
      try {
        const res = await fetch("/api/stripe/preview-upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tierId: tier.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load upgrade preview.");
        setPreviewData(data);
        setShowPreviewScreen(true);
      } catch (err: any) {
        setErrorMsg(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    } else {
      await executeUpgrade(tier);
    }
  };

  const executeUpgrade = async (tier: PricingTier) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: tier.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process upgrade");
      }

      if (data.requiresSetup && data.setupClientSecret) {
        // Stripe requires a card on file first
        setSetupClientSecret(data.setupClientSecret);
        setShowPreviewScreen(false);
      } else if (data.clientSecret) {
        // First-time card setup + payment confirmation required (incomplete new subscription)
        setClientSecret(data.clientSecret);
        setShowPreviewScreen(false);
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        // Upgraded successfully immediately
        onSuccess(tier.id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) {
        setSetupClientSecret(null);
        setClientSecret(null);
        setPreviewData(null);
        setShowPreviewScreen(false);
        setErrorMsg("");
      }
    }}>
      <DialogContent className="sm:max-w-lg p-0 bg-white rounded-[32px] overflow-hidden border-0 shadow-2xl">
        {showPreviewScreen && previewData && targetTier ? (
          <div className="p-8 space-y-6">
            <DialogHeader className="mb-2">
              <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-blue-600 animate-pulse" />
                Confirm Plan Upgrade
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">
                Review your billing summary. Stripe will charge your card on file for the prorated amount immediately.
              </DialogDescription>
            </DialogHeader>

            {/* Price Preview Card */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-3">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Upgrade Plan</span>
                <span className="font-black text-slate-800">{currentTier?.name} → {targetTier.name}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold text-slate-650">
                  <span>New Monthly Subscription Rate</span>
                  <span className="text-slate-900 font-bold">${targetTier.price}/mo</span>
                </div>
                
                <div className="flex justify-between text-sm font-semibold text-slate-650">
                  <span>Unused Credit (Starter Plan)</span>
                  <span className="text-emerald-600 font-bold">-${(Number(targetTier.price) - previewData.amountDue).toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200 border-dashed">
                  <span>Prorated Charge Today</span>
                  <span className="text-blue-650">${previewData.amountDue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method / Card details */}
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5">
                <CreditCard className="h-4.5 w-4.5 text-blue-600" />
                <span className="font-bold text-slate-700 capitalize">{previewData.cardBrand} ending in {previewData.cardLast4}</span>
              </div>
              <span className="text-xs font-bold text-slate-400">Card on File</span>
            </div>

            {/* Billing cycle details */}
            {previewData.nextBillingDate && (
              <p className="text-xs text-slate-500 font-medium text-center">
                Your next monthly invoice of <strong>${targetTier.price}.00</strong> is scheduled for{" "}
                <strong>
                  {new Date(previewData.nextBillingDate * 1000).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>.
              </p>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                {errorMsg}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setShowPreviewScreen(false);
                  setPreviewData(null);
                }}
                disabled={loading}
                className="flex-1 h-12 rounded-xl font-bold text-slate-650 hover:bg-slate-50"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => executeUpgrade(targetTier)}
                disabled={loading}
                className="flex-1 h-12 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-indigo-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  "Pay & Upgrade"
                )}
              </Button>
            </div>
          </div>
        ) : setupClientSecret && targetTier ? (
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-blue-600 animate-pulse" />
                Add Card to Upgrade
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">
                Please add a payment method to upgrade your plan to <span className="font-bold text-slate-800">{targetTier.name}</span>.
              </DialogDescription>
            </DialogHeader>

            <Elements stripe={stripePromise} options={{ clientSecret: setupClientSecret }}>
              <SetupForm
                tierId={targetTier.id}
                tierName={targetTier.name}
                onSuccess={() => {
                  setSetupClientSecret(null);
                  onSuccess(targetTier.id);
                }}
              />
            </Elements>
          </div>
        ) : clientSecret && targetTier ? (
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-blue-600 animate-pulse" />
                Upgrade Payment Required
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">
                Confirm your subscription payment to upgrade to <span className="font-bold text-slate-800">{targetTier.name}</span>.
              </DialogDescription>
            </DialogHeader>

            <Elements stripe={stripePromise} options={{ clientSecret: clientSecret }}>
              <CheckoutForm
                tierName={targetTier.name}
                tierPrice={Number(targetTier.price)}
                onSuccess={() => {
                  setClientSecret(null);
                  onSuccess(targetTier.id);
                }}
              />
            </Elements>
          </div>
        ) : (
          <div>
            {/* Top Gradient Banner */}
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-6 translate-x-6" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/20 rounded-full blur-xl -translate-x-6 translate-y-6" />
              
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                  <Layers className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-bold tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">Plan Upgrade Required</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight mt-3">Increase Your Property Limits</h2>
              <p className="text-blue-100 text-sm font-medium mt-1">
                You're listing a property with {requestedUnits} units, which exceeds your current limit.
              </p>
            </div>

            <div className="p-8 space-y-6">
              {/* Limit Comparison Card */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4.5 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Plan</p>
                  <p className="font-extrabold text-slate-800 text-base">{currentTier?.name || "Hobbyist"}</p>
                  <p className="text-xs font-bold text-slate-500">{currentUnitsLimit} Units Limit</p>
                </div>
                <div className="border-l border-slate-200 pl-4 space-y-1 relative">
                  <ArrowRight className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500 bg-white border border-slate-100 rounded-full p-0.5" />
                  <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Required Upgrade</p>
                  <p className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                    {recommendedTier?.name || "Starter"}
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Best Fit</span>
                  </p>
                  <p className="text-xs font-bold text-slate-650">Up to {recommendedTier?.maxUnits || 15} Units</p>
                </div>
              </div>

              {recommendedTier && (
                <div className="space-y-4">
                  {/* Price Block */}
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-black text-slate-950">${recommendedTier.price}</span>
                      <span className="text-slate-500 text-sm font-bold"> / month</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Cancel anytime
                    </span>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Included in {recommendedTier.name}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {recommendedTier.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                      {errorMsg}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 flex gap-3">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => onOpenChange(false)}
                      disabled={loading}
                      className="flex-1 h-12 rounded-xl font-bold text-slate-650 hover:bg-slate-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleUpgradeClick(recommendedTier)}
                      disabled={loading}
                      className="flex-1 h-12 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-indigo-200"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Checking...
                        </>
                      ) : (
                        `Upgrade to ${recommendedTier.name}`
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
