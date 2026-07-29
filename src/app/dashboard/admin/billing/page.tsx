"use client";

import React, { useEffect, useState } from "react";
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Users, 
  AlertOctagon, 
  Activity, 
  Clock, 
  Loader2, 
  ArrowLeft,
  ChevronRight,
  TrendingDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";

interface TierDistribution {
  id: string;
  name: string;
  price: number;
  count: number;
}

interface StatusDistribution {
  status: string;
  count: number;
}

interface PastDueUser {
  id: string;
  name: string | null;
  email: string;
  pricingTier: {
    name: string;
    price: number;
  } | null;
}

interface SubscriptionEvent {
  id: string;
  userName: string;
  userEmail: string;
  event: string;
  fromTierName: string | null;
  toTierName: string | null;
  amountPaid: number | null;
  createdAt: string;
}

interface BillingOverviewData {
  mrr: number;
  arr: number;
  subscriberCount: number;
  tierDistribution: TierDistribution[];
  statuses: StatusDistribution[];
  churnRate: number;
  pastDueCount: number;
  pastDueUsers: PastDueUser[];
  recentEvents: SubscriptionEvent[];
}

export default function AdminBillingDashboard() {
  const [data, setData] = useState<BillingOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      const res = await fetch("/api/admin/billing-overview");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error("Failed to load billing metrics");
      }
    } catch {
      toast.error("Error connecting to billing API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-gray-500 text-sm font-semibold">Aggregating SaaS metrics...</p>
      </div>
    );
  }

  const mrr = data?.mrr || 0;
  const arr = data?.arr || 0;
  const subscribers = data?.subscriberCount || 0;
  const churn = data?.churnRate || 0;
  const pastDue = data?.pastDueCount || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* Back button and page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/dashboard/admin/settings" className="hover:text-blue-600 transition flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              Settings
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span>Billing Overview</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-blue-600" />
            SaaS Subscription Intelligence
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Monitor real-time Monthly Recurring Revenue, plan usage quotas, churn rates, and past-due billing risks.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        
        {/* MRR Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 h-16 w-16 bg-white/10 rounded-full blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-75">MRR</span>
            <DollarSign className="w-5 h-5 opacity-75" />
          </div>
          <p className="text-3xl font-black mt-3">${mrr.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] opacity-75 mt-1">Monthly Recurring Revenue</p>
        </div>

        {/* ARR Card */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ARR</span>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-3">
              ${arr.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">Annual Recurring Run-Rate</p>
          </div>
        </div>

        {/* Active Subscribers Card */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subscribers</span>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-3">{subscribers}</p>
            <p className="text-[11px] text-gray-400 mt-1">Active Paid Landlords</p>
          </div>
        </div>

        {/* Churn Rate Card */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Historical Churn</span>
            <TrendingDown className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-3">{churn.toFixed(1)}%</p>
            <p className="text-[11px] text-gray-400 mt-1">Cancel vs Subscribe Ratio</p>
          </div>
        </div>

        {/* Past Due Risk Card */}
        <div className={`p-6 rounded-2xl border shadow-sm flex flex-col justify-between transition-colors ${
          pastDue > 0 
            ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800" 
            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Past Due Risk</span>
            <AlertOctagon className={`w-5 h-5 ${pastDue > 0 ? "text-red-650" : "text-gray-400"}`} />
          </div>
          <div>
            <p className={`text-2xl font-black mt-3 ${pastDue > 0 ? "text-red-750 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
              {pastDue}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">Delinquent Account Count</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Tier Distribution and Status distribution */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Plan Distribution */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Subscribers by Plan
            </h3>
            <div className="space-y-3 pt-1">
              {data?.tierDistribution && data.tierDistribution.length > 0 ? (
                data.tierDistribution.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-850/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div>
                      <p className="text-xs font-bold text-gray-950 dark:text-white">{t.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">${t.price}/month</p>
                    </div>
                    <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-xs font-black px-2.5 py-1 rounded-lg">
                      {t.count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 py-2">No plan tiers configured.</p>
              )}
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              Subscription Statuses
            </h3>
            <div className="space-y-2.5 pt-1">
              {data?.statuses && data.statuses.length > 0 ? (
                data.statuses.map((s, idx) => {
                  const colors: Record<string, string> = {
                    Active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
                    Trialing: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
                    Past_Due: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
                    Inactive: "bg-gray-100 text-gray-800 dark:bg-gray-850/50 dark:text-gray-400",
                  };
                  const colorClass = colors[s.status] || "bg-gray-100 text-gray-800 dark:bg-gray-850/50 dark:text-gray-400";
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                      <span className={`px-2.5 py-0.5 rounded-full border border-transparent ${colorClass}`}>{s.status}</span>
                      <span>{s.count} accounts</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-500 py-2">No active accounts found.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Delinquent Users and Recent Audit Logs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Delinquent landords warning */}
          {pastDue > 0 && (
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-red-200 dark:border-red-800 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-red-650 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-650" />
                Delinquent Landlords (Past Due)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-850 text-gray-400">
                      <th className="pb-2 font-semibold">Name</th>
                      <th className="pb-2 font-semibold">Email</th>
                      <th className="pb-2 font-semibold">Current Plan</th>
                      <th className="pb-2 font-semibold text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.pastDueUsers?.map((user) => (
                      <tr key={user.id} className="border-b border-gray-50 dark:border-gray-850 text-gray-800 dark:text-gray-200">
                        <td className="py-2.5 font-bold">{user.name || "Unknown Landlord"}</td>
                        <td className="py-2.5 text-gray-500">{user.email}</td>
                        <td className="py-2.5 font-medium">{user.pricingTier?.name || "N/A"}</td>
                        <td className="py-2.5 text-right font-bold text-red-650">
                          ${user.pricingTier?.price ? Number(user.pricingTier.price).toFixed(2) : "0.00"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Timeline Logs */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Subscription Event Stream
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Real-time lifecycle modifications feed</p>
            </div>
            
            <div className="relative border-l border-gray-100 dark:border-gray-800 pl-4 ml-2 space-y-4 py-1">
              {data?.recentEvents && data.recentEvents.length > 0 ? (
                data.recentEvents.map((event) => {
                  const eventColors: Record<string, string> = {
                    SUBSCRIBED: "bg-emerald-100 text-emerald-800",
                    UPGRADED: "bg-blue-100 text-blue-800",
                    DOWNGRADED: "bg-amber-100 text-amber-800",
                    REACTIVATED: "bg-teal-100 text-teal-800",
                    CANCELED: "bg-red-100 text-red-800",
                    PAST_DUE: "bg-rose-100 text-rose-800",
                    RETENTION_OFFER_ACCEPTED: "bg-indigo-100 text-indigo-800",
                    SYNC_SELF_HEAL: "bg-violet-100 text-violet-800",
                  };
                  const color = eventColors[event.event] || "bg-gray-100 text-gray-800";
                  return (
                    <div key={event.id} className="relative text-xs">
                      {/* Node circle */}
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-gray-900" />
                      <div className="flex flex-col sm:flex-row justify-between gap-1">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-gray-900 dark:text-white">{event.userName}</span>
                            <span className="text-gray-400">({event.userEmail})</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${color}`}>{event.event}</span>
                          </div>
                          <p className="text-gray-500 mt-0.5">
                            {event.fromTierName ? `${event.fromTierName} Plan` : ""}
                            {event.fromTierName && event.toTierName ? " → " : ""}
                            {event.toTierName ? `${event.toTierName} Plan` : ""}
                            {event.amountPaid !== null && event.amountPaid > 0 && ` ($${event.amountPaid.toFixed(2)})`}
                          </p>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0 font-medium sm:text-right">
                          {new Date(event.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-500 py-1">No lifecycle changes recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
