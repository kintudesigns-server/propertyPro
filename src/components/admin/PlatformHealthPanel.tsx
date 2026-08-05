"use client";

import React from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Owner {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: string | null;
  subscriptionOverride: any | null;
}

interface PlatformHealthPanelProps {
  owners: Owner[];
}

export function PlatformHealthPanel({ owners }: PlatformHealthPanelProps) {
  const list = Array.isArray(owners) ? owners : [];

  const activeCount = list.filter(o => o.subscriptionStatus === "Active" || o.subscriptionStatus === "Active (Canceling)").length;
  const pastDueCount = list.filter(o => o.subscriptionStatus === "Past_Due").length;
  const pausedCount = list.filter(o => o.subscriptionStatus === "Paused").length;
  const trialingCount = list.filter(o => o.subscriptionStatus === "Trialing").length;
  const exceptionCount = list.filter(o => o.subscriptionOverride).length;

  const totalSaaSCount = activeCount + pastDueCount + pausedCount + trialingCount;
  const atRiskPct = totalSaaSCount > 0 ? Math.round((pastDueCount / totalSaaSCount) * 100) : 0;

  return (
    <div className="bg-white border border-[#E5E5EA] shadow-sm rounded-2xl p-6 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#F2F2F7] pb-4">
        <div>
          <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight">Platform Health & SaaS Subscriptions</h3>
          <p className="text-xs text-[#8E8E93] font-semibold mt-0.5">Live status monitor across subscription tiers, payment health, and compliance exceptions.</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
          pastDueCount > 0 
            ? "bg-amber-50 text-amber-700 border border-amber-200" 
            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
        }`}>
          <ShieldCheck size={14} /> {pastDueCount > 0 ? `${pastDueCount} Account(s) Require Attention` : "All Systems Operational"}
        </span>
      </div>

      {/* Visual Health Ratio Bar */}
      {totalSaaSCount > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Subscriber Health Distribution</span>
            <span>{Math.round(((activeCount + trialingCount) / totalSaaSCount) * 100)}% Good Standing</span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${(activeCount / totalSaaSCount) * 100}%` }} title={`Active: ${activeCount}`} />
            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${(trialingCount / totalSaaSCount) * 100}%` }} title={`Trialing: ${trialingCount}`} />
            <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${(pastDueCount / totalSaaSCount) * 100}%` }} title={`Past Due: ${pastDueCount}`} />
            <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${(pausedCount / totalSaaSCount) * 100}%` }} title={`Paused: ${pausedCount}`} />
          </div>
          <div className="flex items-center gap-4 text-[10px] font-extrabold uppercase tracking-wider text-[#8E8E93] pt-0.5">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Active ({activeCount})</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" /> Trialing ({trialingCount})</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Past Due ({pastDueCount})</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500 inline-block" /> Paused ({pausedCount})</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Active Subscribers */}
        <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-2xl">
          <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">Active Subscribers</span>
          <div className="text-2xl font-black text-emerald-950 mt-1">{activeCount}</div>
          <span className="text-xs font-semibold text-emerald-700">Billing in good standing</span>
        </div>

        {/* Past Due */}
        <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl relative group">
          <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">Past-Due Accounts</span>
          <div className="text-2xl font-black text-amber-900 mt-1">{pastDueCount}</div>
          <Link href="/dashboard/admin/subscriptions?status=Past_Due" className="text-xs font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1 mt-1">
            View Past Due <ArrowRight size={12} />
          </Link>
        </div>

        {/* Paused Accounts */}
        <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl relative group">
          <span className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider block">Paused Accounts</span>
          <div className="text-2xl font-black text-rose-900 mt-1">{pausedCount}</div>
          <Link href="/dashboard/admin/subscriptions?status=Paused" className="text-xs font-medium text-rose-700 hover:text-rose-900 flex items-center gap-1 mt-1">
            View Paused <ArrowRight size={12} />
          </Link>
        </div>

        {/* Trialing */}
        <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl">
          <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider block">Trial Accounts</span>
          <div className="text-2xl font-black text-blue-900 mt-1">{trialingCount}</div>
          <span className="text-xs font-semibold text-blue-700">Onboarding pipeline</span>
        </div>
      </div>

      <div className="pt-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-t border-[#F2F2F7] text-xs font-semibold text-slate-700">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-purple-500" />
          <span>Active Policy Overrides: <span className="font-semibold text-slate-900">{exceptionCount} account{exceptionCount !== 1 ? "s" : ""}</span></span>
        </div>
        <div className="text-xs text-[#8E8E93] font-bold uppercase tracking-wider">
          Delinquency Risk Rate: <span className={atRiskPct > 15 ? "text-rose-600 font-black text-sm" : "text-slate-900 font-black text-sm"}>{atRiskPct}%</span>
        </div>
      </div>
    </div>
  );
}
