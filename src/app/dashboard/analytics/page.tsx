"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Users, 
  DollarSign, 
  PieChart, 
  RefreshCw, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import ModuleLockedBanner from "@/components/subscription/ModuleLockedBanner";

export default function PortfolioAnalyticsPage() {
  const { allowed, loading: checkingAccess } = useModuleAccess("analytics");
  const { data: session } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    summary: {
      totalProperties: 0,
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
      occupancyRate: 0,
      grossRevenue: 0,
      totalExpenses: 0,
      totalAdminFees: 0,
      netOperatingIncome: 0,
      maintenanceCount: 0,
    },
    monthlyTrends: [],
    propertyPerformance: [],
  });

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
      } else {
        toast.error("Failed to load analytics data.");
      }
    } catch {
      toast.error("Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) {
      fetchAnalytics();
    }
  }, [allowed]);

  if (checkingAccess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-[#6E6E73] font-bold text-sm uppercase tracking-wider">Checking module access...</p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4">
        <ModuleLockedBanner module="analytics" />
      </div>
    );
  }

  const { summary, monthlyTrends, propertyPerformance } = data;
  const maxMonthlyRevenue = Math.max(...monthlyTrends.map((t: any) => Math.max(t.revenue, t.expenses)), 1000);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-6 pb-20 px-4 sm:px-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm">
            <BarChart2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#1D1D1F] tracking-tight">Portfolio Analytics</h1>
            <p className="text-[#6E6E73] text-sm mt-0.5">Executive business intelligence, occupancy trends, and asset yield performance.</p>
          </div>
        </div>
        <Button 
          onClick={fetchAnalytics} 
          disabled={loading}
          variant="outline"
          className="border-[#E5E5EA] hover:bg-slate-50 text-[#1D1D1F] rounded-xl h-11 px-5 font-bold text-sm bg-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh Data
        </Button>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Occupancy Rate */}
        <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-3xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-xs font-extrabold text-[#6E6E73] uppercase tracking-wider">Portfolio Occupancy</p>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#1D1D1F]">{summary.occupancyRate}%</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center">
                <ArrowUpRight size={14} /> {summary.occupiedUnits}/{summary.totalUnits} Units
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${summary.occupancyRate}%` }}
              />
            </div>
            <p className="text-[10px] text-[#8E8E93] font-semibold mt-2">{summary.vacantUnits} vacant unit{summary.vacantUnits === 1 ? "" : "s"} currently listed</p>
          </div>
        </Card>

        {/* Net Operating Income */}
        <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-3xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-xs font-extrabold text-[#6E6E73] uppercase tracking-wider">Net Operating Income</p>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#1D1D1F]">${summary.netOperatingIncome.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-[#8E8E93] font-semibold mt-2">Gross Rent minus maintenance & admin fees</p>
          </div>
        </Card>

        {/* Gross Revenue */}
        <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-3xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-xs font-extrabold text-[#6E6E73] uppercase tracking-wider">Gross Rent Revenue</p>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#1D1D1F]">${summary.grossRevenue.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-[#8E8E93] font-semibold mt-2">Total tenant rent collected YTD</p>
          </div>
        </Card>

        {/* Portfolio Assets */}
        <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-3xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-xs font-extrabold text-[#6E6E73] uppercase tracking-wider">Active Properties</p>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building2 size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#1D1D1F]">{summary.totalProperties}</span>
              <span className="text-xs font-bold text-slate-500">Properties</span>
            </div>
            <p className="text-[10px] text-[#8E8E93] font-semibold mt-2">{summary.maintenanceCount} total maintenance tickets logged</p>
          </div>
        </Card>

      </div>

      {/* Visual Chart 1: 6-Month Revenue vs Expenses Breakdown */}
      <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-3xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#F2F2F7] pb-4">
          <div>
            <h3 className="text-lg font-black text-[#1D1D1F] tracking-tight">Revenue vs. Expense Trend</h3>
            <p className="text-xs text-[#6E6E73]">Monthly cash flow comparison over the past 6 months.</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-blue-600" />
              <span className="text-slate-700">Gross Rent Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-rose-400" />
              <span className="text-slate-700">Expenses & Maintenance</span>
            </div>
          </div>
        </div>

        {/* Visual Bar Graph */}
        <div className="h-64 flex items-end justify-around gap-2 pt-6 pb-2 border-b border-[#F2F2F7]">
          {monthlyTrends.map((t: any, idx: number) => {
            const revHeight = maxMonthlyRevenue > 0 ? Math.max(15, Math.round((t.revenue / maxMonthlyRevenue) * 100)) : 15;
            const expHeight = maxMonthlyRevenue > 0 ? Math.max(10, Math.round((t.expenses / maxMonthlyRevenue) * 100)) : 10;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full flex items-end justify-center gap-1.5 h-48 px-1">
                  {/* Revenue Bar */}
                  <div 
                    className="w-1/2 bg-blue-600 hover:bg-blue-700 rounded-t-lg transition-all relative group/bar"
                    style={{ height: `${revHeight}%` }}
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover/bar:block bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded whitespace-nowrap z-10">
                      ${t.revenue.toLocaleString()}
                    </div>
                  </div>
                  {/* Expense Bar */}
                  <div 
                    className="w-1/2 bg-rose-400 hover:bg-rose-500 rounded-t-lg transition-all relative group/bar"
                    style={{ height: `${expHeight}%` }}
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover/bar:block bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded whitespace-nowrap z-10">
                      ${t.expenses.toLocaleString()}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#6E6E73]">{t.month}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Property Performance & Yield Leaderboard */}
      <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-3xl p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-[#F2F2F7] pb-4">
          <div>
            <h3 className="text-lg font-black text-[#1D1D1F] tracking-tight">Property Asset Performance</h3>
            <p className="text-xs text-[#6E6E73]">Breakdown of unit occupancy and estimated yield per property asset.</p>
          </div>
          <Badge className="bg-blue-50 text-blue-700 border border-blue-100 font-bold text-xs px-3 py-1 shadow-none">
            {propertyPerformance.length} Properties Tracked
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-slate-700">
            <thead>
              <tr className="border-b border-[#F2F2F7] text-[#8E8E93] font-bold uppercase tracking-wider">
                <th className="pb-3 pl-2">Property Name</th>
                <th className="pb-3">Location</th>
                <th className="pb-3 text-center">Occupancy Rate</th>
                <th className="pb-3 text-right">Monthly Rent Potential</th>
                <th className="pb-3 text-right pr-2">Est. Annual ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F2F7]">
              {propertyPerformance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#8E8E93] italic font-normal">
                    No properties listed yet. Add properties to see asset yield metrics.
                  </td>
                </tr>
              ) : (
                propertyPerformance.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 pl-2 font-bold text-[#1D1D1F] flex items-center gap-2">
                      <Building2 size={16} className="text-blue-500 shrink-0" />
                      {p.name}
                    </td>
                    <td className="py-4 text-[#6E6E73]">{p.city}</td>
                    <td className="py-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <span className="font-extrabold text-[#1D1D1F]">{p.occupancyRate}%</span>
                        <span className="text-[10px] text-[#8E8E93]">({p.occupiedUnits}/{p.units})</span>
                      </div>
                    </td>
                    <td className="py-4 text-right font-extrabold text-[#1D1D1F]">${p.monthlyPotential.toLocaleString()}</td>
                    <td className="py-4 text-right pr-2">
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-xs shadow-none">
                        ~{p.estimatedRoi}% ROI
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}
