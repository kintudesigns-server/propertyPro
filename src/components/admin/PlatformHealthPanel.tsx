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
    <div className="bg-white border border-[#E5E5EA] shadow-sm rounded-2xl p-6 space-y-4">
      <div className="flex justify-between items-center border-b border-[#F2F2F7] pb-3">
        <div>
          <h3 className="text-sm font-bold text-[#1D1D1F]">Platform Health Status</h3>
          <p className="text-[10px] text-[#8E8E93] font-semibold">Live status monitor across subscription tiers and compliance parameters.</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
          <ShieldCheck size={12} /> All Systems OK
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Active Subscribers */}
        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
          <span className="text-[9px] font-extrabold text-[#8E8E93] uppercase tracking-wider block">Active Subscribers</span>
          <div className="text-xl font-black text-slate-800 mt-1">{activeCount}</div>
          <span className="text-[9px] font-semibold text-[#8E8E93]">Billing up to date</span>
        </div>

        {/* Past Due */}
        <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-xl relative group">
          <span className="text-[9px] font-extrabold text-amber-800 uppercase tracking-wider block">Past-Due Accounts</span>
          <div className="text-xl font-black text-amber-700 mt-1">{pastDueCount}</div>
          <Link href="/dashboard/admin/subscriptions?status=Past_Due" className="text-[9px] font-bold text-amber-600 hover:text-amber-800 flex items-center gap-0.5 mt-0.5">
            View Past Due <ArrowRight size={10} />
          </Link>
        </div>

        {/* Paused Accounts */}
        <div className="bg-rose-50/50 border border-rose-100 p-3 rounded-xl relative group">
          <span className="text-[9px] font-extrabold text-rose-800 uppercase tracking-wider block">Paused Accounts</span>
          <div className="text-xl font-black text-rose-700 mt-1">{pausedCount}</div>
          <Link href="/dashboard/admin/subscriptions?status=Paused" className="text-[9px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-0.5 mt-0.5">
            View Paused <ArrowRight size={10} />
          </Link>
        </div>

        {/* Trialing */}
        <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl">
          <span className="text-[9px] font-extrabold text-blue-800 uppercase tracking-wider block">Trial Accounts</span>
          <div className="text-xl font-black text-blue-700 mt-1">{trialingCount}</div>
          <span className="text-[9px] font-semibold text-[#8E8E93]">Onboarding pipeline</span>
        </div>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-t border-[#F2F2F7] text-xs font-semibold text-slate-700">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          <span>Active Policy Overrides: <span className="font-bold text-[#1D1D1F]">{exceptionCount} accounts</span></span>
        </div>
        <div className="text-[11px] text-[#8E8E93] font-bold uppercase tracking-wider">
          SaaS Delinquency At-Risk Rate: <span className={atRiskPct > 15 ? "text-rose-600 font-extrabold" : "text-slate-700 font-extrabold"}>{atRiskPct}%</span>
        </div>
      </div>
    </div>
  );
}
