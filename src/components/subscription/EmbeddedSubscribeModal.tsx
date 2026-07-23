"use client";

import React, { useState, useEffect } from "react";
import {
  loadStripe,
  StripeElementsOptions,
} from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, ArrowLeft, Lock, Zap, Shield, AlertTriangle } from "lucide-react";
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
  title = "Choose Your Plan",
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
    const isDowngrade = currentTierId && tier.price < currentTierPrice;
    const isDowngradeBlocked = isDowngrade && currentUserUnitCount > tier.maxUnits;

    if (isDowngradeBlocked) {
      setSelectedTier(tier);
      setStep("downgrade_blocked" as any);
      return;
    }

    // If user already has a plan and is switching, show confirmation
    if (currentTierId && tier.id !== currentTierId) {
      setConfirmTier(tier);
      setStep("confirm");
    } else {
      processPlanSwitch(tier);
    }
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
            colorPrimary: "#0062CC",
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
      <DialogContent showCloseButton={!required} className="bg-white border-0 rounded-[28px] w-[95vw] sm:max-w-[680px] p-0 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-slate-900 leading-tight">
                  {step === "payment" && selectedTier ? `Subscribe to ${selectedTier.name}` 
                   : step === "setup" && selectedTier ? `Add Card to Upgrade to ${selectedTier.name}`
                   : title}
                </DialogTitle>
                {contextMessage && step === "plans" && (
                  <DialogDescription className="text-[#6E6E73] text-sm font-medium mt-0.5">
                    {contextMessage}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-8 pb-8">
          {/* ── STEP 1: Plan Selection ── */}
          {step === "plans" && (
            <div className="space-y-4">
              {loadingTiers ? (
                // Loading skeleton
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border-2 border-slate-100 rounded-2xl p-5 animate-pulse">
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
                      className={`border-2 rounded-2xl p-5 transition-all ${
                        isCurrent
                          ? "border-slate-200 bg-slate-50 opacity-70 cursor-default"
                          : "border-slate-200 hover:border-blue-400 hover:shadow-md hover:shadow-blue-50 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-black text-slate-900 text-lg">{tier.name}</h3>
                            {isCurrent && (
                              <Badge className="bg-slate-200 text-[#6E6E73] hover:bg-slate-200 border-0 rounded-lg text-[10px] font-bold px-2">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-[#6E6E73] mb-3">
                            {tier.description || `Up to ${tier.maxUnits} units`}
                          </p>
                          {tier.features && tier.features.length > 0 && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {tier.features.slice(0, 3).map((f, i) => (
                                <span key={i} className="flex items-center gap-1.5 text-xs font-medium text-[#6E6E73]">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="ml-6 flex flex-col items-end gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-2xl font-black text-slate-900">${tier.price}</span>
                            <span className="text-[#6E6E73] text-xs font-medium">/mo</span>
                          </div>
                          <Button
                            onClick={() => handleSelectPlan(tier)}
                            disabled={isCurrent || !!loadingTierId}
                            className={`h-9 px-5 rounded-xl font-bold text-sm transition-all ${
                              isCurrent
                                ? "bg-slate-200 text-[#8E8E93] cursor-not-allowed"
                                : isDowngradeBlocked
                                ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 shadow-sm"
                                : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                            }`}
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isCurrent ? (
                              "Active"
                            ) : isDowngradeBlocked ? (
                              "Downgrade"
                            ) : isDowngrade ? (
                              "Downgrade"
                            ) : (
                              "Upgrade"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              <p className="text-center text-[11px] text-[#8E8E93] font-medium pt-2 flex items-center justify-center gap-1.5">
                <Lock className="h-3 w-3" />
                All plans are billed monthly · Cancel anytime
              </p>
            </div>
          )}

          {/* ── STEP 1.5: Plan Switch Confirmation ── */}
          {step === "confirm" && confirmTier && (
            <div className="space-y-6">
              <div className={`p-6 rounded-2xl border ${confirmTier.price > currentTierPrice ? 'bg-blue-50 border-blue-100 text-blue-900' : 'bg-amber-50 border-amber-100 text-amber-900'}`}>
                <h3 className="text-lg font-black mb-2">
                  {confirmTier.price > currentTierPrice ? 'Upgrading to ' : 'Downgrading to '} {confirmTier.name}
                </h3>
                <p className="text-sm font-medium leading-relaxed opacity-90">
                  {confirmTier.price > currentTierPrice ? (
                    "You are about to upgrade your subscription. You will be immediately charged a prorated amount to cover the remainder of your current billing cycle."
                  ) : (
                    "You are about to downgrade your subscription. You will not be charged today. The unused time from your current plan will be automatically deposited into your Stripe wallet as a credit, which will be applied to your future invoices."
                  )}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("plans")}
                  className="h-12 px-5 rounded-xl border-slate-200 font-bold text-[#6E6E73] hover:bg-[#F5F5F7]"
                  disabled={!!loadingTierId}
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back to Plans
                </Button>
                <Button
                  type="button"
                  onClick={() => processPlanSwitch(confirmTier)}
                  disabled={!!loadingTierId}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-60"
                >
                  {loadingTierId ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
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
              <div className="p-6 rounded-2xl border border-red-100 bg-red-50 text-red-900">
                <h3 className="text-lg font-black mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                  Downgrade Blocked
                </h3>
                <p className="text-sm font-medium leading-relaxed opacity-90">
                  You currently have <span className="font-bold">{currentUserUnitCount} active units</span> registered. 
                  The <span className="font-bold">{selectedTier.name} plan</span> only allows up to <span className="font-bold">{selectedTier.maxUnits} units</span>.
                </p>
                <p className="text-sm font-medium leading-relaxed opacity-90 mt-2">
                  To downgrade, please archive at least <span className="font-bold">{currentUserUnitCount - selectedTier.maxUnits} unit(s)</span> from your Properties tab, then return here.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("plans")}
                  className="h-12 px-5 rounded-xl border-slate-200 font-bold text-[#6E6E73] hover:bg-[#F5F5F7]"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back to Plans
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    // Navigate to properties hash/tab
                    window.location.hash = "#properties";
                    // If they are on owner dashboard page, they can also trigger tab change directly
                    const tabBtn = document.querySelector('[role="tab"][value="properties"]') as HTMLButtonElement;
                    if (tabBtn) tabBtn.click();
                  }}
                  className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all"
                >
                  Go to Properties & Manage Units
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
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}

          {/* ── STEP 2b: Setup Card (no payment method on file) ── */}
          {step === "setup" && setupClientSecret && selectedTier && (
            <Elements stripe={stripePromise} options={{ clientSecret: setupClientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#0062CC", borderRadius: "12px" } } }}>
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
