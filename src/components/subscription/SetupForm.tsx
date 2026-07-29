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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3 items-start">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-900">No payment method on file</p>
          <p className="text-xs text-amber-700 mt-0.5">Add a card below to upgrade to <strong>{tierName}</strong>. Your card will be saved for future billing.</p>
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
          <Button type="button" variant="outline" onClick={onBack} className="h-12 px-5 rounded-xl border-slate-200 font-bold text-[#6E6E73]" disabled={isProcessing}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </Button>
        )}
        <Button type="submit" disabled={!stripe || !elements || isProcessing || !ready} className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20">
          {isProcessing ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</>) : (<><Lock className="h-4 w-4 mr-2" />Save Card & Upgrade</>)}
        </Button>
      </div>
      <p className="text-center text-[11px] text-[#8E8E93] font-medium flex items-center justify-center gap-1.5">
        <Lock className="h-3 w-3" /> Secured by Stripe · 256-bit SSL encryption
      </p>
    </form>
  );
}
