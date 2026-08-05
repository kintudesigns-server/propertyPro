"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, Eye, Wrench, Calendar, CheckCircle2, ShieldAlert,
  Clock, MapPin, User, Phone, Search, ChevronUp, ChevronDown,
  ChevronsUpDown, Archive, FileText, BadgeHelp, CheckCircle, MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureBlockedOverlay } from "@/components/subscription/FeatureBlockedBanner";

// ─── Config ───────────────────────────────────────────────────────────────────
const PRIORITY_CFG: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  EMERGENCY: { label: "Emergency", dot: "bg-red-500",    text: "text-red-700",    bg: "bg-red-50",    border: "border-red-250" },
  HIGH:      { label: "High",      dot: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  MEDIUM:    { label: "Medium",    dot: "bg-amber-400",  text: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200" },
  LOW:       { label: "Low",       dot: "bg-slate-400",  text: "text-[#6E6E73]",  bg: "bg-[#F5F5F7]",  border: "border-[#E5E5EA]" },
};

type SortField = "title" | "property" | "status" | "date";
type SortDir   = "asc" | "desc";

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronsUpDown className="h-3 w-3 text-[#8E8E93] ml-1 inline" />;
  return sortDir === "asc"
    ? <ChevronUp   className="h-3 w-3 text-indigo-500 ml-1 inline" />
    : <ChevronDown className="h-3 w-3 text-indigo-500 ml-1 inline" />;
}

