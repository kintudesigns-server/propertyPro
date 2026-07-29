"use client";

import React from "react";
import { ShieldAlert, Lock, Clock, Calendar, Mail, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface FeatureBlockedBannerProps {
  featureKey?: string;
  featureLabel?: string;
  reason?: string;
  adminNote?: string;
  expiresAt?: string | null;
  daysRemaining?: number | null;
  blockedAt?: string | null;
}

export default function FeatureBlockedBanner({
  featureKey,
  featureLabel = "This Feature",
  reason = "Access to this feature has been temporarily restricted by an administrator.",
  adminNote,
  expiresAt,
  daysRemaining,
  blockedAt,
}: FeatureBlockedBannerProps) {
  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const formattedBlockedDate = blockedAt
    ? new Date(blockedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-rose-200 shadow-xl overflow-hidden">
        {/* Top Gradient Header */}
        <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
            <Lock className="w-64 h-64" />
          </div>

          <div className="relative z-10 flex flex-col items-start gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black tracking-wider uppercase border border-white/30">
              <ShieldAlert className="h-4 w-4" />
              Administrative Restriction Active
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {featureLabel} Access Restricted
            </h2>
            <p className="text-rose-100 text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
              An administrative policy is currently restricting access to this module. Below are the details regarding your restriction status and restoration timeline.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Reason Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Authorization & Audit Log Reason
            </span>
            <p className="text-sm font-bold text-slate-900 leading-normal italic">
              "{adminNote || reason}"
            </p>
          </div>

          {/* Key Metadata Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Expiration Status */}
            <div className="bg-purple-50/60 border border-purple-200/80 p-4 rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-purple-800">
                <Clock className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-wider">Restoration Timeline</span>
              </div>
              {expiresAt ? (
                <div>
                  <p className="text-lg font-black text-purple-950">
                    {daysRemaining && daysRemaining > 0
                      ? `~${daysRemaining} ${daysRemaining === 1 ? "Day" : "Days"} Remaining`
                      : "Expiring Soon"}
                  </p>
                  <p className="text-xs font-semibold text-purple-700">
                    Access auto-restores on {formattedExpiry}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-black text-purple-950">Permanent Block</p>
                  <p className="text-xs font-semibold text-purple-700">
                    Requires manual admin review to reinstate
                  </p>
                </div>
              )}
            </div>

            {/* Date Imposed */}
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Calendar className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-wider">Restriction Applied</span>
              </div>
              <p className="text-lg font-black text-slate-900">
                {formattedBlockedDate || "Recently Applied"}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Logged in audit governance registry
              </p>
            </div>
          </div>

          {/* Welfare Notice Callout */}
          <div className="flex items-start gap-3 bg-amber-50/80 border border-amber-200 p-4 rounded-2xl text-amber-900 text-xs">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold text-amber-950">Statutory Welfare Protection Note</p>
              <p className="font-medium text-amber-800 leading-relaxed">
                If you believe this restriction was applied in error or if this affects an urgent housing emergency, please contact your platform administrator or support team immediately.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto font-bold text-xs rounded-xl h-10 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 inline-flex items-center justify-center px-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Link>

            <Link
              href="/dashboard/notifications"
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl h-10 inline-flex items-center justify-center px-4 shadow-xs transition-colors"
            >
              <Mail className="h-4 w-4 mr-2" />
              View Admin Notifications
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
