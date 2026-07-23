"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Sparkles, Loader2, Frown, HeartHandshake, X } from "lucide-react";
import { toast } from "sonner";

interface CancellationRetentionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmCancel: () => void; // Standard Stripe portal redirect
  activePropertyCount?: number;
  activeLeaseCount?: number;
}

export default function CancellationRetentionModal({
  open,
  onOpenChange,
  onConfirmCancel,
  activePropertyCount = 0,
  activeLeaseCount = 0,
}: CancellationRetentionModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [redeemed, setRedeemed] = useState(false);

  const handleAcceptGift = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (res.ok) {
        setRedeemed(true);
        toast.success("🎁 1 Month Free has been successfully applied to your plan! Thank you for staying.");
        setTimeout(() => {
          onOpenChange(false);
          // Reload page to show the history record and changes
          window.location.reload();
        }, 3000);
      } else {
        toast.error(data.error || "Failed to apply discount. Please try again.");
      }
    } catch {
      toast.error("Failed to apply discount. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-0 rounded-[28px] max-w-md p-8 shadow-2xl overflow-hidden">
        
        {/* Step 1: Warning what they will lose */}
        {step === 1 && (
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center animate-bounce">
              <Frown className="h-8 w-8" />
            </div>
            
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900 leading-tight">
                Wait! Don't Go Just Yet...
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-sm font-medium mt-1">
                We're sad to see you go. Cancelling your subscription means you'll lose immediate access to these core features:
              </DialogDescription>
            </DialogHeader>

            {/* Core loss checklist card */}
            <div className="w-full bg-slate-50 rounded-2xl p-5 border border-slate-100 text-left space-y-3.5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-slate-700">
                  Access to your registered <span className="text-slate-900 font-bold">{activePropertyCount} active properties</span> and units.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-slate-700">
                  Management of <span className="text-slate-900 font-bold">{activeLeaseCount} active tenant agreements</span>.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-slate-700">
                  Automated Stripe rent invoicing, collection, and inspection trackers.
                </p>
              </div>
            </div>

            <div className="w-full space-y-2.5 pt-2">
              <Button
                onClick={() => setStep(2)}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/10 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                See Special Offer
              </Button>
              <Button
                variant="ghost"
                onClick={onConfirmCancel}
                className="w-full h-11 text-[#6E6E73] hover:text-red-600 hover:bg-red-50 font-bold rounded-xl"
              >
                Cancel Anyway
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Special retention offer (1 month free) */}
        {step === 2 && (
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <HeartHandshake className="h-8 w-8" />
            </div>

            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900 leading-tight">
                {redeemed ? "Offer Redeemed!" : "Stay With Us — 1 Month Free!"}
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-sm font-medium mt-1">
                {redeemed 
                  ? "We've added a 100% discount on your next monthly invoice. Happy leasing!"
                  : "We value you as a landlord. Let us cover your subscription fee for the next 30 days. No catch, cancel anytime."}
              </DialogDescription>
            </DialogHeader>

            {!redeemed && (
              <div className="w-full bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute right-0 top-0 h-24 w-24 bg-white/10 rounded-full blur-2xl" />
                
                <h4 className="text-sm font-extrabold uppercase tracking-widest opacity-80">Landlord Support Gift</h4>
                <p className="text-4xl font-black mt-2">30 Days Free</p>
                <p className="text-[11px] font-medium opacity-80 mt-2">Applied directly to your active plan</p>
              </div>
            )}

            <div className="w-full space-y-2.5 pt-2">
              {!redeemed ? (
                <>
                  <Button
                    onClick={handleAcceptGift}
                    disabled={loading}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Claim Free Month
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={onConfirmCancel}
                    disabled={loading}
                    className="w-full h-11 text-[#6E6E73] hover:text-slate-700 font-bold rounded-xl"
                  >
                    Cancel Anyway
                  </Button>
                </>
              ) : (
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 py-3 rounded-xl border border-emerald-100 w-full">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  Refreshing portal...
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
