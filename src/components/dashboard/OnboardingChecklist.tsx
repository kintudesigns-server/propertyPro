"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight, X, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface OnboardingChecklistProps {
  userId?: string;
  hasProperty?: boolean;
  hasUnit?: boolean;
  hasTenant?: boolean;
  hasPayment?: boolean;
}

export function OnboardingChecklist({
  userId = "user",
  hasProperty = false,
  hasUnit = false,
  hasTenant = false,
  hasPayment = false,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false);
  const storageKey = `pp_onboarding_dismissed_${userId}`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDismissed = localStorage.getItem(storageKey);
      if (isDismissed) setDismissed(true);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, "true");
    }
  };

  const steps = [
    { id: 1, label: "Account created & profile set", done: true, href: "/dashboard/settings" },
    { id: 2, label: "Add your first property", done: hasProperty, href: "/dashboard/properties/new" },
    { id: 3, label: "Add a unit to property", done: hasUnit, href: "/dashboard/properties" },
    { id: 4, label: "Invite a tenant", done: hasTenant, href: "/dashboard/tenants/new" },
    { id: 5, label: "Set up payment collection", done: hasPayment, href: "/dashboard/payments" },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  if (dismissed || completedCount === steps.length) return null;

  return (
    <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl border border-slate-700 shadow-md mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
        <Sparkles className="h-32 w-32 text-white" />
      </div>

      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">Quick Setup Guide</h3>
              <p className="text-xs text-slate-300">Complete these steps to unlock full property automation</p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-700/60 rounded-full h-2 mb-5 overflow-hidden">
          <div
            className="bg-emerald-400 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {steps.map((step) => (
            <Link
              key={step.id}
              href={step.href}
              className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                step.done
                  ? "bg-white/5 border-emerald-500/30 text-slate-300"
                  : "bg-white/10 border-white/15 text-white hover:bg-white/15"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-400 shrink-0" />
                )}
                <span className="text-xs font-bold line-clamp-1">{step.label}</span>
              </div>
              <div className="flex items-center justify-end text-[10px] font-semibold text-slate-300">
                {step.done ? "Completed" : "Start"} <ArrowRight className="h-3 w-3 ml-1" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
