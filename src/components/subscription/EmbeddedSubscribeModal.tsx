"use client";

import React, { useState, useEffect } from "react";
import {
  loadStripe,
  StripeElementsOptions,
} from "@stripe/stripe-js";
import {
  Elements,
} from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ArrowLeft, Lock, Sparkles, Shield, AlertTriangle, Building2 } from "lucide-react";
import { toast } from "sonner";
import SetupForm from "./SetupForm";
import CheckoutForm from "./CheckoutForm";

// ─── Stripe Promise (singleton) ──────────────────────────────────────────────
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

// ─── Types ────────────────────────────────────────────────────────────────────
interface PricingTier {
  id: string;
  name: string;
  price: number;
  maxUnits: number;
  description?: string;
  features?: string[];
}

interface EmbeddedSubscribeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pricingTiers: PricingTier[];
  currentTierId?: string;
  currentUserUnitCount?: number;
  currentTierPrice?: number;
  /** Called after a successful subscription payment is confirmed */
  onSuccess?: (newTierId: string) => void;
  /** Context message shown at top of modal */
  contextMessage?: string;
  title?: string;
  required?: boolean;
}

// ─── Main Modal Component ─────────────────────────────────────────────────────
export default function EmbeddedSubscribeModal({
  open,
  onOpenChange,
  pricingTiers: propTiers,
  currentTierId,
  currentUserUnitCount = 0,
  currentTierPrice = 0,
  onSuccess,
  contextMessage,
  title = "Choose Your Subscription Plan",
  required = false,
}: EmbeddedSubscribeModalProps) {
  const [step, setStep] = useState<"plans" | "confirm" | "payment" | "setup" | "downgrade_blocked">("plans");
  const [confirmTier, setConfirmTier] = useState<PricingTier | null>(null);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);
  const [loadingTierId, setLoadingTierId] = useState<string | null>(null);
  const [fetchedTiers, setFetchedTiers] = useState<PricingTier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(false);

  // Use prop tiers if provided, else use self-fetched tiers
  const pricingTiers = propTiers.length > 0 ? propTiers : fetchedTiers;

  // Self-fetch tiers when modal opens and no tiers were passed as props
  useEffect(() => {
    if (open && propTiers.length === 0 && fetchedTiers.length === 0) {
      setLoadingTiers(true);
      fetch("/api/pricing-tiers")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setFetchedTiers(data.filter((t: any) => t.isActive && !t.isCustom));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingTiers(false));
    }
  }, [open, propTiers.length, fetchedTiers.length]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("plans");
        setSelectedTier(null);
        setConfirmTier(null);
        setClientSecret(null);
        setSetupClientSecret(null);
        setLoadingTierId(null);
      }, 300);
    }
  }, [open]);

  const handleSelectPlan = (tier: PricingTier) => {
    window.location.href = `/dashboard/owner/billing?tierId=${tier.id}`;
  };

  const processPlanSwitch = async (tier: PricingTier) => {
    setLoadingTierId(tier.id);
    try {
      const res = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: tier.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to initiate payment");
        return;
      }

      if (data.upgraded) {
        if (data.proratedAmount > 0) {
          toast.success(`🎉 Successfully switched to ${tier.name}! You've been charged a prorated amount of $${data.proratedAmount.toFixed(2)} for the remainder of this cycle.`, { duration: 8000 });
        } else {
          toast.success(`🎉 Successfully switched to ${tier.name}!`);
        }
        handleSuccess(tier.id);
        return;
      }

      // No payment method on file — collect card first via SetupIntent
      if (data.requiresSetup && data.setupClientSecret) {
        setSelectedTier(tier);
        setSetupClientSecret(data.setupClientSecret);
        setStep("setup");
        return;
      }

      setSelectedTier(tier);
      setClientSecret(data.clientSecret);
      setStep("payment");
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoadingTierId(null);
    }
  };

  const handleSuccess = async (tierId?: string) => {
    // Give webhook a tiny moment to start committing
    await new Promise((r) => setTimeout(r, 1000));
    onSuccess?.(tierId || selectedTier?.id || confirmTier?.id || "");
    onOpenChange(false);
  };

  const elementsOptions: StripeElementsOptions = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#0F172A",
            colorBackground: "#ffffff",
            colorText: "#1D1D1F",
            colorDanger: "#EF4444",
            fontFamily: "Inter, system-ui, sans-serif",
            borderRadius: "12px",
            spacingUnit: "5px",
          },
        },
      }
    : {};

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen, details: any) => { 
        if (required && (details?.reason === 'escape-key' || details?.reason === 'outside-press')) return; 
        onOpenChange(newOpen); 
      }}
      disablePointerDismissal={required}
    >
      <DialogContent showCloseButton={!required} className="bg-white border border-slate-200/80 rounded-3xl w-[95vw] sm:max-w-[640px] p-0 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto font-sans">
        
        {/* Modern SaaS Header */}
        <div className="px-6 md:px-8 pt-7 pb-4 border-b border-slate-100">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
                <Sparkles className="h-4 w-4 text-slate-700" />
              </div>
              <div>
                <DialogTitle className="text-xl md:text-2xl font-semibold text-[#1D1D1F] tracking-tight">
                  {step === "payment" && selectedTier ? `Subscribe to ${selectedTier.name}` 
                   : step === "setup" && selectedTier ? `Add Card to Upgrade to ${selectedTier.name}`
                   : title}
                </DialogTitle>
                {contextMessage && step === "plans" && (
                  <DialogDescription className="text-[#6E6E73] text-xs font-normal mt-0.5">
                    {contextMessage}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 md:p-8">
          {/* ── STEP 1: Plan Selection ── */}
          {step === "plans" && (
            <div className="space-y-4">
              {loadingTiers ? (
                // Loading skeleton
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="border border-slate-200 rounded-2xl p-5 animate-pulse bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="h-5 bg-slate-200 rounded-lg w-32" />
                          <div className="h-4 bg-slate-100 rounded-lg w-48" />
                        </div>
                        <div className="ml-6 space-y-2 flex flex-col items-end">
                          <div className="h-7 bg-slate-200 rounded-lg w-16" />
                          <div className="h-9 bg-slate-200 rounded-xl w-24" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                pricingTiers
                  .filter((tier) => tier.id !== currentTierId)
                  .map((tier) => {
                    const isCurrent = tier.id === currentTierId;
                    const isLoading = loadingTierId === tier.id;
                    const isDowngrade = currentTierId && tier.price < currentTierPrice;
                    const isDowngradeBlocked = isDowngrade && currentUserUnitCount > tier.maxUnits;

                    return (
                      <div
                        key={tier.id}
                        className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs transition-all font-sans relative ${
                          isCurrent
                            ? "opacity-60 cursor-default bg-slate-50/60"
                            : "hover:border-slate-300 hover:shadow-xs cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight">{tier.name}</h3>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                                  Current Plan
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-normal text-[#6E6E73]">
                              {tier.description || `Up to ${tier.maxUnits} units`}
                            </p>
                            {tier.features && tier.features.length > 0 && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                                {tier.features.slice(0, 3).map((f, i) => (
                                  <span key={i} className="flex items-center gap-1.5 text-xs font-normal text-[#6E6E73]">
                                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    {f}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">${tier.price}</span>
                              <span className="text-[#6E6E73] text-xs font-normal">/mo</span>
                            </div>
                            <Button
                              onClick={() => handleSelectPlan(tier)}
                              disabled={isCurrent || !!loadingTierId}
                              className={`h-9 px-4 rounded-xl font-medium text-xs transition-all border-none cursor-pointer flex items-center justify-center gap-2 ${
                                isCurrent
                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                  : isDowngradeBlocked
                                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-2xs"
                                  : "bg-slate-900 hover:bg-slate-800 text-white shadow-2xs"
                              }`}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                              ) : isCurrent ? (
                                "Active"
                              ) : isDowngradeBlocked ? (
                                "Downgrade"
                              ) : isDowngrade ? (
                                "Downgrade"
                              ) : (
                                "Upgrade Plan"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}

              <p className="text-center text-xs text-[#6E6E73] font-normal pt-2 flex items-center justify-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                All plans are billed monthly · Secure checkout via Stripe · Cancel anytime
              </p>
            </div>
          )}

          {/* ── STEP 1.5: Plan Switch Confirmation ── */}
          {step === "confirm" && confirmTier && (
            <div className="space-y-6">
              <div className={`p-6 rounded-2xl border ${confirmTier.price > currentTierPrice ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                <h3 className="text-base font-semibold text-[#1D1D1F] mb-2">
                  {confirmTier.price > currentTierPrice ? 'Upgrading to ' : 'Downgrading to '} {confirmTier.name}
                </h3>
                <p className="text-xs font-normal leading-relaxed text-[#6E6E73]">
                  {confirmTier.price > currentTierPrice ? (
                    "You are upgrading your subscription. You will be charged a prorated amount immediately to cover the remainder of your current billing cycle."
                  ) : (
                    "You are downgrading your subscription. The unused credit from your current plan will automatically apply to future invoices."
                  )}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("plans")}
                  className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs font-medium text-xs transition-all"
                  disabled={!!loadingTierId}
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => processPlanSwitch(confirmTier)}
                  disabled={!!loadingTierId}
                  className="flex-1 h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-2xs transition-all border-none cursor-pointer flex items-center justify-center gap-2"
                >
                  {loadingTierId ? (
                    <><Loader2 className="h-4 w-4 animate-spin text-white mr-1" /> Processing...</>
                  ) : (
                    "Confirm & Switch Plan"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 1.7: Downgrade Blocked ── */}
          {step === "downgrade_blocked" && selectedTier && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900">
                <h3 className="text-base font-semibold mb-2 flex items-center gap-2 text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  Unit Limit Exceeded
                </h3>
                <p className="text-xs font-normal leading-relaxed text-amber-800">
                  You currently have <span className="font-semibold">{currentUserUnitCount} active units</span> registered. 
                  The <span className="font-semibold">{selectedTier.name} plan</span> allows up to <span className="font-semibold">{selectedTier.maxUnits} units</span>.
                </p>
                <p className="text-xs font-normal leading-relaxed text-amber-800 mt-2">
                  Please delete at least <span className="font-semibold">{currentUserUnitCount - selectedTier.maxUnits} unit(s)</span> from your Properties tab to downgrade.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("plans")}
                  className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs font-medium text-xs transition-all"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    window.location.hash = "#properties";
                    const tabBtn = document.querySelector('[role="tab"][value="properties"]') as HTMLButtonElement;
                    if (tabBtn) tabBtn.click();
                  }}
                  className="flex-1 h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-2xs transition-all border-none cursor-pointer flex items-center justify-center"
                >
                  Manage Properties & Units
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Embedded Payment Form ── */}
          {step === "payment" && clientSecret && selectedTier && (
            <Elements stripe={stripePromise} options={elementsOptions}>
              <CheckoutForm
                tierName={selectedTier.name}
                tierPrice={Number(selectedTier.price)}
                onSuccess={handleSuccess}
                onBack={() => {
                  setStep("plans");
                  setClientSecret(null);
                  setSelectedTier(null);
                }}
              />
            </Elements>
          )}

          {step === "payment" && !clientSecret && (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
            </div>
          )}

          {/* ── STEP 2b: Setup Card (no payment method on file) ── */}
          {step === "setup" && setupClientSecret && selectedTier && (
            <Elements stripe={stripePromise} options={{ clientSecret: setupClientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#0F172A", borderRadius: "12px" } } }}>
              <SetupForm
                tierName={selectedTier.name}
                tierId={selectedTier.id}
                onSuccess={handleSuccess}
                onBack={() => {
                  setStep("plans");
                  setSetupClientSecret(null);
                  setSelectedTier(null);
                }}
              />
            </Elements>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
