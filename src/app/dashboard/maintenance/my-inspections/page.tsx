"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, Wrench, Calendar, Clock, MapPin, User, Info,
  ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal,
  Zap, Search, CheckCircle2, AlertTriangle,
} from "lucide-react";

import { toast } from "sonner";
import Link from "next/link";

// ─── Config ───────────────────────────────────────────────────────────────────
const PRIORITY_CFG: Record<string, { label: string; dot: string; text: string; bg: string; border: string; sort: number }> = {
  EMERGENCY: { label: "Emergency", dot: "bg-rose-500",   text: "text-rose-700",   bg: "bg-rose-50",   border: "border-rose-200",   sort: 0 },
  HIGH:      { label: "High",      dot: "bg-amber-500",  text: "text-amber-800",  bg: "bg-amber-50",  border: "border-amber-200",  sort: 1 },
  MEDIUM:    { label: "Medium",    dot: "bg-slate-400", text: "text-slate-800",  bg: "bg-slate-100", border: "border-slate-200", sort: 2 },
  LOW:       { label: "Low",       dot: "bg-slate-400", text: "text-slate-600",  bg: "bg-slate-100", border: "border-slate-200", sort: 3 },
};

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; border: string; step: number; cta: string; modal: string }> = {
  ASSIGNED:            { label: "Assigned",         bg: "bg-[#F2F2F7]",   text: "text-slate-700",   border: "border-slate-200",   step: 1, cta: "Schedule Visit",   modal: "SCHEDULE_DIAGNOSIS" },
  DIAGNOSIS_SCHEDULED: { label: "Visit Scheduled",  bg: "bg-slate-100",    text: "text-slate-900",   border: "border-slate-200",   step: 2, cta: "Submit Report",   modal: "SUBMIT_ESTIMATE"    },
  DIAGNOSIS_COMPLETE:  { label: "Report Submitted", bg: "bg-emerald-50",   text: "text-emerald-700", border: "border-emerald-200", step: 3, cta: "",              modal: ""                   },
  AWAITING_APPROVAL:   { label: "Pending (Vendor)", bg: "bg-amber-50",    text: "text-amber-800",   border: "border-amber-200",   step: 3, cta: "",              modal: ""                   },
  APPROVED:            { label: "Vendor Approved",  bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200", step: 3, cta: "",              modal: ""                   },
  REPAIR_SCHEDULED:    { label: "Vendor Working",   bg: "bg-purple-50",   text: "text-purple-700",  border: "border-purple-200",  step: 3, cta: "",              modal: ""                   },
};

const PIPELINE = ["ASSIGNED", "DIAGNOSIS_SCHEDULED", "DIAGNOSIS_COMPLETE"];

type SortField = "priority" | "status" | "title" | "property" | "created";
type SortDir   = "asc" | "desc";

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronsUpDown className="h-3 w-3 text-slate-400 ml-1 inline" />;
  return sortDir === "asc"
    ? <ChevronUp   className="h-3 w-3 text-slate-900 ml-1 inline" />
    : <ChevronDown className="h-3 w-3 text-slate-900 ml-1 inline" />;
}

