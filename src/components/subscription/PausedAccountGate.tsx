"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { PauseCircle, ArrowRight, Lock } from "lucide-react";
import Link from "next/link";

interface PausedAccountGateProps {
  isLocked: boolean;
  planName?: string | null;
  reason: string; // e.g. "Adding new properties", "Lease creation"
  children: React.ReactNode;
  allowedActions?: string[];
  gracePeriodEnd?: string | Date | null;
  pausedAt?: string | Date | null;
}

export default function PausedAccountGate({
  isLocked,
  planName,
  reason,
  children,
  allowedActions = [
    "Your existing properties and tenant data remain safe and untouched.",
    "You can still view files, access reports, and manage tenant details.",
  ],
  gracePeriodEnd,
  pausedAt,
}: PausedAccountGateProps) {
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-6 relative">
      {/* Premium Amber Lock Card */}
      <div className="bg-[#FFF9E6] border border-[#FFE0A3] rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#FFF0CC] rounded-2xl shrink-0 text-[#B25E00]">
            <PauseCircle className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-[#5C3300] leading-tight">
                Account Access Suspended
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFE0A3] text-[#804400]">
                <Lock className="h-3 w-3" /> Locked
              </span>
            </div>
            
            {(() => {
              if (!pausedAt) return null;
              const pausedDate = new Date(pausedAt);
              const archivalDate = new Date(pausedDate.getTime() + 60 * 24 * 60 * 60 * 1000);
              const now = new Date();
              const diffTime = archivalDate.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              let text = "";
              let colorClass = "";
              
              if (diffDays < 0) {
                text = "Flagged for manual database archival review due to prolonged inactivity.";
                colorClass = "text-red-700 bg-red-100/60 border-red-200";
              } else if (diffDays <= 7) {
                text = `${diffDays} days remaining before automatic database archival review warning.`;
                colorClass = "text-red-700 bg-red-100/60 border-red-200 animate-pulse";
              } else {
                text = `${diffDays} days remaining before database archival review.`;
                colorClass = "text-amber-700 bg-amber-100/60 border-[#FFE0A3]";
              }
              
              return (
                <div className={`mt-2 px-3 py-1 rounded-full border text-[11px] font-bold flex items-center gap-1.5 w-fit ${colorClass}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  {text}
                </div>
              );
            })()}
            
            <p className="text-sm font-semibold text-[#804400] mt-1.5">
              {reason} is restricted because your subscription ({planName ? `Plan: ${planName}` : "your plan"}) is currently paused due to a billing issue.
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="text-xs font-bold text-[#804400] uppercase tracking-wider">What this means for you:</div>
              {allowedActions.map((action, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-[#5C3300]">
                  <span className="mt-0.5 text-[#B25E00] font-bold">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: action }} />
                </div>
              ))}
              <div className="flex items-start gap-2.5 text-sm text-[#5C3300]">
                <span className="mt-0.5 text-[#D9383A] font-black">✗</span>
                <span>This form is locked and cannot be submitted.</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/dashboard/owner/billing">
                <Button className="bg-[#B25E00] hover:bg-[#804400] text-white font-bold rounded-xl h-10 px-5 text-sm shadow-xs flex items-center gap-2 transition-all">
                  Reactivate Subscription <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" className="font-bold text-[#804400] hover:bg-[#FFF0CC] rounded-xl h-10 px-4 text-sm">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Grayed-out Disabled Wrapper */}
      <div className="pointer-events-none opacity-40 select-none transition-all duration-300">
        {children}
      </div>
    </div>
  );
}
