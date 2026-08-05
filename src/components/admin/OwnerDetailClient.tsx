"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
import { toast } from "sonner";
import { GATABLE_MODULES } from "@/lib/modules-registry";
import { ReasonModal } from "@/components/ui/ReasonModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PolicyToggleTable } from "@/components/admin/PolicyToggleTable";
import { getAuditMeta, getRelativeTime, AuditCategory } from "@/lib/audit-utils";

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
  
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    if (type === "success") toast.success(message);
    else if (type === "error") toast.error(message);
    else toast.info(message);
  };

  // State variables migrated from drawer
  const [reasonModal, setReasonModal] = useState<{
    open: boolean;
    title: string;
    description?: string;
    actionSummary?: string;
    confirmLabel?: string;
    confirmVariant?: "primary" | "destructive" | "warning";
    onConfirm: (reason: string) => void | Promise<void>;
  }>({
    open: false,
    title: "",
    onConfirm: () => {},
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    confirmVariant?: "destructive" | "default";
    onConfirm: () => void | Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const [blockPayoutsOverride, setBlockPayoutsOverride] = useState<string>(
    owner.subscriptionOverride?.blockPayouts === true ? "block" :
    owner.subscriptionOverride?.blockPayouts === false ? "allow" : "default"
  );
  const [blockNewUnitsOverride, setBlockNewUnitsOverride] = useState<string>(
    owner.subscriptionOverride?.blockNewUnits === true ? "block" :
    owner.subscriptionOverride?.blockNewUnits === false ? "allow" : "default"
  );
  const [allowAddVendorOverride, setAllowAddVendorOverride] = useState<string>(
    owner.subscriptionOverride?.allowAddVendor === true ? "allow" :
    owner.subscriptionOverride?.allowAddVendor === false ? "block" : "default"
  );
  const [allowAddInspectorOverride, setAllowAddInspectorOverride] = useState<string>(
    owner.subscriptionOverride?.allowAddInspector === true ? "allow" :
    owner.subscriptionOverride?.allowAddInspector === false ? "block" : "default"
  );
  const [allowProcessApplicationsOverride, setAllowProcessApplicationsOverride] = useState<string>(
    owner.subscriptionOverride?.allowProcessApplications === true ? "allow" :
    owner.subscriptionOverride?.allowProcessApplications === false ? "block" : "default"
  );
  const [allowAddTenantOverride, setAllowAddTenantOverride] = useState<string>(
    owner.subscriptionOverride?.allowAddTenant === true ? "allow" :
    owner.subscriptionOverride?.allowAddTenant === false ? "block" : "default"
  );
  const [allowTourSlotsOverride, setAllowTourSlotsOverride] = useState<string>(
    owner.subscriptionOverride?.allowTourSlots === true ? "allow" :
    owner.subscriptionOverride?.allowTourSlots === false ? "block" : "default"
  );
  const getInitialExpiry = (dateVal: any) =>
    dateVal ? new Date(dateVal).toISOString().split('T')[0] : "";

  const [blockPayoutsExpiresAt, setBlockPayoutsExpiresAt] = useState(getInitialExpiry(owner.subscriptionOverride?.blockPayoutsExpiresAt));
  const [blockNewUnitsExpiresAt, setBlockNewUnitsExpiresAt] = useState(getInitialExpiry(owner.subscriptionOverride?.blockNewUnitsExpiresAt));
  const [allowAddVendorExpiresAt, setAllowAddVendorExpiresAt] = useState(getInitialExpiry(owner.subscriptionOverride?.allowAddVendorExpiresAt));
  const [allowAddInspectorExpiresAt, setAllowAddInspectorExpiresAt] = useState(getInitialExpiry(owner.subscriptionOverride?.allowAddInspectorExpiresAt));
  const [allowProcessApplicationsExpiresAt, setAllowProcessApplicationsExpiresAt] = useState(getInitialExpiry(owner.subscriptionOverride?.allowProcessApplicationsExpiresAt));
  const [allowAddTenantExpiresAt, setAllowAddTenantExpiresAt] = useState(getInitialExpiry(owner.subscriptionOverride?.allowAddTenantExpiresAt));
  const [allowTourSlotsExpiresAt, setAllowTourSlotsExpiresAt] = useState(getInitialExpiry(owner.subscriptionOverride?.allowTourSlotsExpiresAt));
  const [overrideExpiresAt, setOverrideExpiresAt] = useState(getInitialExpiry(owner.subscriptionOverride?.expiresAt));
  
  const [actionLoading, setActionLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [manualGrantDays, setManualGrantDays] = useState("30");
  const [manualGraceDays, setManualGraceDays] = useState("7");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customGrantSelected, setCustomGrantSelected] = useState(false);
  const [customGraceSelected, setCustomGraceSelected] = useState(false);
  const [ownerGrants, setOwnerGrants] = useState<any[]>(initialGrants);
  const [grantExpiresAt, setGrantExpiresAt] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | AuditCategory>("ALL");
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

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
  const handleGrantModule = async (moduleKey: string, overrideType: "GRANT" | "BLOCK" = "GRANT", reason: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/owners/${owner.id}/module-grants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: moduleKey,
          expiresAt: grantExpiresAt ? new Date(grantExpiresAt).toISOString() : null,
          reason: reason,
          overrideType
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(
        overrideType === "BLOCK"
          ? `Access to ${moduleKey} blocked successfully.`
          : `Access to ${moduleKey} granted successfully.`,
        "success"
      );
      setGrantExpiresAt("");
      fetchUpdatedGrants();
      router.refresh();
    } catch (err: any) {
      showToast(`Failed to update module access: ${err.message}`, "error");
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

  const handleGrantAllModules = async (reason: string) => {
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
            reason: reason
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
  const handleSaveOverride = async (reason: string) => {
    try {
      setActionLoading(true);
      const payload = {
        userId: owner.id,
        blockPayouts: blockPayoutsOverride === "block" ? true : blockPayoutsOverride === "allow" ? false : null,
        blockNewUnits: blockNewUnitsOverride === "block" ? true : blockNewUnitsOverride === "allow" ? false : null,
        allowAddVendor: allowAddVendorOverride === "allow" ? true : allowAddVendorOverride === "block" ? false : null,
        allowAddInspector: allowAddInspectorOverride === "allow" ? true : allowAddInspectorOverride === "block" ? false : null,
        allowProcessApplications: allowProcessApplicationsOverride === "allow" ? true : allowProcessApplicationsOverride === "block" ? false : null,
        allowAddTenant: allowAddTenantOverride === "allow" ? true : allowAddTenantOverride === "block" ? false : null,
        allowTourSlots: allowTourSlotsOverride === "allow" ? true : allowTourSlotsOverride === "block" ? false : null,
        blockPayoutsExpiresAt: blockPayoutsExpiresAt ? new Date(blockPayoutsExpiresAt).toISOString() : null,
        blockNewUnitsExpiresAt: blockNewUnitsExpiresAt ? new Date(blockNewUnitsExpiresAt).toISOString() : null,
        allowAddVendorExpiresAt: allowAddVendorExpiresAt ? new Date(allowAddVendorExpiresAt).toISOString() : null,
        allowAddInspectorExpiresAt: allowAddInspectorExpiresAt ? new Date(allowAddInspectorExpiresAt).toISOString() : null,
        allowProcessApplicationsExpiresAt: allowProcessApplicationsExpiresAt ? new Date(allowProcessApplicationsExpiresAt).toISOString() : null,
        allowAddTenantExpiresAt: allowAddTenantExpiresAt ? new Date(allowAddTenantExpiresAt).toISOString() : null,
        allowTourSlotsExpiresAt: allowTourSlotsExpiresAt ? new Date(allowTourSlotsExpiresAt).toISOString() : null,
        expiresAt: overrideExpiresAt ? new Date(overrideExpiresAt).toISOString() : null,
        reason: reason,
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
      setBlockPayoutsOverride("default");
      setBlockNewUnitsOverride("default");
      setAllowAddVendorOverride("default");
      setAllowAddInspectorOverride("default");
      setAllowProcessApplicationsOverride("default");
      setAllowAddTenantOverride("default");
      setAllowTourSlotsOverride("default");
      setBlockPayoutsExpiresAt("");
      setBlockNewUnitsExpiresAt("");
      setAllowAddVendorExpiresAt("");
      setAllowAddInspectorExpiresAt("");
      setAllowProcessApplicationsExpiresAt("");
      setAllowAddTenantExpiresAt("");
      setAllowTourSlotsExpiresAt("");
      setOverrideExpiresAt("");
      setShowDeleteConfirm(false);
      router.refresh();
    } catch (err: any) {
      showToast(`Failed to clear overrides: ${err.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualAction = async (action: string, extraBody = {}, reason: string) => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/admin/subscriptions/manual-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userId: owner.id,
          reason: reason,
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

  const getCategorizedModules = () => {
    const core: any[] = [];
    const plan: any[] = [];
    const granted: any[] = [];
    const blocked: any[] = [];
    const locked: any[] = [];

    GATABLE_MODULES.forEach(mod => {
      const tierIncluded = owner.pricingTier?.modules?.includes(mod.key);
      const activeGrant = ownerGrants.find(g => g.module === mod.key);
      const isOverrideActive = activeGrant && (!activeGrant.expiresAt || new Date(activeGrant.expiresAt) > new Date());
      const isBlockActive = isOverrideActive && activeGrant.overrideType === "BLOCK";
      const isGrantActive = isOverrideActive && activeGrant.overrideType === "GRANT";

      const item = {
        ...mod,
        tierIncluded,
        activeGrant,
        isOverrideActive,
        isBlockActive,
        isGrantActive
      };

      if (isBlockActive) {
        blocked.push(item);
      } else if (mod.alwaysIncluded) {
        core.push(item);
      } else if (isGrantActive) {
        granted.push(item);
      } else if (tierIncluded) {
        plan.push(item);
      } else {
        locked.push(item);
      }
    });

    return [
      { id: "core", label: "Core Features (Always Active)", items: core },
      { id: "plan", label: "Subscribed Plan Features", items: plan },
      { id: "granted", label: "Admin Override Grants", items: granted },
      { id: "blocked", label: "Admin Forced Blocks", items: blocked },
      { id: "locked", label: "Plan Excluded Features", items: locked }
    ];
  };

  const getChangedPoliciesPreview = () => {
    const changes: { label: string; from: string; to: string }[] = [];
    const defaults = {
      blockPayouts: owner.subscriptionOverride?.blockPayouts === true ? "block" : owner.subscriptionOverride?.blockPayouts === false ? "allow" : "default",
      blockNewUnits: owner.subscriptionOverride?.blockNewUnits === true ? "block" : owner.subscriptionOverride?.blockNewUnits === false ? "allow" : "default",
      allowAddVendor: owner.subscriptionOverride?.allowAddVendor === true ? "allow" : owner.subscriptionOverride?.allowAddVendor === false ? "block" : "default",
      allowAddInspector: owner.subscriptionOverride?.allowAddInspector === true ? "allow" : owner.subscriptionOverride?.allowAddInspector === false ? "block" : "default",
      allowProcessApplications: owner.subscriptionOverride?.allowProcessApplications === true ? "allow" : owner.subscriptionOverride?.allowProcessApplications === false ? "block" : "default",
      allowAddTenant: owner.subscriptionOverride?.allowAddTenant === true ? "allow" : owner.subscriptionOverride?.allowAddTenant === false ? "block" : "default",
      allowTourSlots: owner.subscriptionOverride?.allowTourSlots === true ? "allow" : owner.subscriptionOverride?.allowTourSlots === false ? "block" : "default",
      blockPayoutsExp: getInitialExpiry(owner.subscriptionOverride?.blockPayoutsExpiresAt),
      blockNewUnitsExp: getInitialExpiry(owner.subscriptionOverride?.blockNewUnitsExpiresAt),
      allowAddVendorExp: getInitialExpiry(owner.subscriptionOverride?.allowAddVendorExpiresAt),
      allowAddInspectorExp: getInitialExpiry(owner.subscriptionOverride?.allowAddInspectorExpiresAt),
      allowProcessApplicationsExp: getInitialExpiry(owner.subscriptionOverride?.allowProcessApplicationsExpiresAt),
      allowAddTenantExp: getInitialExpiry(owner.subscriptionOverride?.allowAddTenantExpiresAt),
      allowTourSlotsExp: getInitialExpiry(owner.subscriptionOverride?.allowTourSlotsExpiresAt),
    };

    const getDisplayValue = (val: string, expDate?: string) => {
      if (val === "default") return "Platform Default";
      const base = val === "allow" ? "Forced Allow" : "Forced Block";
      return expDate ? `${base} (Expires ${expDate})` : `${base} (Permanent)`;
    };

    if (blockPayoutsOverride !== defaults.blockPayouts || blockPayoutsExpiresAt !== defaults.blockPayoutsExp) {
      changes.push({ label: "Payout Controls Exception", from: getDisplayValue(defaults.blockPayouts, defaults.blockPayoutsExp), to: getDisplayValue(blockPayoutsOverride, blockPayoutsExpiresAt) });
    }
    if (blockNewUnitsOverride !== defaults.blockNewUnits || blockNewUnitsExpiresAt !== defaults.blockNewUnitsExp) {
      changes.push({ label: "Portfolio Property/Unit Cap", from: getDisplayValue(defaults.blockNewUnits, defaults.blockNewUnitsExp), to: getDisplayValue(blockNewUnitsOverride, blockNewUnitsExpiresAt) });
    }
    if (allowAddVendorOverride !== defaults.allowAddVendor || allowAddVendorExpiresAt !== defaults.allowAddVendorExp) {
      changes.push({ label: "Vendor Gating Override (When Paused)", from: getDisplayValue(defaults.allowAddVendor, defaults.allowAddVendorExp), to: getDisplayValue(allowAddVendorOverride, allowAddVendorExpiresAt) });
    }
    if (allowAddInspectorOverride !== defaults.allowAddInspector || allowAddInspectorExpiresAt !== defaults.allowAddInspectorExp) {
      changes.push({ label: "Inspector Gating Override (When Paused)", from: getDisplayValue(defaults.allowAddInspector, defaults.allowAddInspectorExp), to: getDisplayValue(allowAddInspectorOverride, allowAddInspectorExpiresAt) });
    }
    if (allowProcessApplicationsOverride !== defaults.allowProcessApplications || allowProcessApplicationsExpiresAt !== defaults.allowProcessApplicationsExp) {
      changes.push({ label: "Application Processing Override (When Paused)", from: getDisplayValue(defaults.allowProcessApplications, defaults.allowProcessApplicationsExp), to: getDisplayValue(allowProcessApplicationsOverride, allowProcessApplicationsExpiresAt) });
    }
    if (allowAddTenantOverride !== defaults.allowAddTenant || allowAddTenantExpiresAt !== defaults.allowAddTenantExp) {
      changes.push({ label: "Tenant Registration Override (When Paused)", from: getDisplayValue(defaults.allowAddTenant, defaults.allowAddTenantExp), to: getDisplayValue(allowAddTenantOverride, allowAddTenantExpiresAt) });
    }
    if (allowTourSlotsOverride !== defaults.allowTourSlots || allowTourSlotsExpiresAt !== defaults.allowTourSlotsExp) {
      changes.push({ label: "Tour Availability Override (When Paused)", from: getDisplayValue(defaults.allowTourSlots, defaults.allowTourSlotsExp), to: getDisplayValue(allowTourSlotsOverride, allowTourSlotsExpiresAt) });
    }

    return changes;
  };

  const handleExportCsv = () => {
    const headers = ["Timestamp", "Action", "Category", "Actor Role", "Actor ID", "Audit Note", "Old State", "New State"];
    const rows = auditLogs.map(log => {
      const meta = getAuditMeta(log.action);
      return [
        new Date(log.createdAt).toISOString(),
        log.action,
        meta.category,
        log.actorRole || "SYSTEM",
        log.actorId || "",
        log.note || "",
        log.oldValue ? JSON.stringify(log.oldValue).replace(/"/g, '""') : "",
        log.newValue ? JSON.stringify(log.newValue).replace(/"/g, '""') : "",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_log_${owner.name.toLowerCase().replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleRow = (id: string) => {
    setExpandedLogs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredLogs = auditLogs.filter((log: any) => {
    if (categoryFilter === "ALL") return true;
    const meta = getAuditMeta(log.action);
    return meta.category === categoryFilter;
  });

  const totalUnits = owner.ownedProperties.reduce((acc: any, p: any) => acc + p.units.length, 0);
  const isOverLimit = owner.pricingTier && totalUnits > owner.pricingTier.maxUnits;
  const hasActiveOverride = owner.subscriptionOverride && 
    (!owner.subscriptionOverride.expiresAt || new Date(owner.subscriptionOverride.expiresAt) > new Date());
  return (
    <div className="space-y-6 font-sans">

      {/* Header */}
      <div className="flex flex-col gap-2 font-sans">
        <button 
          onClick={() => router.push("/dashboard/admin/subscriptions")}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition-colors w-fit cursor-pointer"
        >
          <ChevronLeft size={14} /> Back to Subscriptions
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-1">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-semibold tracking-tight text-[#1D1D1F]">{owner.name || "Owner Management"}</h1>
              {hasActiveOverride && <Badge className="bg-purple-50 text-purple-700 border border-purple-200 font-medium text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-2xs">Policy Override Active</Badge>}
            </div>
            <p className="text-[#6E6E73] text-sm font-normal mt-0.5">{owner.email} · Registered {new Date(owner.createdAt).toLocaleDateString()}</p>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              disabled={syncing || !owner.stripeSubscriptionId}
              onClick={handleSyncStripe}
              className="border-slate-200 text-[#1D1D1F] bg-white hover:bg-slate-50 rounded-xl flex items-center gap-1.5 font-medium text-xs h-9 px-4 shadow-2xs cursor-pointer"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin text-slate-500" : "text-slate-500"} />
              {syncing ? "Syncing..." : "Sync Stripe Status"}
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = `mailto:${owner.email}`}
              className="border-slate-200 text-[#1D1D1F] bg-white hover:bg-slate-50 rounded-xl flex items-center gap-1.5 font-medium text-xs h-9 px-4 shadow-2xs cursor-pointer"
            >
              <Mail size={14} className="text-slate-500" />
              Email Owner
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Switcher — Standardized Segment Control */}
      <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl w-fit border border-slate-200/30">
        {[
          { key: 'overview', label: 'Overview', icon: User },
          { key: 'modules', label: 'Module Access', icon: Layers },
          { key: 'overrides', label: 'Billing Overrides', icon: Settings2 },
          { key: 'activity', label: 'Activity Log', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-white text-[#1D1D1F] shadow-2xs' 
                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
              onClick={() => setActiveTab(tab.key as any)}
            >
              <Icon size={14} className={isActive ? "text-slate-900" : "text-slate-500"} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Tab Area */}
      <div>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
            {/* Column 1: Details */}
            <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl md:col-span-2 font-sans">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[#1D1D1F] border-b border-slate-100 pb-3 mb-4">Account Portfolio &amp; Billing Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <span className="text-xs font-normal text-[#6E6E73] block">Billing Status</span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                          owner.subscriptionStatus === 'Active' || owner.subscriptionStatus === 'Active (Canceling)' ? 'bg-emerald-500' :
                          owner.subscriptionStatus === 'Past_Due' ? 'bg-orange-500' :
                          owner.subscriptionStatus === 'Paused' ? 'bg-amber-500' :
                          'bg-slate-400'
                        }`} />
                        <Badge className={`border-0 font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-md shadow-2xs ${
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
                      <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Subscribed Tier</span>
                      <p className="text-sm font-black text-slate-900">
                        {owner.pricingTier ? owner.pricingTier.name : "No Subscribed Plan"}
                        {owner.pricingTier && <span className="font-semibold text-slate-400 ml-1.5">(${owner.pricingTier.price}/mo)</span>}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Portfolio Unit Utilization</span>
                      <p className={`text-sm font-black ${isOverLimit ? "text-rose-600" : "text-slate-900"}`}>
                        {owner.ownedProperties?.length || 0} properties / {totalUnits} unit{totalUnits === 1 ? "" : "s"} occupied
                        {owner.pricingTier && <span className="font-semibold text-slate-400 ml-1.5">({owner.pricingTier.maxUnits} units max)</span>}
                      </p>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-1.5 max-w-sm border border-slate-200/80 p-0.5 shadow-2xs">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (totalUnits / (owner.pricingTier?.maxUnits || 2)) * 100)}%` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            isOverLimit 
                              ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]" 
                              : "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.85)]"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Contact Phone</span>
                      <p className="text-sm font-semibold text-slate-900">{owner.phone || "No phone added"}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">Stripe Gateway IDs</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200/80 text-xs shadow-2xs">
                      <span className="font-extrabold text-slate-600 flex items-center gap-1.5"><CreditCard size={14} className="text-slate-400" /> Stripe Customer ID</span>
                      {owner.stripeCustomerId ? (
                        <div className="flex items-center gap-1.5 font-mono text-xs font-black text-slate-900">
                          <span>{owner.stripeCustomerId}</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(owner.stripeCustomerId);
                              showToast("Customer ID copied!", "success");
                            }} 
                            className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-semibold">Not Created</span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200/80 text-xs shadow-2xs">
                      <span className="font-extrabold text-slate-600 flex items-center gap-1.5"><Settings2 size={14} className="text-slate-400" /> Stripe Subscription ID</span>
                      {owner.stripeSubscriptionId ? (
                        <div className="flex items-center gap-1.5 font-mono text-xs font-black text-slate-900">
                          <span>{owner.stripeSubscriptionId}</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(owner.stripeSubscriptionId);
                              showToast("Subscription ID copied!", "success");
                            }} 
                            className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
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
                        className="w-full text-xs font-black border-slate-200 text-slate-900 hover:bg-slate-50 h-9 rounded-xl mt-2 flex items-center justify-center gap-1.5 bg-white transition-all shadow-2xs cursor-pointer"
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
            <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl flex flex-col justify-between font-sans">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Gating Status</h3>
                
                {owner.subscriptionStatus === 'Paused' ? (
                  <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-center space-y-2 shadow-2xs">
                    <Pause className="h-7 w-7 text-amber-600 mx-auto" />
                    <h4 className="text-sm font-black text-amber-900">Portfolio Suspended</h4>
                    <p className="text-xs text-amber-700 leading-normal font-semibold">New properties, units, tenants, vendors, and application processing are soft-locked.</p>
                  </div>
                ) : owner.subscriptionStatus === 'Past_Due' ? (
                  <div className="bg-orange-50 border border-orange-200/80 rounded-2xl p-4 text-center space-y-2 shadow-2xs">
                    <AlertTriangle className="h-7 w-7 text-orange-600 mx-auto" />
                    <h4 className="text-sm font-black text-orange-900">In Grace Period</h4>
                    <p className="text-xs text-orange-700 leading-normal font-semibold">Under grace due to billing failures. Default policies lock operations on grace expiry.</p>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 text-center space-y-2 shadow-2xs">
                    <ShieldCheck className="h-7 w-7 text-emerald-600 mx-auto" />
                    <h4 className="text-sm font-black text-emerald-900">Portfolio Active</h4>
                    <p className="text-xs text-emerald-700 leading-normal font-semibold">All subscription billing items are verified and running normally.</p>
                  </div>
                )}

                {owner.subscriptionOverride && (
                  <div className="bg-purple-50 border border-purple-200/80 rounded-2xl p-4 text-xs space-y-2 text-purple-900 font-extrabold shadow-2xs">
                    <div className="flex items-center gap-1.5"><Settings2 size={14} className="text-purple-600" /> Active Policy Exception</div>
                    <div className="space-y-1 font-semibold text-slate-600 text-[11px] leading-relaxed">
                      <p>• Payout Block: <span className="font-black text-slate-900">{owner.subscriptionOverride.blockPayouts === true ? "Forced Block" : owner.subscriptionOverride.blockPayouts === false ? "Forced Allow" : "Default"}</span></p>
                      <p>• Portfolio Limit: <span className="font-black text-slate-900">{owner.subscriptionOverride.blockNewUnits === true ? "Forced Block" : owner.subscriptionOverride.blockNewUnits === false ? "Forced Allow" : "Default"}</span></p>
                      {owner.subscriptionOverride.expiresAt && <p>• Expiration: <span className="font-black text-purple-700">{timeUntil(owner.subscriptionOverride.expiresAt)}</span></p>}
                    </div>
                  </div>
                )}

                {owner.accessGrantedByAdmin && owner.accessGrantedExpiresAt && (
                  <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl p-4 text-xs space-y-1.5 text-indigo-900 font-extrabold shadow-2xs">
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
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl font-sans">
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Feature Access Manager</h3>
                  <p className="text-slate-500 text-xs mt-0.5 font-semibold">Control which platform features this owner can access, regardless of their subscription plan.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => {
                      setReasonModal({
                        open: true,
                        title: "Grant All Modules",
                        description: `This will grant all custom modules to ${owner.name}. This action will be logged.`,
                        actionSummary: `Grant access to all premium modules for ${owner.name}`,
                        confirmLabel: "Confirm Bulk Grant",
                        confirmVariant: "primary",
                        onConfirm: (reason) => handleGrantAllModules(reason)
                      });
                    }}
                    className="border-slate-200 hover:border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-white rounded-xl font-black text-xs h-9 shadow-2xs cursor-pointer"
                  >
                    Grant All Modules
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => {
                      setConfirmDialog({
                        open: true,
                        title: "Clear Override Grants",
                        description: `Are you sure you want to clear all custom module overrides for ${owner.name}? Platform defaults will take over immediately.`,
                        confirmLabel: "Clear Overrides",
                        confirmVariant: "destructive",
                        onConfirm: handleClearAllGrants
                      });
                    }}
                    className="border-slate-200 hover:border-rose-300 text-rose-700 hover:bg-rose-50 bg-white rounded-xl font-black text-xs h-9 shadow-2xs cursor-pointer"
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

              {/* Grouped Feature Table */}
              <div className="overflow-hidden border border-[#E5E5EA] rounded-2xl bg-white shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[#8E8E93] text-[10px] font-extrabold tracking-wider uppercase">
                      <th className="py-3 px-4">Feature Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Plan Status</th>
                      <th className="py-3 px-4">Override Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {getCategorizedModules().map(section => {
                      if (section.items.length === 0) return null;
                      return (
                        <React.Fragment key={section.id}>
                          <tr className="bg-slate-50/40">
                            <td colSpan={5} className="py-2 px-4 font-extrabold text-[10px] text-slate-500 tracking-wider uppercase border-b border-slate-100">
                              {section.label}
                            </td>
                          </tr>
                          {section.items.map(item => {
                            let statusText = "Locked";
                            let statusDot = "bg-slate-300";
                            let statusColor = "text-slate-500";
                            
                            if (item.isBlockActive) {
                              statusText = "Blocked by Admin";
                              statusDot = "bg-rose-500 animate-pulse";
                              statusColor = "text-rose-700";
                            } else if (item.alwaysIncluded) {
                              statusText = "Always On";
                              statusDot = "bg-emerald-500";
                              statusColor = "text-emerald-700";
                            } else if (item.tierIncluded) {
                              statusText = `Subscribed Plan (${owner.pricingTier?.name || "Plan"})`;
                              statusDot = "bg-blue-500";
                              statusColor = "text-blue-700";
                            } else if (item.isGrantActive) {
                              statusText = item.activeGrant.expiresAt ? "Temporary Grant" : "Permanent Override Grant";
                              statusDot = "bg-purple-500";
                              statusColor = "text-purple-700";
                            }

                            const showExpires = item.isOverrideActive && item.activeGrant.expiresAt;

                            return (
                              <tr key={item.key} className="hover:bg-slate-50/40 transition-colors">
                                <td className="py-3.5 px-4 font-bold text-slate-800">
                                  {item.label}
                                </td>
                                <td className="py-3.5 px-4 font-semibold text-xs text-[#8E8E93]">
                                  {item.category}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${statusColor}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                                    {statusText}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  {item.isOverrideActive ? (
                                    <div className="space-y-0.5">
                                      <span className="text-[11px] font-bold text-purple-700">Override Active</span>
                                      {showExpires && (
                                        <div className="text-[10px] text-purple-500 font-semibold">
                                          Expires {timeUntil(item.activeGrant.expiresAt)}
                                        </div>
                                      )}
                                      {item.activeGrant.reason && (
                                        <div className="text-[10px] text-slate-400 italic line-clamp-1 max-w-[200px]" title={item.activeGrant.reason}>
                                          "{item.activeGrant.reason}"
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 font-semibold text-xs">—</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex gap-2 justify-end items-center">
                                    {item.isBlockActive ? (
                                      <Button 
                                        variant="outline"
                                        size="sm"
                                        disabled={actionLoading}
                                        onClick={() => {
                                          setConfirmDialog({
                                            open: true,
                                            title: `Lift Block for ${item.label}`,
                                            description: `Are you sure you want to lift the administrative block and restore the standard pricing tier policies for ${item.label}?`,
                                            confirmLabel: "Lift Block",
                                            confirmVariant: "default",
                                            onConfirm: () => handleRevokeModule(item.key)
                                          });
                                        }}
                                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl font-bold text-xs h-8 px-3"
                                      >
                                        Lift Block
                                      </Button>
                                    ) : item.isGrantActive ? (
                                      <>
                                        <Button 
                                          variant="destructive"
                                          size="sm"
                                          disabled={actionLoading}
                                          onClick={() => {
                                            setConfirmDialog({
                                              open: true,
                                              title: `Revoke Custom Grant`,
                                              description: `Are you sure you want to revoke ${owner.name || "this owner"}'s custom grant for ${item.label}? standard pricing tier rules will take over.`,
                                              confirmLabel: "Revoke Override",
                                              confirmVariant: "destructive",
                                              onConfirm: () => handleRevokeModule(item.key)
                                            });
                                          }}
                                          className="bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-xs h-8 px-3 shadow-none border border-red-100"
                                        >
                                          Revoke Grant
                                        </Button>
                                        <Button 
                                          variant="outline"
                                          size="sm"
                                          disabled={actionLoading}
                                          onClick={() => {
                                            setReasonModal({
                                              open: true,
                                              title: `Force Block "${item.label}"`,
                                              description: `Administratively suspend access to ${item.label} for ${owner.name}.`,
                                              actionSummary: `Force block module access to ${item.label}`,
                                              confirmLabel: "Apply Block",
                                              confirmVariant: "destructive",
                                              onConfirm: (reason) => handleGrantModule(item.key, "BLOCK", reason)
                                            });
                                          }}
                                          className="border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl font-bold text-xs h-8 px-3"
                                        >
                                          Force Block
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        {item.alwaysIncluded || item.tierIncluded ? (
                                          <>
                                            <span className="text-emerald-500 font-extrabold text-xs flex items-center gap-1 mr-2 select-none">
                                              <ShieldCheck size={14} /> Full Access
                                            </span>
                                            <Button 
                                              variant="outline"
                                              size="sm"
                                              disabled={actionLoading}
                                              onClick={() => {
                                                setReasonModal({
                                                  open: true,
                                                  title: `Force Block "${item.label}"`,
                                                  description: `Administratively suspend access to ${item.label} for ${owner.name}.`,
                                                  actionSummary: `Force block module access to ${item.label}`,
                                                  confirmLabel: "Apply Block",
                                                  confirmVariant: "destructive",
                                                  onConfirm: (reason) => handleGrantModule(item.key, "BLOCK", reason)
                                                });
                                              }}
                                              className="border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl font-bold text-xs h-8 px-3"
                                            >
                                              Force Block
                                            </Button>
                                          </>
                                        ) : (
                                          <>
                                            <Button 
                                              variant="outline"
                                              size="sm"
                                              disabled={actionLoading}
                                              onClick={() => {
                                                setReasonModal({
                                                  open: true,
                                                  title: `Grant "${item.label}" Override`,
                                                  description: `Grant temporary or permanent administrative access to ${item.label} for ${owner.name}.`,
                                                  actionSummary: `Grant module override for ${item.label}`,
                                                  confirmLabel: "Apply Grant",
                                                  confirmVariant: "primary",
                                                  onConfirm: (reason) => handleGrantModule(item.key, "GRANT", reason)
                                                });
                                              }}
                                              className="border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-xl font-bold text-xs h-8 px-3"
                                            >
                                              Grant Override
                                            </Button>
                                            <Button 
                                              variant="outline"
                                              size="sm"
                                              disabled={actionLoading}
                                              onClick={() => {
                                                setReasonModal({
                                                  open: true,
                                                  title: `Force Block "${item.label}"`,
                                                  description: `Administratively suspend access to ${item.label} for ${owner.name}.`,
                                                  actionSummary: `Force block module access to ${item.label}`,
                                                  confirmLabel: "Apply Block",
                                                  confirmVariant: "destructive",
                                                  onConfirm: (reason) => handleGrantModule(item.key, "BLOCK", reason)
                                                });
                                              }}
                                              className="border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl font-bold text-xs h-8 px-3"
                                            >
                                              Force Block
                                            </Button>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* BILLING OVERRIDES TAB */}
        {activeTab === 'overrides' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left/Middle Columns: Policy Exception Matrix */}
              <div className="lg:col-span-2 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-[#1D1D1F]">Policy Exception Rules</h3>
                      <p className="text-[#6E6E73] text-xs mt-0.5">Enforce custom allow or block parameters to override standard platform logic.</p>
                    </div>
                  </div>
                  <PolicyToggleTable
                    rows={[
                      {
                        key: "blockPayouts",
                        label: "Payout Controls Exception",
                        description: "Force payouts to be enabled or blocked regardless of subscription state.",
                        icon: CreditCard,
                        value: blockPayoutsOverride,
                        onChange: setBlockPayoutsOverride,
                        expiresAt: blockPayoutsExpiresAt,
                        onExpiryChange: setBlockPayoutsExpiresAt,
                      },
                      {
                        key: "blockNewUnits",
                        label: "Portfolio Property/Unit Cap",
                        description: "Allow owner to exceed unit caps or strictly enforce blocks.",
                        icon: Building2,
                        value: blockNewUnitsOverride,
                        onChange: setBlockNewUnitsOverride,
                        expiresAt: blockNewUnitsExpiresAt,
                        onExpiryChange: setBlockNewUnitsExpiresAt,
                      },
                      {
                        key: "allowAddVendor",
                        label: "Vendor Gating Override (When Paused)",
                        description: "Force access to register external vendors when delinquent/paused.",
                        icon: Users,
                        value: allowAddVendorOverride,
                        onChange: setAllowAddVendorOverride,
                        expiresAt: allowAddVendorExpiresAt,
                        onExpiryChange: setAllowAddVendorExpiresAt,
                      },
                      {
                        key: "allowAddInspector",
                        label: "Inspector Gating Override (When Paused)",
                        description: "Force access to add inspectors to the portfolio when delinquent/paused.",
                        icon: ShieldCheck,
                        value: allowAddInspectorOverride,
                        onChange: setAllowAddInspectorOverride,
                        expiresAt: allowAddInspectorExpiresAt,
                        onExpiryChange: setAllowAddInspectorExpiresAt,
                      },
                      {
                        key: "allowProcessApplications",
                        label: "Application Processing Override",
                        description: "Override block on processing rental applications when paused.",
                        icon: Settings2,
                        value: allowProcessApplicationsOverride,
                        onChange: setAllowProcessApplicationsOverride,
                        expiresAt: allowProcessApplicationsExpiresAt,
                        onExpiryChange: setAllowProcessApplicationsExpiresAt,
                      },
                      {
                        key: "allowAddTenant",
                        label: "Tenant Registration Override",
                        description: "Override block on adding tenants when paused.",
                        icon: User,
                        value: allowAddTenantOverride,
                        onChange: setAllowAddTenantOverride,
                        expiresAt: allowAddTenantExpiresAt,
                        onExpiryChange: setAllowAddTenantExpiresAt,
                      },
                      {
                        key: "allowTourSlots",
                        label: "Tour Availability Override",
                        description: "Override block on tour slots and showings when paused.",
                        icon: Calendar,
                        value: allowTourSlotsOverride,
                        onChange: setAllowTourSlotsOverride,
                        expiresAt: allowTourSlotsExpiresAt,
                        onExpiryChange: setAllowTourSlotsExpiresAt,
                      },
                    ]}
                  />
                </div>
              </div>

              {/* Right Column: Actions, Save Matrix, Danger Zone */}
              <div className="space-y-5">

                {/* ─── Account Status Controls ─── */}
                <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden font-sans">
                  {/* Card Header */}
                  <div className="px-5 pt-5 pb-3 border-b border-slate-100">
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Account Status Controls</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-semibold">Grant temporary access or extend billing grace outside Stripe.</p>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Complimentary Access Block */}
                    <div className="rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
                      <div className="bg-emerald-50/80 px-4 py-2.5 flex items-center gap-2 border-b border-emerald-200/80">
                        <ShieldCheck size={14} className="text-emerald-700 shrink-0" />
                        <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider">Complimentary Access</span>
                      </div>
                      <div className="px-4 py-3.5 space-y-3 bg-white">
                        <p className="text-xs text-[#6E6E73] font-normal leading-relaxed">
                          Bypass billing restrictions for a set number of days. The owner retains full feature access as if actively subscribed.
                        </p>
                        {/* Duration Selector */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Duration</span>
                          <div className="grid grid-cols-4 gap-1.5">
                            {["7", "14", "30"].map(days => (
                              <button
                                key={days}
                                type="button"
                                onClick={() => { setManualGrantDays(days); setCustomGrantSelected(false); }}
                                className={`py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                  manualGrantDays === days && !customGrantSelected
                                    ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                                }`}
                              >
                                {days}d
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setCustomGrantSelected(true)}
                              className={`py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                customGrantSelected
                                  ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                              }`}
                            >
                              Custom
                            </button>
                          </div>
                          {customGrantSelected && (
                            <div className="flex items-center gap-2 animate-in fade-in duration-200">
                              <Input
                                type="number"
                                value={manualGrantDays}
                                onChange={(e) => setManualGrantDays(e.target.value)}
                                placeholder="e.g. 45"
                                className="h-9 text-xs font-black text-center border-slate-200 rounded-xl focus:border-slate-900 bg-slate-50 flex-1 shadow-2xs"
                              />
                              <span className="text-xs font-extrabold text-slate-400 whitespace-nowrap">days</span>
                            </div>
                          )}
                        </div>
                        <Button
                          disabled={actionLoading}
                          onClick={() => {
                            setReasonModal({
                              open: true,
                              title: "Grant Complimentary Access",
                              description: `Grant administrative complimentary access exception to ${owner.name} for ${manualGrantDays} days.`,
                              actionSummary: `Grant ${manualGrantDays} days comp access to ${owner.name}`,
                              confirmLabel: "Apply Access Grant",
                              confirmVariant: "primary",
                              onConfirm: (reason) => handleManualAction("restore_access", { grantDays: parseInt(manualGrantDays) || 30 }, reason)
                            });
                          }}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black h-9 text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 mt-1 cursor-pointer border-none shadow-xs"
                        >
                          <ShieldCheck size={14} />
                          Grant {manualGrantDays}d Access
                        </Button>
                      </div>
                    </div>

                    {/* Grace Period Extension Block */}
                    <div className="rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
                      <div className="bg-amber-50/80 px-4 py-2.5 flex items-center gap-2 border-b border-amber-200/80">
                        <Clock size={14} className="text-amber-700 shrink-0" />
                        <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider">Extend Grace Period</span>
                      </div>
                      <div className="px-4 py-3.5 space-y-3 bg-white">
                        <p className="text-xs text-[#6E6E73] font-normal leading-relaxed">
                          Push out the billing delinquency deadline. The account won&apos;t lock during the extension window.
                        </p>
                        {/* Duration Selector */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Extension</span>
                          <div className="grid grid-cols-4 gap-1.5">
                            {["3", "7", "14"].map(days => (
                              <button
                                key={days}
                                type="button"
                                onClick={() => { setManualGraceDays(days); setCustomGraceSelected(false); }}
                                className={`py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                  manualGraceDays === days && !customGraceSelected
                                    ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                                }`}
                              >
                                {days}d
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setCustomGraceSelected(true)}
                              className={`py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                customGraceSelected
                                  ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                              }`}
                            >
                              Custom
                            </button>
                          </div>
                          {customGraceSelected && (
                            <div className="flex items-center gap-2 animate-in fade-in duration-200">
                              <Input
                                type="number"
                                value={manualGraceDays}
                                onChange={(e) => setManualGraceDays(e.target.value)}
                                placeholder="e.g. 10"
                                className="h-9 text-xs font-black text-center border-slate-200 rounded-xl focus:border-slate-900 bg-slate-50 flex-1 shadow-2xs"
                              />
                              <span className="text-xs font-extrabold text-slate-400 whitespace-nowrap">days</span>
                            </div>
                          )}
                        </div>
                        <Button
                          disabled={actionLoading}
                          onClick={() => {
                            setReasonModal({
                              open: true,
                              title: "Extend Grace Period",
                              description: `Extend the subscription grace period for ${owner.name} by ${manualGraceDays} days.`,
                              actionSummary: `Extend billing grace period by ${manualGraceDays} days`,
                              confirmLabel: "Extend Grace",
                              confirmVariant: "warning",
                              onConfirm: (reason) => handleManualAction("extend_grace", { graceDays: parseInt(manualGraceDays) || 7 }, reason)
                            });
                          }}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black h-9 text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 mt-1 cursor-pointer border-none shadow-xs"
                        >
                          <Clock size={14} />
                          Extend by {manualGraceDays}d
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* ─── Save Matrix Configurations ─── */}
                <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden font-sans">
                  <div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Save Matrix Configurations</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-semibold">Review pending changes before committing overrides.</p>
                    </div>
                    {getChangedPoliciesPreview().length > 0 && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200/60 shadow-2xs">
                        {getChangedPoliciesPreview().length} change{getChangedPoliciesPreview().length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Live Diff Preview */}
                    {getChangedPoliciesPreview().length > 0 ? (
                      <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 space-y-2 shadow-2xs">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                          <Settings2 size={12} />
                          Pending Changes
                        </div>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto">
                          {getChangedPoliciesPreview().map((change: { label: string; from: string; to: string }, idx: number) => (
                            <div key={idx} className="bg-white border border-purple-200/60 rounded-xl px-3 py-2 space-y-1 shadow-2xs">
                              <div className="text-xs font-semibold text-slate-900">{change.label}</div>
                              <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                                <span className="text-slate-400 line-through">{change.from}</span>
                                <span className="text-purple-400">→</span>
                                <span className="text-purple-800 font-black">{change.to}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center">
                        <div className="text-xs font-extrabold text-slate-500">No unsaved changes</div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Modify policy toggles above to see a diff preview.</div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Button
                        disabled={actionLoading || getChangedPoliciesPreview().length === 0}
                        onClick={() => {
                          setReasonModal({
                            open: true,
                            title: "Apply Policy Exceptions",
                            description: `Save persistent administrative policy overrides for ${owner.name}.`,
                            actionSummary: `Apply custom rule exception matrix for ${owner.name}`,
                            confirmLabel: "Save Overrides",
                            confirmVariant: "primary",
                            onConfirm: (reason) => handleSaveOverride(reason)
                          });
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black h-9 text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer border-none shadow-xs"
                      >
                        <Settings2 size={14} />
                        {actionLoading ? "Applying Changes..." : "Apply Exceptions Matrix"}
                      </Button>

                      {owner.subscriptionOverride && (
                        <Button
                          disabled={actionLoading}
                          onClick={() => {
                            setConfirmDialog({
                              open: true,
                              title: "Clear Exceptions & Overrides",
                              description: `Are you sure you want to clear all custom exceptions and overrides for ${owner.name}? The system will fall back to platform subscription rules.`,
                              confirmLabel: "Yes, Clear Overrides",
                              confirmVariant: "destructive",
                              onConfirm: confirmClearOverride
                            });
                          }}
                          className="w-full border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 rounded-xl font-black h-9 text-xs bg-white transition-all shadow-2xs cursor-pointer"
                        >
                          Clear Active Exceptions
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>

                {/* ─── Danger Zone ─── */}
                <div className="rounded-3xl border border-rose-200 bg-white overflow-hidden shadow-xs font-sans">
                  {/* Red header stripe */}
                  <div className="bg-rose-50 px-5 py-3 border-b border-rose-200 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-extrabold text-rose-900 uppercase tracking-wider">Danger Zone</h4>
                      <p className="text-[10px] text-rose-600 font-semibold">Irreversible administrative actions</p>
                    </div>
                  </div>

                  <div className="px-5 py-4 space-y-3">
                    <p className="text-xs text-[#6E6E73] font-normal leading-relaxed">
                      Manually pausing or resuming this account bypasses Stripe billing. Every action is permanently recorded in the audit log.
                    </p>

                    {/* Active Status Pill */}
                    <div className="flex items-center gap-2 py-2 px-3 bg-slate-50 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        owner.subscriptionStatus === "Paused" ? "bg-amber-500 animate-pulse" :
                        owner.subscriptionStatus === "Past_Due" ? "bg-orange-500 animate-pulse" :
                        "bg-emerald-500"
                      }`} />
                      <div>
                        <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider">Current Status: </span>
                        <span className="text-xs font-black text-slate-900">
                          {owner.subscriptionStatus === "Paused" ? "Suspended" :
                           owner.subscriptionStatus === "Past_Due" ? "Past Due / Grace" :
                           owner.subscriptionStatus === "Active" ? "Active & Healthy" :
                           owner.subscriptionStatus || "Unknown"}
                        </span>
                      </div>
                    </div>

                    {owner.subscriptionStatus === "Paused" ? (
                      <Button
                        disabled={actionLoading}
                        onClick={() => {
                          setReasonModal({
                            open: true,
                            title: "Force Resume Account",
                            description: `Administratively lift all subscription constraints and force resume ${owner.name}'s account.`,
                            actionSummary: `Force resume subscription active status for ${owner.name}`,
                            confirmLabel: "Resume Account",
                            confirmVariant: "primary",
                            onConfirm: (reason) => handleManualAction("manual_resume", {}, reason)
                          });
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black h-9 text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer border-none"
                      >
                        <Play size={14} />
                        Force Resume Account
                      </Button>
                    ) : (
                      <Button
                        disabled={actionLoading}
                        onClick={() => {
                          setReasonModal({
                            open: true,
                            title: "Force Suspend Account",
                            description: `Immediately suspend all portfolio features and pause operations for ${owner.name}.`,
                            actionSummary: `Force suspend and lock features for ${owner.name}`,
                            confirmLabel: "Suspend Account",
                            confirmVariant: "destructive",
                            onConfirm: (reason) => handleManualAction("manual_pause", {}, reason)
                          });
                        }}
                        className="w-full border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl font-black h-9 text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <Pause size={14} />
                        Force Suspend Account
                      </Button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ACTIVITY LOG TAB */}
        {activeTab === 'activity' && (
          <div className="space-y-4 font-sans">
            {/* Header controls bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 border border-slate-200 rounded-3xl shadow-xs font-sans">
              <div className="flex flex-wrap items-center gap-2">
                {(["ALL", "ACCESS", "BILLING", "SECURITY", "SYSTEM"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`text-[9px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                      categoryFilter === cat
                        ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                        : "bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {cat === "ALL" ? `All Events (${auditLogs.length})` : cat}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="border-slate-200 hover:bg-slate-50 text-slate-900 rounded-xl font-medium text-xs h-9 bg-white shadow-2xs cursor-pointer"
              >
                Export Audit Trail (CSV)
              </Button>
            </div>

            {/* Log Timeline */}
            {filteredLogs.length === 0 ? (
              <div className="bg-white border border-[#E5E5EA] rounded-2xl py-16 text-center shadow-xs">
                <History size={32} className="text-[#C7C7CC] mx-auto mb-3" />
                <div className="text-sm font-bold text-[#8E8E93]">No events in this category</div>
                <div className="text-xs text-[#C7C7CC] mt-1">Try switching to &quot;All Events&quot; to see the full audit trail.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => {
                  const meta = getAuditMeta(log.action);
                  const isExpanded = !!expandedLogs[log.id];

                  // Build a human-readable diff from oldValue / newValue
                  const POLICY_LABELS: Record<string, string> = {
                    blockPayouts: "Payout Processing",
                    blockNewUnits: "Add New Units",
                    allowMaintenance: "Maintenance Requests",
                    allowAddVendor: "Add Vendors",
                    allowAddInspector: "Add Inspectors",
                    allowProcessApplications: "Process Applications",
                    allowAddTenant: "Tenant Registration",
                    allowTourSlots: "Tour Availability",
                    expiresAt: "Override Expiry",
                    reason: "Admin Reason",
                    gracePeriodDays: "Grace Period",
                    subscriptionStatus: "Subscription Status",
                    compAccessDays: "Comp. Access Days",
                  };

                  const formatVal = (key: string, val: unknown): string => {
                    if (val === null || val === undefined) return "—";
                    if (key === "expiresAt" && typeof val === "string") {
                      try { return new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
                      catch { return String(val); }
                    }
                    if (typeof val === "boolean") return val ? "Enabled" : "Disabled";
                    return String(val);
                  };

                  const buildDiff = () => {
                    const oldObj: Record<string, unknown> = log.oldValue && typeof log.oldValue === "object" ? log.oldValue as Record<string, unknown> : {};
                    const newObj: Record<string, unknown> = log.newValue && typeof log.newValue === "object" ? log.newValue as Record<string, unknown> : {};
                    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
                    return allKeys
                      .filter(k => k !== "id" && k !== "userId" && k !== "createdAt" && k !== "updatedAt")
                      .filter(k => JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k]))
                      .map(k => ({
                        label: POLICY_LABELS[k] || k,
                        from: formatVal(k, oldObj[k]),
                        to: formatVal(k, newObj[k]),
                        key: k,
                        isNew: oldObj[k] === undefined,
                        isRemoved: newObj[k] === undefined || newObj[k] === null,
                        isBool: typeof newObj[k] === "boolean" || typeof oldObj[k] === "boolean",
                      }));
                  };

                  const diff = (log.oldValue || log.newValue) ? buildDiff() : [];
                  const hasDiff = diff.length > 0;

                  return (
                    <div
                      key={log.id}
                      className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                        isExpanded ? "border-[#007AFF]/30 shadow-sm" : "border-[#E5E5EA] hover:border-[#C7C7CC]"
                      }`}
                    >
                      {/* Row Summary */}
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        {/* Category dot + icon */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                        </div>

                        {/* Event info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-semibold text-[#1D1D1F]">{meta.label}</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${meta.color}`}>
                              {meta.category}
                            </span>
                            {hasDiff && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wide bg-purple-50 text-purple-600 border border-purple-100">
                                {diff.length} field{diff.length > 1 ? "s" : ""} changed
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#6E6E73] font-medium truncate max-w-lg">
                            {log.note || "No audit note recorded."}
                          </div>
                        </div>

                        {/* Timestamp + actor + toggle */}
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <div className="text-right hidden sm:block">
                            <div className="text-[11px] font-bold text-[#1D1D1F]" title={new Date(log.createdAt).toLocaleString()}>
                              {getRelativeTime(log.createdAt)}
                            </div>
                            <div className="text-[10px] font-semibold text-purple-600 capitalize mt-0.5">
                              {log.actorRole?.toLowerCase() || "system"}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleRow(log.id)}
                            className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all ${
                              isExpanded
                                ? "bg-[#1D1D1F] border-[#1D1D1F] text-white"
                                : "bg-white border-[#E5E5EA] text-[#6E6E73] hover:border-[#007AFF] hover:text-[#007AFF]"
                            }`}
                          >
                            {isExpanded ? (
                              <><X size={11} /> Close</>
                            ) : (
                              <>View</>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Detail Panel */}
                      {isExpanded && (
                        <div className="border-t border-[#F2F2F7] bg-[#FAFAFA] px-5 py-4 space-y-4">
                          
                          {/* Timestamp + Actor row */}
                          <div className="flex flex-wrap gap-4">
                            <div className="bg-white border border-[#E5E5EA] rounded-xl px-3.5 py-2.5">
                              <div className="text-[9px] font-extrabold text-[#C7C7CC] uppercase tracking-wider mb-1">Event Time</div>
                              <div className="text-[11px] font-bold text-[#1D1D1F]">
                                {new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                            <div className="bg-white border border-[#E5E5EA] rounded-xl px-3.5 py-2.5">
                              <div className="text-[9px] font-extrabold text-[#C7C7CC] uppercase tracking-wider mb-1">Performed By</div>
                              <div className="text-[11px] font-bold text-purple-700 capitalize">{log.actorRole?.toLowerCase() || "System"}</div>
                            </div>
                            <div className="bg-white border border-[#E5E5EA] rounded-xl px-3.5 py-2.5">
                              <div className="text-[9px] font-extrabold text-[#C7C7CC] uppercase tracking-wider mb-1">Event Type</div>
                              <div className="text-[11px] font-bold text-[#1D1D1F]">{meta.label}</div>
                            </div>
                          </div>

                          {/* Rationale */}
                          {log.note && (
                            <div className="bg-white border border-[#E5E5EA] rounded-xl p-3.5">
                              <div className="text-[9px] font-extrabold text-[#C7C7CC] uppercase tracking-wider mb-2">Admin Rationale</div>
                              <p className="text-[11px] font-medium text-[#3A3A3C] leading-relaxed">
                                &ldquo;{log.note}&rdquo;
                              </p>
                            </div>
                          )}

                          {/* Human-readable diff */}
                          {hasDiff ? (
                            <div>
                              <div className="text-[9px] font-extrabold text-[#C7C7CC] uppercase tracking-wider mb-2">Changes Made</div>
                              <div className="grid gap-2">
                                {diff.map((item, i) => (
                                  <div key={i} className="bg-white border border-[#E5E5EA] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                                    <span className="text-[11px] font-bold text-[#3A3A3C] shrink-0">{item.label}</span>
                                    <div className="flex items-center gap-2 text-[11px] font-semibold ml-auto">
                                      {!item.isNew && (
                                        <span className="text-[#8E8E93] line-through bg-slate-50 px-2 py-0.5 rounded-lg">{item.from}</span>
                                      )}
                                      {!item.isNew && <span className="text-[#C7C7CC]">→</span>}
                                      <span className={`px-2 py-0.5 rounded-lg font-extrabold ${
                                        item.isRemoved ? "bg-rose-50 text-rose-700" :
                                        item.isBool && item.to === "Enabled" ? "bg-emerald-50 text-emerald-700" :
                                        item.isBool && item.to === "Disabled" ? "bg-rose-50 text-rose-700" :
                                        "bg-blue-50 text-blue-700"
                                      }`}>{item.to}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (log.oldValue || log.newValue) ? (
                            <div>
                              <div className="text-[9px] font-extrabold text-[#C7C7CC] uppercase tracking-wider mb-2">State Snapshot</div>
                              <div className="bg-white border border-[#E5E5EA] rounded-xl p-3 text-[10px] font-mono text-[#3A3A3C] overflow-auto max-h-[120px]">
                                {JSON.stringify(log.newValue || log.oldValue, null, 2)}
                              </div>
                            </div>
                          ) : null}

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Modals */}
      <ReasonModal
        open={reasonModal.open}
        onOpenChange={(open) => setReasonModal(prev => ({ ...prev, open }))}
        title={reasonModal.title}
        description={reasonModal.description}
        actionSummary={reasonModal.actionSummary}
        confirmLabel={reasonModal.confirmLabel}
        confirmVariant={reasonModal.confirmVariant}
        isLoading={actionLoading}
        onConfirm={reasonModal.onConfirm}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        confirmVariant={confirmDialog.confirmVariant}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
}

