"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  TrendingUp,
  ArrowUpRight,
  DollarSign,
  PieChart,
  Sparkles,
  Layers,
  Check
} from "lucide-react";

interface MonthlyTrendItem {
  month: string;
  revenue: number;
  expenses: number;
  [key: string]: any;
}

interface RevenueTrendChartProps {
  data: MonthlyTrendItem[];
  title?: string;
  subtitle?: string;
}

export default function RevenueTrendChart({
  data = [],
  title = "Revenue vs. Expense Trends",
  subtitle = "Monthly cashflow comparison over rolling 12-month period",
}: RevenueTrendChartProps) {
  const [activeView, setActiveView] = useState<"both" | "revenue" | "expenses">("both");
  const [showNetLine, setShowNetLine] = useState(true);

  // Compute calculated metrics for enriched chart data
  const chartData = data.map((item) => {
    const rev = item.revenue || 0;
    const exp = item.expenses || 0;
    const net = rev - exp;
    const margin = rev > 0 ? Math.round((net / rev) * 100) : 0;
    return {
      ...item,
      net,
      margin,
    };
  });

  const totalRev = chartData.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
  const totalExp = chartData.reduce((acc, curr) => acc + (curr.expenses || 0), 0);
  const totalNet = totalRev - totalExp;
  const avgMargin = totalRev > 0 ? Math.round((totalNet / totalRev) * 100) : 0;
  const peakMonth = [...chartData].sort((a, b) => b.revenue - a.revenue)[0];

  // Custom Animated Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 shadow-2xl text-white min-w-[210px] space-y-3 z-50 pointer-events-none"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-black tracking-wider uppercase text-slate-400">
            {item.month} Performance
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {item.margin}% Margin
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              Gross Revenue
            </span>
            <span className="font-extrabold text-blue-400">
              ${(item.revenue || 0).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              Operating Expenses
            </span>
            <span className="font-extrabold text-rose-400">
              ${(item.expenses || 0).toLocaleString()}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-200 font-bold">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              Net Cashflow
            </span>
            <span className="font-black text-emerald-400 text-sm">
              ${(item.net || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.05)] p-6 space-y-6 overflow-hidden"
    >
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-slate-100 text-[#1D1D1F] rounded-xl flex items-center justify-center font-bold">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-[#1D1D1F] tracking-tight">{title}</h2>
          </div>
          <p className="text-xs text-[#6E6E73] font-normal mt-1 pl-10">{subtitle}</p>
        </div>

        {/* Controls & Filter Toggles */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* View Segment Switcher */}
          <div className="bg-slate-100/80 p-1 rounded-xl flex items-center gap-1 border border-slate-200/30">
            <button
              onClick={() => setActiveView("both")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border-none ${
                activeView === "both"
                  ? "bg-white text-[#1D1D1F] shadow-2xs"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              All Trends
            </button>
            <button
              onClick={() => setActiveView("revenue")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border-none ${
                activeView === "revenue"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setActiveView("expenses")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border-none ${
                activeView === "expenses"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              Expenses
            </button>
          </div>

          {/* Net Line Toggle Button */}
          <button
            onClick={() => setShowNetLine(!showNetLine)}
            className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
              showNetLine
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs"
                : "bg-white text-[#6E6E73] border-slate-200 hover:bg-slate-50"
            }`}
          >
            {showNetLine && <Check className="h-3 w-3 text-emerald-600" />}
            <span>Net Line</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 shadow-2xs">
        <div>
          <span className="text-xs font-normal text-[#6E6E73] block mb-0.5">
            Total Revenue
          </span>
          <span className="text-base font-semibold text-[#1D1D1F]">
            ${totalRev.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-xs font-normal text-[#6E6E73] block mb-0.5">
            Total Expenses
          </span>
          <span className="text-base font-semibold text-rose-600">
            ${totalExp.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-xs font-normal text-[#6E6E73] block mb-0.5">
            Net Cashflow
          </span>
          <span className="text-base font-semibold text-emerald-600 flex items-center gap-1">
            ${totalNet.toLocaleString()}
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          </span>
        </div>
        <div>
          <span className="text-xs font-normal text-[#6E6E73] block mb-0.5">
            Profit Margin
          </span>
          <div className="inline-flex items-center gap-1.5">
            <span className="text-base font-semibold text-[#1D1D1F]">{avgMargin}%</span>
            {peakMonth && (
              <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                Peak: {peakMonth.month}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Interactive Recharts Area */}
      <div className="h-[280px] sm:h-[320px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              {/* Revenue Gradient */}
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.8} />
              </linearGradient>

              {/* Expense Gradient */}
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#BE123C" stopOpacity={0.75} />
              </linearGradient>

              {/* Net Profit Line Glow */}
              <linearGradient id="netLineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#F1F5F9"
            />

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }}
              dy={10}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94A3B8", fontSize: 10, fontWeight: 600 }}
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Revenue Bar */}
            {(activeView === "both" || activeView === "revenue") && (
              <Bar
                dataKey="revenue"
                name="Gross Income"
                fill="url(#revenueGradient)"
                radius={[8, 8, 2, 2]}
                barSize={activeView === "both" ? 22 : 36}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            )}

            {/* Expense Bar */}
            {(activeView === "both" || activeView === "expenses") && (
              <Bar
                dataKey="expenses"
                name="Operating Expenses"
                fill="url(#expenseGradient)"
                radius={[8, 8, 2, 2]}
                barSize={activeView === "both" ? 22 : 36}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            )}

            {/* Net Profit Overlay Line */}
            {showNetLine && (
              <Line
                type="monotone"
                dataKey="net"
                name="Net Income"
                stroke="url(#netLineGradient)"
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: "#10B981",
                  stroke: "#FFFFFF",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 7,
                  fill: "#059669",
                  stroke: "#FFFFFF",
                  strokeWidth: 3,
                }}
                animationDuration={1500}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs font-bold border-t border-slate-100 text-slate-600">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-600 shadow-xs" />
            <span>Gross Income</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500 shadow-xs" />
            <span>Operating Expenses</span>
          </div>
          {showNetLine && (
            <div className="flex items-center gap-2">
              <span className="h-2 w-4 rounded-full bg-emerald-500 shadow-xs" />
              <span className="text-emerald-700">Net Cashflow Trend</span>
            </div>
          )}
        </div>
        <div className="text-[11px] text-slate-400 font-medium">
          Live GAAP Accrual Portfolio Feed
        </div>
      </div>
    </motion.div>
  );
}
