"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Building2, 
  Users, 
  CreditCard, 
  ShieldAlert, 
  Layers, 
  DollarSign, 
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
  Copy,
  ChevronLeft,
  User,
  History,
  Clock
} from "lucide-react";
import { GATABLE_MODULES } from "@/lib/modules-registry";

export default function OwnerDetailClient({
  owner,
  initialGrants,
  auditLogs
}: {
  owner: any;
  initialGrants: any[];
  auditLogs: any[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'overrides' | 'activity'>('overview');
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // State variables migrated from drawer
  const [overrideReason, setOverrideReason] = useState(owner.subscriptionOverride?.reason || "");
  const [blockPayoutsOverride, setBlockPayoutsOverride] = useState<string>(
    owner.subscriptionOverride?.blockPayouts === true ? "block" :
    owner.subscriptionOverride?.blockPayouts === false ? "allow" : "default"
  );
  const [blockNewUnitsOverride, setBlockNewUnitsOverride] = useState<string>(
    owner.subscriptionOverride?.blockNewUnits === true ? "block" :
    owner.subscriptionOverride?.blockNewUnits === false ? "allow" : "default"
  );
  const [overrideExpiresAt, setOverrideExpiresAt] = useState(
    owner.subscriptionOverride?.expiresAt 
      ? new Date(owner.subscriptionOverride.expiresAt).toISOString().split('T')[0]
      : ""
  );
  
  const [actionLoading, setActionLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [manualGrantDays, setManualGrantDays] = useState("30");
  const [manualGraceDays, setManualGraceDays] = useState("7");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customGrantSelected, setCustomGrantSelected] = useState(false);
  const [customGraceSelected, setCustomGraceSelected] = useState(false);
  const [ownerGrants, setOwnerGrants] = useState<any[]>(initialGrants);
  const [grantExpiresAt, setGrantExpiresAt] = useState<string>("");

  // Helpers
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
    const formattedDate = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    
    if (diffDays < 0) {
      return `expired ${Math.abs(diffDays)}d ago · ${formattedDate}`;
    } else if (diffDays === 0) {
      return `ends today · ${formattedDate}`;
    } else {
      return `in ${diffDays} day${diffDays > 1 ? "s" : ""} · ${formattedDate}`;
    }
  };

  // Stripe & General sync handlers
  const handleSyncStripe = async () => {
    try {
      setSyncing(true);
      const res = await fetch("/api/admin/subscriptions/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: owner.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showToast(`Stripe sync complete. Status is now: ${formatStatus(data.status)}`, "success");
      router.refresh();
    } catch (err: any) {
      showToast(`Failed to sync with Stripe: ${err.message}`, "error");
    } finally {
      setSyncing(false);
    }
  };

  const fetchUpdatedGrants = async () => {
    try {
      const res = await fetch(`/api/admin/owners/${owner.id}/module-grants`);
      if (res.ok) {
        const data = await res.json();
        setOwnerGrants(data);
      }
    } catch (err) {
      console.error("Failed to load module grants", err);
    }
  };

  // Module grants handlers
  const handleGrantModule = async (moduleKey: string) => {
    if (!overrideReason || overrideReason.trim().length < 10) {
      showToast("A valid reason of at least 10 characters is required to log this grant.", "error");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/owners/${owner.id}/module-grants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: moduleKey,
          expiresAt: grantExpiresAt ? new Date(grantExpiresAt).toISOString() : null,
          reason: overrideReason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Access to ${moduleKey} granted successfully.`, "success");
      setGrantExpiresAt("");
      fetchUpdatedGrants();
      router.refresh();
    } catch (err: any) {
      showToast(`Failed to grant module: ${err.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeModule = async (moduleKey: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/owners/${owner.id}/module-grants?module=${moduleKey}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Access to ${moduleKey} revoked successfully.`, "success");
      fetchUpdatedGrants();
      router.refresh();
    } catch (err: any) {
      showToast(`Failed to revoke module: ${err.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGrantAllModules = async () => {
    if (!overrideReason || overrideReason.trim().length < 10) {
      showToast("A valid reason of at least 10 characters is required to log this grant.", "error");
      return;
    }

    try {
      setActionLoading(true);
      const nonCoreGatable = GATABLE_MODULES.filter(m => !m.alwaysIncluded);
      for (const mod of nonCoreGatable) {
        if (owner.pricingTier?.modules?.includes(mod.key)) continue;

        await fetch(`/api/admin/owners/${owner.id}/module-grants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module: mod.key,
            expiresAt: grantExpiresAt ? new Date(grantExpiresAt).toISOString() : null,
            reason: overrideReason
          })
        });
      }
      showToast("All modules granted successfully.", "success");
      setGrantExpiresAt("");
      fetchUpdatedGrants();
      router.refresh();
    } catch (err: any) {
      showToast(`Failed to grant all modules: ${err.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearAllGrants = async () => {
    try {
      setActionLoading(true);
      const nonCoreGatable = GATABLE_MODULES.filter(m => !m.alwaysIncluded);
      for (const mod of nonCoreGatable) {
        if (owner.pricingTier?.modules?.includes(mod.key)) continue;

        await fetch(`/api/admin/owners/${owner.id}/module-grants?module=${mod.key}`, {
          method: "DELETE"
        });
      }
      showToast("All grants cleared successfully.", "success");
      fetchUpdatedGrants();
      router.refresh();
    } catch (err: any) {
      showToast(`Failed to clear grants: ${err.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Lifecycle Override Handlers
  const handleSaveOverride = async () => {
    if (!overrideReason || overrideReason.trim().length < 10) {
      showToast("A valid reason of at least 10 characters is required for audit trails.", "error");
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        userId: owner.id,
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
      router.refresh();
    } catch (err: any) {
      showToast(`Failed to save override: ${err.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmClearOverride = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/subscriptions/override?userId=${owner.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("Overrides cleared. Default platform policies applied.", "success");
      setShowDeleteConfirm(false);
      router.refresh();
    } catch (err: any) {
      showToast(`Failed to clear overrides: ${err.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualAction = async (action: string, extraBody = {}) => {
    if (!overrideReason || overrideReason.trim().length < 10) {
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
          userId: owner.id,
          reason: overrideReason,
          ...extraBody
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Action completed successfully.`, "success");
      router.refresh();
    } catch (err: any) {
      showToast(`Action failed: ${err.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const getFutureDateString = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const totalUnits = owner.ownedProperties.reduce((acc: any, p: any) => acc + p.units.length, 0);
  const isOverLimit = owner.pricingTier && totalUnits > owner.pricingTier.maxUnits;
  const hasActiveOverride = owner.subscriptionOverride && 
    (!owner.subscriptionOverride.expiresAt || new Date(owner.subscriptionOverride.expiresAt) > new Date());

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
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

      {/* Back button and Page Title */}
      <div className="flex flex-col gap-3">
        <button 
          onClick={() => router.push("/dashboard/admin/subscriptions")}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#6E6E73] hover:text-[#1D1D1F] transition-colors w-fit"
        >
          <ChevronLeft size={16} /> Back to Subscriptions
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-[#1D1D1F]">{owner.name || "Owner Management"}</h1>
              {hasActiveOverride && <Badge className="bg-purple-50 text-purple-700 border border-purple-100 font-bold text-xs px-2 py-0.5 rounded-lg shadow-none">⚙ Policy Override Active</Badge>}
            </div>
            <p className="text-[#6E6E73] text-sm mt-0.5">{owner.email} · Registered {new Date(owner.createdAt).toLocaleDateString()}</p>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              disabled={syncing || !owner.stripeSubscriptionId}
              onClick={handleSyncStripe}
              className="border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-xl flex items-center gap-1.5 font-bold text-xs h-10 px-4"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing..." : "Sync Stripe Status"}
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = `mailto:${owner.email}`}
              className="border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-xl flex items-center gap-1.5 font-bold text-xs h-10 px-4"
            >
              <Mail size={14} />
              Email Owner
            </Button>
          </div>
        </div>
      </div>

      {/* Custom Audit Action Reason Header - Promoted to page top as a prerequisite */}
      <Card className="border border-purple-100 bg-purple-50/20 rounded-2xl shadow-xs">
        <CardContent className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="p-3 bg-purple-100 rounded-xl text-purple-700 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div className="flex-1 w-full space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-purple-950 block uppercase tracking-wider">Administrative Reason * (Minimum 10 Characters Required)</label>
              {overrideReason.trim().length >= 10 ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px]">Ready to Authorize Actions</Badge>
              ) : (
                <Badge className="bg-rose-50 text-rose-700 border-rose-100 font-bold text-[10px]">Action Locked</Badge>
              )}
            </div>
            <textarea 
              value={overrideReason} 
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Approved payout grace bypass during Stripe bank transfer dispute review."
              className="w-full min-h-[60px] rounded-xl border border-[#E5E5EA] bg-white p-3 text-sm focus:outline-none focus:border-purple-300 font-medium transition-all shadow-inner"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tab Switcher */}
      <div className="flex border-b border-[#E5E5EA] gap-6">
        {[
          { key: 'overview', label: 'Overview', icon: User },
          { key: 'modules', label: 'Module Access Controls', icon: Layers },
          { key: 'overrides', label: 'Billing Overrides', icon: Settings2 },
          { key: 'activity', label: 'Account Activity Log', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              className={`py-3 px-1 text-sm font-bold border-b-2 transition-all flex items-center gap-2 -mb-[2px] ${
                activeTab === tab.key 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
              onClick={() => setActiveTab(tab.key as any)}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Tab Area */}
      <div>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Details */}
            <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl md:col-span-2">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[#1D1D1F] border-b border-[#F2F2F7] pb-3 mb-4">Account Portfolio & Billing Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block">Billing Status</span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                          owner.subscriptionStatus === 'Active' || owner.subscriptionStatus === 'Active (Canceling)' ? 'bg-emerald-500' :
                          owner.subscriptionStatus === 'Past_Due' ? 'bg-orange-500' :
                          owner.subscriptionStatus === 'Paused' ? 'bg-amber-500' :
                          'bg-slate-400'
                        }`} />
                        <Badge className={`border-0 font-extrabold text-xs px-2.5 py-0.5 rounded-lg shadow-none ${
                          owner.subscriptionStatus === 'Active' || owner.subscriptionStatus === 'Active (Canceling)' ? 'bg-emerald-50 text-emerald-700' :
                          owner.subscriptionStatus === 'Past_Due' ? 'bg-orange-50 text-orange-700' :
                          owner.subscriptionStatus === 'Paused' ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-50 text-slate-700'
                        }`}>
                          {formatStatus(owner.subscriptionStatus)}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block">Subscribed Tier</span>
                      <p className="text-sm font-extrabold text-[#1D1D1F]">
                        {owner.pricingTier ? owner.pricingTier.name : "No Subscribed Plan"}
                        {owner.pricingTier && <span className="font-semibold text-slate-400 ml-1.5">(${owner.pricingTier.price}/mo)</span>}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block">Portfolio Unit Utilization</span>
                      <p className={`text-sm font-extrabold ${isOverLimit ? "text-rose-600" : "text-[#1D1D1F]"}`}>
                        {owner.ownedProperties?.length || 0} properties / {totalUnits} unit{totalUnits === 1 ? "" : "s"} occupied
                        {owner.pricingTier && <span className="font-semibold text-slate-400 ml-1.5">({owner.pricingTier.maxUnits} units max)</span>}
                      </p>
                      <div className="w-full bg-[#E5E5EA] h-2 rounded-full overflow-hidden mt-1.5 max-w-sm">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${isOverLimit ? "bg-rose-500" : "bg-blue-600"}`}
                          style={{ width: `${Math.min(100, (totalUnits / (owner.pricingTier?.maxUnits || 2)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block">Contact Phone</span>
                      <p className="text-sm font-semibold text-[#1D1D1F]">{owner.phone || "No phone added"}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#F2F2F7]">
                  <h3 className="text-sm font-bold text-[#1D1D1F] mb-4">Stripe Gateway IDs</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-[#F9F9FB] px-3.5 py-2.5 rounded-xl border border-[#E5E5EA] text-xs">
                      <span className="font-bold text-[#6E6E73] flex items-center gap-1"><CreditCard size={14} /> Stripe Customer ID</span>
                      {owner.stripeCustomerId ? (
                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#1D1D1F]">
                          <span>{owner.stripeCustomerId}</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(owner.stripeCustomerId);
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
                    
                    <div className="flex justify-between items-center bg-[#F9F9FB] px-3.5 py-2.5 rounded-xl border border-[#E5E5EA] text-xs">
                      <span className="font-bold text-[#6E6E73] flex items-center gap-1"><Settings2 size={14} /> Stripe Subscription ID</span>
                      {owner.stripeSubscriptionId ? (
                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#1D1D1F]">
                          <span>{owner.stripeSubscriptionId}</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(owner.stripeSubscriptionId);
                              showToast("Subscription ID copied!", "success");
                            }} 
                            className="text-[#8E8E93] hover:text-[#1D1D1F] p-0.5 rounded hover:bg-[#E5E5EA] transition-colors"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-semibold">No Subscription ID</span>
                      )}
                    </div>

                    {owner.stripeCustomerId && (
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(`https://dashboard.stripe.com/customers/${owner.stripeCustomerId}`, '_blank')}
                        className="w-full text-xs font-bold border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F2F2F7] h-10 rounded-xl mt-2 flex items-center justify-center gap-1.5 bg-white transition-all hover:border-[#1D1D1F]"
                      >
                        <ExternalLink size={13} className="text-emerald-600" />
                        Open Stripe Customer Profile
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Column 2: Status Indicator Panel */}
            <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl flex flex-col justify-between">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block">Gating Status</h3>
                
                {owner.subscriptionStatus === 'Paused' ? (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center space-y-2">
                    <Pause className="h-8 w-8 text-amber-500 mx-auto" />
                    <h4 className="text-sm font-extrabold text-amber-800">Portfolio Suspended</h4>
                    <p className="text-xs text-amber-700 leading-normal font-medium">New properties, units, tenants, vendors, and application processing are soft-locked.</p>
                  </div>
                ) : owner.subscriptionStatus === 'Past_Due' ? (
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-center space-y-2">
                    <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto" />
                    <h4 className="text-sm font-extrabold text-orange-800">In Grace Period</h4>
                    <p className="text-xs text-orange-700 leading-normal font-medium">Under grace due to billing failures. Default policies lock operations on grace expiry.</p>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center space-y-2">
                    <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto" />
                    <h4 className="text-sm font-extrabold text-emerald-800">Portfolio Active</h4>
                    <p className="text-xs text-emerald-700 leading-normal font-medium">All subscription billing items are verified and running normally.</p>
                  </div>
                )}

                {owner.subscriptionOverride && (
                  <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 text-xs space-y-2 text-purple-900 font-bold">
                    <div className="flex items-center gap-1.5"><Settings2 size={14} className="text-purple-600" /> Active Policy Exception</div>
                    <div className="space-y-1 font-semibold text-[#6E6E73] text-[11px] leading-relaxed">
                      <p>• Payout Block: <span className="font-extrabold text-slate-800">{owner.subscriptionOverride.blockPayouts === true ? "Forced Block" : owner.subscriptionOverride.blockPayouts === false ? "Forced Allow" : "Default"}</span></p>
                      <p>• Portfolio Limit: <span className="font-extrabold text-slate-800">{owner.subscriptionOverride.blockNewUnits === true ? "Forced Block" : owner.subscriptionOverride.blockNewUnits === false ? "Forced Allow" : "Default"}</span></p>
                      {owner.subscriptionOverride.expiresAt && <p>• Expiration: <span className="font-extrabold text-purple-700">{timeUntil(owner.subscriptionOverride.expiresAt)}</span></p>}
                    </div>
                  </div>
                )}

                {owner.accessGrantedByAdmin && owner.accessGrantedExpiresAt && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs space-y-1.5 text-indigo-900 font-bold">
                    <div className="flex items-center gap-1.5"><Play size={14} className="text-indigo-600" /> Temp Admin Comp Access</div>
                    <p className="text-xs font-semibold text-indigo-700">Expires: {timeUntil(owner.accessGrantedExpiresAt)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODULE ACCESS CONTROLS TAB */}
        {activeTab === 'modules' && (
          <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl">
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[#1D1D1F]">Fine-Grained Module Overrides</h3>
                  <p className="text-[#6E6E73] text-xs mt-0.5">Admin-granted modules act as override options that grant access even if the owner's plan does not include them.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    disabled={actionLoading || overrideReason.trim().length < 10}
                    onClick={handleGrantAllModules}
                    className="border-[#E5E5EA] hover:border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl font-bold text-xs h-9"
                  >
                    Grant All Modules
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={handleClearAllGrants}
                    className="border-[#E5E5EA] hover:border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl font-bold text-xs h-9"
                  >
                    Clear Override Grants
                  </Button>
                </div>
              </div>

              {/* Expiry Selector inline */}
              <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-4 max-w-md flex flex-col gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#6E6E73] uppercase tracking-wider block">Set Temp Override Expiry (Optional)</span>
                  <div className="flex gap-2">
                    <input 
                      type="date"
                      value={grantExpiresAt}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setGrantExpiresAt(e.target.value)}
                      className="bg-white border border-[#E5E5EA] rounded-xl text-xs h-9 px-3 font-semibold focus:outline-none focus:border-blue-500 w-full sm:w-auto"
                    />
                    {grantExpiresAt && (
                      <button 
                        onClick={() => setGrantExpiresAt("")}
                        className="text-xs text-[#8E8E93] hover:text-[#1D1D1F] font-bold px-2"
                      >
                        Clear Expiry
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider mr-1">Quick Presets:</span>
                  {[
                    { label: "+1 Day", days: 1 },
                    { label: "+7 Days", days: 7 },
                    { label: "+30 Days", days: 30 },
                  ].map(opt => {
                    const dateStr = getFutureDateString(opt.days);
                    const isSelected = grantExpiresAt === dateStr;
                    return (
                      <button
                        key={opt.days}
                        type="button"
                        onClick={() => setGrantExpiresAt(dateStr)}
                        className={`text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition-all border ${
                          isSelected
                            ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                            : "bg-white text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#F2F2F7]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modules List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {GATABLE_MODULES.map(mod => {
                  const alwaysIncluded = mod.alwaysIncluded;
                  const tierIncluded = owner.pricingTier?.modules?.includes(mod.key);
                  const activeGrant = ownerGrants.find(g => g.module === mod.key);
                  const isGrantActive = activeGrant && (!activeGrant.expiresAt || new Date(activeGrant.expiresAt) > new Date());
                  const isBlocked = !alwaysIncluded && !tierIncluded && !isGrantActive;

                  let statusText = "Locked";
                  let badgeTheme = "bg-slate-50 text-slate-500 border border-slate-200/60";
                  
                  if (alwaysIncluded) {
                    statusText = "Always Available";
                    badgeTheme = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                  } else if (tierIncluded) {
                    statusText = "Subscribed (Tier)";
                    badgeTheme = "bg-blue-50 text-blue-700 border border-blue-100";
                  } else if (isGrantActive) {
                    statusText = activeGrant.expiresAt ? `Override Grant (Expires)` : "Override Grant (Permanent)";
                    badgeTheme = "bg-purple-50 text-purple-700 border border-purple-100";
                  }

                  return (
                    <div 
                      key={mod.key} 
                      className={`border rounded-2xl p-4 flex justify-between items-center transition-all ${
                        isBlocked ? "border-[#E5E5EA] bg-[#F9F9FB]/50 opacity-70" : "border-[#E5E5EA] bg-white shadow-xs"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-[#1D1D1F]">{mod.label}</span>
                          <span className="text-[10px] font-semibold text-[#8E8E93]">({mod.category})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${badgeTheme} rounded-lg text-[10px] font-bold px-2 py-0.5 shadow-none`}>
                            {statusText}
                          </Badge>
                          {isGrantActive && activeGrant.expiresAt && (
                            <span className="text-[10px] font-bold text-purple-600">Expires {timeUntil(activeGrant.expiresAt)}</span>
                          )}
                        </div>
                        {isGrantActive && activeGrant.reason && (
                          <p className="text-[10px] text-slate-500 italic mt-1.5 font-medium leading-normal max-w-sm">"Reason: {activeGrant.reason}"</p>
                        )}
                      </div>

                      <div>
                        {alwaysIncluded || tierIncluded ? (
                          <div className="text-emerald-500 font-extrabold text-xs flex items-center gap-1 px-3 py-1.5">
                            <ShieldCheck size={14} /> Full Access
                          </div>
                        ) : isGrantActive ? (
                          <Button 
                            variant="destructive"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleRevokeModule(mod.key)}
                            className="bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-xs h-8 px-3 shadow-none border border-red-100"
                          >
                            Revoke Override
                          </Button>
                        ) : (
                          <Button 
                            variant="outline"
                            size="sm"
                            disabled={actionLoading || overrideReason.trim().length < 10}
                            onClick={() => handleGrantModule(mod.key)}
                            className="border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-xl font-bold text-xs h-8 px-3"
                          >
                            Grant Override
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* BILLING OVERRIDES TAB */}
        {activeTab === 'overrides' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Manual Actions */}
              <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-sm font-bold text-[#1D1D1F] border-b border-[#F2F2F7] pb-3">Administrative Lifespan Toggles</h3>
                  
                  {/* Restore / Comp Access */}
                  <div className="border border-[#E5E5EA] rounded-2xl p-4 space-y-3 bg-white">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-500" /> Grant Comp Access Exceptions
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
                        disabled={actionLoading || overrideReason.trim().length < 10} 
                        onClick={() => handleManualAction("restore_access", { grantDays: parseInt(manualGrantDays) || 30 })} 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1 h-9 text-xs px-4"
                      >
                        Grant Access
                      </Button>
                    </div>
                  </div>

                  {/* Grace Extender */}
                  <div className="border border-[#E5E5EA] rounded-2xl p-4 space-y-3 bg-white">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={14} className="text-orange-500" /> Extend Grace Period Days
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
                            onClick={() => {
                              setManualGraceDays(days);
                              setCustomGraceSelected(false);
                            }} 
                            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                              manualGraceDays === days && !customGraceSelected
                                ? "bg-white text-[#1D1D1F] shadow-sm" 
                                : "text-[#6E6E73] hover:text-[#1D1D1F]"
                            }`}
                          >
                            {days}d
                          </button>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => setCustomGraceSelected(true)} 
                          className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                            customGraceSelected
                              ? "bg-white text-[#1D1D1F] shadow-sm" 
                              : "text-[#6E6E73] hover:text-[#1D1D1F]"
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                      
                      <Button 
                        disabled={actionLoading || overrideReason.trim().length < 10} 
                        onClick={() => handleManualAction("extend_grace", { graceDays: parseInt(manualGraceDays) || 7 })} 
                        className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex items-center justify-center gap-1 h-9 text-xs px-4"
                      >
                        Extend Grace
                      </Button>
                    </div>
                  </div>

                  {/* Manual Suspend / Manual Resume triggers */}
                  <div className="pt-2 border-t border-[#F2F2F7] flex justify-between gap-3">
                    {owner.subscriptionStatus === "Paused" ? (
                      <Button 
                        disabled={actionLoading || overrideReason.trim().length < 10} 
                        onClick={() => handleManualAction("manual_resume")}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold h-10 text-xs flex items-center justify-center gap-1.5"
                      >
                        <Play size={13} />
                        Force Resume Account
                      </Button>
                    ) : (
                      <Button 
                        disabled={actionLoading || overrideReason.trim().length < 10} 
                        onClick={() => handleManualAction("manual_pause")}
                        className="w-full border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl font-bold h-10 text-xs flex items-center justify-center gap-1.5"
                      >
                        <Pause size={13} />
                        Force Suspend Account
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Exception Settings overrides */}
              <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl">
                <CardContent className="p-6 space-y-5">
                  <h3 className="text-sm font-bold text-[#1D1D1F] border-b border-[#F2F2F7] pb-3">Permanent Exception Overrides</h3>
                  
                  {/* Block Payouts Toggle Option */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6E6E73] uppercase tracking-wider block">Payout Controls Override</label>
                    <select 
                      value={blockPayoutsOverride} 
                      onChange={(e) => setBlockPayoutsOverride(e.target.value)}
                      className="w-full bg-white border border-[#E5E5EA] rounded-xl h-10 px-3 text-xs font-bold text-[#1D1D1F] focus:outline-none focus:border-purple-300 transition-all"
                    >
                      <option value="default">Use Platform Subscription Policies (Default)</option>
                      <option value="allow">Force Allow Payouts (Ignore failures/suspension)</option>
                      <option value="block">Force Block Payouts (Administrative Hold)</option>
                    </select>
                  </div>

                  {/* Block New Units Toggle Option */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6E6E73] uppercase tracking-wider block">Portfolio Property/Unit Cap Controls</label>
                    <select 
                      value={blockNewUnitsOverride} 
                      onChange={(e) => setBlockNewUnitsOverride(e.target.value)}
                      className="w-full bg-white border border-[#E5E5EA] rounded-xl h-10 px-3 text-xs font-bold text-[#1D1D1F] focus:outline-none focus:border-purple-300 transition-all"
                    >
                      <option value="default">Use Subscribed Pricing Tier Limits (Default)</option>
                      <option value="allow">Allow Unlimited Portfolio Unit Overages</option>
                      <option value="block">Strictly Block Adding Properties/Units</option>
                    </select>
                  </div>

                  {/* Override Expiration Date Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6E6E73] uppercase tracking-wider block">Set Exception Expiration Date (Optional)</label>
                    <Input 
                      type="date" 
                      value={overrideExpiresAt} 
                      onChange={(e) => setOverrideExpiresAt(e.target.value)}
                      className="bg-white rounded-xl border-[#E5E5EA] h-10 text-xs font-bold text-[#1D1D1F]"
                    />
                  </div>

                  {/* Form Trigger Footer buttons */}
                  <div className="pt-4 border-t border-[#F2F2F7] flex flex-col gap-3">
                    {owner.subscriptionOverride && (
                      showDeleteConfirm ? (
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex flex-col gap-2 animate-in fade-in duration-200">
                          <p className="text-xs font-bold text-rose-800 leading-normal">Are you sure you want to clear Marcus Reed's policy exceptions? Default parameters will take over immediately.</p>
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
                              {actionLoading ? "Clearing..." : "Yes, Clear Exceptions"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button 
                          disabled={actionLoading} 
                          onClick={() => setShowDeleteConfirm(true)}
                          className="w-full border border-[#E5E5EA] text-[#ef4444] hover:bg-rose-50 hover:border-rose-100 rounded-xl font-bold h-10 text-xs bg-white transition-all shadow-none"
                        >
                          Clear Policy Override Settings
                        </Button>
                      )
                    )}
                    
                    {!showDeleteConfirm && (
                      <Button 
                        disabled={actionLoading || overrideReason.trim().length < 10} 
                        onClick={handleSaveOverride}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold h-10 text-xs shadow-sm transition-all"
                      >
                        {actionLoading ? "Saving..." : "Apply Policy Overrides"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        )}

        {/* ACTIVITY LOG TAB */}
        {activeTab === 'activity' && (
          <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#F2F2F7] flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-[#1D1D1F]">Administrative Action Audit Trail</h3>
                <p className="text-[#6E6E73] text-xs mt-0.5">Chronological record of manual overrides, policy bypasses, and account status transitions logged for this owner.</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F9F9FB]">
                  <TableRow className="border-[#E5E5EA] hover:bg-transparent">
                    <TableHead className="w-40 text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider">Timestamp</TableHead>
                    <TableHead className="w-32 text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider">Action</TableHead>
                    <TableHead className="w-32 text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider">Role</TableHead>
                    <TableHead className="text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider">Audit Details & Rationale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-[#6E6E73] text-sm font-semibold">
                        No custom activities logged for this owner.
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log) => (
                      <TableRow key={log.id} className="border-[#E5E5EA] hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-xs font-bold text-[#1D1D1F]">
                          {new Date(log.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-slate-100 border-0 text-slate-800 rounded-lg px-2 py-0.5 text-[10px] font-extrabold shadow-none uppercase">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-purple-700 capitalize">
                          {log.actorRole?.toLowerCase() || "System"}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-[#1D1D1F] leading-normal py-3 max-w-lg">
                          {log.note || "No audit comments recorded."}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
