"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Building2, 
  ExternalLink, 
  AlertTriangle, 
  ArrowRight,
  ShieldAlert,
  Loader2
} from "lucide-react";

interface UsageWidgetData {
  tier: {
    name: string;
    price: number;
    maxUnits: number;
  };
  subscriptionStatus: string;
  usage: {
    units: {
      current: number;
      max: number;
      percent: number;
    };
    inspectors: {
      current: number;
      max: number;
      percent: number;
    };
    properties: number;
  };
}

export function PlanUsageWidget() {
  const [data, setData] = useState<UsageWidgetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/usage")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json) setData(json);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center justify-center h-24">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const subStatus = data.subscriptionStatus || "Active";
  const isPastDue = subStatus === "Past_Due" || subStatus === "Inactive";
  const unitPercent = data.usage.units.percent;

  return (
    <div className="space-y-3">
      {/* Banner alert if subscription past due */}
      {isPastDue && (
        <div className="bg-red-500 text-white px-4 py-3 rounded-xl flex items-center justify-between shadow-sm text-sm">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>
              <strong>Action Needed:</strong> Your subscription payment is {subStatus.toLowerCase()}. Please update your payment method.
            </span>
          </div>
          <Link
            href="/dashboard/owner/billing"
            className="px-3 py-1 bg-white text-red-700 hover:bg-gray-100 rounded-md text-xs font-bold shrink-0 transition"
          >
            Fix Billing →
          </Link>
        </div>
      )}

      {/* Usage summary card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 dark:text-white text-base">
                {data.tier.name} Plan
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                subStatus === "Active"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              }`}>
                {subStatus}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {data.usage.units.current} of {data.usage.units.max} units registered across {data.usage.properties} properties
            </p>
          </div>
        </div>

        {/* Mini progress bar & Link */}
        <div className="flex items-center gap-4 min-w-[240px]">
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 font-medium">Capacity</span>
              <span className="font-bold text-gray-900 dark:text-white">{unitPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  unitPercent > 90 
                    ? "bg-red-500" 
                    : unitPercent > 75 
                    ? "bg-amber-500" 
                    : "bg-blue-600"
                }`}
                style={{ width: `${unitPercent}%` }}
              />
            </div>
          </div>

          <Link
            href="/dashboard/owner/billing"
            className="p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition shrink-0"
          >
            Billing
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
