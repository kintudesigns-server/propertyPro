"use client";

import React from "react";
import { ShieldAlert, Lock, Clock, Calendar, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface FeatureBlockedBannerProps {
  featureKey?: string;
  featureLabel?: string;
  reason?: string;
  adminNote?: string;
  expiresAt?: string | null;
  daysRemaining?: number | null;
  blockedAt?: string | null;
  children?: React.ReactNode;
}

export default function FeatureBlockedBanner({
  featureKey,
  featureLabel = "This Feature",
  reason = "Access to this feature has been restricted by platform administration.",
  adminNote,
  expiresAt,
  daysRemaining,
  blockedAt,
  children,
}: FeatureBlockedBannerProps) {
  const router = useRouter();

  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="relative w-full min-h-screen">
      {/* Background Page Content — Full 100% Width & Height of real page, blurred */}
      <div className="w-full pointer-events-none select-none filter blur-[2.5px] opacity-75">
        {children}
      </div>

      {/* Fixed Overlay Container — Perfectly Centered relative to Main Workspace */}
      <div className="fixed inset-0 pl-0 md:pl-64 w-full h-full backdrop-blur-[2px] flex items-center justify-center p-4 sm:p-6 z-30 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(15,23,42,0.22) 0%, rgba(30,27,75,0.18) 100%)"
        }}
      >
        {/* ─── ADMIN BLOCK CARD — Clean Single-Surface Production Card ─── */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-[0_8px_40px_-4px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/8 animate-in fade-in zoom-in-95 duration-300 pointer-events-auto overflow-hidden">
          
          {/* Thin red top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-red-500 via-red-400 to-orange-400" />

          <div className="p-6 space-y-5">
            {/* Icon + Badge row */}
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                <ShieldAlert size={22} className="text-red-500 stroke-[1.8]" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-50 border border-red-100 rounded-full mb-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">Restricted</span>
                </div>
                <h2 className="text-[15px] font-bold text-[#111111] tracking-tight leading-tight">
                  {featureLabel} Access Restricted
                </h2>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-100" />

            {/* Reason */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reason</p>
              <p className="text-[13px] text-slate-700 leading-relaxed">
                {adminNote || reason}
              </p>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Timeline</p>
                <span className="text-[12px] font-bold text-slate-800">
                  {expiresAt ? `Until ${formattedExpiry}` : "Permanent"}
                </span>
              </div>
              <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Restricted By</p>
                <span className="text-[12px] font-bold text-slate-800">Super Admin</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2.5 pt-1">
              <Button
                onClick={() => window.open(`mailto:support@propertypro.com?subject=Access%20Restriction%20Inquiry%20-%20${featureLabel}`)}
                className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-[13px] shadow-sm hover:shadow-md transition-all"
              >
                Contact Support
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="flex-1 h-10 border-slate-200 text-slate-700 rounded-xl font-semibold text-[13px] bg-white hover:bg-slate-50 transition-all"
              >
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
