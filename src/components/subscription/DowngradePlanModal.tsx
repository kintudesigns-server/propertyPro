"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

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
      <DialogContent className="sm:max-w-lg p-0 bg-white rounded-[28px] overflow-hidden border-0 shadow-2xl">
        {/* Top Header/Warning Banner */}
        <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-red-650 text-white p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-6 translate-x-6" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/20 rounded-full blur-xl -translate-x-6 translate-y-6" />
          
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs font-bold tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
              Plan Downgrade
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-3">Confirm Plan Change</h2>
          <p className="text-orange-100 text-sm font-medium mt-1">
            Review changes to your subscription features and billing terms.
          </p>
        </div>

        <div className="p-8 space-y-6">
          {/* Comparison Card */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4.5 rounded-2xl border border-slate-100">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Plan</p>
              <p className="font-extrabold text-slate-800 text-base">{currentTier.name}</p>
              <p className="text-xs font-bold text-slate-500">${currentTier.price}/mo</p>
            </div>
            <div className="border-l border-slate-200 pl-4 space-y-1 relative">
              <ArrowRight className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-500 bg-white border border-slate-100 rounded-full p-0.5" />
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Target Plan</p>
              <p className="font-extrabold text-slate-900 text-base">{targetTier.name}</p>
              <p className="text-xs font-bold text-slate-650">${targetTier.price}/mo</p>
            </div>
          </div>

          {/* Unit Over-limit Alert Box */}
          {isLimitExceeded ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-650 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-red-900 text-sm">Limit Exceeded</p>
                <p className="text-xs text-red-750">
                  You currently have <strong>{currentUnits}</strong> units, but the <strong>{targetTier.name}</strong> plan only allows up to <strong>{targetTier.maxUnits}</strong> units. You must delete at least <strong>{currentUnits - targetTier.maxUnits}</strong> unit(s) before you can downgrade.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900 leading-relaxed font-medium">
              <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                {isFreeDowngrade ? (
                  <p>
                    Your subscription will cancel at the end of the current billing cycle. You will keep your current features until then, and your data will be preserved under the free Hobbyist tier limits.
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
              className="flex-1 h-12 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={loading || isLimitExceeded}
              className="flex-1 h-12 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
