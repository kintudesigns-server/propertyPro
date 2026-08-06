"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, ArrowRight, ShieldCheck, Layers } from "lucide-react";

interface PricingTier {
  id: string;
  name: string;
  price: number;
  maxUnits: number;
  features: string[];
}

interface DowngradePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: PricingTier | null;
  targetTier: PricingTier | null;
  currentUnits: number;
  onConfirm: (tierId: string) => Promise<void>;
}

export default function DowngradePlanModal({
  open,
  onOpenChange,
  currentTier,
  targetTier,
  currentUnits = 0,
  onConfirm,
}: DowngradePlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!targetTier || !currentTier) return null;

  const isLimitExceeded = currentUnits > targetTier.maxUnits;
  const isFreeDowngrade = targetTier.price === 0;

  const handleConfirm = async () => {
    if (isLimitExceeded) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await onConfirm(targetTier.id);
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process downgrade.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) setErrorMsg(null);
    }}>
      <DialogContent className="sm:max-w-lg p-0 bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-2xl font-sans">
        {/* Top Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
              <Layers className="h-4 w-4 text-slate-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-semibold text-[#1D1D1F] tracking-tight">Confirm Plan Downgrade</DialogTitle>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">Plan Change</span>
              </div>
              <DialogDescription className="text-[#6E6E73] text-xs font-normal mt-0.5">
                Review changes to your subscription features and billing terms.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Comparison Card */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4.5 rounded-2xl border border-slate-200/80">
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-[#6E6E73] uppercase tracking-wider">Current Plan</p>
              <p className="font-semibold text-[#1D1D1F] text-base">{currentTier.name}</p>
              <p className="text-xs font-normal text-[#6E6E73]">${currentTier.price}/mo</p>
            </div>
            <div className="border-l border-slate-200 pl-4 space-y-1 relative">
              <ArrowRight className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 bg-white border border-slate-200 rounded-full p-0.5 shadow-2xs" />
              <p className="text-[10px] font-medium text-slate-700 uppercase tracking-wider">Target Plan</p>
              <p className="font-semibold text-[#1D1D1F] text-base">{targetTier.name}</p>
              <p className="text-xs font-normal text-[#6E6E73]">${targetTier.price}/mo</p>
            </div>
          </div>

          {/* Unit Over-limit Alert Box */}
          {isLimitExceeded ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-900 text-xs">Limit Exceeded</p>
                <p className="text-xs text-rose-800 font-normal">
                  You currently have <strong>{currentUnits}</strong> units, but the <strong>{targetTier.name}</strong> plan only allows up to <strong>{targetTier.maxUnits}</strong> units. You must delete at least <strong>{currentUnits - targetTier.maxUnits}</strong> unit(s) before you can downgrade.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900 leading-relaxed font-normal">
              <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                {isFreeDowngrade ? (
                  <p>
                    Your subscription will cancel at the end of the current billing cycle. You will keep your current features until then, and your data will be preserved under the free tier limits.
                  </p>
                ) : (
                  <p>
                    Your downgrade to the {targetTier.name} plan is scheduled for the end of your current billing period. Stripe will update your invoice amount for the next billing cycle.
                  </p>
                )}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl">
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
              className="flex-1 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-2xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={loading || isLimitExceeded}
              className="flex-1 h-9 rounded-xl font-medium text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-all border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white mr-1" />
                  Downgrading...
                </>
              ) : (
                "Confirm Downgrade"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
