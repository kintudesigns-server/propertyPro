"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard, Lock, Loader2, ShieldCheck, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateLuhn, formatCardNumber, detectCardBrand, validateExpiry } from "@/lib/card-utils";

export interface MockCardFormProps {
  onSuccess: (details: {
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
    cardholderName: string;
    mockPaymentMethodId: string;
  }) => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  submitButtonText?: string;
  cancelButtonText?: string;
  onCancel?: () => void;
}

export function MockCardForm({
  onSuccess,
  isSubmitting,
  setIsSubmitting,
  submitButtonText = "Save Card Securely",
  cancelButtonText = "Cancel",
  onCancel,
}: MockCardFormProps) {
  // Card Fields
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState(""); // MM / YY format
  const [cvv, setCvv] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const cardBrand = detectCardBrand(cardNumber);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    const cleanedNumber = cardNumber.replace(/\D/g, "");
    if (!cleanedNumber) newErrors.cardNumber = "Required";
    else if (cleanedNumber.length < 13 || cleanedNumber.length > 19) newErrors.cardNumber = "Invalid length";
    else if (!validateLuhn(cleanedNumber)) newErrors.cardNumber = "Invalid card number";

    if (!expiry) newErrors.expiry = "Required";
    else {
      const [m, y] = expiry.split("/").map(s => s.trim());
      if (!m || !y || m.length !== 2 || y.length !== 2) newErrors.expiry = "Use MM/YY format";
      else {
        const fullYear = parseInt("20" + y);
        if (!validateExpiry(m, fullYear.toString())) newErrors.expiry = "Expired";
      }
    }

    if (!cvv) newErrors.cvv = "Required";
    else if (cvv.length < 3) newErrors.cvv = "Invalid";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.substring(0, 4);
    
    if (value.length > 2) {
      value = value.substring(0, 2) + "/" + value.substring(2);
    }
    setExpiry(value);
    if (touched.expiry) validate();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ cardNumber: true, expiry: true, cvv: true });

    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const mockId = "pm_mock_" + Math.random().toString(36).substring(7);
      const [m, y] = expiry.split("/").map(s => s.trim());

      onSuccess({
        brand: cardBrand || "visa",
        last4: cardNumber.replace(/\s/g, "").slice(-4) || "4242",
        expiryMonth: parseInt(m) || 12,
        expiryYear: parseInt("20" + y) || 2028,
        cardholderName: cardName || "Demo User",
        mockPaymentMethodId: mockId,
      });
    }, 1200);
  };

  const getBrandLogo = (brand: string) => {
    switch (brand) {
      case "visa":
        return <span className="text-[#1A1F71] font-black italic text-lg select-none">VISA</span>;
      case "mastercard":
        return (
          <div className="flex -space-x-1.5 select-none">
            <div className="w-5 h-5 rounded-full bg-[#EB001B] opacity-90" />
            <div className="w-5 h-5 rounded-full bg-[#FF5F00] opacity-90" />
          </div>
        );
      case "amex":
        return (
          <span className="bg-[#0070D1] text-white px-1.5 py-0.5 rounded text-[10px] font-black tracking-tighter select-none">
            AMEX
          </span>
        );
      case "discover":
        return <span className="text-[#FF6600] font-black italic text-[11px] select-none">DISCOVER</span>;
      default:
        return <CreditCard className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Info */}
      <div className="rounded-xl bg-amber-50 p-4 border border-amber-200">
        <p className="font-bold flex items-center gap-2 text-amber-900 text-xs uppercase tracking-wider">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          Stripe Demo Simulation
        </p>
        <p className="mt-1 text-xs text-amber-700 leading-relaxed">
          No live Stripe connection detected. Real cards will not be charged. Use any valid test card (e.g. 4242 •••• •••• 4242).
        </p>
      </div>

      {/* Visual Credit Card Preview */}
      <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden h-44 flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-10 -translate-x-10" />
        
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Cardholder</p>
            <p className="text-white font-bold text-sm truncate max-w-[180px] mt-0.5">
              {cardName.toUpperCase() || "YOUR NAME"}
            </p>
          </div>
          <div className="h-8 flex items-center">{getBrandLogo(cardBrand)}</div>
        </div>

        <div className="relative z-10">
          <p className="text-xl font-mono font-bold tracking-widest">
            {cardNumber || "•••• •••• •••• ••••"}
          </p>
        </div>

        <div className="relative z-10 flex justify-between items-end">
          <div>
            <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Expires</p>
            <p className="text-xs font-mono font-bold mt-0.5">{expiry || "MM/YY"}</p>
          </div>
          <div>
            <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest text-right">CVV</p>
            <p className="text-xs font-mono font-bold mt-0.5 text-right">{cvv || "•••"}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-[#0F172A]">Cardholder Name</Label>
          <Input
            placeholder="Jane Doe"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            className="h-11 rounded-xl border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#635BFF]"
          />
        </div>

        {/* Card Number */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-[#0F172A]">Card Number</Label>
          <div className="relative">
            <Input
              placeholder="4242 4242 4242 4242"
              value={cardNumber}
              onChange={(e) => {
                setCardNumber(formatCardNumber(e.target.value));
                if (touched.cardNumber) validate();
              }}
              onBlur={() => setTouched(prev => ({ ...prev, cardNumber: true }))}
              maxLength={19}
              className={cn(
                "h-11 rounded-xl border-[#E2E8F0] pr-12 font-mono focus-visible:ring-1 focus-visible:ring-[#635BFF]",
                errors.cardNumber && touched.cardNumber && "border-red-300 bg-red-50/30 focus-visible:ring-red-500"
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              {getBrandLogo(cardBrand)}
            </div>
          </div>
          {errors.cardNumber && touched.cardNumber && (
            <p className="text-xs text-red-500 font-medium">{errors.cardNumber}</p>
          )}
        </div>

        {/* Expiry & CVV */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-[#0F172A]">Expiration Date</Label>
            <Input
              placeholder="MM/YY"
              value={expiry}
              onChange={handleExpiryChange}
              onBlur={() => setTouched(prev => ({ ...prev, expiry: true }))}
              maxLength={5}
              className={cn(
                "h-11 rounded-xl border-[#E2E8F0] font-mono text-center focus-visible:ring-1 focus-visible:ring-[#635BFF]",
                errors.expiry && touched.expiry && "border-red-300 bg-red-50/30 focus-visible:ring-red-500"
              )}
            />
            {errors.expiry && touched.expiry && (
              <p className="text-xs text-red-500 font-medium">{errors.expiry}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-[#0F172A]">CVV</Label>
            <Input
              placeholder="123"
              value={cvv}
              onChange={(e) => {
                setCvv(e.target.value.replace(/\D/g, "").substring(0, 4));
                if (touched.cvv) validate();
              }}
              onBlur={() => setTouched(prev => ({ ...prev, cvv: true }))}
              maxLength={4}
              className={cn(
                "h-11 rounded-xl border-[#E2E8F0] font-mono text-center focus-visible:ring-1 focus-visible:ring-[#635BFF]",
                errors.cvv && touched.cvv && "border-red-300 bg-red-50/30 focus-visible:ring-red-500"
              )}
            />
            {errors.cvv && touched.cvv && (
              <p className="text-xs text-red-500 font-medium">{errors.cvv}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Lock className="h-3.5 w-3.5" />
          <span>Secure AES-256 simulation · Simulated SSL Certificate</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 h-11 rounded-xl border-[#E2E8F0] font-semibold text-sm"
            >
              {cancelButtonText}
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-[2] h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md text-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              <><Lock className="h-4 w-4" /> {submitButtonText}</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
