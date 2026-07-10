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
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string | null;
  actorRole: string | null;
  oldValue: any;
  newValue: any;
  note: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (entityType) params.append("entityType", entityType);
      if (action) params.append("action", action);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");

      const data = await res.json();
      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err: any) {
      toast.error(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, entityType, action]);

  const handleFilterChange = (type: string, val: string) => {
    if (type === "entityType") {
      setEntityType(val);
    } else {
      setAction(val);
    }
    setPage(1); // Reset page on filter change
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-rose-600 animate-pulse" />
            System Audit Trails
          </h2>
          <p className="text-slate-500 text-sm">
            Trace security compliance, financial operations, lease modifications, and authentication actions.
          </p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm" className="h-10 border-slate-200 text-slate-600 rounded-xl flex items-center gap-2 font-bold bg-white">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Trails
        </Button>
      </div>

      {/* Control and Filter Bar */}
      <Card className="border-0 shadow-xs bg-white rounded-2xl">
        <CardContent className="p-5 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600">
              <Filter className="h-4 w-4 text-slate-400" />
              Filters
            </div>

            <select
              value={entityType}
              onChange={(e) => handleFilterChange("entityType", e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="">All Entity Types</option>
              <option value="AUTH">Authentication</option>
              <option value="LEASE">Lease Lifecycle</option>
              <option value="PAYMENT">Payments & Payouts</option>
              <option value="USER">User Administrative</option>
              <option value="TOUR">Showing Tours</option>
            </select>

            <select
              value={action}
              onChange={(e) => handleFilterChange("action", e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="">All Actions</option>
              <option value="LOGIN_SUCCESS">Login Success</option>
              <option value="LOGIN_FAILURE">Login Failure</option>
              <option value="LOGIN_BLOCKED">Login Blocked</option>
              <option value="CREATED">Created</option>
              <option value="UPDATED">Updated</option>
              <option value="DELETED">Deleted</option>
              <option value="SIGNED">Lease Signed</option>
              <option value="STATUS_CHANGED">Status Changed</option>
              <option value="PAYOUT_CREATED">Payout Created</option>
              <option value="PAYOUT_APPROVED">Payout Approved</option>
              <option value="PAYOUT_REJECTED">Payout Rejected</option>
            </select>
          </div>

          <div className="text-xs font-bold text-slate-400">
            Showing <span className="text-slate-800">{logs.length}</span> of <span className="text-slate-800">{pagination.total}</span> records
          </div>
        </CardContent>
      </Card>

      {/* Main Logs Table */}
      <Card className="border-0 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-24 text-center text-slate-400 font-medium flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Fetching audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Database className="h-12 w-12 text-slate-200" />
              <p className="font-semibold text-sm">No audit logs found.</p>
              <p className="text-xs text-slate-400">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-[10px] font-extrabold tracking-wider uppercase">
                    <th className="py-3.5 px-6">Event Time</th>
                    <th className="py-3.5 px-6">Entity</th>
                    <th className="py-3.5 px-6">Action / Event</th>
                    <th className="py-3.5 px-6">Actor Details</th>
                    <th className="py-3.5 px-6">Description / Notes</th>
                    <th className="py-3.5 px-6 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {logs.map((log) => {
                    const eventDate = new Date(log.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    });
                    const eventTime = new Date(log.createdAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      second: "2-digit"
                    });

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-700 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {eventDate}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {eventTime}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge variant="outline" className="rounded-lg font-bold text-[10px] uppercase py-0.5 px-2 bg-slate-50 border-slate-200 text-slate-600">
                            {log.entityType}
                          </Badge>
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">{log.entityId.slice(0, 8)}...</div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge
                            className={`rounded-full font-bold text-[9px] uppercase px-2.5 py-0.5 border-0 ${
                              log.action.includes("FAILURE") || log.action.includes("REJECTED") || log.action.includes("BLOCKED")
                                ? "bg-rose-100 text-rose-700"
                                : log.action.includes("SUCCESS") || log.action.includes("APPROVED") || log.action.includes("SIGNED")
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {log.action.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-bold text-slate-700">
                              {log.actorRole || "SYSTEM"}
                            </span>
                          </div>
                          {log.actorId && (
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              ID: {log.actorId.slice(0, 8)}...
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 max-w-xs">
                          <p className="text-xs font-medium text-slate-600 line-clamp-2">
                            {log.note || "No comments or description recorded."}
                          </p>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Button
                            onClick={() => setSelectedLog(log)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-xl"
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
                className="h-9 px-3 rounded-lg border-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1 bg-white disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="text-xs font-bold text-slate-500">
                Page <span className="text-slate-800">{page}</span> of{" "}
                <span className="text-slate-800">{pagination.totalPages}</span>
              </div>

              <Button
                disabled={page >= pagination.totalPages || loading}
                onClick={() => setPage((prev) => Math.min(prev + 1, pagination.totalPages))}
                variant="outline"
                size="sm"
                className="h-9 px-3 rounded-lg border-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1 bg-white disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diffs Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl bg-white border-slate-100 text-slate-800 rounded-3xl p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900">Audit Trail Diffs</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Detailed payload change representation captured during execution.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 pt-4 overflow-y-auto max-h-[450px] pr-2">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="font-bold text-slate-400 uppercase text-[9px] mb-1">Entity Details</div>
                  <div className="text-slate-700 font-semibold">{selectedLog.entityType} ({selectedLog.entityId.slice(0, 8)})</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="font-bold text-slate-400 uppercase text-[9px] mb-1">Trigger Action</div>
                  <div className="text-slate-700 font-semibold">{selectedLog.action}</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600">Event Description</label>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 font-semibold italic">
                  "{selectedLog.note || "No details provided."}"
                </div>
              </div>

              {/* JSON Diffs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-rose-600">Old/Before Value</label>
                  <pre className="bg-rose-50/50 text-rose-800 border border-rose-100 p-4 rounded-2xl text-[11px] font-mono overflow-auto max-h-[220px]">
                    {selectedLog.oldValue ? JSON.stringify(selectedLog.oldValue, null, 2) : "null (No previous state)"}
                  </pre>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-emerald-600">New/After Value</label>
                  <pre className="bg-emerald-50/50 text-emerald-800 border border-emerald-100 p-4 rounded-2xl text-[11px] font-mono overflow-auto max-h-[220px]">
                    {selectedLog.newValue ? JSON.stringify(selectedLog.newValue, null, 2) : "null (No subsequent state)"}
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