// ─── Mini Pipeline Badge ──────────────────────────────────────────────────────
function PipelineBadge({ status }: { status: string }) {
  const step = STATUS_CFG[status]?.step || 0;
  return (
    <div className="flex items-center gap-0.5">
      {PIPELINE.map((_, i) => (
        <div key={i} className={`h-1 w-4 rounded-full ${i < step ? "bg-slate-900" : "bg-slate-200"}`} />
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function OwnerAssignedInspectionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tasks,   setTasks]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modal,    setModal]    = useState<string | null>(null);
  const [ticket,   setTicket]   = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving,   setSaving]   = useState(false);

  const estimatedLabor = Number(formData.labor || 0);
  const estimatedMaterials = Number(formData.materials || 0);
  const totalEstimate = estimatedLabor + estimatedMaterials;

  // Filters + sort
  const [search,    setSearch]    = useState("");
  const [prioFilter, setPrio]     = useState("ALL");
  const [stFilter,   setSt]       = useState("ALL");
  const [sortField,  setSortField] = useState<SortField>("priority");
  const [sortDir,    setSortDir]   = useState<SortDir>("asc");

  // Expanded row
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const r = await fetch("/api/maintenance");
      if (!r.ok) throw new Error();
      setTasks(await r.json());
    } catch { toast.error("Failed to load tasks."); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (status === "authenticated") fetchData(); }, [status]);

  const handleUpdate = async (id: string, newStatus: string, payload: any = {}) => {
    setSaving(true);
    try {
      const r = await fetch("/api/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus, ...payload }),
      });
      if (r.ok) {
        toast.success("Work order updated.");
        setModal(null); setTicket(null); setFormData({});
        fetchData();
      } else { const e = await r.json(); toast.error(e.error || "Update failed."); }
    } catch { toast.error("Network error."); }
    finally { setSaving(false); }
  };

  const submitModal = () => {
    if (!ticket) return;
    if (modal === "SCHEDULE_DIAGNOSIS") {
      if (!formData.date) { toast.error("Select a date & time."); return; }
      handleUpdate(ticket.id, "DIAGNOSIS_SCHEDULED", { diagnosisDate: formData.date });
    } else if (modal === "SUBMIT_ESTIMATE") {
      if (!formData.labor && !formData.materials) { toast.error("Enter at least one cost (labor or materials)."); return; }
      handleUpdate(ticket.id, "DIAGNOSIS_COMPLETE", {
        action: "SUBMIT_INSPECTOR_ESTIMATE",
        estimatedLabor: formData.labor || 0,
        estimatedMaterials: formData.materials || 0,
        inspectorNotes: formData.notes,
      });
    }
  };

  const openModal = (t: any, m: string) => { setTicket(t); setFormData({}); setModal(m); };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  // ── Derived ──
  const active = useMemo(() => {
    const userId = (session?.user as any)?.id;
    if (!userId) return [];
    return tasks.filter(t => 
      t.inspectorId === userId && 
      !["RESOLVED", "CLOSED", "PENDING_TENANT_CONFIRMATION"].includes(t.status)
    );
  }, [tasks, session?.user]);

  const filtered = useMemo(() => {
    return active
      .filter(t => prioFilter === "ALL" || t.priority === prioFilter)
      .filter(t => stFilter   === "ALL" || t.status   === stFilter)
      .filter(t => {
        if (!search) return true;
        const q = search.toLowerCase();
        return t.title?.toLowerCase().includes(q)
          || t.unit?.property?.name?.toLowerCase().includes(q)
          || t.tenant?.name?.toLowerCase().includes(q)
          || t.unit?.name?.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        let va: any, vb: any;
        if (sortField === "priority") { va = PRIORITY_CFG[a.priority]?.sort ?? 99; vb = PRIORITY_CFG[b.priority]?.sort ?? 99; }
        else if (sortField === "status") { va = STATUS_CFG[a.status]?.step ?? 0; vb = STATUS_CFG[b.status]?.step ?? 0; }
        else if (sortField === "title") { va = a.title || ""; vb = b.title || ""; }
        else if (sortField === "property") { va = a.unit?.property?.name || ""; vb = b.unit?.property?.name || ""; }
        else if (sortField === "created") { va = new Date(a.createdAt).getTime(); vb = new Date(b.createdAt).getTime(); }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [active, prioFilter, stFilter, search, sortField, sortDir]);

  const emergencyCount = active.filter(t => t.priority === "EMERGENCY").length;

  if (loading || status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        <p className="text-slate-500 font-extrabold text-sm uppercase tracking-wider">Loading work orders...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6 font-sans">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">My Assigned Inspections</h1>
          <p className="text-xs text-[#6E6E73] font-normal mt-0.5">Manage, schedule, and estimate repairs assigned to yourself</p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { label: "Total", value: active.length, bg: "bg-slate-100 text-[#1D1D1F] border-slate-200/60" },
            { label: "Waiting Approval", value: active.filter(t => t.status === "AWAITING_APPROVAL").length, bg: "bg-amber-50 text-amber-800 border-amber-200" },
            { label: "Needs Action", value: active.filter(t => t.status !== "AWAITING_APPROVAL").length, bg: "bg-slate-100 text-[#1D1D1F] border-slate-200/60" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border rounded-xl px-3 py-1 flex items-center gap-1.5 shadow-2xs`}>
              <span className="text-xs font-semibold text-[#1D1D1F]">{s.value}</span>
              <span className="text-[10px] font-medium text-[#6E6E73] uppercase tracking-wider">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── EMERGENCY BANNER ── */}
      {emergencyCount > 0 && (
        <div className="relative flex items-center gap-3 bg-rose-50 border border-rose-200/80 rounded-2xl p-4 shadow-xs">
          <div className="absolute left-0 top-0 w-1 h-full bg-rose-600 rounded-l-2xl" />
          <Zap className="ml-2 h-5 w-5 text-rose-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-rose-900 uppercase tracking-wider">{emergencyCount} Emergency ticket{emergencyCount > 1 ? "s" : ""} — Respond immediately</p>
            <p className="text-xs text-rose-700 font-normal mt-0.5">Emergency repairs are auto-approved by the system. Visit, diagnose, and complete ASAP.</p>
          </div>
        </div>
      )}

      {/* ── TOOLBAR: Search + Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search title, property, tenant..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-9 border-slate-200 rounded-xl bg-white text-xs font-normal text-[#1D1D1F] shadow-2xs focus-visible:ring-2 focus-visible:ring-slate-900/10" 
          />
        </div>

        {/* Priority filter */}
        <div className="flex items-center gap-1 bg-slate-100 border border-slate-200/30 p-1 rounded-xl shadow-2xs">
          {["ALL", "EMERGENCY", "HIGH", "MEDIUM", "LOW"].map(p => (
            <button key={p} onClick={() => setPrio(p)}
              className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${prioFilter === p ? "bg-white text-[#1D1D1F] font-medium shadow-2xs" : "text-[#6E6E73] hover:text-[#1D1D1F] font-normal"}`}>
              {p === "ALL" ? "All" : p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 bg-slate-100 border border-slate-200/30 p-1 rounded-xl shadow-2xs">
          {[["ALL", "All"], ["ASSIGNED", "Assigned"], ["DIAGNOSIS_SCHEDULED", "Visit"], ["DIAGNOSIS_COMPLETE", "Done"], ["AWAITING_APPROVAL", "Pending"]].map(([val, label]) => (
            <button key={val} onClick={() => setSt(val)}
              className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${stFilter === val ? "bg-white text-[#1D1D1F] font-medium shadow-2xs" : "text-[#6E6E73] hover:text-[#1D1D1F] font-normal"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── DATA TABLE ── */}
      {filtered.length === 0 ? (
        <div className="text-center bg-white border border-slate-200 rounded-3xl py-24 shadow-xs">
          <div className="h-14 w-14 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-900 shadow-2xs">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            {search || prioFilter !== "ALL" || stFilter !== "ALL" ? "No tickets match your filters" : "No active work orders!"}
          </h3>
          <p className="text-xs text-[#6E6E73] font-normal">
            {search || prioFilter !== "ALL" || stFilter !== "ALL" ? "Try adjusting the filters above." : "All caught up — great work!"}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left border-collapse">
              {/* ── THEAD ── */}
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  <th className="px-6 py-3.5 w-[110px]">
                    <button onClick={() => toggleSort("priority")} className="font-normal text-xs text-[#6E6E73] hover:text-[#1D1D1F] transition-colors flex items-center cursor-pointer">
                      Priority <SortIcon field="priority" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-6 py-3.5">
                    <button onClick={() => toggleSort("title")} className="font-normal text-xs text-[#6E6E73] hover:text-[#1D1D1F] transition-colors flex items-center cursor-pointer">
                      Work Order <SortIcon field="title" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-6 py-3.5 w-[190px]">
                    <button onClick={() => toggleSort("property")} className="font-normal text-xs text-[#6E6E73] hover:text-[#1D1D1F] transition-colors flex items-center cursor-pointer">
                      Property / Unit <SortIcon field="property" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-6 py-3.5 w-[160px]">
                    <span className="font-normal text-xs text-[#6E6E73]">Tenant</span>
                  </th>
                  <th className="px-6 py-3.5 w-[190px]">
                    <button onClick={() => toggleSort("status")} className="font-normal text-xs text-[#6E6E73] hover:text-[#1D1D1F] transition-colors flex items-center cursor-pointer">
                      Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-6 py-3.5 w-[140px]">
                    <span className="font-normal text-xs text-[#6E6E73]">Scheduled</span>
                  </th>
                  <th className="px-6 py-3.5 w-[220px] text-right">
                    <span className="font-normal text-xs text-[#6E6E73]">Actions</span>
                  </th>
                </tr>
              </thead>

              {/* ── TBODY ── */}
              <tbody className="divide-y divide-slate-100">
                {filtered.map(t => {
                  const pCfg = PRIORITY_CFG[t.priority] || PRIORITY_CFG["MEDIUM"];
                  const sCfg = STATUS_CFG[t.status];
                  const isWaiting = t.status === "AWAITING_APPROVAL";
                  const isExpanded = expanded === t.id;

                  const scheduledDate = t.status === "DIAGNOSIS_SCHEDULED" && t.diagnosisDate
                    ? new Date(t.diagnosisDate)
                    : t.status === "REPAIR_SCHEDULED" && t.repairDate
                    ? new Date(t.repairDate)
                    : null;

                  return (
                    <React.Fragment key={t.id}>
                      <tr
                        className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${t.priority === "EMERGENCY" ? "border-l-4 border-l-rose-600" : ""}`}
                        onClick={() => setExpanded(isExpanded ? null : t.id)}
                      >
                        {/* Priority */}
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border shadow-2xs ${pCfg.bg} ${pCfg.text} ${pCfg.border}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${pCfg.dot} ${t.priority === "EMERGENCY" ? "animate-pulse" : ""}`} />
                            {pCfg.label}
                          </span>
                        </td>

                        {/* Work Order info */}
                        <td className="px-6 py-3.5 max-w-[280px]">
                          <p className="font-extrabold text-xs text-slate-900 leading-snug">{t.title}</p>
                          <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate max-w-xs">{t.description}</p>
                          <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase mt-1 px-1.5 py-0.5 rounded border shadow-2xs ${
                            t.entryPermission
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}>
                            {t.entryPermission ? "✓ Entry OK" : "⚠ Coordinate"}
                          </span>
                        </td>

                        {/* Property */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-extrabold text-xs text-slate-900 leading-snug">{t.unit?.property?.name}</p>
                              <p className="text-[11px] font-semibold text-slate-500">Unit {t.unit?.name} · {t.unit?.property?.city}</p>
                            </div>
                          </div>
                        </td>

                        {/* Tenant */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-start gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-extrabold text-xs text-slate-900 leading-snug">{t.tenant?.name || "—"}</p>
                              {t.tenant?.phone && <p className="text-[11px] font-semibold text-slate-500">{t.tenant.phone}</p>}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-3.5">
                          {sCfg && (
                            <div className="space-y-1.5">
                              <span className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border shadow-2xs ${sCfg.bg} ${sCfg.text} ${sCfg.border}`}>
                                <span className={`h-1.5 w-1.5 rounded-full bg-current opacity-60 ${isWaiting ? "animate-pulse" : ""}`} />
                                {sCfg.label}
                              </span>
                              <PipelineBadge status={t.status} />
                              <p className="text-[9px] text-slate-400 font-extrabold uppercase">Step {sCfg.step} of 5</p>
                            </div>
                          )}
                        </td>

                        {/* Scheduled date */}
                        <td className="px-6 py-3.5">
                          {scheduledDate ? (
                            <div className="flex items-start gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-slate-900">{scheduledDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                                <p className="text-[10px] text-slate-500 font-semibold">{scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium italic">Not scheduled</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-3.5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {isWaiting ? (
                              <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase text-amber-800 shadow-2xs">
                                <Clock className="h-3 w-3 animate-pulse" /> Awaiting Approval
                              </span>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger className="h-8 w-8 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-100 transition-colors flex items-center justify-center focus:outline-none cursor-pointer">
                                  <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-2xl border border-slate-200 bg-white shadow-xl p-1.5 z-50">
                                  {sCfg?.cta && (
                                    <DropdownMenuItem
                                      onClick={() => openModal(t, sCfg.modal)}
                                      className="cursor-pointer font-bold text-xs rounded-xl py-2 text-slate-900 hover:bg-slate-50"
                                    >
                                      {sCfg.cta}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/dashboard/maintenance/${t.id}`)}
                                    className="cursor-pointer font-bold text-xs rounded-xl py-2 text-slate-800 hover:bg-slate-50"
                                  >
                                    View Details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 border-l-4 border-l-slate-900">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                              <div>
                                <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-1">Description</p>
                                <p className="text-slate-700 font-medium leading-relaxed">{t.description || "No description provided."}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-1">Entry &amp; Timing</p>
                                <div className="space-y-1">
                                  <p className={`font-semibold ${t.entryPermission ? "text-emerald-700" : "text-amber-800"}`}>
                                    {t.entryPermission ? "✓ Entry permitted if tenant not home" : "⚠ Tenant must be present — coordinate first"}
                                  </p>
                                  {t.preferredTimes && <p className="text-slate-500">Preferred times: <strong>{t.preferredTimes}</strong></p>}
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-1">Cost Estimate</p>
                                {t.estimatedLabor || t.estimatedMaterials ? (
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-slate-600"><span>Labor:</span><span className="font-bold">${Number(t.estimatedLabor || 0).toFixed(2)}</span></div>
                                    <div className="flex justify-between text-slate-600"><span>Materials:</span><span className="font-bold">${Number(t.estimatedMaterials || 0).toFixed(2)}</span></div>
                                    <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-200">
                                      <span>Total:</span>
                                      <span>${(Number(t.estimatedLabor || 0) + Number(t.estimatedMaterials || 0)).toFixed(2)}</span>
                                    </div>
                                  </div>
                                ) : <p className="text-slate-400 italic">No estimate submitted yet.</p>}
                              </div>
                            </div>
                            {t.inspectorNotes && (
                              <div className="mt-3 pt-3 border-t border-slate-200">
                                <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-1">Inspector Notes</p>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed">{t.inspectorNotes}</p>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-[#6E6E73] font-normal">
              Showing <strong className="text-slate-900 font-extrabold">{filtered.length}</strong> of <strong className="text-slate-900 font-extrabold">{active.length}</strong> active work orders
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Click a row to expand details</p>
          </div>
        </div>
      )}

      {/* ── ACTION DIALOGS ── */}
      <Dialog open={!!modal} onOpenChange={open => !open && (setModal(null), setTicket(null), setFormData({}))}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-slate-900">
              {modal === "SCHEDULE_DIAGNOSIS" && <><Calendar className="h-5 w-5 text-slate-900" /> Schedule Diagnosis Visit</>}
              {modal === "SUBMIT_ESTIMATE"    && <><Wrench className="h-5 w-5 text-slate-900" /> Submit Diagnosis Report</>}
            </DialogTitle>
            <DialogDescription className="pt-1">
              <span className="font-bold text-slate-900">{ticket?.title}</span>
              <span className="text-slate-400 mx-1.5">·</span>
              <span className="text-slate-500 font-semibold">{ticket?.unit?.property?.name}, Unit {ticket?.unit?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Entry notice */}
            <div className={`flex items-start gap-3 rounded-2xl border p-3.5 shadow-2xs ${ticket?.entryPermission ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${ticket?.entryPermission ? "bg-emerald-100" : "bg-amber-100"}`}>
                {ticket?.entryPermission ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
              </div>
              <div>
                <p className={`text-xs font-black ${ticket?.entryPermission ? "text-emerald-900" : "text-amber-900"}`}>
                  {ticket?.entryPermission ? "Entry Permitted — Access if tenant not home" : "Coordination Required — Tenant must be home"}
                </p>
                {ticket?.preferredTimes && <p className="text-[11px] text-slate-600 font-medium mt-0.5">Preferred: {ticket.preferredTimes}</p>}
              </div>
            </div>

            {/* Date picker: only for scheduling visits */}
            {modal === "SCHEDULE_DIAGNOSIS" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date &amp; Time</Label>
                <Input type="datetime-local" className="h-10 rounded-xl border-slate-200 text-xs font-semibold"
                  onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
            )}

            {/* Cost inputs — only for diagnosis report */}
            {modal === "SUBMIT_ESTIMATE" && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 shadow-2xs">
                  <Info className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                    <strong>Diagnosis Report:</strong> Enter your estimated reference cost for this job. The owner will use this to evaluate vendor quotes.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Labor Cost ($)</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      min="0" 
                      step="0.01" 
                      className="h-10 rounded-xl border-slate-200 text-xs font-semibold"
                      value={formData.labor !== undefined ? formData.labor : ""}
                      onChange={e => setFormData({ ...formData, labor: e.target.value ? Number(e.target.value) : undefined })} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Materials ($)</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      min="0" 
                      step="0.01" 
                      className="h-10 rounded-xl border-slate-200 text-xs font-semibold"
                      value={formData.materials !== undefined ? formData.materials : ""}
                      onChange={e => setFormData({ ...formData, materials: e.target.value ? Number(e.target.value) : undefined })} 
                    />
                  </div>
                </div>

                {/* Diagnosis Report Summary */}
                <div className="bg-slate-50 border border-slate-200/85 rounded-2xl p-4 space-y-3 shadow-xs">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference Estimate Summary</p>
                  <div className="space-y-1.5 text-xs font-semibold text-slate-600">
                    <div className="flex justify-between">
                      <span>Labor Cost:</span>
                      <span className="font-semibold text-slate-900">${estimatedLabor.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Materials Cost:</span>
                      <span className="font-semibold text-slate-900">${estimatedMaterials.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-200/80 my-1 pt-1.5 flex justify-between text-sm font-black text-slate-900">
                      <span>Total Reference Estimate:</span>
                      <span className="font-black text-base text-slate-900">${totalEstimate.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Diagnosis notes */}
            {modal === "SUBMIT_ESTIMATE" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Diagnosis Notes</Label>
                <Textarea placeholder="Describe what you observed, the root cause, and what repair work is needed..." rows={3} className="rounded-xl border-slate-200 resize-none text-xs font-medium"
                  onChange={e => setFormData({ ...formData, notes: e.target.value })} />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModal(null)} className="rounded-xl font-bold text-xs border-slate-200">Cancel</Button>
            <Button onClick={submitModal} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-xs px-6 shadow-xs">
              {saving ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving...</span> : "Confirm & Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

