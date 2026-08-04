"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShieldAlert,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Database,
  Calendar,
  Clock,
  User,
  RefreshCw,
  Download,
  X,
  Copy,
  Check,
  Globe,
  Laptop,
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileText
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuditLogActor {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  avatar: string | null;
}

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string | null;
  actorRole: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  oldValue: any;
  newValue: any;
  note: string | null;
  createdAt: string;
  actor?: AuditLogActor | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Stats {
  totalEvents: number;
  failedLogins24h: number;
  todayEvents: number;
  criticalEvents: number;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [stats, setStats] = useState<Stats>({ totalEvents: 0, failedLogins24h: 0, todayEvents: 0, criticalEvents: 0 });
  const [entityTypeCounts, setEntityTypeCounts] = useState<Record<string, number>>({});
  const [actionCounts, setActionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [entityType, setEntityType] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [limit, setLimit] = useState<number>(15);
  const [page, setPage] = useState(1);

  // Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedOld, setCopiedOld] = useState(false);
  const [copiedNew, setCopiedNew] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (entityType) params.append("entityType", entityType);
      if (action) params.append("action", action);
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");

      const data = await res.json();
      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      if (data.stats) {
        setStats(data.stats);
      }
      if (data.entityTypeCounts) {
        setEntityTypeCounts(data.entityTypeCounts);
      }
      if (data.actionCounts) {
        setActionCounts(data.actionCounts);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, limit, entityType, action, debouncedSearch, startDate, endDate]);

  const handleClearFilters = () => {
    setEntityType("");
    setAction("");
    setSearch("");
    setDebouncedSearch("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (entityType) params.append("entityType", entityType);
      if (action) params.append("action", action);
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/admin/audit-logs/export?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to generate CSV export");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Audit logs exported successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  const copyToClipboard = (jsonObj: any, type: "old" | "new") => {
    if (!jsonObj) return;
    navigator.clipboard.writeText(JSON.stringify(jsonObj, null, 2));
    if (type === "old") {
      setCopiedOld(true);
      setTimeout(() => setCopiedOld(false), 2000);
    } else {
      setCopiedNew(true);
      setTimeout(() => setCopiedNew(false), 2000);
    }
    toast.success("JSON copied to clipboard");
  };

  const hasActiveFilters = entityType || action || search || startDate || endDate;

  // Counts helpers
  const getCount = (key: string) => entityTypeCounts[key] || 0;
  const getActionCount = (key: string) => actionCounts[key] || 0;

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-rose-600 animate-pulse" />
            System Audit Trails
          </h2>
          <p className="text-[#6E6E73] text-sm mt-1">
            Enterprise security compliance, authentication tracking, financial mutations, and system event governance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleExportCsv}
            disabled={exporting || loading}
            variant="outline"
            size="sm"
            className="h-10 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 font-bold bg-white"
          >
            <Download className={`h-4 w-4 text-emerald-600 ${exporting ? "animate-bounce" : ""}`} />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>

          <Button
            onClick={fetchLogs}
            variant="outline"
            size="sm"
            className="h-10 border-slate-200 text-[#6E6E73] rounded-xl flex items-center gap-2 font-bold bg-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Trails
          </Button>
        </div>
      </div>

      {/* KPI Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-100 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold tracking-wider uppercase text-[#8E8E93]">Total Logs Filtered</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{pagination.total}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold tracking-wider uppercase text-[#8E8E93]">Failed Logins (24h)</p>
              <div className="flex items-center gap-2 mt-1">
                <h3 className="text-2xl font-black text-slate-900">{stats.failedLogins24h}</h3>
                {stats.failedLogins24h > 0 && (
                  <Badge className="bg-rose-100 text-rose-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full border-0">
                    Security Alert
                  </Badge>
                )}
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold tracking-wider uppercase text-[#8E8E93]">Today's Activity</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.todayEvents}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold tracking-wider uppercase text-[#8E8E93]">Critical Events</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.criticalEvents}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control and Filter Bar */}
      <Card className="border border-slate-100 shadow-xs bg-white rounded-2xl">
        <CardContent className="p-5 space-y-4">
          {/* Top Row: Search and Filters */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Entity ID, Actor name/email, Action..."
                className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-xl text-xs font-semibold focus-visible:ring-rose-500/20"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value);
                  setPage(1);
                }}
                className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
              >
                <option value="">All Entity Types ({stats.totalEvents})</option>
                <option value="AUTH">AUTH (Authentication & Logins)</option>
                <option value="USER">USER (Account & Roles) ({getCount("USER")})</option>
                <option value="LEASE">LEASE (Lifecycle) ({getCount("LEASE")})</option>
                <option value="PAYOUT">PAYOUT (Financial Disbursements) ({getCount("PAYOUT")})</option>
                <option value="INVOICE">INVOICE (Billing & Stripe) ({getCount("INVOICE")})</option>
                <option value="SUBSCRIPTION_GATE">SUBSCRIPTION_GATE (Security Check) ({getCount("SUBSCRIPTION_GATE")})</option>
                <option value="TOUR">TOUR (Showing Appointments) ({getCount("TOUR")})</option>
                <option value="PROPERTY">PROPERTY (Real Estate Assets) ({getCount("PROPERTY")})</option>
                <option value="MAINTENANCE">MAINTENANCE (Work Orders) ({getCount("MAINTENANCE")})</option>
              </select>

              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
                className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
              >
                <option value="">All Actions</option>
                <option value="LOGIN_SUCCESS">Login Success ({getActionCount("LOGIN_SUCCESS")})</option>
                <option value="LOGIN_FAILURE">Login Failure ({getActionCount("LOGIN_FAILURE")})</option>
                <option value="LOGIN_BLOCKED">Login Blocked ({getActionCount("LOGIN_BLOCKED")})</option>
                <option value="CREATED">Created ({getActionCount("CREATED")})</option>
                <option value="UPDATED">Updated ({getActionCount("UPDATED")})</option>
                <option value="DELETED">Deleted ({getActionCount("DELETED")})</option>
                <option value="SIGNED">Lease Signed ({getActionCount("SIGNED")})</option>
                <option value="STATUS_CHANGED">Status Changed ({getActionCount("STATUS_CHANGED")})</option>
                <option value="PAYOUT_CREATED">Payout Created ({getActionCount("PAYOUT_CREATED")})</option>
                <option value="PAYOUT_APPROVED">Payout Approved ({getActionCount("PAYOUT_APPROVED")})</option>
                <option value="PAYOUT_REJECTED">Payout Rejected ({getActionCount("PAYOUT_REJECTED")})</option>
              </select>

              {/* Date Filters */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 h-10">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                />
                <span className="text-slate-400 text-xs font-bold">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                />
              </div>

              {hasActiveFilters && (
                <Button
                  onClick={handleClearFilters}
                  variant="ghost"
                  size="sm"
                  className="h-10 px-3 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold text-xs rounded-xl flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Bottom Info & Page Size */}
          <div className="flex items-center justify-between text-xs font-bold text-[#8E8E93] pt-1 border-t border-slate-100">
            <div>
              Showing <span className="text-slate-900 font-extrabold">{logs.length}</span> of{" "}
              <span className="text-slate-900 font-extrabold">{pagination.total}</span> audit records
            </div>

            <div className="flex items-center gap-2">
              <span>Per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 px-2 py-1 focus:outline-none"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Logs Table */}
      <Card className="border border-slate-100 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-24 text-center text-[#8E8E93] font-medium flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">Loading compliance audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-24 text-center text-[#8E8E93] flex flex-col items-center justify-center gap-3">
              <Database className="h-12 w-12 text-slate-200" />
              <p className="font-semibold text-sm text-slate-800">No audit logs found for this filter.</p>
              <p className="text-xs text-[#8E8E93]">
                {hasActiveFilters
                  ? "No records match your selected entity type or filter criteria. Try resetting filters."
                  : "Audit events will appear here automatically when actions occur."}
              </p>
              {hasActiveFilters && (
                <Button
                  onClick={handleClearFilters}
                  variant="outline"
                  size="sm"
                  className="mt-2 rounded-xl border-slate-200 text-xs font-bold"
                >
                  Reset All Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[#8E8E93] text-[10px] font-extrabold tracking-wider uppercase">
                    <th className="py-3.5 px-6">Event Time</th>
                    <th className="py-3.5 px-6">Entity</th>
                    <th className="py-3.5 px-6">Action / Event</th>
                    <th className="py-3.5 px-6">Actor Details</th>
                    <th className="py-3.5 px-6">Network / Device</th>
                    <th className="py-3.5 px-6">Description / Notes</th>
                    <th className="py-3.5 px-6 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {logs.map((log) => {
                    const eventDate = new Date(log.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const eventTime = new Date(log.createdAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      second: "2-digit",
                    });

                    // P0 Fix: replace ALL underscores with spaces
                    const formattedAction = log.action ? log.action.replace(/_/g, " ") : "UNKNOWN";

                    const isFailure =
                      log.action.includes("FAILURE") ||
                      log.action.includes("REJECTED") ||
                      log.action.includes("BLOCKED") ||
                      log.action.includes("DELETED");

                    const isSuccess =
                      log.action.includes("SUCCESS") ||
                      log.action.includes("APPROVED") ||
                      log.action.includes("SIGNED");

                    return (
                      <tr key={log.id} className="hover:bg-[#F5F5F7]/40 transition-colors">
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="font-bold text-slate-700 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-[#8E8E93]" />
                            {eventDate}
                          </div>
                          <div className="text-xs text-[#8E8E93] flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-3.5 w-3.5 text-[#8E8E93]" />
                            {eventTime}
                          </div>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <Badge variant="outline" className="rounded-lg font-bold text-[10px] uppercase py-0.5 px-2 bg-slate-50 border-slate-200 text-[#6E6E73]">
                            {log.entityType}
                          </Badge>
                          <div className="text-[10px] text-[#8E8E93] mt-1 font-mono">{log.entityId.slice(0, 8)}...</div>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <Badge
                            className={`rounded-full font-bold text-[9px] uppercase px-2.5 py-0.5 border-0 ${
                              isFailure
                                ? "bg-rose-100 text-rose-700"
                                : isSuccess
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {formattedAction}
                          </Badge>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {log.actor?.avatar ? (
                              <img
                                src={log.actor.avatar}
                                alt={log.actor.name || "Actor Avatar"}
                                className="h-7 w-7 rounded-full object-cover shrink-0 border border-slate-200 shadow-xs"
                              />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-600 overflow-hidden shrink-0">
                                {log.actor?.name ? log.actor.name.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5 text-slate-400" />}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-800 text-xs">
                                {log.actor?.name || log.actorRole || "SYSTEM"}
                              </div>
                              <div className="text-[10px] text-[#8E8E93] font-mono">
                                {log.actor?.email || (log.actorId ? `ID: ${log.actorId.slice(0, 8)}...` : "Automated System")}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          {log.ipAddress || log.userAgent ? (
                            <div className="space-y-0.5">
                              {log.ipAddress && (
                                <div className="text-[11px] font-mono font-bold text-slate-700 flex items-center gap-1">
                                  <Globe className="h-3 w-3 text-slate-400" />
                                  {log.ipAddress}
                                </div>
                              )}
                              {log.userAgent && (
                                <div className="text-[10px] text-[#8E8E93] truncate max-w-[120px] flex items-center gap-1" title={log.userAgent}>
                                  <Laptop className="h-3 w-3 text-slate-400" />
                                  {log.userAgent.split(" ")[0]}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 font-mono">—</span>
                          )}
                        </td>

                        <td className="py-4 px-6 max-w-xs">
                          <p className="text-xs font-medium text-[#6E6E73] line-clamp-2">
                            {log.note || "No comments or description recorded."}
                          </p>
                        </td>

                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <Button
                            onClick={() => setSelectedLog(log)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#8E8E93] hover:text-rose-600 hover:bg-[#F5F5F7] rounded-xl"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <Button
                disabled={page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                variant="outline"
                size="sm"
                className="h-9 px-3 rounded-lg border-slate-200 text-[#6E6E73] text-xs font-bold flex items-center gap-1 bg-white disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="text-xs font-bold text-[#6E6E73]">
                Page <span className="text-[#1D1D1F] font-black">{page}</span> of{" "}
                <span className="text-[#1D1D1F] font-black">{pagination.totalPages}</span>
              </div>

              <Button
                disabled={page >= pagination.totalPages || loading}
                onClick={() => setPage((prev) => Math.min(prev + 1, pagination.totalPages))}
                variant="outline"
                size="sm"
                className="h-9 px-3 rounded-lg border-slate-200 text-[#6E6E73] text-xs font-bold flex items-center gap-1 bg-white disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Trail Details & Diffs Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl bg-white border-slate-100 text-slate-800 rounded-3xl p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              Audit Trail Payload Inspection
            </DialogTitle>
            <DialogDescription className="text-[#8E8E93] text-xs">
              Complete state mutation record and network metadata captured during execution.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 pt-4 overflow-y-auto max-h-[500px] pr-2">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="font-bold text-[#8E8E93] uppercase text-[9px] mb-1">Entity Type</div>
                  <div className="text-slate-800 font-black">{selectedLog.entityType}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedLog.entityId.slice(0, 10)}...</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="font-bold text-[#8E8E93] uppercase text-[9px] mb-1">Trigger Action</div>
                  <div className="text-rose-600 font-black">{selectedLog.action.replace(/_/g, " ")}</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="font-bold text-[#8E8E93] uppercase text-[9px] mb-1">Actor</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selectedLog.actor?.avatar ? (
                      <img
                        src={selectedLog.actor.avatar}
                        alt={selectedLog.actor.name || "Actor Avatar"}
                        className="h-6 w-6 rounded-full object-cover shrink-0 border border-slate-200"
                      />
                    ) : null}
                    <div className="overflow-hidden">
                      <div className="text-slate-800 font-bold truncate">{selectedLog.actor?.name || selectedLog.actorRole || "SYSTEM"}</div>
                      <div className="text-[10px] text-slate-400 truncate">{selectedLog.actor?.email || selectedLog.actorId || "System Task"}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="font-bold text-[#8E8E93] uppercase text-[9px] mb-1">Network Info</div>
                  <div className="text-slate-800 font-mono font-bold">{selectedLog.ipAddress || "N/A"}</div>
                  <div className="text-[10px] text-slate-400 truncate" title={selectedLog.userAgent || ""}>
                    {selectedLog.userAgent ? selectedLog.userAgent.slice(0, 18) + "..." : "No User Agent"}
                  </div>
                </div>
              </div>

              {/* Event Description (P0 Fix: clean rendering without literal quotes) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#6E6E73]">Event Description & Notes</label>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 font-medium">
                  {selectedLog.note || "No additional metadata comments recorded for this audit entry."}
                </div>
              </div>

              {/* JSON Diffs Viewer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Old Value */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-rose-600">Old / Before State</label>
                    {selectedLog.oldValue && (
                      <Button
                        onClick={() => copyToClipboard(selectedLog.oldValue, "old")}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] font-bold text-rose-700 hover:bg-rose-100 rounded-lg flex items-center gap-1"
                      >
                        {copiedOld ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedOld ? "Copied" : "Copy JSON"}
                      </Button>
                    )}
                  </div>
                  <pre className="bg-rose-50/50 text-rose-800 border border-rose-100 p-4 rounded-2xl text-[11px] font-mono overflow-auto max-h-[220px]">
                    {selectedLog.oldValue ? JSON.stringify(selectedLog.oldValue, null, 2) : "null (No previous state recorded)"}
                  </pre>
                </div>

                {/* New Value */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-600">New / After State</label>
                    {selectedLog.newValue && (
                      <Button
                        onClick={() => copyToClipboard(selectedLog.newValue, "new")}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 rounded-lg flex items-center gap-1"
                      >
                        {copiedNew ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedNew ? "Copied" : "Copy JSON"}
                      </Button>
                    )}
                  </div>
                  <pre className="bg-emerald-50/50 text-emerald-800 border border-emerald-100 p-4 rounded-2xl text-[11px] font-mono overflow-auto max-h-[220px]">
                    {selectedLog.newValue ? JSON.stringify(selectedLog.newValue, null, 2) : "null (No subsequent state recorded)"}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
