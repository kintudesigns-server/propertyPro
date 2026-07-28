"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  ShieldAlert, 
  Layers, 
  Search, 
  DollarSign, 
  MoreHorizontal, 
  RefreshCw, 
  Mail, 
  ExternalLink,
  AlertTriangle,
  Pause,
  Play,
  X,
  ShieldCheck,
  Settings2,
  AlertCircle,
  Users,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Lock,
  Building,
  Shield
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const HERO_SLIDES = [
  {
    src: "/images/hero/hero_subscription_analytics.png",
    tag: "Recurring MRR & Revenue Analytics",
  },
  {
    src: "/images/hero/hero_subscription_billing.png",
    tag: "SaaS Licensing & Payment Gateway",
  },
  {
    src: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1600&auto=format&fit=crop",
    tag: "Landlord Contract Operations",
  },
];

export default function AdminSubscriptionsClient({ 
  owners, 
  mrr, 
  atRiskMrr, 
  platformSettings 
}: { 
  owners: any[]; 
  mrr: number; 
  atRiskMrr: number; 
  platformSettings: any; 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  // Background slide rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Global settings state
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState(platformSettings);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    if (type === "success") toast.success(message);
    else if (type === "error") toast.error(message);
    else toast.info(message);
  };

  // Formatting helpers
  const formatStatus = (status: string) => {
    if (!status) return "Inactive";
    return status.replace(/_/g, " ");
  };

  const getStatusUrgency = (status: string) => {
    switch (status) {
      case "Past_Due": return 0;
      case "Paused": return 1;
      case "Trialing": return 2;
      case "Active": return 3;
      case "Active (Canceling)": return 4;
      default: return 5;
    }
  };

  const handleSyncStripe = async (userId: string) => {
    try {
      setSyncingId(userId);
      const res = await fetch("/api/admin/subscriptions/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showToast(`Sync complete. Status is now: ${formatStatus(data.status)}`, "success");
      router.refresh();
    } catch (err: any) {
      showToast(`Failed to sync: ${err.message}`, "error");
    } finally {
      setSyncingId(null);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("Platform subscription settings updated successfully.", "success");
      setShowSettings(false);
      router.refresh();
    } catch (err: any) {
      showToast(`Failed to save settings: ${err.message}`, "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredOwners = owners
    .filter(o => {
      if (search && !o.name?.toLowerCase().includes(search.toLowerCase()) && !o.email?.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "ALL" && (o.subscriptionStatus || "Inactive") !== statusFilter) return false;
      if (tierFilter !== "ALL" && (o.pricingTier?.name || "No Active Plan") !== tierFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const urgencyA = getStatusUrgency(a.subscriptionStatus || "");
      const urgencyB = getStatusUrgency(b.subscriptionStatus || "");
      if (urgencyA !== urgencyB) {
        return urgencyA - urgencyB;
      }
      return (a.name || "").localeCompare(b.name || "");
    });

  const totalOwners = owners.length;
  const activeCount = owners.filter(o => o.subscriptionStatus === "Active" || o.subscriptionStatus === "Active (Canceling)").length;
  const pastDueCount = owners.filter(o => o.subscriptionStatus === "Past_Due").length;
  const pausedCount = owners.filter(o => o.subscriptionStatus === "Paused").length;
  const trialingCount = owners.filter(o => o.subscriptionStatus === "Trialing").length;

  const uniqueTiers = Array.from(new Set(owners.map(o => o.pricingTier?.name || "No Active Plan")));

  return (
    <div className="space-y-8 relative pb-20">

      {/* 1. MATCHING DASHBOARD HERO BANNER WITH MOTION BACKGROUND */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-[#E5E5EA] shadow-sm min-h-[220px] w-full">
        {/* Background Image Crossfade Stack */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-slate-100">
          {HERO_SLIDES.map((slide, idx) => {
            const isActive = idx === slideIndex;
            return (
              <motion.img
                key={slide.src}
                src={slide.src}
                alt={slide.tag}
                initial={false}
                animate={{
                  opacity: isActive ? 0.78 : 0,
                  scale: isActive ? 1.07 : 1.0,
                }}
                transition={{
                  opacity: { duration: 1.6, ease: "easeInOut" },
                  scale: { duration: 6, ease: "linear" },
                }}
                className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
              />
            );
          })}

          {/* Light theme gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-white/40 z-10" />
          
          <div
            className="absolute inset-0 opacity-[0.03] z-10 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #0F172A 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        {/* Hero Foreground Content */}
        <div className="relative z-20 p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-2.5 max-w-2xl"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[#007AFF] shadow-2xs font-extrabold text-[10px] tracking-widest uppercase">
                <CreditCard className="h-3.5 w-3.5" />
                SaaS Revenue & Licensing Hub
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px]">
                {HERO_SLIDES[slideIndex].tag}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#1D1D1F]">
              Active Owner Subscriptions
            </h1>
            <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">
              Manage landlord SaaS subscription contracts, recurring MRR performance, custom feature grants, and global past-due policy locks.
            </p>
          </motion.div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button 
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
              className="bg-white/90 hover:bg-white text-[#1D1D1F] border border-[#E5E5EA] rounded-xl font-bold text-xs h-10 px-4 transition-all shadow-xs"
            >
              <Settings2 className="h-4 w-4 mr-2 text-slate-600" />
              {showSettings ? "Hide Global Policies" : "Configure Policies"}
            </Button>

            <Link
              href="/dashboard/admin/settings/pricing"
              className="inline-flex items-center bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-xl font-bold text-xs h-10 px-4 transition-all shadow-xs"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Pricing Tiers & Fees <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Global Subscription Policy Settings Drawer/Card */}
      {showSettings && (
        <Card className="bg-white border border-[#E5E5EA] shadow-lg rounded-3xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#1D1D1F]">Global Subscription Gating & Overage Policies</h3>
                <p className="text-xs text-[#6E6E73]">System-wide default policy parameters governing soft-locks and past-due grace windows</p>
              </div>
            </div>
            <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold text-xs">Platform-Wide Defaults</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Financial Controls */}
            <div className="bg-slate-50/70 border border-[#E5E5EA] rounded-2xl p-5 space-y-4 shadow-2xs">
              <h4 className="text-xs font-black text-[#8E8E93] uppercase tracking-wider border-b border-slate-200/60 pb-2">Financial Controls</h4>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Past_Due Grace Period</label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    value={settings.gracePeriodDays} 
                    onChange={(e) => setSettings({ ...settings, gracePeriodDays: parseInt(e.target.value) || 0 })}
                    className="bg-white rounded-xl border-[#E5E5EA] h-10 w-24 text-center font-bold text-sm"
                  />
                  <span className="text-xs font-semibold text-[#6E6E73]">Days grace before lock</span>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="payoutsPastDue"
                  checked={!!settings.blockPayoutsOnPastDue}
                  onChange={(e) => setSettings({ ...settings, blockPayoutsOnPastDue: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5E5EA] text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="payoutsPastDue" className="text-xs font-bold text-[#1D1D1F] cursor-pointer">Block payouts during Past_Due grace</label>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="payoutsPaused"
                  checked={!!settings.blockPayoutsOnPaused}
                  onChange={(e) => setSettings({ ...settings, blockPayoutsOnPaused: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5E5EA] text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="payoutsPaused" className="text-xs font-bold text-[#1D1D1F] cursor-pointer">Block payouts when account paused</label>
              </div>
            </div>

            {/* Column 2: Paused Account Restrictions */}
            <div className="bg-slate-50/70 border border-[#E5E5EA] rounded-2xl p-5 space-y-3.5 shadow-2xs">
              <h4 className="text-xs font-black text-[#8E8E93] uppercase tracking-wider border-b border-slate-200/60 pb-2">Paused Account Restrictions</h4>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="unitsPaused"
                  checked={!!settings.blockNewUnitsOnPaused}
                  onChange={(e) => setSettings({ ...settings, blockNewUnitsOnPaused: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5E5EA] text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="unitsPaused" className="text-xs font-semibold text-[#1D1D1F] cursor-pointer">Block adding new units & properties</label>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="vendorPaused"
                  checked={!!settings.blockAddVendorOnPaused}
                  onChange={(e) => setSettings({ ...settings, blockAddVendorOnPaused: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5E5EA] text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="vendorPaused" className="text-xs font-semibold text-[#1D1D1F] cursor-pointer">Block adding external vendors</label>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="inspectorPaused"
                  checked={!!settings.blockAddInspectorOnPaused}
                  onChange={(e) => setSettings({ ...settings, blockAddInspectorOnPaused: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5E5EA] text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="inspectorPaused" className="text-xs font-semibold text-[#1D1D1F] cursor-pointer">Block adding inspectors / team</label>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="tenantPaused"
                  checked={!!settings.blockAddTenantOnPaused}
                  onChange={(e) => setSettings({ ...settings, blockAddTenantOnPaused: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5E5EA] text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="tenantPaused" className="text-xs font-semibold text-[#1D1D1F] cursor-pointer">Block registering new tenants</label>
              </div>
            </div>

            {/* Column 3: Policy Welfare Exemptions */}
            <div className="bg-slate-50/70 border border-[#E5E5EA] rounded-2xl p-5 space-y-3.5 shadow-2xs flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black text-[#8E8E93] uppercase tracking-wider border-b border-slate-200/60 pb-2">Welfare Exemptions</h4>
                <div className="flex items-center gap-3 mt-3">
                  <input 
                    type="checkbox" 
                    id="maintPaused"
                    checked={!!settings.allowMaintenanceOnPaused}
                    onChange={(e) => setSettings({ ...settings, allowMaintenanceOnPaused: e.target.checked })}
                    className="h-4 w-4 rounded border-[#E5E5EA] text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="maintPaused" className="text-xs font-semibold text-[#1D1D1F] cursor-pointer">Always allow tenant maintenance requests</label>
                </div>
                <div className="flex items-center gap-3 mt-2.5">
                  <input 
                    type="checkbox" 
                    id="welfareAllowMoveOut"
                    checked={!!settings.welfareAllowMoveOut}
                    onChange={(e) => setSettings({ ...settings, welfareAllowMoveOut: e.target.checked })}
                    className="h-4 w-4 rounded border-[#E5E5EA] text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="welfareAllowMoveOut" className="text-xs font-semibold text-[#1D1D1F] cursor-pointer">Always allow move-out document access</label>
                </div>
              </div>
              <div className="bg-white border border-[#E5E5EA] rounded-xl p-3.5 text-xs text-[#6E6E73] space-y-1">
                <div className="font-bold text-[#1D1D1F] flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Welfare Safe Guarantee
                </div>
                <p className="text-[11px] leading-normal font-medium">
                  Maintenance tickets and lease document viewing remain exempt from billing suspension locks.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#F2F2F7]">
            <Button variant="outline" onClick={() => { setSettings(platformSettings); setShowSettings(false); }} className="rounded-xl font-bold text-xs h-10">Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={savingSettings} className="bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-xl font-bold text-xs h-10 px-5 shadow-xs">
              {savingSettings ? "Saving..." : "Save Policies"}
            </Button>
          </div>
        </Card>
      )}

      {/* 2. REVENUE & PORTFOLIO METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* MRR Card */}
        <Card className="bg-white border border-[#E5E5EA] shadow-2xs rounded-3xl p-5 transition-all hover:border-[#007AFF] hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Monthly Recurring Revenue</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#1D1D1F] mt-2.5 tracking-tight">${mrr.toLocaleString()}/mo</p>
          <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>From {activeCount} active subscriptions</span>
          </div>
        </Card>

        {/* At Risk MRR Card */}
        <Card className="bg-white border border-[#E5E5EA] shadow-2xs rounded-3xl p-5 transition-all hover:border-rose-300 hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">At-Risk MRR</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-600 mt-2.5 tracking-tight">${atRiskMrr.toLocaleString()}/mo</p>
          <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-rose-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{pastDueCount + pausedCount} accounts in grace / lock</span>
          </div>
        </Card>

        {/* Paying Subscribers Card */}
        <Card className="bg-white border border-[#E5E5EA] shadow-2xs rounded-3xl p-5 transition-all hover:border-[#007AFF] hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Paying Owners</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#1D1D1F] mt-2.5 tracking-tight">{activeCount} / {totalOwners}</p>
          <p className="text-[11px] font-semibold text-[#6E6E73] mt-1">
            {totalOwners > 0 ? Math.round((activeCount / totalOwners) * 100) : 0}% active conversion rate
          </p>
        </Card>

        {/* Soft-Locked Portfolios */}
        <Card className="bg-white border border-[#E5E5EA] shadow-2xs rounded-3xl p-5 transition-all hover:border-amber-300 hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Soft-Locked Portfolios</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-600 mt-2.5 tracking-tight">{pausedCount + pastDueCount}</p>
          <p className="text-[11px] font-semibold text-[#6E6E73] mt-1">
            {pastDueCount} past-due, {pausedCount} paused
          </p>
        </Card>
      </div>

      {/* 3. FILTER AND SEARCH CONSOLE */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 border border-[#E5E5EA] rounded-2xl shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search owners by name or email address..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#F2F2F7] border border-[#E5E5EA] focus:bg-white focus:border-[#007AFF] rounded-xl h-10 w-full font-semibold text-xs transition-all"
          />
          {search && (
            <button 
              onClick={() => setSearch("")} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-3 w-full sm:w-auto shrink-0">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "ALL")}>
            <SelectTrigger className="w-full sm:w-[170px] bg-white border-[#E5E5EA] hover:border-[#1D1D1F] rounded-xl h-10 font-bold text-xs transition-all shadow-2xs">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-[#8E8E93] font-semibold">Status:</span>
                <span className="truncate">{formatStatus(statusFilter)}</span>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-white rounded-xl border-[#E5E5EA]">
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Trialing">Trialing</SelectItem>
              <SelectItem value="Past_Due">Past Due</SelectItem>
              <SelectItem value="Paused">Paused</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tierFilter} onValueChange={(v) => setTierFilter(v || "ALL")}>
            <SelectTrigger className="w-full sm:w-[170px] bg-white border-[#E5E5EA] hover:border-[#1D1D1F] rounded-xl h-10 font-bold text-xs transition-all shadow-2xs">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-[#8E8E93] font-semibold">Tier:</span>
                <span className="truncate">{tierFilter === "ALL" ? "All Tiers" : tierFilter}</span>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-white rounded-xl border-[#E5E5EA]">
              <SelectItem value="ALL">All Tiers</SelectItem>
              {uniqueTiers.map(tier => (
                <SelectItem key={tier} value={tier}>{tier}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. EXECUTIVE SAAS SUBSCRIPTIONS TABLE */}
      <Card className="bg-white border-[#E5E5EA] shadow-2xs rounded-3xl overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <Table>
            <TableHeader className="bg-slate-50/80 border-b border-[#E5E5EA]">
              <TableRow className="border-[#E5E5EA] hover:bg-transparent">
                <TableHead className="w-12 text-[#6E6E73] font-black text-[11px] uppercase tracking-wider">#</TableHead>
                <TableHead className="text-[#6E6E73] font-black text-[11px] uppercase tracking-wider">Owner Account</TableHead>
                <TableHead className="text-[#6E6E73] font-black text-[11px] uppercase tracking-wider">SaaS Tier / License</TableHead>
                <TableHead className="text-[#6E6E73] font-black text-[11px] uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-[#6E6E73] font-black text-[11px] uppercase tracking-wider">Feature Overrides</TableHead>
                <TableHead className="text-[#6E6E73] font-black text-[11px] uppercase tracking-wider">Portfolio Scale</TableHead>
                <TableHead className="text-right text-[#6E6E73] font-black text-[11px] uppercase tracking-wider whitespace-nowrap">Manage Account</TableHead>
                <TableHead className="text-right text-[#6E6E73] font-black text-[11px] uppercase tracking-wider w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-[#F2F2F7] text-xs font-semibold text-[#1D1D1F]">
              {filteredOwners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-[#6E6E73]">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <CreditCard className="h-8 w-8 text-slate-300" />
                      <p className="font-bold text-sm">No landlords found matching your filter criteria.</p>
                      <Button 
                        onClick={() => { setSearch(""); setStatusFilter("ALL"); setTierFilter("ALL"); }}
                        className="bg-[#1D1D1F] text-white hover:bg-black rounded-xl font-bold text-xs h-9 px-4"
                      >
                        Reset All Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOwners.map((owner, idx) => {
                  const totalUnits = owner.ownedProperties.reduce((acc: any, p: any) => acc + p.units.length, 0);
                  const isOverLimit = owner.pricingTier && totalUnits > owner.pricingTier.maxUnits;

                  const isOverrideActive = owner.subscriptionOverride &&
                    (!owner.subscriptionOverride.expiresAt || new Date(owner.subscriptionOverride.expiresAt) > new Date());

                  const isCompedActive = owner.accessGrantedByAdmin &&
                    (!owner.accessGrantedExpiresAt || new Date(owner.accessGrantedExpiresAt) > new Date());
                  
                  const activeOverridesCount = owner.moduleGrants?.length || 0;

                  return (
                    <TableRow 
                      key={owner.id} 
                      className="border-[#E5E5EA] hover:bg-slate-50/60 transition-colors cursor-pointer" 
                      onClick={() => router.push(`/dashboard/admin/users/${owner.id}`)}
                    >
                      <TableCell className="text-[#6E6E73] text-xs font-bold" onClick={(e) => e.stopPropagation()}>
                        {idx + 1}
                      </TableCell>

                      {/* Owner Account */}
                      <TableCell className="font-extrabold text-[#1D1D1F]">
                        <div className="flex items-center gap-3">
                          {owner.avatar ? (
                            <img src={owner.avatar} alt={owner.name} className="h-9 w-9 rounded-full object-cover shrink-0 border border-slate-200" />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                              {owner.name?.charAt(0)?.toUpperCase() || "O"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-extrabold text-sm text-[#1D1D1F] truncate">{owner.name || "Unknown"}</p>
                              {isOverrideActive && <Badge className="bg-purple-50 text-purple-700 border-purple-100 font-bold text-[9px] px-1.5 py-0.5 rounded-md">⚙ Policy</Badge>}
                              {isCompedActive && <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold text-[9px] px-1.5 py-0.5 rounded-md">🎁 Comped</Badge>}
                            </div>
                            <p className="text-xs font-medium text-[#6E6E73] truncate">{owner.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Tier / Plan */}
                      <TableCell className="whitespace-nowrap">
                        {owner.pricingTier ? (
                          <Badge className="bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-900 border-indigo-100 rounded-xl px-3 py-1 font-bold text-xs shadow-2xs">
                            {owner.pricingTier.name}
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 rounded-xl px-3 py-1 font-bold text-xs shadow-none">
                            No Active Plan
                          </Badge>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="whitespace-nowrap">
                        {owner.subscriptionStatus === "Active" || owner.subscriptionStatus === "Active (Canceling)" ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/60 font-bold text-xs px-3 py-1 flex items-center gap-1.5 w-max">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" /> Active Subscription
                          </Badge>
                        ) : owner.subscriptionStatus === "Past_Due" ? (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200/60 font-bold text-xs px-3 py-1 flex items-center gap-1.5 w-max">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" /> Past Due Grace
                          </Badge>
                        ) : owner.subscriptionStatus === "Paused" ? (
                          <Badge className="bg-rose-50 text-rose-700 border-rose-200/60 font-bold text-xs px-3 py-1 flex items-center gap-1.5 w-max">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" /> Soft-Locked (Paused)
                          </Badge>
                        ) : owner.subscriptionStatus === "Trialing" ? (
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200/60 font-bold text-xs px-3 py-1 flex items-center gap-1.5 w-max">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" /> Trial Period
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold text-xs px-3 py-1 flex items-center gap-1.5 w-max">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" /> Standard
                          </Badge>
                        )}
                      </TableCell>

                      {/* Feature Overrides */}
                      <TableCell className="whitespace-nowrap">
                        {activeOverridesCount > 0 ? (
                          <Badge className="bg-purple-50 text-purple-700 border border-purple-200/60 font-extrabold text-[11px] rounded-lg px-2.5 py-1">
                            {activeOverridesCount} Grant{activeOverridesCount > 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">—</span>
                        )}
                      </TableCell>

                      {/* Portfolio Size */}
                      <TableCell className="whitespace-nowrap font-semibold text-[#1D1D1F]">
                        <div className="flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          {owner.pricingTier ? (
                            <span className={isOverLimit ? 'text-rose-600 font-extrabold' : ''}>
                              {owner.ownedProperties.length} prop ({totalUnits}/{owner.pricingTier.maxUnits} units)
                            </span>
                          ) : (
                            <span>{owner.ownedProperties.length} prop ({totalUnits} units)</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Manage Column Link */}
                      <TableCell className="text-right whitespace-nowrap" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/admin/users/${owner.id}`); }}>
                        <span className="inline-flex items-center gap-1 bg-white hover:bg-[#007AFF] text-[#007AFF] hover:text-white border border-[#007AFF]/30 hover:border-[#007AFF] font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-2xs group">
                          <span>Manage Owner</span>
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </span>
                      </TableCell>

                      {/* Quick Actions Dropdown */}
                      <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 p-0 text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-slate-100 rounded-xl inline-flex items-center justify-center transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-white rounded-2xl shadow-xl border-[#E5E5EA] p-1.5">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel className="font-bold text-[#8E8E93] text-[10px] uppercase tracking-wider px-3 py-1.5">Account Administration</DropdownMenuLabel>
                              <DropdownMenuItem 
                                className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[#1D1D1F] rounded-xl px-3 py-2 focus:bg-slate-100" 
                                onClick={() => router.push(`/dashboard/admin/users/${owner.id}`)}
                              >
                                <Users className="h-4 w-4 text-blue-500" /> View Owner Profile
                              </DropdownMenuItem>

                              <DropdownMenuItem 
                                className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[#1D1D1F] rounded-xl px-3 py-2 focus:bg-slate-100" 
                                disabled={syncingId === owner.id || !owner.stripeSubscriptionId}
                                onClick={() => handleSyncStripe(owner.id)}
                              >
                                <RefreshCw className={`h-4 w-4 text-purple-500 ${syncingId === owner.id ? 'animate-spin' : ''}`} /> 
                                {syncingId === owner.id ? "Syncing..." : "Sync Stripe Identity"}
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem 
                                className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[#1D1D1F] rounded-xl px-3 py-2 focus:bg-slate-100" 
                                disabled={!owner.stripeCustomerId}
                                onClick={() => window.open(`https://dashboard.stripe.com/customers/${owner.stripeCustomerId || ''}`, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 text-emerald-500" /> View Stripe Portal
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator className="bg-[#F2F2F7] my-1" />
                            <DropdownMenuGroup>
                              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[#1D1D1F] rounded-xl px-3 py-2 focus:bg-slate-100" onClick={() => window.location.href = `mailto:${owner.email}`}>
                                <Mail className="h-4 w-4 text-[#6E6E73]" /> Send Email Notice
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