export default function InspectorHistoryPage() {
  const featureAccess = useFeatureAccess("view_history");
  const { status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filters + sort
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortField,    setSortField]    = useState<SortField>("date");
  const [sortDir,      setSortDir]      = useState<SortDir>("desc");

  // Expanded row
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchInspectorRequests = async () => {
    try {
      const res = await fetch("/api/maintenance");
      if (!res.ok) {
        const text = await res.text();
        console.error("API Error details:", text);
        throw new Error("Failed to load requests");
      }
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load history logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchInspectorRequests();
    }
  }, [status]);

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    setUpdatingId(requestId);
    toast.info(`Archiving ticket...`);
    try {
      const res = await fetch("/api/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId, status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Ticket successfully archived.`);
        fetchInspectorRequests();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating ticket.");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  // ── Derived ──
  const completedTasks = useMemo(() =>
    requests.filter((r) => ["RESOLVED", "CLOSED"].includes(r.status)),
    [requests]
  );

  const filtered = useMemo(() => {
    return completedTasks
      .filter(t => statusFilter === "ALL" || t.status === statusFilter)
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
        if (sortField === "status") { va = a.status; vb = b.status; }
        else if (sortField === "title") { va = a.title || ""; vb = b.title || ""; }
        else if (sortField === "property") { va = a.unit?.property?.name || ""; vb = b.unit?.property?.name || ""; }
        else if (sortField === "date") { va = new Date(a.updatedAt).getTime(); vb = new Date(b.updatedAt).getTime(); }
        
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [completedTasks, statusFilter, search, sortField, sortDir]);

  if (featureAccess.loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-[#8E8E93] font-extrabold text-xs tracking-wider uppercase">Verifying access permissions...</p>
      </div>
    );
  }

  const isBlocked = !featureAccess.allowed;

  if (loading || status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-[#8E8E93] font-semibold text-sm">Loading history logs...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {isBlocked && (
        <FeatureBlockedOverlay
          featureLabel={featureAccess.featureLabel || "Closed Diagnostics History"}
          reason={featureAccess.reason}
          adminNote={featureAccess.adminNote}
          expiresAt={featureAccess.expiresAt}
        />
      )}
      <div className={isBlocked ? "pointer-events-none select-none blur-[2.5px] opacity-70" : ""}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-6 pb-20 space-y-5">
      
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 font-sans">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Archive className="h-4 w-4 text-slate-700" />
            <span className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider">History &amp; Archives</span>
          </div>
          <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">History Logs</h1>
          <p className="text-xs font-normal text-[#6E6E73] mt-0.5">A complete record of all resolved and closed repair requests.</p>
        </div>
        <div className="px-2.5 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs inline-flex items-center gap-1.5">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
          {completedTasks.length} resolved ticket{completedTasks.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="flex flex-col sm:flex-row gap-3 font-sans">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6E73]" />
          <Input placeholder="Search title, property, tenant..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 pl-9 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all" />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs flex-wrap">
          {["ALL", "RESOLVED", "CLOSED"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${statusFilter === s ? "bg-slate-900 text-white font-medium shadow-2xs" : "text-[#6E6E73] font-normal hover:bg-slate-100"}`}>
              {s === "ALL" ? "All Completed" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABLE ── */}
      {filtered.length === 0 ? (
        <div className="text-center bg-white border border-slate-200 rounded-3xl py-24 shadow-2xs font-sans">
          <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-700 shadow-2xs">
            <Archive className="h-4 w-4 text-slate-500" />
          </div>
          <h3 className="text-xs font-semibold text-[#1D1D1F] mb-1">
            {search || statusFilter !== "ALL" ? "No logs match your filters" : "No history logs yet"}
          </h3>
          <p className="text-xs font-normal text-[#6E6E73]">
            {search || statusFilter !== "ALL" ? "Try adjusting the filters above." : "Resolved tickets will appear here once finalized."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-2xs overflow-hidden font-sans">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3">
                    <button onClick={() => toggleSort("title")} className="text-[11px] font-medium uppercase tracking-wider text-[#6E6E73] hover:text-[#1D1D1F] transition-colors flex items-center cursor-pointer">
                      Work Order <SortIcon field="title" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="text-left px-5 py-3 w-[220px]">
                    <button onClick={() => toggleSort("property")} className="text-[11px] font-medium uppercase tracking-wider text-[#6E6E73] hover:text-[#1D1D1F] transition-colors flex items-center cursor-pointer">
                      Property / Unit <SortIcon field="property" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="text-left px-5 py-3 w-[180px]">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-[#6E6E73]">Tenant</span>
                  </th>
                  <th className="text-left px-5 py-3 w-[160px]">
                    <button onClick={() => toggleSort("status")} className="text-[11px] font-medium uppercase tracking-wider text-[#6E6E73] hover:text-[#1D1D1F] transition-colors flex items-center cursor-pointer">
                      Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="text-left px-5 py-3 w-[150px]">
                    <button onClick={() => toggleSort("date")} className="text-[11px] font-medium uppercase tracking-wider text-[#6E6E73] hover:text-[#1D1D1F] transition-colors flex items-center cursor-pointer">
                      Completed Date <SortIcon field="date" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="text-right px-5 py-3 w-[160px]">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-[#6E6E73]">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(t => {
                  const pCfg = PRIORITY_CFG[t.priority] || PRIORITY_CFG["MEDIUM"];
                  const isExpanded = expanded === t.id;
                  const isResolved = t.status === "RESOLVED";

                  return (
                    <React.Fragment key={t.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => setExpanded(isExpanded ? null : t.id)}>
                        {/* Work order title */}
                        <td className="px-5 py-3.5 max-w-[280px]">
                          <p className="text-xs font-semibold text-[#1D1D1F] leading-snug">{t.title}</p>
                          <p className="text-xs font-normal text-[#6E6E73] mt-0.5 truncate max-w-xs">{t.description}</p>
                          {t.priority && (
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border shadow-2xs mt-1.5 inline-flex items-center gap-1 ${pCfg.bg} ${pCfg.text} ${pCfg.border}`}>
                              {pCfg.label}
                            </span>
                          )}
                        </td>

                        {/* Property */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-[#1D1D1F] leading-snug">{t.unit?.property?.name}</p>
                              <p className="text-xs font-normal text-[#6E6E73]">Unit {t.unit?.name}</p>
                            </div>
                          </div>
                        </td>

                        {/* Tenant */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-start gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-[#1D1D1F] leading-snug">{t.tenant?.name || "—"}</p>
                              {t.tenant?.phone && <p className="text-xs font-normal text-[#6E6E73]">{t.tenant.phone}</p>}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border shadow-2xs inline-flex items-center gap-1.5 ${
                            t.status === "CLOSED"
                              ? "bg-slate-100 text-slate-700 border-slate-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${t.status === "CLOSED" ? "bg-slate-400" : "bg-emerald-500"}`} />
                            {t.status}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-3.5 text-xs font-semibold text-[#1D1D1F]">
                          {new Date(t.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {isResolved && (
                              <Button
                                size="sm"
                                disabled={updatingId === t.id}
                                onClick={() => handleUpdateStatus(t.id, "CLOSED")}
                                className="h-8 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-3 shadow-xs cursor-pointer border-none"
                              >
                                {updatingId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Archive"}
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs transition-all focus:outline-none cursor-pointer">
                                <MoreHorizontal className="h-4 w-4 text-slate-700" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 rounded-xl p-1.5 shadow-lg border border-slate-200 bg-white font-sans z-50">
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/maintenance/${t.id}`)} className="text-xs font-medium text-[#1D1D1F] cursor-pointer py-2 focus:bg-slate-100 rounded-lg">
                                  <Eye className="h-4 w-4 mr-2 text-slate-500" />
                                  View Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded panel details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 border-l-2 border-l-emerald-400">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-[10px] font-extrabold text-[#8E8E93] uppercase tracking-widest mb-1.5">Resolution description</p>
                                <p className="text-slate-700 text-xs leading-relaxed">{t.inspectorNotes || "No resolution comments logged."}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-extrabold text-[#8E8E93] uppercase tracking-widest mb-1.5">Tenant Feedback</p>
                                {t.tenantRating || t.tenantFeedback ? (
                                  <div className="space-y-1">
                                    <p className="text-xs font-bold text-amber-600">Rating: {t.tenantRating || "—"} / 5 ★</p>
                                    {t.tenantFeedback && <p className="text-xs text-[#6E6E73] italic">"{t.tenantFeedback}"</p>}
                                  </div>
                                ) : (
                                  <p className="text-xs text-[#8E8E93] italic">No feedback provided yet.</p>
                                )}
                              </div>
                              <div>
                                <p className="text-[10px] font-extrabold text-[#8E8E93] uppercase tracking-widest mb-1.5">Final Cost Billing</p>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs text-[#6E6E73]"><span>Labor:</span><span className="font-bold">${Number(t.finalLabor || 0).toFixed(2)}</span></div>
                                  <div className="flex justify-between text-xs text-[#6E6E73]"><span>Materials:</span><span className="font-bold">${Number(t.finalMaterials || 0).toFixed(2)}</span></div>
                                  <div className="flex justify-between text-xs font-black text-slate-900 pt-1 border-t border-slate-200">
                                    <span>Total Invoice:</span>
                                    <span>${(Number(t.finalLabor || 0) + Number(t.finalMaterials || 0)).toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <p className="text-xs text-[#8E8E93] font-semibold">
              Showing <strong className="text-[#6E6E73]">{filtered.length}</strong> of <strong className="text-[#6E6E73]">{completedTasks.length}</strong> completed requests
            </p>
            <p className="text-[10px] text-[#8E8E93] font-medium">Click a row to expand details</p>
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
