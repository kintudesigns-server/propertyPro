"use client";

import React, { useState } from "react";
import Link from "next/link";
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
    <div className="space-y-6">

      {/* iOS-Style Breadcrumbs and Header */}
      <div className="flex flex-col gap-2">
        {/* Breadcrumb Trail */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">
          <Link href="/dashboard/admin" className="hover:text-[#1D1D1F] transition-colors">Admin</Link>
          <span>/</span>
          <Link href="/dashboard/admin/subscriptions" className="hover:text-[#1D1D1F] transition-colors">Subscriptions</Link>
          <span>/</span>
          <span className="text-[#1D1D1F]">{owner.name || "Owner Details"}</span>
        </div>

        <button 
          onClick={() => router.push("/dashboard/admin/subscriptions")}
          className="flex items-center gap-1.5 text-xs font-bold text-[#6E6E73] hover:text-[#1D1D1F] transition-colors w-fit mt-1"
        >
          <ChevronLeft size={14} /> Back to Subscriptions
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-black tracking-tight text-[#1D1D1F]">{owner.name || "Owner Management"}</h1>
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

      {/* Tab Switcher */}
      <div className="flex border-b border-[#E5E5EA] gap-6">
        {[
          { key: 'overview', label: 'Overview', icon: User },
          { key: 'modules', label: 'Module Access', icon: Layers },
          { key: 'overrides', label: 'Billing Overrides', icon: Settings2 },
          { key: 'activity', label: 'Activity Log', icon: History }
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
                  <h3 className="text-sm font-bold text-[#1D1D1F]">Feature Access Manager</h3>
                  <p className="text-[#6E6E73] text-xs mt-0.5">Control which platform features this owner can access, regardless of their subscription plan.</p>
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
                    className="border-[#E5E5EA] hover:border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl font-bold text-xs h-9"
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
                <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl overflow-hidden">
                  {/* Card Header */}
                  <div className="px-5 pt-5 pb-3 border-b border-[#F2F2F7]">
                    <h3 className="text-xs font-extrabold text-[#1D1D1F] uppercase tracking-wider">Account Status Controls</h3>
                    <p className="text-[11px] text-[#8E8E93] mt-0.5 font-medium">Grant temporary access or extend billing grace outside Stripe.</p>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Complimentary Access Block */}
                    <div className="rounded-xl border border-[#E5E5EA] overflow-hidden">
                      <div className="bg-emerald-50/60 px-4 py-2.5 flex items-center gap-2 border-b border-emerald-100">
                        <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                        <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">Complimentary Access</span>
                      </div>
                      <div className="px-4 py-3.5 space-y-3">
                        <p className="text-[11px] text-[#6E6E73] font-medium leading-relaxed">
                          Bypass billing restrictions for a set number of days. The owner retains full feature access as if actively subscribed.
                        </p>
                        {/* Duration Selector */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider block">Duration</span>
                          <div className="grid grid-cols-4 gap-1.5">
                            {["7", "14", "30"].map(days => (
                              <button
                                key={days}
                                type="button"
                                onClick={() => { setManualGrantDays(days); setCustomGrantSelected(false); }}
                                className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                  manualGrantDays === days && !customGrantSelected
                                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                                    : "bg-white text-[#6E6E73] border-[#E5E5EA] hover:border-emerald-300 hover:text-emerald-700"
                                }`}
                              >
                                {days}d
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setCustomGrantSelected(true)}
                              className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                customGrantSelected
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                                  : "bg-white text-[#6E6E73] border-[#E5E5EA] hover:border-emerald-300 hover:text-emerald-700"
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
                                className="h-8 text-xs font-bold text-center border-[#E5E5EA] rounded-lg focus:border-emerald-400 flex-1"
                              />
                              <span className="text-[11px] font-bold text-[#6E6E73] whitespace-nowrap">days</span>
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
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold h-9 text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 mt-1"
                        >
                          <ShieldCheck size={13} />
                          Grant {manualGrantDays}d Access
                        </Button>
                      </div>
                    </div>

                    {/* Grace Period Extension Block */}
                    <div className="rounded-xl border border-[#E5E5EA] overflow-hidden">
                      <div className="bg-amber-50/60 px-4 py-2.5 flex items-center gap-2 border-b border-amber-100">
                        <Clock size={13} className="text-amber-600 shrink-0" />
                        <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider">Extend Grace Period</span>
                      </div>
                      <div className="px-4 py-3.5 space-y-3">
                        <p className="text-[11px] text-[#6E6E73] font-medium leading-relaxed">
                          Push out the billing delinquency deadline. The account won&apos;t lock during the extension window.
                        </p>
                        {/* Duration Selector */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider block">Extension</span>
                          <div className="grid grid-cols-4 gap-1.5">
                            {["3", "7", "14"].map(days => (
                              <button
                                key={days}
                                type="button"
                                onClick={() => { setManualGraceDays(days); setCustomGraceSelected(false); }}
                                className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                  manualGraceDays === days && !customGraceSelected
                                    ? "bg-amber-500 border-amber-500 text-white shadow-xs"
                                    : "bg-white text-[#6E6E73] border-[#E5E5EA] hover:border-amber-300 hover:text-amber-700"
                                }`}
                              >
                                {days}d
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setCustomGraceSelected(true)}
                              className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                customGraceSelected
                                  ? "bg-amber-500 border-amber-500 text-white shadow-xs"
                                  : "bg-white text-[#6E6E73] border-[#E5E5EA] hover:border-amber-300 hover:text-amber-700"
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
                                className="h-8 text-xs font-bold text-center border-[#E5E5EA] rounded-lg focus:border-amber-400 flex-1"
                              />
                              <span className="text-[11px] font-bold text-[#6E6E73] whitespace-nowrap">days</span>
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
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold h-9 text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 mt-1"
                        >
                          <Clock size={13} />
                          Extend by {manualGraceDays}d
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* ─── Save Matrix Configurations ─── */}
                <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl overflow-hidden">
                  <div className="px-5 pt-5 pb-3 border-b border-[#F2F2F7] flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold text-[#1D1D1F] uppercase tracking-wider">Save Matrix Configurations</h3>
                      <p className="text-[11px] text-[#8E8E93] mt-0.5 font-medium">Review pending changes before committing overrides.</p>
                    </div>
                    {getChangedPoliciesPreview().length > 0 && (
                      <span className="text-[10px] font-extrabold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        {getChangedPoliciesPreview().length} change{getChangedPoliciesPreview().length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Live Diff Preview */}
                    {getChangedPoliciesPreview().length > 0 ? (
                      <div className="bg-purple-50 border border-purple-100 rounded-xl p-3.5 space-y-2">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                          <Settings2 size={11} />
                          Pending Changes
                        </div>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto">
                          {getChangedPoliciesPreview().map((change: { label: string; from: string; to: string }, idx: number) => (
                            <div key={idx} className="bg-white border border-purple-100 rounded-lg px-3 py-2 space-y-1">
                              <div className="text-[11px] font-bold text-slate-700">{change.label}</div>
                              <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                                <span className="text-slate-400 line-through">{change.from}</span>
                                <span className="text-purple-400">→</span>
                                <span className="text-purple-800 font-extrabold">{change.to}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#F9F9FB] border border-dashed border-[#E5E5EA] rounded-xl p-4 text-center">
                        <div className="text-[11px] font-bold text-[#8E8E93]">No unsaved changes</div>
                        <div className="text-[10px] text-[#C7C7CC] mt-0.5">Modify policy toggles above to see a diff preview.</div>
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
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold h-9 text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                      >
                        <Settings2 size={13} />
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
                          className="w-full border border-[#E5E5EA] text-[#6E6E73] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 rounded-xl font-bold h-9 text-xs bg-white transition-all"
                        >
                          Clear Active Exceptions
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>

                {/* ─── Danger Zone ─── */}
                <div className="rounded-2xl border border-red-200 bg-white overflow-hidden">
                  {/* Red header stripe */}
                  <div className="bg-red-50 px-5 py-3 border-b border-red-200 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-extrabold text-red-800 uppercase tracking-wider">Danger Zone</h4>
                      <p className="text-[10px] text-red-600 font-semibold">Irreversible administrative actions</p>
                    </div>
                  </div>

                  <div className="px-5 py-4 space-y-3">
                    <p className="text-[11px] text-[#6E6E73] font-medium leading-relaxed">
                      Manually pausing or resuming this account bypasses Stripe billing. Every action is permanently recorded in the audit log.
                    </p>

                    {/* Active Status Pill */}
                    <div className="flex items-center gap-2 py-2 px-3 bg-[#F9F9FB] rounded-lg border border-[#E5E5EA]">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        owner.subscriptionStatus === "Paused" ? "bg-amber-500 animate-pulse" :
                        owner.subscriptionStatus === "Past_Due" ? "bg-orange-500 animate-pulse" :
                        "bg-emerald-500"
                      }`} />
                      <div>
                        <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">Current Status: </span>
                        <span className="text-[11px] font-extrabold text-[#1D1D1F]">
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
                        className="w-full bg-[#007AFF] hover:bg-[#0066D9] text-white rounded-xl font-bold h-9 text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Play size={13} />
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
                        className="w-full border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 rounded-xl font-bold h-9 text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Pause size={13} />
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
          <div className="space-y-4">
            {/* Header controls bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 border border-[#E5E5EA] rounded-2xl shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                {(["ALL", "ACCESS", "BILLING", "SECURITY", "SYSTEM"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`text-[10px] font-extrabold px-3 py-1.5 rounded-full border transition-all ${
                      categoryFilter === cat
                        ? "bg-[#1D1D1F] border-[#1D1D1F] text-white shadow-xs"
                        : "bg-white text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#F2F2F7]"
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
                className="border-[#E5E5EA] hover:bg-slate-50 text-[#1D1D1F] rounded-xl font-bold text-xs h-9"
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
                            <span className="text-[11px] font-extrabold text-[#1D1D1F]">{meta.label}</span>
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
