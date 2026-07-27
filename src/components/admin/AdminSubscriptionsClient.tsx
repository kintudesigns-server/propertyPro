"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Global settings state
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState(platformSettings);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Formatting helpers
  const formatStatus = (status: string) => {
    if (!status) return "Inactive";
    return status.replace(/_/g, " ");
  };

  const timeUntil = (dateStr: string | Date | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const cleanDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const cleanNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = cleanDate.getTime() - cleanNow.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const formattedDate = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    
    if (diffDays < 0) {
      return `expired ${Math.abs(diffDays)}d ago · ${formattedDate}`;
    } else if (diffDays === 0) {
      return `ends today · ${formattedDate}`;
    } else {
      return `in ${diffDays} day${diffDays > 1 ? "s" : ""} · ${formattedDate}`;
    }
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
    <div className="space-y-8 relative">
      {/* Toast alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300">
          <div className={`rounded-2xl p-4 shadow-2xl flex items-center gap-3 border text-sm font-bold min-w-[320px] ${
            toast.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-100" :
            toast.type === "error" ? "bg-rose-50 text-rose-800 border-rose-100" :
            "bg-blue-50 text-blue-800 border-blue-100"
          }`}>
            {toast.type === "success" && <ShieldCheck className="text-emerald-600 shrink-0" size={18} />}
            {toast.type === "error" && <AlertTriangle className="text-rose-600 shrink-0" size={18} />}
            {toast.type === "info" && <AlertCircle className="text-blue-600 shrink-0" size={18} />}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-[#8E8E93] hover:text-[#1D1D1F]">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Platform settings section toggle bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 border border-[#E5E5EA] rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#F2F2F7] rounded-xl text-[#6E6E73]">
            <Settings2 size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#1D1D1F]">Platform Subscription Policies</h4>
            <p className="text-xs text-[#6E6E73]">
              Default grace period: <span className="font-extrabold text-[#1D1D1F]">{platformSettings.gracePeriodDays} days</span> · 
              Block payouts on past due: <span className="font-extrabold text-[#1D1D1F]">{platformSettings.blockPayoutsOnPastDue ? "Yes" : "No"}</span>
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowSettings(!showSettings)}
          className="border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-xl flex items-center gap-2 font-bold text-xs h-9"
        >
          {showSettings ? "Hide Settings" : "Configure Policies"}
        </Button>
      </div>

      {showSettings && (
        <Card className="bg-[#F2F2F7]/50 border border-[#E5E5EA] shadow-sm rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#1D1D1F] flex items-center gap-2">
              <Settings2 size={18} className="text-blue-500" />
              Global Subscription Gating & Overage Policies
            </h3>
            <span className="text-xs text-[#6E6E73] bg-white px-3 py-1 rounded-full border border-[#E5E5EA]">Platform-Wide Defaults</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Column 1: Financial Controls */}
            <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 space-y-4 shadow-2xs">
              <h4 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider border-b border-slate-100 pb-2">Financial Controls</h4>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Grace Period</label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    value={settings.gracePeriodDays} 
                    onChange={(e) => setSettings({ ...settings, gracePeriodDays: parseInt(e.target.value) || 0 })}
                    className="bg-white rounded-xl border-[#E5E5EA] h-10 w-24 text-center font-bold"
                  />
                  <span className="text-xs font-medium text-[#6E6E73]">Days in Past_Due state</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="payoutsPastDue"
                  checked={!!settings.blockPayoutsOnPastDue}
                  onChange={(e) => setSettings({ ...settings, blockPayoutsOnPastDue: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5E5EA] text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="payoutsPastDue" className="text-sm font-medium text-[#1D1D1F] cursor-pointer">Block payouts during Past_Due grace</label>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="payoutsPaused"
                  checked={!!settings.blockPayoutsOnPaused}
                  onChange={(e) => setSettings({ ...settings, blockPayoutsOnPaused: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5E5EA] text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="payoutsPaused" className="text-sm font-medium text-[#1D1D1F] cursor-pointer">Block payouts when paused</label>
              </div>
            </div>

            {/* Column 2: Paused Account Restrictions */}
            <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 space-y-4 shadow-2xs">
              <h4 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider border-b border-slate-100 pb-2">Paused Restrictions</h4>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="unitsPaused"
                  checked={!!settings.blockNewUnitsOnPaused}
                  onChange={(e) => setSettings({ ...settings, blockNewUnitsOnPaused: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5E5EA] text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="unitsPaused" className="text-sm font-medium text-[#1D1D1F] cursor-pointer">Block new units & properties</label>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="vendorPaused"
                  checked={!!settings.blockAddVendorOnPaused}
                  onChange={(e) => setSettings({ ...settings, blockAddVendorOnPaused: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5E5EA] text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="vendorPaused" className="text-sm font-medium text-[#1D1D1F] cursor-pointer">Block adding new vendors</label>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="inspectorPaused"
                  checked={!!settings.blockAddInspectorOnPaused}
                  onChange={(e) => setSettings({ ...settings, blockAddInspectorOnPaused: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5E5EA] text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="inspectorPaused" className="text-sm font-medium text-[#1D1D1F] cursor-pointer">Block adding new inspectors / team</label>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="tenantPaused"
                  checked={!!settings.blockAddTenantOnPaused}
                  onChange={(e) => setSettings({ ...settings, blockAddTenantOnPaused: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5E5EA] text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="tenantPaused" className="text-sm font-medium text-[#1D1D1F] cursor-pointer">Block registering new tenants</label>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="processAppsPaused"
                  checked={!!settings.blockProcessApplicationsOnPaused}
                  onChange={(e) => setSettings({ ...settings, blockProcessApplicationsOnPaused: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5E5EA] text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="processAppsPaused" className="text-sm font-medium text-[#1D1D1F] cursor-pointer">Block processing applications</label>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="tourSlotsPaused"
                  checked={!!settings.blockTourSlotsOnPaused}
                  onChange={(e) => setSettings({ ...settings, blockTourSlotsOnPaused: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5E5EA] text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="tourSlotsPaused" className="text-sm font-medium text-[#1D1D1F] cursor-pointer">Block updating tour availability</label>
              </div>
            </div>

            {/* Column 3: Policy Welfare & Safety Defaults */}
            <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 space-y-4 shadow-2xs flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider border-b border-slate-100 pb-2">Policy Exemptions</h4>
                <div className="flex items-center gap-3 mt-4">
                  <input 
                    type="checkbox" 
                    id="maintPaused"
                    checked={!!settings.allowMaintenanceOnPaused}
                    onChange={(e) => setSettings({ ...settings, allowMaintenanceOnPaused: e.target.checked })}
                    className="h-4 w-4 rounded border-[#E5E5EA] text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="maintPaused" className="text-sm font-medium text-[#1D1D1F] cursor-pointer">Always allow tenant maintenance</label>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mt-4 text-xs text-[#6E6E73] space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" /> Always Allowed (Welfare Exempt)
                </div>
                <p className="leading-relaxed">
                  Tenant payouts, maintenance assignments, messaging, record viewing, billing setup, and lease activation/move-out details are exempt from suspension locks.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E5EA]">
            <Button variant="ghost" onClick={() => { setSettings(platformSettings); setShowSettings(false); }} className="rounded-xl font-bold">Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={savingSettings} className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold">
              {savingSettings ? "Saving..." : "Save Policies"}
            </Button>
          </div>
        </Card>
      )}

      {/* Overview Cards Grid */}
      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-3">Portfolio Lifecycle Volumes</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl transition-all hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Total Owners</p>
                  <Users size={14} className="text-slate-400" />
                </div>
                <p className="text-2xl font-black text-[#1D1D1F] mt-1">{totalOwners}</p>
                <p className="text-[10px] font-semibold text-[#8E8E93] mt-1">Registered accounts</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl transition-all hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Active</p>
                  <ShieldCheck size={14} className="text-emerald-500" />
                </div>
                <p className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</p>
                <p className="text-[10px] font-semibold text-[#8E8E93] mt-1">Paying subscribers</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl transition-all hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Trialing</p>
                  <Play size={14} className="text-blue-500" />
                </div>
                <p className="text-2xl font-black text-blue-500 mt-1">{trialingCount}</p>
                <p className="text-[10px] font-semibold text-[#8E8E93] mt-1">Free evaluations</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl transition-all hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Past Due</p>
                  <AlertTriangle size={14} className="text-orange-500" />
                </div>
                <p className="text-2xl font-black text-orange-500 mt-1">{pastDueCount}</p>
                <p className="text-[10px] font-semibold text-[#8E8E93] mt-1">In payment grace</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl transition-all hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Paused</p>
                  <Pause size={14} className="text-amber-500" />
                </div>
                <p className="text-2xl font-black text-amber-600 mt-1">{pausedCount}</p>
                <p className="text-[10px] font-semibold text-[#8E8E93] mt-1">Soft-locked portfolios</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-3">Platform Financial Health</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50/30 border border-emerald-100/80 shadow-xs rounded-2xl transition-all hover:shadow-md">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Monthly Recurring Revenue (MRR)</p>
                  <p className="text-3xl font-black text-emerald-700 mt-1.5">${mrr.toLocaleString()}</p>
                  <p className="text-[10px] font-semibold text-emerald-600 mt-1">Volume from active subscription contracts</p>
                </div>
                <div className="p-3.5 bg-emerald-500 text-white rounded-2xl shadow-xs">
                  <DollarSign size={24} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-rose-50 to-orange-50/30 border border-rose-100/80 shadow-xs rounded-2xl transition-all hover:shadow-md relative group cursor-help">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">At-Risk MRR</p>
                  <p className="text-3xl font-black text-rose-700 mt-1.5">${atRiskMrr.toLocaleString()}</p>
                  <p className="text-[10px] font-semibold text-rose-600 mt-1">Lapsed contracts under grace / lock</p>
                </div>
                <div className="p-3.5 bg-rose-500 text-white rounded-2xl shadow-xs">
                  <ShieldAlert size={24} />
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 text-white text-[10px] p-2.5 rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-2xl z-30 leading-normal text-center font-medium">
                  Monthly subscription contracts that are in Paused or Past Due states and at risk of churning.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Filter and Table Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 border border-[#E5E5EA] rounded-2xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6E73]" />
          <Input 
            placeholder="Search owners by name or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#F2F2F7] border-transparent focus:bg-white focus:border-blue-500 rounded-xl h-10 w-full font-medium"
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto shrink-0">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "ALL")}>
            <SelectTrigger className="w-full sm:w-[170px] bg-white border-[#E5E5EA] hover:border-[#1D1D1F] rounded-xl h-10 font-bold text-xs transition-all shadow-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[#8E8E93] font-semibold">Status:</span>
                <span>{formatStatus(statusFilter)}</span>
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
            <SelectTrigger className="w-full sm:w-[170px] bg-white border-[#E5E5EA] hover:border-[#1D1D1F] rounded-xl h-10 font-bold text-xs transition-all shadow-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[#8E8E93] font-semibold">Tier:</span>
                <span>{tierFilter === "ALL" ? "All" : tierFilter}</span>
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

      <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <Table>
            <TableHeader className="bg-[#F9F9FB]">
              <TableRow className="border-[#E5E5EA] hover:bg-transparent">
                <TableHead className="w-12 text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider">#</TableHead>
                <TableHead className="text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider">Owner Name</TableHead>
                <TableHead className="text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider">Email Address</TableHead>
                <TableHead className="text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider">Plan / Tier</TableHead>
                <TableHead className="text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider">Overrides Status</TableHead>
                <TableHead className="text-right text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider">Properties (Units)</TableHead>
                <TableHead className="text-center text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider w-[120px]">Manage</TableHead>
                <TableHead className="text-right text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOwners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-44 text-center text-[#6E6E73]">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <p className="font-bold text-sm">No owners found matching your criteria.</p>
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
                      className="border-[#E5E5EA] hover:bg-blue-50/30 transition-colors cursor-pointer" 
                      onClick={() => router.push(`/dashboard/admin/subscriptions/${owner.id}`)}
                    >
                      <TableCell className="text-[#6E6E73] text-sm font-bold" onClick={(e) => e.stopPropagation()}>{idx + 1}</TableCell>
                      <TableCell className="font-bold text-[#1D1D1F]">
                        <div className="flex items-center gap-2">
                          {owner.name || "Unknown"}
                          {isOverrideActive && <Badge className="bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-50 font-bold text-[9px] px-1.5 py-0.5 rounded-md shadow-none">⚙ Policy</Badge>}
                          {isCompedActive && <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-50 font-bold text-[9px] px-1.5 py-0.5 rounded-md shadow-none">🎁 Comped</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-[#6E6E73]">{owner.email}</TableCell>
                      <TableCell>
                        {owner.pricingTier ? (
                          <Badge className="bg-amber-50 text-amber-700 border border-amber-100/50 rounded-lg px-2.5 py-1 font-bold text-xs shadow-none">
                            {owner.pricingTier.name}
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-50 text-[#6E6E73] border border-slate-100 rounded-lg px-2.5 py-1 font-bold text-xs shadow-none">
                            No Active Plan
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                            owner.subscriptionStatus === 'Active' || owner.subscriptionStatus === 'Active (Canceling)' ? 'bg-emerald-500 animate-pulse' :
                            owner.subscriptionStatus === 'Past_Due' ? 'bg-orange-500 animate-pulse' :
                            owner.subscriptionStatus === 'Paused' ? 'bg-amber-500 animate-pulse' :
                            owner.subscriptionStatus === 'Trialing' ? 'bg-blue-500 animate-pulse' :
                            'bg-slate-400'
                          }`} />
                          <Badge className={`border-0 rounded-lg px-2.5 py-1 font-bold text-xs shadow-none ${
                            owner.subscriptionStatus === 'Active' || owner.subscriptionStatus === 'Active (Canceling)' ? 'bg-emerald-100 text-emerald-700' :
                            owner.subscriptionStatus === 'Past_Due' ? 'bg-orange-100 text-orange-700' :
                            owner.subscriptionStatus === 'Paused' ? 'bg-amber-100 text-amber-700' :
                            owner.subscriptionStatus === 'Trialing' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {formatStatus(owner.subscriptionStatus)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {activeOverridesCount > 0 ? (
                          <Badge className="bg-purple-100 hover:bg-purple-100 text-purple-700 font-extrabold text-[10px] rounded-lg px-2 py-0.5 shadow-none border-0">
                            {activeOverridesCount} Override{activeOverridesCount > 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-[#1D1D1F]">
                        {owner.pricingTier ? (
                          <span className={isOverLimit ? 'text-red-500 font-bold' : ''}>
                            {owner.ownedProperties.length} properties ({totalUnits}/{owner.pricingTier.maxUnits} units)
                          </span>
                        ) : (
                          <span>{owner.ownedProperties.length} properties ({totalUnits} units)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/admin/subscriptions/${owner.id}`); }}>
                        <span className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-0.5 hover:underline">
                          Manage Owner <ChevronRight size={14} />
                        </span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 p-0 text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-lg inline-flex items-center justify-center">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-white rounded-xl shadow-lg border-[#E5E5EA]">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel className="font-bold text-[#6E6E73] text-xs uppercase tracking-wider py-2">Quick Actions</DropdownMenuLabel>
                              <DropdownMenuItem 
                                className="flex items-center gap-2 cursor-pointer font-bold text-sm text-[#1D1D1F] focus:bg-[#F2F2F7]" 
                                disabled={syncingId === owner.id || !owner.stripeSubscriptionId}
                                onClick={() => handleSyncStripe(owner.id)}
                              >
                                <RefreshCw className={`h-4 w-4 text-blue-500 ${syncingId === owner.id ? 'animate-spin' : ''}`} /> 
                                {syncingId === owner.id ? "Syncing..." : "Force Sync with Stripe"}
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem 
                                className="flex items-center gap-2 cursor-pointer font-bold text-sm text-[#1D1D1F] focus:bg-[#F2F2F7]" 
                                disabled={!owner.stripeCustomerId}
                                onClick={() => window.open(`https://dashboard.stripe.com/customers/${owner.stripeCustomerId || ''}`, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 text-emerald-500" /> View in Stripe
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator className="bg-[#E5E5EA]" />
                            <DropdownMenuGroup>
                              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer font-bold text-sm text-[#1D1D1F] focus:bg-[#F2F2F7]" onClick={() => window.location.href = `mailto:${owner.email}`}>
                                <Mail className="h-4 w-4 text-[#6E6E73]" /> Email Owner
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
