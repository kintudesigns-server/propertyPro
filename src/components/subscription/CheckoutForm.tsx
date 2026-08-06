"use client";

import React, { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Lock, Shield } from "lucide-react";
import { toast } from "sonner";

export default function CheckoutForm({
  tierName,
  tierPrice,
  onSuccess,
  onBack,
}: {
  tierName: string;
  tierPrice: number;
  onSuccess: () => void;
  onBack?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [ready, setReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMsg("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/owner?subscribed=true`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMsg(error.message || "Payment failed. Please try again.");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      toast.success("🎉 Subscription activated! Setting up your account...");
      onSuccess();
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 font-sans">
      {/* Plan Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between text-white shadow-2xs">
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Subscribing to</p>
          <p className="text-xl font-semibold tracking-tight text-white">{tierName}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="text-xs text-slate-300 font-normal">Cancel anytime · Secure payment</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tracking-tight text-white">${tierPrice}</p>
          <p className="text-xs text-slate-400 font-normal">/month</p>
        </div>
      </div>

      {/* Stripe PaymentElement */}
      <div className={`transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}>
        <PaymentElement
          onReady={() => setReady(true)}
          options={{
            layout: "tabs",
            fields: {
              billingDetails: {
                address: { country: "auto" },
              },
            },
          }}
        />
      </div>

      {!ready && (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-700" />
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium px-4 py-3 rounded-xl">
          {errorMsg}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-2xs"
            disabled={isProcessing}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            Back
          </Button>
        )}
        <Button
          type="submit"
          disabled={!stripe || !elements || isProcessing || !ready}
          className="flex-1 h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-2xs transition-all border-none cursor-pointer flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white mr-1" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5 mr-1" />
              Subscribe · ${tierPrice}/mo
            </>
          )}
        </Button>
      </div>

      <p className="text-center text-xs text-[#6E6E73] font-normal flex items-center justify-center gap-1.5">
        <Lock className="h-3.5 w-3.5 text-slate-400" />
        Secured by Stripe · 256-bit SSL encryption
      </p>
    </form>
  );
}
