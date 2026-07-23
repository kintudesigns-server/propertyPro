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
  Calendar,
  X,
  ShieldCheck,
  Settings2,
  Lock,
  Unlock,
  AlertCircle,
  Users,
  Copy,
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

  // Drawer / Override state
  const [selectedOwner, setSelectedOwner] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [blockPayoutsOverride, setBlockPayoutsOverride] = useState<string>("default");
  const [blockNewUnitsOverride, setBlockNewUnitsOverride] = useState<string>("default");
  const [overrideExpiresAt, setOverrideExpiresAt] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [manualGrantDays, setManualGrantDays] = useState("30");
  const [manualGraceDays, setManualGraceDays] = useState("7");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customGrantSelected, setCustomGrantSelected] = useState(false);
  const [customGraceSelected, setCustomGraceSelected] = useState(false);

  // Formatting helpers
  const formatStatus = (status: string) => {
    if (!status) return "Inactive";
    return status.replace(/_/g, " ");
  };

  const timeUntil = (dateStr: string | Date | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    // Normalize times to count clean days
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

  const openDrawer = (owner: any) => {
    setSelectedOwner(owner);
    setIsDrawerOpen(true);
    setShowDeleteConfirm(false);
    setCustomGrantSelected(false);
    setCustomGraceSelected(false);
    setOverrideReason(owner.subscriptionOverride?.reason || "");
    setBlockPayoutsOverride(
      owner.subscriptionOverride?.blockPayouts === true ? "block" :
      owner.subscriptionOverride?.blockPayouts === false ? "allow" : "default"
    );
    setBlockNewUnitsOverride(
      owner.subscriptionOverride?.blockNewUnits === true ? "block" :
      owner.subscriptionOverride?.blockNewUnits === false ? "allow" : "default"
    );
    setOverrideExpiresAt(
      owner.subscriptionOverride?.expiresAt 
        ? new Date(owner.subscriptionOverride.expiresAt).toISOString().split('T')[0]
        : ""
    );
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedOwner(null);
    setShowDeleteConfirm(false);
    setCustomGrantSelected(false);
    setCustomGraceSelected(false);
  };

  const handleSaveOverride = async () => {
    if (!selectedOwner) return;
    if (!overrideReason || overrideReason.trim().length < 10) {
      showToast("A valid reason of at least 10 characters is required for audit trails.", "error");
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        userId: selectedOwner.id,
        blockPayouts: blockPayoutsOverride === "block" ? true : blockPayoutsOverride === "allow" ? false : null,
        blockNewUnits: blockNewUnitsOverride === "block" ? true : blockNewUnitsOverride === "allow" ? false : null,
        expiresAt: overrideExpiresAt ? new Date(overrideExpiresAt).toISOString() : null,
        reason: overrideReason,
      };

      const res = await fetch("/api/admin/subscriptions/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("Subscription override saved successfully.", "success");
      closeDrawer();
      router.refresh();
    } catch (err: any) {
      showToast(`Failed to save override: ${err.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmClearOverride = async () => {
    if (!selectedOwner) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/subscriptions/override?userId=${selectedOwner.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("Overrides cleared. Default platform policies applied.", "success");
      setShowDeleteConfirm(false);
      closeDrawer();
      router.refresh();
    } catch (err: any) {
      showToast(`Failed to clear overrides: ${err.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualAction = async (action: string, extraBody = {}) => {
    if (!selectedOwner) return;
    
    // Validate reasons for pause/restore/extend_grace
    if ((action === "manual_pause" || action === "restore_access" || action === "extend_grace") && (!overrideReason || overrideReason.trim().length < 10)) {
      showToast("A valid reason of at least 10 characters is required to log this action.", "error");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/admin/subscriptions/manual-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userId: selectedOwner.id,
          reason: overrideReason,
          ...extraBody
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Manual action completed successfully.`, "success");
      closeDrawer();
      router.refresh();
    } catch (err: any) {
      showToast(`Action failed: ${err.message}`, "error");
    } finally {
      setActionLoading(false);
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
                <TableHead className="text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider">Details / Expiry</TableHead>
                <TableHead className="text-right text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider">Properties (Units)</TableHead>
                <TableHead className="text-center text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider w-[100px]">Manage</TableHead>
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

                  return (
                    <TableRow key={owner.id} className="border-[#E5E5EA] hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => openDrawer(owner)}>
                      <TableCell className="text-[#6E6E73] text-sm font-bold" onClick={(e) => e.stopPropagation()}>{idx + 1}</TableCell>
                      <TableCell className="font-bold text-[#1D1D1F]">
                        <div className="flex items-center gap-2">
                          {owner.name || "Unknown"}
                          {isOverrideActive && <Badge className="bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-50 font-bold text-[9px] px-1.5 py-0.5 rounded-md shadow-none">⚙ Override</Badge>}
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
                      <TableCell className="text-xs font-semibold text-[#6E6E73]">
                        {owner.subscriptionStatus === 'Past_Due' && owner.gracePeriodEnd && (
                          <span className="text-orange-600 font-bold">Grace ends {timeUntil(owner.gracePeriodEnd)}</span>
                        )}
                        {owner.subscriptionStatus === 'Paused' && owner.pausedAt && (
                          <span className="text-amber-600 font-bold">Paused since {new Date(owner.pausedAt).toLocaleDateString()}</span>
                        )}
                        {isCompedActive && owner.accessGrantedExpiresAt && (
                          <span className="text-indigo-600 font-bold">Admin grant ends {timeUntil(owner.accessGrantedExpiresAt)}</span>
                        )}
                        {!owner.gracePeriodEnd && !owner.pausedAt && !isCompedActive && (
                          <span className="text-slate-400">—</span>
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
                      <TableCell className="text-center" onClick={(e) => { e.stopPropagation(); openDrawer(owner); }}>
                        <span className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-0.5 hover:underline">
                          Configure <ChevronRight size={14} />
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

      {/* Side Slide-Out Control Drawer */}
      {isDrawerOpen && selectedOwner && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-0 overflow-hidden relative border-l border-[#E5E5EA]">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-[#E5E5EA] flex justify-between items-center bg-[#F9F9FB]">
              <div>
                <h2 className="text-lg font-black text-[#1D1D1F] tracking-tight">{selectedOwner.name || "Owner Control Panel"}</h2>
                <p className="text-xs font-semibold text-[#8E8E93] mt-0.5">{selectedOwner.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={`/dashboard/admin/properties?search=${encodeURIComponent(selectedOwner.name || "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 bg-blue-50 px-2.5 py-1.5 rounded-xl border border-blue-100 transition-all shrink-0"
                >
                  View Portfolio <ExternalLink size={12} />
                </a>
                <button className="text-[#8E8E93] hover:text-[#1D1D1F] p-1.5 rounded-full hover:bg-[#E5E5EA] transition-colors" onClick={closeDrawer}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Action Authorization Required Card - Promoted to the TOP of the drawer */}
              <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-purple-600 shrink-0" size={16} />
                  <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider">Action Authorization</h3>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-purple-950 block">Audit Trail Reason * (Min 10 characters)</label>
                  <textarea 
                    value={overrideReason} 
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. Approved payout bypass during billing dispute review."
                    className="w-full min-h-[70px] rounded-xl border border-[#E5E5EA] bg-white p-3 text-sm focus:outline-none focus:border-purple-300 font-medium transition-all shadow-inner"
                  />
                  <p className="text-[10px] text-purple-700 leading-snug">You must provide an administrative justification before using any action controls below.</p>
                </div>
              </div>

              {/* Owner Overview Card */}
              <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-4 shadow-xs">
                <h3 className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">Owner Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-[#8E8E93]">Billing Status</span>
                    <div>
                      <Badge className={`border-0 font-extrabold text-xs px-2.5 py-0.5 rounded-lg ${
                        selectedOwner.subscriptionStatus === 'Active' || selectedOwner.subscriptionStatus === 'Active (Canceling)' ? 'bg-emerald-50 text-emerald-700' :
                        selectedOwner.subscriptionStatus === 'Past_Due' ? 'bg-orange-50 text-orange-700' :
                        selectedOwner.subscriptionStatus === 'Paused' ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-50 text-slate-700'
                      }`}>
                        {formatStatus(selectedOwner.subscriptionStatus)}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-[#8E8E93]">Pricing Tier</span>
                    <p className="text-sm font-extrabold text-[#1D1D1F]">{selectedOwner.pricingTier?.name || "No Plan"}</p>
                  </div>
                </div>

                {/* Progress Bar for Portfolio Units */}
                <div className="pt-2 border-t border-[#F2F2F7]">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[#6E6E73]">Portfolio Unit Cap Usage:</span>
                    <span className="font-extrabold text-[#1D1D1F]">
                      {selectedOwner.ownedProperties.reduce((acc: any, p: any) => acc + p.units.length, 0)} / {selectedOwner.pricingTier?.maxUnits || 2} Units
                    </span>
                  </div>
                  {/* Visual Progress bar */}
                  <div className="w-full bg-[#E5E5EA] h-2 rounded-full overflow-hidden mt-1.5">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        (selectedOwner.ownedProperties.reduce((acc: any, p: any) => acc + p.units.length, 0) / (selectedOwner.pricingTier?.maxUnits || 2)) >= 1 
                          ? "bg-rose-500" 
                          : "bg-blue-600"
                      }`}
                      style={{ 
                        width: `${Math.min(100, (selectedOwner.ownedProperties.reduce((acc: any, p: any) => acc + p.units.length, 0) / (selectedOwner.pricingTier?.maxUnits || 2)) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {selectedOwner.accessGrantedByAdmin && selectedOwner.accessGrantedExpiresAt && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700 mt-2 flex flex-col gap-0.5 font-bold">
                    <span>🎁 Temp Admin Comp Access Active</span>
                    <span className="text-[10px] text-indigo-600 font-semibold">Expires: {timeUntil(selectedOwner.accessGrantedExpiresAt)}</span>
                  </div>
                )}
              </div>

              {/* Stripe Billing Portal details */}
              <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-3 shadow-xs">
                <h3 className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">Stripe Gateway Details</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center bg-[#F9F9FB] px-3 py-2 rounded-xl border border-[#E5E5EA]">
                    <span className="font-bold text-[#6E6E73]">Stripe Customer ID</span>
                    {selectedOwner.stripeCustomerId ? (
                      <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-[#1D1D1F]">
                        <span>{selectedOwner.stripeCustomerId}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(selectedOwner.stripeCustomerId);
                            showToast("Customer ID copied!", "success");
                          }} 
                          className="text-[#8E8E93] hover:text-[#1D1D1F] p-0.5 rounded hover:bg-[#E5E5EA] transition-colors"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-semibold">Not Created</span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center bg-[#F9F9FB] px-3 py-2 rounded-xl border border-[#E5E5EA]">
                    <span className="font-bold text-[#6E6E73]">Stripe Subscription ID</span>
                    {selectedOwner.stripeSubscriptionId ? (
                      <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-[#1D1D1F]">
                        <span>{selectedOwner.stripeSubscriptionId}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(selectedOwner.stripeSubscriptionId);
                            showToast("Subscription ID copied!", "success");
                          }} 
                          className="text-[#8E8E93] hover:text-[#1D1D1F] p-0.5 rounded hover:bg-[#E5E5EA] transition-colors"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-semibold">No Active Subscription</span>
                    )}
                  </div>

                  {selectedOwner.stripeCustomerId && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`https://dashboard.stripe.com/customers/${selectedOwner.stripeCustomerId}`, '_blank')}
                      className="w-full text-xs font-bold border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F2F2F7] h-9 rounded-xl mt-1 flex items-center justify-center gap-1.5 bg-white transition-all hover:border-[#1D1D1F]"
                    >
                      <ExternalLink size={13} className="text-emerald-600" />
                      View Customer in Stripe
                    </Button>
                  )}
                </div>
              </div>

              {/* Section: Manual Admin Lifecycle Overrides */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider flex items-center gap-1.5">
                  <Play size={14} className="text-blue-500" /> Manual Account Overrides
                </h3>

                <div className="space-y-4">
                  {/* Restore / Comp Access card */}
                  <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-3 shadow-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-extrabold text-[#1D1D1F] flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-500" /> Grant Comp Access
                      </span>
                      {customGrantSelected && (
                        <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                          <Input 
                            type="number" 
                            value={manualGrantDays} 
                            onChange={(e) => setManualGrantDays(e.target.value)} 
                            placeholder="Days"
                            className="w-16 rounded-lg text-center font-bold text-xs h-7 border-[#E5E5EA]"
                          />
                          <span className="text-[10px] font-bold text-[#6E6E73]">days</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex gap-1.5 bg-[#F2F2F7] p-1 rounded-xl">
                        {["7", "14", "30"].map(days => (
                          <button 
                            key={days} 
                            type="button" 
                            onClick={() => {
                              setManualGrantDays(days);
                              setCustomGrantSelected(false);
                            }} 
                            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                              manualGrantDays === days && !customGrantSelected
                                ? "bg-white text-[#1D1D1F] shadow-sm" 
                                : "text-[#6E6E73] hover:text-[#1D1D1F]"
                            }`}
                          >
                            {days}d
                          </button>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => setCustomGrantSelected(true)} 
                          className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                            customGrantSelected
                              ? "bg-white text-[#1D1D1F] shadow-sm" 
                              : "text-[#6E6E73] hover:text-[#1D1D1F]"
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                      
                      <Button 
                        disabled={actionLoading} 
                        onClick={() => handleManualAction("restore_access", { grantDays: parseInt(manualGrantDays) || 30 })} 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1 h-9 text-xs px-4"
                      >
                        Grant Access
                      </Button>
                    </div>
                  </div>

                  {/* Extend Grace period card */}
                  <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-3 shadow-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-extrabold text-[#1D1D1F] flex items-center gap-1.5">
                        <Calendar size={14} className="text-blue-500" /> Extend Grace Period
                      </span>
                      {customGraceSelected && (
                        <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                          <Input 
                            type="number" 
                            value={manualGraceDays} 
                            onChange={(e) => setManualGraceDays(e.target.value)} 
                            placeholder="Days"
                            className="w-16 rounded-lg text-center font-bold text-xs h-7 border-[#E5E5EA]"
                          />
                          <span className="text-[10px] font-bold text-[#6E6E73]">days</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex gap-1.5 bg-[#F2F2F7] p-1 rounded-xl">
                        {["3", "7", "14"].map(days => (
                          <button 
                            key={days} 
                            type="button" 
                            disabled={selectedOwner.subscriptionStatus !== "Past_Due"}
                            onClick={() => {
                              setManualGraceDays(days);
                              setCustomGraceSelected(false);
                            }} 
                            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all disabled:opacity-40 ${
                              manualGraceDays === days && !customGraceSelected
                                ? "bg-white text-[#1D1D1F] shadow-sm" 
                                : "text-[#6E6E73] hover:text-[#1D1D1F]"
                            }`}
                          >
                            +{days}d
                          </button>
                        ))}
                        <button 
                          type="button" 
                          disabled={selectedOwner.subscriptionStatus !== "Past_Due"}
                          onClick={() => setCustomGraceSelected(true)} 
                          className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all disabled:opacity-40 ${
                            customGraceSelected
                              ? "bg-white text-[#1D1D1F] shadow-sm" 
                              : "text-[#6E6E73] hover:text-[#1D1D1F]"
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                      
                      <Button 
                        disabled={actionLoading || selectedOwner.subscriptionStatus !== "Past_Due"} 
                        onClick={() => handleManualAction("extend_grace", { days: parseInt(manualGraceDays) || 7 })} 
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-1 h-9 text-xs px-4 disabled:opacity-40"
                      >
                        Extend Grace
                      </Button>
                    </div>
                  </div>

                  {/* Pause / Reminder double button row */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      disabled={actionLoading || selectedOwner.subscriptionStatus === "Paused"} 
                      onClick={() => handleManualAction("manual_pause")} 
                      className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 h-10 text-xs disabled:opacity-40 shadow-sm"
                    >
                      <Pause size={14} /> Pause Portfolio
                    </Button>

                    <Button 
                      disabled={actionLoading} 
                      onClick={() => handleManualAction("send_reminder")} 
                      className="border border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-xl font-bold flex items-center justify-center gap-1.5 h-10 text-xs bg-white shadow-xs transition-all hover:border-[#1D1D1F]"
                    >
                      <Mail size={14} /> Send Reminder
                    </Button>
                  </div>
                </div>
              </div>

              {/* Section: Custom Policy Overrides Dropdowns */}
              <div className="space-y-4 pt-6 border-t border-[#E5E5EA]">
                <h3 className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider flex items-center gap-1.5">
                  <Settings2 size={14} className="text-purple-500" /> Custom Policy Exemptions
                </h3>

                <div className="space-y-4 bg-[#F9F9FB] border border-[#E5E5EA] rounded-2xl p-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-[#1D1D1F] flex items-center gap-1.5">
                      <DollarSign size={14} className="text-[#6E6E73]" /> Payout Withdrawals
                    </span>
                    <Select value={blockPayoutsOverride} onValueChange={(val) => setBlockPayoutsOverride(val || "default")}>
                      <SelectTrigger className="w-[140px] rounded-xl font-bold bg-white border-[#E5E5EA] h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white rounded-xl border-[#E5E5EA]">
                        <SelectItem value="default">Use Default Policy</SelectItem>
                        <SelectItem value="block">Always Block</SelectItem>
                        <SelectItem value="allow">Always Allow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-between items-center text-sm pt-2 border-t border-[#E5E5EA]">
                    <span className="font-bold text-[#1D1D1F] flex items-center gap-1.5">
                      <Layers size={14} className="text-[#6E6E73]" /> Add New Units
                    </span>
                    <Select value={blockNewUnitsOverride} onValueChange={(val) => setBlockNewUnitsOverride(val || "default")}>
                      <SelectTrigger className="w-[140px] rounded-xl font-bold bg-white border-[#E5E5EA] h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white rounded-xl border-[#E5E5EA]">
                        <SelectItem value="default">Use Default Policy</SelectItem>
                        <SelectItem value="block">Always Block</SelectItem>
                        <SelectItem value="allow">Always Allow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#E5E5EA]">
                    <label className="text-xs font-bold text-[#6E6E73] block">Override Expiration Date (Optional)</label>
                    <Input 
                      type="date" 
                      value={overrideExpiresAt} 
                      onChange={(e) => setOverrideExpiresAt(e.target.value)}
                      className="rounded-xl border-[#E5E5EA] bg-white h-9 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Sticky Action Footer */}
            <div className="p-6 border-t border-[#E5E5EA] bg-[#F9F9FB] flex flex-col justify-end">
              <div className="space-y-3">
                {selectedOwner.subscriptionOverride && (
                  showDeleteConfirm ? (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex flex-col gap-2 animate-in fade-in duration-200">
                      <p className="text-xs font-bold text-rose-800 leading-normal">Are you sure you want to clear this override? Default platform policies will apply immediately.</p>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setShowDeleteConfirm(false)} 
                          className="text-xs font-bold h-8 rounded-lg bg-white border border-[#E5E5EA] flex-1 text-[#1D1D1F]"
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={confirmClearOverride} 
                          disabled={actionLoading}
                          className="text-xs font-bold h-8 rounded-lg bg-red-600 text-white hover:bg-red-700 flex-1"
                        >
                          {actionLoading ? "Clearing..." : "Yes, Clear"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      disabled={actionLoading} 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full border border-[#E5E5EA] text-[#ef4444] hover:bg-rose-50 hover:border-rose-100 rounded-xl font-bold h-10 text-xs bg-white transition-all"
                    >
                      Clear Override Exceptions
                    </Button>
                  )
                )}
                
                {!showDeleteConfirm && (
                  <Button 
                    disabled={actionLoading} 
                    onClick={handleSaveOverride}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold h-10 text-xs shadow-sm transition-all"
                  >
                    {actionLoading ? "Saving..." : "Apply Override Exceptions"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
