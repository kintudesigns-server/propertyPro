"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { KpiCard } from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart2, 
  TrendingUp, 
  Building2, 
  Users, 
  DollarSign, 
  RefreshCw, 
  ArrowUpRight
} from "lucide-react";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import RevenueTrendChart from "@/components/analytics/RevenueTrendChart";

export default function PortfolioAnalyticsPage() {
  const { allowed } = useModuleAccess("analytics");
  const { data: session } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    summary: {
      totalProperties: 12,
      totalUnits: 34,
      occupiedUnits: 32,
      vacantUnits: 2,
      occupancyRate: 94.1,
      grossRevenue: 184200,
      totalExpenses: 28400,
      totalAdminFees: 4200,
      netOperatingIncome: 151600,
      maintenanceCount: 4,
    },
    monthlyTrends: [
      { month: "Jan", revenue: 14500, expenses: 2200 },
      { month: "Feb", revenue: 15200, expenses: 2800 },
      { month: "Mar", revenue: 15800, expenses: 2100 },
      { month: "Apr", revenue: 16100, expenses: 3100 },
      { month: "May", revenue: 15900, expenses: 2400 },
      { month: "Jun", revenue: 16500, expenses: 2600 },
      { month: "Jul", revenue: 16800, expenses: 2300 },
    ],
    propertyPerformance: [
      { id: "1", name: "Sunset Heights Apartments", city: "San Francisco, CA", units: 16, occupiedUnits: 15, occupancyRate: 93.7, monthlyPotential: 42500, estimatedRoi: 8.4 },
      { id: "2", name: "Oakridge Commercial Hub", city: "San Jose, CA", units: 8, occupiedUnits: 8, occupancyRate: 100, monthlyPotential: 28900, estimatedRoi: 9.1 },
      { id: "3", name: "Maplewood Terrace", city: "Oakland, CA", units: 10, occupiedUnits: 9, occupancyRate: 90.0, monthlyPotential: 18500, estimatedRoi: 7.8 }
    ],
  });

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
      }
    } catch {
      // Keep baseline teaser data if fetch fails / 403
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const summary = data?.summary || {};
  const monthlyTrends = data?.monthlyTrends || [];
  const propertyPerformance = data?.propertyPerformance || [];
  const maxMonthlyRevenue = Math.max(...monthlyTrends.map((t: any) => Math.max(t.revenue || 0, t.expenses || 0)), 1000);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-6 pb-20 px-4 sm:px-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BarChart2 className="h-8 w-8 text-blue-600" />
            Portfolio Analytics
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
            Executive business intelligence, occupancy rate trends, and asset yield metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={fetchAnalytics} 
            disabled={loading}
            variant="outline" 
            className="rounded-xl border-slate-200 text-slate-700 font-bold text-xs h-10 px-4 flex items-center gap-2 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Portfolio Occupancy"
          value={`${summary.occupancyRate ?? 0}%`}
          subtext={`${summary.occupiedUnits ?? 0} occupied of ${summary.totalUnits ?? 0} total units`}
          icon={Users}
          variant="emerald"
        />
        <KpiCard
          title="Gross Annual Revenue"
          value={`$${(summary.grossRevenue ?? 0).toLocaleString()}`}
          subtext="Total rental collections YTD"
          icon={TrendingUp}
          variant="blue"
        />
        <KpiCard
          title="Net Operating Income"
          value={`$${(summary.netOperatingIncome ?? 0).toLocaleString()}`}
          subtext="After operating expenses"
          icon={DollarSign}
          variant="purple"
        />
        <KpiCard
          title="Active Properties"
          value={summary.totalProperties ?? 0}
          subtext={`${summary.maintenanceCount ?? 0} total maintenance tickets logged`}
          icon={Building2}
          variant="indigo"
        />
      </div>

      {/* Monthly Trends Chart — Recharts + Framer Motion SaaS Component */}
      <RevenueTrendChart data={monthlyTrends} />

      {/* Property Performance Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Property Performance Leaderboard</h2>
          <p className="text-xs text-slate-500 font-medium">Breakdown of occupancy and estimated annual ROI per asset</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3 pl-2">Property Name</th>
                <th className="pb-3">Location</th>
                <th className="pb-3 text-center">Occupancy Rate</th>
                <th className="pb-3 text-right">Monthly Rent Potential</th>
                <th className="pb-3 text-right pr-2">Est. Annual ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {propertyPerformance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic font-normal">
                    No properties listed yet. Add properties to see asset yield metrics.
                  </td>
                </tr>
              ) : (
                propertyPerformance.map((p: any, idx: number) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 pl-2 font-bold text-slate-900 flex items-center gap-2">
                      <Building2 size={16} className="text-blue-500 shrink-0" />
                      {p.name}
                    </td>
                    <td className="py-4 text-slate-500 font-medium">{p.city || "N/A"}</td>
                    <td className="py-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">{p.occupancyRate ?? p.occupancy ?? 0}%</span>
                        <span className="text-[10px] text-slate-400 font-bold">({p.occupiedUnits ?? 0}/{p.units ?? 0})</span>
                      </div>
                    </td>
                    <td className="py-4 text-right font-extrabold text-slate-900">${(p.monthlyPotential ?? 0).toLocaleString()}</td>
                    <td className="py-4 text-right pr-2">
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-xs shadow-none">
                        ~{p.estimatedRoi ?? p.yield ?? 0}% ROI
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
