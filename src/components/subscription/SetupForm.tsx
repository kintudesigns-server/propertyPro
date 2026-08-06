"use client";

import React, { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function SetupForm({
  tierName,
  tierId,
  onSuccess,
  onBack,
}: {
  tierName: string;
  tierId: string;
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

    // 1. Confirm the setup intent to save the card
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: `${window.location.origin}/dashboard/owner` },
      redirect: "if_required",
    });

    if (error) {
      setErrorMsg(error.message || "Card setup failed. Please try again.");
      setIsProcessing(false);
      return;
    }

    // 2. Set as default payment method and apply the upgrade
    const pmId = typeof setupIntent?.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent?.payment_method?.id;

    if (!pmId) {
      setErrorMsg("Could not retrieve payment method. Please try again.");
      setIsProcessing(false);
      return;
    }

    try {
      // Attach PM as default then re-trigger subscribe
      await fetch("/api/stripe/saved-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: pmId, setAsDefault: true }),
      });

      // Now retry the subscribe — payment method is now on file
      const res = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to apply plan upgrade. Please try again.");
        setIsProcessing(false);
        return;
      }

      if (data.clientSecret) {
        // Payment requires further action or confirmation
        const { error: confirmError } = await stripe.confirmPayment({
          elements,
          clientSecret: data.clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}/dashboard/owner?subscribed=true`,
          },
          redirect: "if_required",
        });

        if (confirmError) {
          setErrorMsg(confirmError.message || "Payment confirmation failed. Please try again.");
          setIsProcessing(false);
          return;
        }
      }

      toast.success(`🎉 Payment method saved and upgraded to ${tierName}!`);
      onSuccess();
    } catch {
      setErrorMsg("Something went wrong applying your upgrade. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 font-sans">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex gap-3 items-start">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-amber-900">Payment method required</p>
          <p className="text-xs text-amber-800 font-normal mt-0.5">Add a card below to upgrade to <strong>{tierName}</strong>. Your card will be saved securely for future billing.</p>
        </div>
      </div>

      <div className={`transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}>
        <PaymentElement
          onReady={() => setReady(true)}
          options={{ layout: "tabs", fields: { billingDetails: { address: { country: "auto" } } } }}
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
          <Button type="button" variant="outline" onClick={onBack} className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-2xs" disabled={isProcessing}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Back
          </Button>
        )}
        <Button type="submit" disabled={!stripe || !elements || isProcessing || !ready} className="flex-1 h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-2xs transition-all border-none cursor-pointer flex items-center justify-center gap-2">
          {isProcessing ? (<><Loader2 className="h-4 w-4 animate-spin text-white mr-1" />Processing...</>) : (<><Lock className="h-3.5 w-3.5 mr-1" />Save Card & Upgrade</>)}
        </Button>
      </div>
      <p className="text-center text-xs text-[#6E6E73] font-normal flex items-center justify-center gap-1.5">
        <Lock className="h-3.5 w-3.5 text-slate-400" /> Secured by Stripe · 256-bit SSL encryption
      </p>
    </form>
  );
}
