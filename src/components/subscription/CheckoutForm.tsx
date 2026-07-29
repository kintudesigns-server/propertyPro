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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Plan Summary */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 flex items-center justify-between text-white">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Subscribing to</p>
          <p className="text-xl font-black">{tierName}</p>
          <div className="flex items-center gap-2 mt-2">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-slate-400 font-medium">Cancel anytime · Secure payment</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black">${tierPrice}</p>
          <p className="text-xs text-slate-400 font-medium">/month</p>
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
          <Loader2 className="h-6 w-6 animate-spin text-[#8E8E93]" />
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-xl">
          {errorMsg}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="h-12 px-5 rounded-xl border-slate-200 font-bold text-[#6E6E73] hover:bg-[#F5F5F7]"
            disabled={isProcessing}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        )}
        <Button
          type="submit"
          disabled={!stripe || !elements || isProcessing || !ready}
          className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-60"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Subscribe · ${tierPrice}/mo
            </>
          )}
        </Button>
      </div>

      <p className="text-center text-[11px] text-[#8E8E93] font-medium flex items-center justify-center gap-1.5">
        <Lock className="h-3 w-3" />
        Secured by Stripe · 256-bit SSL encryption
      </p>
    </form>
  );
}
