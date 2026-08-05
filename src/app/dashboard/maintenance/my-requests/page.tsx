"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Wrench, Plus, Loader2, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureBlockedOverlay } from "@/components/subscription/FeatureBlockedBanner";

export default function MyRequestsPage() {
  const featureAccess = useFeatureAccess("view_maintenance");
  const { data: session, status } = useSession();
  const router = useRouter();

  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelRequestId, setCancelRequestId] = useState<string | null>(null);

  // Filter States
  const [maintFilterPriority, setMaintFilterPriority] = useState("ALL");
  const [maintFilterStatus, setMaintFilterStatus] = useState("ALL");

  // Reschedule Modal States
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedRequestForReschedule, setSelectedRequestForReschedule] = useState<any>(null);
  const [rescheduleData, setRescheduleData] = useState({ date: "", reason: "" });
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  const fetchMaintenance = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/maintenance");
      if (res.ok) {
        setMaintenance(await res.json());
      }
    } catch (err) {
      toast.error("Failed to load maintenance requests");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/maintenance?id=${requestId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Request cancelled successfully");
        fetchMaintenance();
      } else {
        toast.error("Failed to cancel request");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedRequestForReschedule || !rescheduleData.date || !rescheduleData.reason) return;
    setSubmittingReschedule(true);
    try {
      const res = await fetch("/api/maintenance/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequestForReschedule.id,
          proposedDate: rescheduleData.date,
          reason: rescheduleData.reason,
        }),
      });

      if (res.ok) {
        toast.success("Reschedule request sent successfully!");
        setRescheduleModalOpen(false);
        fetchMaintenance();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to process reschedule");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setSubmittingReschedule(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    fetchMaintenance();
  }, [status, router]);

  const isTenantBlocked = !featureAccess.allowed && !featureAccess.loading;

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#007AFF]" />
        <p className="text-[#8E8E93] font-extrabold text-sm uppercase tracking-wider">Syncing maintenance log...</p>
      </div>
    );
  }

  const filteredMaint = maintenance
    .filter(m => maintFilterPriority === "ALL" || m.priority === maintFilterPriority)
    .filter(m => maintFilterStatus === "ALL" || m.status === maintFilterStatus);

  return (
    <div className="relative">
      {isTenantBlocked && (
        <FeatureBlockedOverlay
          featureLabel="My Maintenance Requests"
          reason={featureAccess.reason}
          adminNote={featureAccess.adminNote}
          expiresAt={featureAccess.expiresAt}
        />
      )}
      <div className={isTenantBlocked ? "pointer-events-none select-none blur-[2.5px] opacity-70" : ""}>
      <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-2xs font-sans">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
            <Wrench className="h-4 w-4 text-slate-700" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">My Requests</h1>
            <p className="text-[#6E6E73] text-xs font-normal mt-0.5">Track pending tickets, schedule inspection dates, and view histories.</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            onClick={fetchMaintenance}
            variant="outline"
            className="h-9 bg-white border border-slate-200 text-[#1D1D1F] hover:bg-slate-50 rounded-xl font-medium text-xs flex items-center justify-center gap-2 px-4 shadow-2xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button 
            onClick={() => router.push("/dashboard/maintenance/new")} 
            className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 rounded-xl shadow-xs border-none cursor-pointer flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="h-4 w-4" /> Submit Request
          </Button>
        </div>
      </div>

      <Card className="bg-white border border-slate-200 rounded-3xl shadow-2xs p-6 md:p-8 font-sans">
        <div className="flex flex-col sm:flex-row justify-between items-center pb-4 border-b border-slate-100 mb-6">
          <div>
            <h2 className="text-base font-semibold text-[#1D1D1F] tracking-tight">Maintenance Log</h2>
            <p className="text-xs font-normal text-[#6E6E73] mt-0.5">All logged repairs and their current statuses</p>
          </div>

          <div className="flex gap-2 mt-4 sm:mt-0 w-full sm:w-auto">
            <Select value={maintFilterPriority} onValueChange={(val) => setMaintFilterPriority(val || "ALL")}>
              <SelectTrigger className="h-9 text-xs font-normal text-[#1D1D1F] w-32 bg-white border border-slate-200 rounded-xl shadow-2xs cursor-pointer">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="bg-white rounded-xl border-slate-200">
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="EMERGENCY">Emergency</SelectItem>
              </SelectContent>
            </Select>

            <Select value={maintFilterStatus} onValueChange={(val) => setMaintFilterStatus(val || "ALL")}>
              <SelectTrigger className="h-9 text-xs font-normal text-[#1D1D1F] w-36 bg-white border border-slate-200 rounded-xl shadow-2xs cursor-pointer">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white rounded-xl border-slate-200">
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="AWAITING_APPROVAL">Awaiting Approval</SelectItem>
                <SelectItem value="PENDING_TENANT_CONFIRMATION">Pending Confirmation</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="font-medium text-[11px] uppercase tracking-wider text-[#6E6E73] py-3">Ticket Title</TableHead>
                <TableHead className="font-medium text-[11px] uppercase tracking-wider text-[#6E6E73] py-3">Category</TableHead>
                <TableHead className="font-medium text-[11px] uppercase tracking-wider text-[#6E6E73] py-3">Priority</TableHead>
                <TableHead className="font-medium text-[11px] uppercase tracking-wider text-[#6E6E73] py-3">Status</TableHead>
                <TableHead className="font-medium text-[11px] uppercase tracking-wider text-[#6E6E73] py-3">Assigned Inspector</TableHead>
                <TableHead className="font-medium text-[11px] uppercase tracking-wider text-[#6E6E73] py-3">Schedule</TableHead>
                <TableHead className="font-medium text-[11px] uppercase tracking-wider text-[#6E6E73] py-3">Date Filed</TableHead>
                <TableHead className="font-medium text-[11px] uppercase tracking-wider text-[#6E6E73] py-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaint.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-[#6E6E73] font-normal text-xs italic">
                    No maintenance tickets found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMaint.map((m) => (
                  <TableRow
                    key={m.id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors border-t border-slate-100"
                    onClick={() => router.push(`/dashboard/maintenance/${m.id}`)}
                  >
                    <TableCell className="font-semibold text-xs text-[#1D1D1F] py-4">
                      {m.title}
                      <p className="text-xs text-[#6E6E73] font-normal mt-0.5 line-clamp-1">{m.description}</p>
                    </TableCell>
                    <TableCell className="text-[#6E6E73] text-xs font-normal">{m.category}</TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider shadow-2xs ${
                        m.priority === "EMERGENCY" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                        m.priority === "HIGH" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                        m.priority === "MEDIUM" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {m.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                        {m.status === "CLOSED" ? "completed" : m.status.toLowerCase().replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-normal text-[#1D1D1F]">
                      {m.inspector ? m.inspector.name : <span className="text-[#6E6E73] italic">Awaiting assignment</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {m.diagnosisDate ? (
                         <div className="font-semibold text-[#1D1D1F]">Diagnosis: {new Date(m.diagnosisDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                      ) : null}
                      {m.repairDate ? (
                         <div className="font-semibold text-emerald-600">Repair: {new Date(m.repairDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                      ) : null}
                      {!m.diagnosisDate && !m.repairDate && <span className="text-[#6E6E73] italic">Not scheduled</span>}
                    </TableCell>
                    <TableCell className="text-[#6E6E73] text-xs">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {m.status === "SUBMITTED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold text-xs flex items-center gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelRequestId(m.id);
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                        {(m.diagnosisDate || m.repairDate) && (m.status !== "RESOLVED" && m.status !== "CLOSED") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 rounded-lg border-orange-200 text-orange-600 hover:bg-orange-50 font-semibold text-xs flex items-center gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequestForReschedule(m);
                              setRescheduleData({ date: "", reason: "" });
                              setRescheduleModalOpen(true);
                            }}
                          >
                            Reschedule
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 rounded-lg border-[#E5E5EA] text-[#007AFF] hover:bg-blue-50 hover:border-blue-200 font-semibold text-xs flex items-center gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/maintenance/${m.id}`);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Reschedule Modal */}
      <Dialog open={rescheduleModalOpen} onOpenChange={setRescheduleModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request Reschedule</DialogTitle>
            <DialogDescription>
              Please provide a new proposed date and a reason for rescheduling. This will notify the inspector to re-book your appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>New Proposed Date & Time</Label>
              <Input 
                type="datetime-local" 
                value={rescheduleData.date}
                onChange={(e) => setRescheduleData({...rescheduleData, date: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Reason for Rescheduling</Label>
              <Textarea 
                placeholder="e.g., I was called into work unexpectedly..."
                value={rescheduleData.reason}
                onChange={(e) => setRescheduleData({...rescheduleData, reason: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleRescheduleSubmit} 
              disabled={submittingReschedule || !rescheduleData.date || !rescheduleData.reason}
              className="bg-primary text-white"
            >
              {submittingReschedule ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={cancelRequestId !== null}
        onOpenChange={(open) => { if (!open) setCancelRequestId(null); }}
        title="Cancel Maintenance Request"
        description="Are you sure you want to cancel this maintenance request?"
        confirmLabel="Cancel Request"
        confirmVariant="destructive"
        onConfirm={() => { if (cancelRequestId) handleCancelRequest(cancelRequestId); }}
      />
    </div>
    </div>
    </div>
  );
}

