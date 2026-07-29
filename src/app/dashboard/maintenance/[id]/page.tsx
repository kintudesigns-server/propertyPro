"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wrench, Clock, Calendar, CheckCircle2, User, Home, Building, FileText, X, Camera, Building2, AlertCircle, ArrowRight, Star } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { DispatchVendorModal } from "@/components/maintenance/DispatchVendorModal";

export default function MaintenanceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const { data: session } = useSession();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [feedback, setFeedback] = useState<string>("");

  const [grantEntry, setGrantEntry] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH"); // STRIPE, CASH, CHECK
  const [referenceNote, setReferenceNote] = useState("");
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const isTenant = (session?.user as any)?.role === "TENANT";
  const role = (session?.user as any)?.role;
  const isOwnerOrAdmin = role === "OWNER" || role === "SUPERADMIN";

  const fetchTicket = () => {
    setLoading(true);
    fetch(`/api/maintenance?id=${id}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setRequest(data);
          setGrantEntry(data.entryPermission || false);
          if (data.externalVendor) {
            if (data.externalVendor.bankName === "CASH") {
              setPaymentMethod("CASH");
            } else if (data.externalVendor.bankName === "CHECK") {
              setPaymentMethod("CHECK");
            } else if (data.externalVendor.bankName) {
              setPaymentMethod("STRIPE");
            } else {
              setPaymentMethod("CASH");
            }
          }
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const handleUpdateStatus = async (newStatus: string) => {
    setProcessing(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: request.id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(`Request status updated to ${newStatus}`);
      fetchTicket();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[#6E6E73] font-semibold">Loading ticket details...</div>;
  }

  if (!request) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#1D1D1F]">Ticket Not Found</h2>
        <Link href="/dashboard/maintenance">
          <Button variant="outline">Back to Requests</Button>
        </Link>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "EMERGENCY": return "bg-red-100 text-red-700 border-red-200";
      case "HIGH": return "bg-orange-100 text-orange-700 border-orange-200";
      case "MEDIUM": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "LOW": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUBMITTED": return "bg-blue-100 text-blue-700";
      case "ASSIGNED": return "bg-purple-100 text-purple-700";
      case "RESOLVED": return "bg-green-100 text-green-700";
      case "CLOSED": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStepState = (stepIndex: number) => {
    const status = request.status;
    const isPaid = !!request.vendorExpenseTransactionId;

    if (stepIndex === 0) {
      // Submitted
      return { completed: true, active: false };
    }
    if (stepIndex === 1) {
      // Inspected / Diagnosed
      const done = ["DIAGNOSIS_COMPLETE", "AWAITING_APPROVAL", "APPROVED", "REPAIR_SCHEDULED", "IN_PROGRESS", "RESOLVED", "PENDING_TENANT_CONFIRMATION", "CLOSED"].includes(status);
      const acting = ["ASSIGNED", "DIAGNOSIS_SCHEDULED"].includes(status);
      return { completed: done, active: acting && !done };
    }
    if (stepIndex === 2) {
      // Vendor Dispatched & Quote Approved
      return {
        completed: ["REPAIR_SCHEDULED", "IN_PROGRESS", "RESOLVED", "PENDING_TENANT_CONFIRMATION", "CLOSED"].includes(status),
        active: ["AWAITING_APPROVAL", "APPROVED"].includes(status),
      };
    }
    if (stepIndex === 3) {
      // Repair Done / Tenant Confirmation
      return {
        completed: status === "CLOSED",
        active: ["RESOLVED", "PENDING_TENANT_CONFIRMATION"].includes(status),
      };
    }
    if (stepIndex === 4) {
      // Closed & Paid
      return {
        completed: status === "CLOSED" && isPaid,
        active: status === "CLOSED" && !isPaid,
      };
    }
    return { completed: false, active: false };
  };

  const showUnpaidWarning = request.status === "CLOSED" && request.externalVendor && !request.vendorExpenseTransactionId;

  const getTimelineEvents = () => {
    const list: any[] = [];

    // 1. Submitted
    list.push({
      key: "submitted",
      title: "Maintenance Ticket Submitted",
      description: `Reported by ${request.tenant.name} • ${format(new Date(request.createdAt), "PPp")}`,
      type: "primary",
    });

    // 2. Assignment
    if (request.inspector || request.externalVendor) {
      list.push({
        key: "assigned",
        title: request.externalVendor 
          ? `Vendor Dispatched: ${request.externalVendor.name}` 
          : `Inspector Assigned: ${request.inspector.name}`,
        description: "Assigned by Property Owner",
        type: "primary",
      });
    }

    // 3. Scheduling
    if (request.scheduledDate) {
      list.push({
        key: "scheduled",
        title: "On-Site Appointment Scheduled",
        description: (
          <span>
            Scheduled for {format(new Date(request.scheduledDate), "PPp")}
            {request.tenantConfirmedSchedule && <span className="text-emerald-650 ml-1 font-bold">✓ Confirmed by tenant</span>}
          </span>
        ),
        type: "primary",
      });
    }

    // 4a. Inspector Diagnosis Report (informational — no approval)
    if (request.inspectorEstimateLabor != null || request.inspectorEstimateMaterials != null) {
      const refTotal = Number(request.inspectorEstimateLabor || 0) + Number(request.inspectorEstimateMaterials || 0);
      list.push({
        key: "inspector_estimate",
        title: `Inspector Diagnosis Report — ${request.inspector?.name || "Inspector"}`,
        description: `Reference estimate: $${refTotal.toFixed(2)} (Labor: $${Number(request.inspectorEstimateLabor || 0).toFixed(2)} • Materials: $${Number(request.inspectorEstimateMaterials || 0).toFixed(2)}). No approval required.`,
        type: "info",
      });
    }

    // 4b. Vendor Estimate Submitted (requires approval)
    if (request.estimatedLabor || request.estimatedMaterials) {
      const vendorTotal = Number(request.estimatedLabor || 0) + Number(request.estimatedMaterials || 0);
      list.push({
        key: "estimate_submitted",
        title: `Vendor Quote Submitted — ${request.externalVendor?.name || "External Vendor"}`,
        description: `Labor: $${Number(request.estimatedLabor || 0).toFixed(2)} • Materials: $${Number(request.estimatedMaterials || 0).toFixed(2)} • Total: $${vendorTotal.toFixed(2)}`,
        type: "primary",
      });
    }

    // 5. Rejection Note
    if (request.inspectorNotes && request.inspectorNotes.includes("Estimate Rejected")) {
      list.push({
        key: "rejected",
        title: "Vendor Quote Rejected by Owner",
        description: (
          <span className="text-[10px] font-semibold text-rose-600/90 mt-1 italic leading-normal bg-rose-50/50 p-2.5 rounded-lg border border-rose-150 max-w-lg block">
            {request.inspectorNotes.split("\n\nPrevious notes:")[0]}
          </span>
        ),
        type: "danger",
      });
    }

    // 6. Work Approved
    if (request.status !== "AWAITING_APPROVAL" && (request.estimatedLabor || request.estimatedMaterials) && (!request.inspectorNotes || !request.inspectorNotes.includes("Estimate Rejected"))) {
      list.push({
        key: "approved",
        title: "Vendor Quote Approved",
        description: "Owner authorized the repairs and vendor budget.",
        type: "primary",
      });
    }

    // 7. Repair Completed
    if (["RESOLVED", "PENDING_TENANT_CONFIRMATION", "CLOSED"].includes(request.status)) {
      list.push({
        key: "resolved",
        title: "Repairs Resolved & Completed",
        description: `Labor: $${Number(request.finalLabor || 0).toFixed(2)} • Materials: $${Number(request.finalMaterials || 0).toFixed(2)}`,
        type: "success",
      });
    }

    // 8. Closed
    if (request.status === "CLOSED") {
      list.push({
        key: "closed",
        title: "Ticket Finalized & Locked",
        description: request.vendorExpenseTransactionId 
          ? "✓ Payout recorded and settled in ledger." 
          : "Awaiting owner financial payout record.",
        type: "neutral",
      });
    }

    return list;
  };

  const timelineEvents = getTimelineEvents();

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-6 pb-20 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="h-10 w-10 bg-white border border-slate-200/80 rounded-xl flex items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] shadow-xs transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Request Details</h1>
            <p className="text-xs font-bold text-[#8E8E93] mt-0.5">Ticket ID: <span className="font-mono text-[#6E6E73]">{request.id.split("-")[0].toUpperCase()}</span></p>
          </div>
        </div>
        
        {/* Unpaid badge for Owner */}
        {showUnpaidWarning && !isTenant && (
          <span className="px-3.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-150 text-[11px] font-extrabold rounded-xl shadow-xs flex items-center gap-1.5 animate-pulse">
            <AlertCircle className="h-3.5 w-3.5 text-rose-500" /> Vendor Payout Pending
          </span>
        )}
      </div>

      {request.isDuplicateSuspect && (
        <div className="flex items-center gap-3 bg-amber-50/70 border border-amber-200/70 text-amber-850 rounded-2xl px-5 py-4 text-xs font-semibold shadow-xs">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <span>
            This ticket is flagged as a possible duplicate of a recent open request for the same unit and category.
            {request.duplicateOfId && (
              <Link href={`/dashboard/maintenance/${request.duplicateOfId}`} className="underline font-bold ml-1.5 text-indigo-650 hover:text-indigo-800">
                View original ticket →
              </Link>
            )}
          </span>
        </div>
      )}

      {/* Dynamic Progress Stepper */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-6">
        <h3 className="text-[10px] font-black text-[#8E8E93] uppercase tracking-widest flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-indigo-500" /> Ticket Guided Progress
        </h3>
        
        {/* Horizontal Steps */}
        <div className="grid grid-cols-5 gap-2 relative">
          {[
          { label: "Submitted",       desc: "Ticket opened" },
          { label: "Diagnosed",       desc: "Inspector visited" },
          { label: "Quote Approved",  desc: "Vendor authorized" },
          { label: "Repaired",        desc: "Work completed" },
          { label: "Closed & Paid",   desc: "Settled & locked" }
        ].map((step, idx) => {
            const { completed, active } = getStepState(idx);
            
            return (
              <div key={idx} className="flex flex-col items-center text-center relative group">
                {/* Connecting Line */}
                {idx < 4 && (
                  <div className={`absolute top-4 left-1/2 right-[-50%] h-[3px] z-0 transition-colors duration-300 rounded-full ${
                    getStepState(idx + 1).completed || getStepState(idx + 1).active
                      ? "bg-indigo-600"
                      : completed
                        ? "bg-indigo-200"
                        : "bg-[#F2F2F7]"
                  }`} />
                )}
                
                {/* Step Circle */}
                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs relative z-10 transition-all duration-300 border-2 ${
                  completed
                    ? "bg-indigo-650 border-indigo-650 text-white shadow-xs scale-105"
                    : active
                      ? "bg-white border-indigo-600 text-indigo-600 shadow-md ring-4 ring-indigo-50 scale-105 animate-pulse"
                      : "bg-white text-slate-300 border-slate-200"
                }`}>
                  {completed ? "✓" : idx + 1}
                </div>
                
                {/* Labels */}
                <div className="mt-3.5 space-y-0.5">
                  <p className={`text-[11px] font-black transition-colors ${
                    completed || active ? "text-[#1D1D1F]" : "text-[#8E8E93]"
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] font-medium text-[#8E8E93] block md:inline max-w-[90px] mx-auto leading-tight">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current status explanation */}
        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping shrink-0" />
            <p className="text-xs font-semibold text-slate-650">
              <span className="font-extrabold text-slate-800">Current Action:</span>{" "}
              {request.status === "SUBMITTED" && "Awaiting assignment or dispatch."}
              {request.status === "ASSIGNED" && "Inspector assigned. Scheduling diagnosis visit."}
              {request.status === "DIAGNOSIS_SCHEDULED" && "Inspector visit scheduled. Awaiting on-site diagnosis."}
              {request.status === "DIAGNOSIS_COMPLETE" && "Inspector submitted diagnosis report. Dispatch a vendor to proceed with repairs."}
              {request.status === "AWAITING_APPROVAL" && "Vendor submitted quote. Review and approve or reject the estimate."}
              {request.status === "APPROVED" && "Vendor quote approved. Repairs will begin shortly."}
              {request.status === "IN_PROGRESS" && "Work is in progress on site."}
              {(request.status === "RESOLVED" || request.status === "PENDING_TENANT_CONFIRMATION") && "Repairs resolved by vendor. Awaiting tenant satisfaction confirmation."}
              {request.status === "CLOSED" && !request.vendorExpenseTransactionId && "Ticket closed. Awaiting vendor payout settlement."}
              {request.status === "CLOSED" && request.vendorExpenseTransactionId && "Ticket closed, finalized, and vendor payout completed."}
            </p>
          </div>
          {request.status === "AWAITING_APPROVAL" && !isTenant && (
            <span className="text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-200/60 shadow-xs animate-pulse">
              Requires Approval
            </span>
          )}
          {request.status === "CLOSED" && !request.vendorExpenseTransactionId && !isTenant && (
            <span className="text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg border border-rose-200/60 shadow-xs">
              Payout Pending
            </span>
          )}
        </div>
      </div>

      {/* Prominent Vendor Payout Warning Banner */}
      {showUnpaidWarning && !isTenant && (
        <div className="bg-[#FFF8F6] border border-[#FFE2DC] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-rose-950 text-sm">Action Required: Vendor Payout Pending</h4>
              <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                The repair has been completed/closed, but payment has not been recorded for {request.externalVendor.name}. Please disburse or record payout.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowPayoutModal(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-sm shrink-0"
          >
            Pay Vendor Now
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200 overflow-hidden">
            {/* Premium Header Banner */}
            <div className="bg-[#1D1D1F] p-8 text-white border-b border-slate-800 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
              <div className="flex justify-between items-start gap-4 relative z-10">
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-3.5">
                    <span className="px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider bg-white/10 text-slate-200 border border-white/10">
                      {request.category}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border ${
                      request.priority === "EMERGENCY" ? "bg-rose-500/10 text-rose-300 border-rose-500/25" :
                      request.priority === "HIGH" ? "bg-orange-500/10 text-orange-300 border-orange-500/25" :
                      "bg-white/10 text-slate-200 border-white/10"
                    }`}>
                      {request.priority} PRIORITY
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border ${
                      request.status === "CLOSED" ? "bg-slate-500/15 text-slate-300 border-slate-500/20" :
                      ["RESOLVED", "PENDING_TENANT_CONFIRMATION"].includes(request.status) ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" :
                      "bg-indigo-500/15 text-indigo-300 border-indigo-500/20"
                    }`}>
                      {request.status.replace("_", " ")}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight leading-tight">{request.title}</h2>
                </div>
                <div className="h-14 w-14 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
                  <Wrench className="h-7 w-7 text-indigo-400" />
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {request.scheduledDate && !["RESOLVED", "PENDING_TENANT_CONFIRMATION", "CLOSED"].includes(request.status) && (
                <div className={`p-6 rounded-2xl border ${
                  (request.tenantConfirmedSchedule || request.entryPermission)
                    ? 'bg-emerald-50 border-emerald-200' 
                    : request.rescheduleRequested 
                      ? 'bg-rose-50 border-rose-200' 
                      : 'bg-amber-50 border-amber-200'
                } space-y-4`}>
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div className="space-y-1">
                      <p className={`text-[10px] font-black uppercase tracking-wider ${
                        (request.tenantConfirmedSchedule || request.entryPermission)
                          ? 'text-emerald-700' 
                          : request.rescheduleRequested 
                            ? 'text-rose-700' 
                            : 'text-amber-800'
                      }`}>
                        {(request.tenantConfirmedSchedule || request.entryPermission)
                          ? (request.entryPermission ? "✓ Auto-Confirmed (Key Release)" : "✓ Confirmed Appointment")
                          : request.rescheduleRequested 
                            ? "🚨 Reschedule Requested" 
                            : "⚠️ Appointment Scheduled"}
                      </p>
                      <p className="text-base font-bold text-slate-800">
                        {new Date(request.scheduledDate).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                      </p>
                      {request.externalVendor ? (
                        <p className="text-xs font-semibold text-slate-600">
                          Assigned Vendor: <span className="font-bold text-blue-600">{request.externalVendor.name}</span> {request.externalVendor.phone && `(${request.externalVendor.phone})`}
                        </p>
                      ) : request.inspector ? (
                        <p className="text-xs font-semibold text-slate-600">
                          Assigned Inspector: <span className="font-bold text-slate-800">{request.inspector.name}</span> {request.inspector.phone && `(${request.inspector.phone})`}
                        </p>
                      ) : null}
                      {request.entryPermission && (
                        <div className="text-[11px] text-emerald-800 bg-emerald-150/40 p-2.5 rounded-lg border border-emerald-200 mt-2 font-medium leading-relaxed max-w-xl">
                          🔑 <strong>Key Release Active:</strong> You granted permission to enter if not home. The vendor will use the management master key, so you do not need to wait around or manually confirm.
                        </div>
                      )}
                    </div>
                    <div>
                      {(request.tenantConfirmedSchedule || request.entryPermission) ? (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm">
                          {request.entryPermission ? "Auto-Confirmed" : (isTenant ? "Confirmed by you" : "Confirmed by tenant")}
                        </span>
                      ) : request.rescheduleRequested ? (
                        <span className="px-3 py-1 bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm animate-pulse">
                          Reschedule Pending
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm animate-pulse">
                          {isTenant ? "Awaiting your confirmation" : "Awaiting tenant confirmation"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Confirmation button for Tenant */}
                  {isTenant && !request.tenantConfirmedSchedule && !request.entryPermission && (
                    request.rescheduleRequested ? (
                      <div className="pt-3 border-t border-rose-200/60 space-y-2">
                        <p className="text-xs font-semibold text-rose-850 flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 text-rose-600" /> Reschedule Request Submitted
                        </p>
                        <p className="text-xs text-rose-700 leading-normal">
                          You have requested to reschedule this appointment. Reason: <span className="italic font-bold">"{request.rescheduleReason}"</span>. 
                          The vendor/inspector has been notified and will update the slot shortly.
                        </p>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-amber-200/60 space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="grantEntry"
                            checked={grantEntry}
                            onChange={(e) => setGrantEntry(e.target.checked)}
                            className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <label htmlFor="grantEntry" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                            🔑 I won't be home, but I grant entry permission using management master key.
                          </label>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <p className="text-xs font-medium text-amber-800">
                            Please confirm if you will be available at this time or grant key release access.
                          </p>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                              size="sm"
                              onClick={async () => {
                                setProcessing(true);
                                try {
                                  const res = await fetch("/api/maintenance", {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ 
                                      id: request.id, 
                                      tenantConfirmedSchedule: true,
                                      entryPermission: grantEntry
                                    }),
                                  });
                                  if (!res.ok) throw new Error("Failed to confirm appointment");
                                  toast.success("Appointment confirmed! The vendor has been notified.");
                                  fetchTicket();
                                } catch (err: any) {
                                  toast.error(err.message);
                                } finally {
                                  setProcessing(false);
                                }
                              }}
                              disabled={processing}
                              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs h-9 px-4 shadow-sm"
                            >
                              Confirm Appointment
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowRescheduleModal(true)}
                              className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-100/50 font-bold rounded-xl text-xs h-9 px-4"
                            >
                              Request Reschedule
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {/* Reschedule notice for Owner / Admin */}
                  {!isTenant && request.rescheduleRequested && (
                    <div className="pt-3 border-t border-rose-200/60 space-y-2">
                      <p className="text-xs font-semibold text-rose-850 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-rose-600 animate-pulse" /> Reschedule Request Pending
                      </p>
                      <p className="text-xs text-rose-700 leading-normal">
                        The tenant has requested to reschedule this appointment. Reason: <span className="italic font-bold">"{request.rescheduleReason}"</span>. 
                        The vendor/inspector has been notified to pick a new date/time slot.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="">
                <h3 className="text-[11px] font-black text-[#8E8E93] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Issue Description
                </h3>
                <p className="text-[15px] font-medium text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm whitespace-pre-wrap">
                  {request.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5">
                  <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Preferred Schedule
                  </h3>
                  <p className="text-[15px] font-bold text-blue-900 leading-tight">
                    {request.preferredTimes || "No preferred times specified"}
                  </p>
                </div>
                <div className={`${request.entryPermission ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'} border rounded-2xl p-5`}>
                  <h3 className={`text-[11px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 ${request.entryPermission ? 'text-emerald-500' : 'text-rose-400'}`}>
                    <Home className="h-4 w-4" /> Entry Permission
                  </h3>
                  <p className={`text-[15px] font-bold leading-tight ${request.entryPermission ? 'text-emerald-900' : 'text-rose-900'}`}>
                    {request.entryPermission ? "✅ Granted (Can enter if not home)" : "❌ Must be home"}
                  </p>
                </div>
              </div>
              
              {request.photos && request.photos.length > 0 && (
                <div className="pt-4">
                  <h3 className="text-[11px] font-black text-[#8E8E93] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Camera className="h-4 w-4" /> Attached Evidence
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {request.photos.map((photo: string, i: number) => (
                      <a key={i} href={photo} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <img src={photo} alt="Issue photo" className="h-32 w-32 object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {request.diagnosisPhotos && request.diagnosisPhotos.length > 0 && (
                <div className="pt-6 border-t border-slate-100 mt-6">
                  <h3 className="text-[11px] font-black text-[#8E8E93] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Camera className="h-4 w-4 text-blue-500" /> Diagnosis Photos (Before Repair)
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {request.diagnosisPhotos.map((photo: string, i: number) => (
                      <a key={i} href={photo} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <img src={photo} alt="Diagnosis photo" className="h-32 w-32 object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {request.repairPhotos && request.repairPhotos.length > 0 && (
                <div className="pt-6 border-t border-slate-100 mt-6">
                  <h3 className="text-[11px] font-black text-[#8E8E93] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Camera className="h-4 w-4 text-emerald-500" /> Repair Completion Photos (After Repair)
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {request.repairPhotos.map((photo: string, i: number) => (
                      <a key={i} href={photo} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <img src={photo} alt="Repair photo" className="h-32 w-32 object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {request.receiptPhotos && request.receiptPhotos.length > 0 && (
                <div className="pt-6 border-t border-slate-100 mt-6">
                  <h3 className="text-[11px] font-black text-[#8E8E93] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#6E6E73]" /> Material & Parts Receipts
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {request.receiptPhotos.map((photo: string, i: number) => (
                      <a key={i} href={photo} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <img src={photo} alt="Receipt photo" className="h-32 w-32 object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

            {/* Inspector Diagnosis Report Card (informational — no approval needed) */}
            {isOwnerOrAdmin && (request.inspectorEstimateLabor != null || request.inspectorEstimateMaterials != null) && (
              <div className="p-6 bg-teal-50 border-l-4 border-l-teal-500 border border-teal-200 rounded-2xl shadow-xs mt-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-teal-900 flex items-center gap-2">
                      <span className="text-lg">🔍</span> Inspector Diagnosis Report
                    </h3>
                    <p className="text-xs font-semibold text-teal-700 mt-1 leading-normal">
                      Submitted by <strong>{request.inspector?.name || "Inspector"}</strong> · For reference only — no approval required.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-teal-100 text-teal-800 border border-teal-200 text-[9px] font-black uppercase tracking-wider rounded-full shrink-0">
                    Informational
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/60 p-4 rounded-xl border border-teal-100 space-y-1">
                    <p className="text-[10px] text-teal-500 font-extrabold uppercase tracking-wider">Labor Reference</p>
                    <p className="font-black text-base text-slate-800">${Number(request.inspectorEstimateLabor || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white/60 p-4 rounded-xl border border-teal-100 space-y-1">
                    <p className="text-[10px] text-teal-500 font-extrabold uppercase tracking-wider">Materials Reference</p>
                    <p className="font-black text-base text-slate-800">${Number(request.inspectorEstimateMaterials || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-teal-100/50 p-4 rounded-xl border border-teal-200 space-y-1">
                    <p className="text-[10px] text-teal-600 font-extrabold uppercase tracking-wider">Fair Price Reference</p>
                    <p className="font-black text-base text-teal-800">${(Number(request.inspectorEstimateLabor || 0) + Number(request.inspectorEstimateMaterials || 0)).toFixed(2)}</p>
                  </div>
                </div>
                {request.inspectorNotes && !request.inspectorNotes.includes("Estimate Rejected") && (
                  <div className="bg-white/50 rounded-xl border border-teal-100 p-4">
                    <p className="text-[10px] font-black text-teal-500 uppercase tracking-wider mb-1.5">Diagnosis Notes</p>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{request.inspectorNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Dispatch Vendor CTA — shown after inspector completes diagnosis */}
            {isOwnerOrAdmin && request.status === "DIAGNOSIS_COMPLETE" && !request.externalVendorId && (
              <div className="p-6 bg-indigo-50 border border-indigo-200 rounded-2xl shadow-xs mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                    <span className="text-lg">⚡</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-indigo-950 text-sm">Next Step: Dispatch a Vendor</h4>
                    <p className="text-xs text-indigo-700 mt-0.5 leading-relaxed">
                      The inspector has completed their diagnosis. Dispatch an external vendor to perform the actual repair work.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => { const el = document.getElementById('assignment-section'); el?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 rounded-xl shadow-sm shrink-0"
                >
                  Dispatch Vendor →
                </Button>
              </div>
            )}

            {/* Financial Approval Block for Owner — Vendor Quote Only */}
            {isOwnerOrAdmin && request.status === "AWAITING_APPROVAL" && (
              <div className="p-6 bg-white border-l-4 border-l-amber-500 border-slate-200 rounded-2xl shadow-xs mt-6 space-y-5">
                <div>
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    Vendor Quote Requires Approval
                  </h3>
                  <p className="text-xs font-semibold text-slate-450 mt-1 leading-normal">
                    <strong>{request.externalVendor?.name || "The external vendor"}</strong> has submitted a cost quote for your review.
                    {request.inspectorEstimateLabor != null && (
                      <span className="text-[#6E6E73]"> Compare against your inspector's reference estimate below before approving.</span>
                    )}
                  </p>
                </div>

                {/* Comparison: Inspector Reference vs Vendor Quote */}
                {(request.inspectorEstimateLabor != null || request.inspectorEstimateMaterials != null) && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
                    <p className="text-[10px] font-black text-[#8E8E93] uppercase tracking-widest">Cost Comparison</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-teal-50 border border-teal-100 rounded-lg p-3 space-y-1">
                        <p className="text-[9px] font-black text-teal-600 uppercase tracking-wider">🔍 Inspector Reference</p>
                        <p className="font-black text-sm text-teal-900">${(Number(request.inspectorEstimateLabor || 0) + Number(request.inspectorEstimateMaterials || 0)).toFixed(2)}</p>
                        <p className="text-[10px] text-teal-600">by {request.inspector?.name || "Inspector"}</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-1">
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider">💼 Vendor Quote</p>
                        <p className="font-black text-sm text-amber-900">${(Number(request.estimatedLabor || 0) + Number(request.estimatedMaterials || 0)).toFixed(2)}</p>
                        <p className="text-[10px] text-amber-600">by {request.externalVendor?.name || "Vendor"}</p>
                      </div>
                    </div>
                    {(() => {
                      const refTotal = Number(request.inspectorEstimateLabor || 0) + Number(request.inspectorEstimateMaterials || 0);
                      const vendorTotal = Number(request.estimatedLabor || 0) + Number(request.estimatedMaterials || 0);
                      const diff = vendorTotal - refTotal;
                      const pct = refTotal > 0 ? ((diff / refTotal) * 100).toFixed(0) : null;
                      if (diff > 0 && pct) return (
                        <p className="text-[11px] font-bold text-amber-700 flex items-center gap-1.5">
                          <span>⚠️</span> Vendor is quoting <strong>${diff.toFixed(2)} more</strong> ({pct}%) than the inspector's reference estimate.
                        </p>
                      );
                      if (diff < 0) return (
                        <p className="text-[11px] font-bold text-teal-700 flex items-center gap-1.5">
                          <span>✅</span> Vendor quote is <strong>${Math.abs(diff).toFixed(2)} below</strong> the inspector's reference — good value.
                        </p>
                      );
                      return null;
                    })()}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-1">
                    <p className="text-[10px] text-[#8E8E93] font-extrabold uppercase tracking-wider">Labor (Vendor)</p>
                    <p className="font-black text-base text-slate-800">${Number(request.estimatedLabor || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-1">
                    <p className="text-[10px] text-[#8E8E93] font-extrabold uppercase tracking-wider">Materials (Vendor)</p>
                    <p className="font-black text-base text-slate-800">${Number(request.estimatedMaterials || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100 space-y-1">
                    <p className="text-[10px] text-indigo-650 font-extrabold uppercase tracking-wider">Total to Authorize</p>
                    <p className="font-black text-base text-indigo-700">${(Number(request.estimatedLabor || 0) + Number(request.estimatedMaterials || 0)).toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-1.5 flex-wrap">
                  <Button
                    onClick={() => handleUpdateStatus("APPROVED")}
                    disabled={processing}
                    className="flex-1 min-w-[160px] bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl text-xs h-9.5 shadow-sm transition-all"
                  >
                    Approve Work &amp; Budget
                  </Button>
                  <Button
                    variant="outline"
                    disabled={processing}
                    onClick={() => setShowRejectionModal(true)}
                    className="flex-1 min-w-[140px] border-rose-200 text-rose-650 hover:bg-rose-50/50 font-bold rounded-xl text-xs h-9.5 transition-all"
                  >
                    Reject Quote
                  </Button>
                </div>
              </div>
            )}

            {/* Tenant Satisfaction block */}
            {(session?.user as any)?.role === "TENANT" && request.status === "PENDING_TENANT_CONFIRMATION" && (
              <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl mt-6">
                <h3 className="font-bold text-blue-950 mb-2">Confirm Repair Completion</h3>
                <p className="text-sm text-blue-800 mb-4">The inspector/vendor has marked the issue as fixed. Please confirm if everything is resolved to your satisfaction.</p>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#6E6E73] uppercase block mb-1">Rate your experience (1 to 5 stars)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className={`h-8 w-8 rounded-full flex items-center justify-center font-bold border transition-all ${
                            rating === star ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {star}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#6E6E73] uppercase block mb-1">Feedback (Optional)</label>
                    <textarea
                      className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white"
                      placeholder="e.g. Service was polite and clean..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={async () => {
                        setProcessing(true);
                        try {
                          const res = await fetch("/api/maintenance", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              id: request.id,
                              status: "CLOSED",
                              tenantRating: rating,
                              tenantFeedback: feedback
                            }),
                          });
                          if (!res.ok) throw new Error("Failed to close request");
                          fetchTicket();
                        } catch (err: any) {
                          toast.error(err.message);
                        } finally {
                          setProcessing(false);
                        }
                      }}
                      disabled={processing}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      Yes, it's fixed!
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        setProcessing(true);
                        try {
                          const res = await fetch("/api/maintenance", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              id: request.id,
                              status: "ASSIGNED",
                              inspectorNotes: "Tenant reported the issue is still broken."
                            }),
                          });
                          if (!res.ok) throw new Error("Failed to reopen request");
                          fetchTicket();
                        } catch (err: any) {
                          toast.error(err.message);
                        } finally {
                          setProcessing(false);
                        }
                      }}
                      disabled={processing}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      No, it's still broken
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Tenant Review & Feedback */}
            {request.tenantRating !== null && request.tenantRating !== undefined && (
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 mt-6">
                <h3 className="text-xs font-black text-[#8E8E93] uppercase tracking-widest flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> Tenant Feedback &amp; Rating
                </h3>
                
                <div className="flex items-center gap-3">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= (request.tenantRating || 0)
                            ? "text-amber-550 fill-amber-500"
                            : "text-[#EBEBF0]"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-700">({request.tenantRating} / 5)</span>
                </div>

                {request.tenantFeedback ? (
                  <p className="text-xs font-medium text-slate-600 italic bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
                    &ldquo;{request.tenantFeedback}&rdquo;
                  </p>
                ) : (
                  <p className="text-xs text-[#8E8E93] italic">No written feedback was provided by the tenant.</p>
                )}
              </div>
            )}

            {/* Cost & Liability Control — 3-State Smart Panel for Owner */}
            {isOwnerOrAdmin && (request.status === "PENDING_TENANT_CONFIRMATION" || request.status === "CLOSED") && (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl mt-6 space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-600" /> Cost &amp; Liability Control
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <p className="text-xs text-[#6E6E73] uppercase font-bold">Labor Cost</p>
                    <p className="font-black text-lg text-slate-900">${request.finalLabor || request.estimatedLabor || "0.00"}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <p className="text-xs text-[#6E6E73] uppercase font-bold">Materials Cost</p>
                    <p className="font-black text-lg text-slate-900">${request.finalMaterials || request.estimatedMaterials || "0.00"}</p>
                  </div>
                </div>

                {/* ── STATE 1: Wear & Tear — no chargeback allowed ── */}
                {!request.vendorReportedFault && !request.ownerChargebackDecision && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600 text-lg">✅</span>
                      <p className="text-sm font-bold text-emerald-800">Normal Wear &amp; Tear — No Tenant Charge</p>
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      The inspector/vendor confirmed this damage is normal wear and tear. This is the owner&apos;s maintenance responsibility. No charge will be applied to the tenant.
                    </p>
                    <Button
                      size="sm"
                      disabled={processing}
                      onClick={async () => {
                        setProcessing(true);
                        try {
                          const res = await fetch("/api/maintenance", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: request.id, action: "RECORD_LIABILITY_RULING", ruling: "WEAR_AND_TEAR" }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || "Failed");
                          toast.success("Ticket closed. No tenant charge applied.");
                          fetchTicket();
                        } catch (err: any) { toast.error(err.message); }
                        finally { setProcessing(false); }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl"
                    >
                      Confirm &amp; Close Ticket
                    </Button>
                  </div>
                )}

                {/* ── STATE 2: Tenant damage flagged, ruling not made yet ── */}
                {request.vendorReportedFault && !request.ownerChargebackDecision && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-4">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-500 text-lg mt-0.5">⚠️</span>
                      <div>
                        <p className="text-sm font-bold text-amber-900">Liability Ruling Required — Cannot Close Yet</p>
                        <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                          The inspector/vendor suspects <strong>tenant damage or negligence</strong>. As the owner, you must make the final liability ruling before this ticket can be closed.
                        </p>
                      </div>
                    </div>

                    {/* Cost & Deposit Summary */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white rounded-lg p-3 border border-amber-100">
                        <p className="text-[#6E6E73] font-bold uppercase">Repair Cost</p>
                        <p className="text-lg font-black text-slate-900 mt-0.5">
                          ${(Number(request.finalLabor || 0) + Number(request.finalMaterials || 0)).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-amber-100">
                        <p className="text-[#6E6E73] font-bold uppercase">Deposit Balance</p>
                        <p className={`text-lg font-black mt-0.5 ${Number(request.activeLease?.depositBalance || 0) > 0 ? "text-emerald-600" : "text-red-500"}`}>
                          ${Number(request.activeLease?.depositBalance || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {request.activeLease && Number(request.activeLease.depositBalance) > 0 && (
                      <p className="text-[11px] text-amber-700 bg-amber-100 rounded-lg p-2.5 leading-relaxed">
                        💡 If you rule Tenant Fault, ${Math.min(Number(request.activeLease.depositBalance), Number(request.finalLabor || 0) + Number(request.finalMaterials || 0)).toFixed(2)} will be automatically deducted from the tenant&apos;s security deposit.
                        {Number(request.activeLease.depositBalance) < (Number(request.finalLabor || 0) + Number(request.finalMaterials || 0)) && (
                          <> The remaining ${((Number(request.finalLabor || 0) + Number(request.finalMaterials || 0)) - Number(request.activeLease.depositBalance)).toFixed(2)} will become a tenant invoice.</>
                        )}
                      </p>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        disabled={processing}
                        onClick={async () => {
                          if (!confirm("Confirm: Rule this as Tenant's Fault? This will deduct from their security deposit and/or generate an invoice.")) return;
                          setProcessing(true);
                          try {
                            const res = await fetch("/api/maintenance", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: request.id, action: "RECORD_LIABILITY_RULING", ruling: "TENANT_FAULT" }),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || "Failed");
                            toast.success("Ruling recorded. Tenant has been notified and deposit/invoice updated.");
                            fetchTicket();
                          } catch (err: any) { toast.error(err.message); }
                          finally { setProcessing(false); }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9 rounded-xl flex-1"
                      >
                        ✓ This Is Tenant&apos;s Fault
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={processing}
                        onClick={async () => {
                          setProcessing(true);
                          try {
                            const res = await fetch("/api/maintenance", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: request.id, action: "RECORD_LIABILITY_RULING", ruling: "WEAR_AND_TEAR" }),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || "Failed");
                            toast.success("Ruled as Normal Wear & Tear. Ticket closed.");
                            fetchTicket();
                          } catch (err: any) { toast.error(err.message); }
                          finally { setProcessing(false); }
                        }}
                        className="border-amber-300 text-amber-800 hover:bg-amber-100 font-bold text-xs h-9 rounded-xl flex-1"
                      >
                        This Is Normal Wear &amp; Tear
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── STATE 3: Ruling already made — read-only summary ── */}
                {request.ownerChargebackDecision && (
                  <div className={`rounded-xl border p-4 space-y-2 ${request.ownerChargebackDecision === "WEAR_AND_TEAR" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                    {request.ownerChargebackDecision === "WEAR_AND_TEAR" && (
                      <>
                        <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                          <span>✅</span> Ruled: Normal Wear &amp; Tear
                        </p>
                        <p className="text-xs text-emerald-700">Owner absorbed the cost. No charge was applied to the tenant.</p>
                      </>
                    )}
                    {request.ownerChargebackDecision === "TENANT_FAULT" && request.chargebackSource === "DEPOSIT" && (
                      <>
                        <p className="text-xs font-bold text-red-800 flex items-center gap-1.5"><span>🔴</span> Ruled: Tenant Fault</p>
                        <p className="text-xs text-red-700">${Number(request.chargebackDepositAmount || 0).toFixed(2)} was deducted from tenant&apos;s security deposit.</p>
                        <p className="text-[10px] text-red-500 font-mono">Ref: DEPOSIT_DEDUCT_{request.id.slice(-6)}</p>
                      </>
                    )}
                    {request.ownerChargebackDecision === "TENANT_FAULT" && request.chargebackSource === "SPLIT" && (
                      <>
                        <p className="text-xs font-bold text-red-800 flex items-center gap-1.5"><span>🔴</span> Ruled: Tenant Fault (Split)</p>
                        <p className="text-xs text-red-700">${Number(request.chargebackDepositAmount || 0).toFixed(2)} deducted from deposit (exhausted) + ${Number(request.chargebackInvoiceAmount || 0).toFixed(2)} invoice issued.</p>
                        {request.chargebackInvoiceId && (
                          <Link href={`/dashboard/leases`} className="text-[11px] underline font-bold text-red-700">View Invoice →</Link>
                        )}
                      </>
                    )}
                    {request.ownerChargebackDecision === "TENANT_FAULT" && request.chargebackSource === "INVOICE" && (
                      <>
                        <p className="text-xs font-bold text-red-800 flex items-center gap-1.5"><span>🔴</span> Ruled: Tenant Fault</p>
                        <p className="text-xs text-red-700">Invoice of ${Number(request.chargebackInvoiceAmount || 0).toFixed(2)} has been generated and sent to the tenant.</p>
                        {request.chargebackInvoiceId && (
                          <Link href={`/dashboard/leases`} className="text-[11px] underline font-bold text-red-700">View Invoice →</Link>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Vendor Payout Settlement Block */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <p className="text-xs font-bold text-[#6E6E73] uppercase">Vendor Payout Settlement</p>
                  {request.vendorExpenseTransactionId ? (() => {
                    const txRef = request.vendorExpenseTransaction?.reference || "";
                    const parts = txRef.split("_");
                    const methodCode = parts[3] || "";
                    const methodLabel = methodCode === "STRIPE" ? "Direct Deposit (ACH)" : methodCode === "CHECK" ? "Written Check" : methodCode === "CASH" ? "Physical Cash" : "Direct Payout";
                    const memoNote = parts[4] === "REF" ? parts.slice(5).join("_") : "";
                    
                    return (
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                          <span>✓ Payout Completed</span>
                          <span className="font-mono text-[10px] bg-emerald-100 px-2 py-0.5 rounded">
                            Ref: VENDOR_PAY_{request.id.slice(-6)}
                          </span>
                        </div>
                        
                        <div className="bg-white p-3 rounded-lg border border-emerald-100/50 space-y-1.5 font-semibold text-slate-700 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-450">Settlement Method:</span>
                            <span className="text-[#1D1D1F]">{methodLabel}</span>
                          </div>
                          {memoNote && (
                            <div className="flex flex-col gap-0.5 pt-1.5 border-t border-slate-100 mt-1.5">
                              <span className="text-slate-450 block">Payment Memo / Reference:</span>
                              <span className="text-slate-800 font-bold bg-slate-50 p-2 rounded border border-slate-100 italic">
                                &ldquo;{memoNote}&rdquo;
                              </span>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                          This payout is recorded and logged in your accounting ledger.
                        </p>
                        <Link href={`/dashboard/accounting/transactions?search=VENDOR_PAY_${request.id.slice(-6)}`}>
                          <Button variant="outline" size="sm" className="w-full border-emerald-200 text-emerald-850 hover:bg-emerald-100/50 bg-white font-bold rounded-xl text-xs h-9 flex items-center justify-center gap-1.5 shadow-sm">
                            <ArrowRight className="h-3.5 w-3.5" /> View Transaction in Ledger
                          </Button>
                        </Link>
                      </div>
                    );
                  })() : request.status !== "CLOSED" ? (
                    <div className="p-4 bg-amber-50/50 border border-amber-150 text-amber-800 rounded-xl text-xs flex items-start gap-2.5 font-medium leading-relaxed">
                      <span className="text-base leading-none">⚠️</span>
                      <div>
                        <p className="font-bold text-amber-900">Payout Locked</p>
                        <p className="mt-0.5 text-amber-800 font-medium">
                          Awaiting tenant verification or owner liability ruling to close the request before payout can be processed.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-[#6E6E73]">No payment has been recorded for this repair yet. Click below to disburse funds electronically or record offline cash/check settlement.</p>
                      <Button
                        size="sm"
                        onClick={() => setShowPayoutModal(true)}
                        className="bg-slate-900 hover:bg-slate-950 text-white font-bold w-full rounded-xl text-xs h-9 shadow-sm"
                      >
                        💸 Pay Vendor / Record Payout
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Elegant Activity Timeline Card */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-5 mt-6">
              <h3 className="text-[10px] font-black text-[#8E8E93] uppercase tracking-widest flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-indigo-500" /> Ticket Activity History
              </h3>
              
              <div className="relative border-l-2 border-slate-100 ml-3.5 pl-6 space-y-6 py-1">
                {timelineEvents.map((evt, idx) => {
                  const isLatest = idx === timelineEvents.length - 1;
                  
                  // Color theme configs
                  let borderClass = "border-indigo-500";
                  let bgClass = "bg-indigo-600";
                  let textClass = "text-slate-800 font-bold";
                  let bgHighlightClass = "ring-indigo-100";
                  
                  if (evt.type === "danger") {
                    borderClass = "border-rose-500";
                    bgClass = "bg-rose-500";
                    textClass = "text-rose-700 font-bold";
                    bgHighlightClass = "ring-rose-100";
                  } else if (evt.type === "success") {
                    borderClass = "border-emerald-500";
                    bgClass = "bg-emerald-500";
                    textClass = "text-emerald-800 font-bold";
                    bgHighlightClass = "ring-emerald-100";
                  } else if (evt.type === "neutral") {
                    borderClass = "border-slate-400";
                    bgClass = "bg-slate-500";
                    textClass = "text-slate-700 font-bold";
                    bgHighlightClass = "ring-slate-100";
                  }

                  return (
                    <div key={evt.key} className="relative">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 bg-white flex items-center justify-center shadow-xs transition-all duration-300 ${
                        isLatest 
                          ? `${borderClass} ring-4 ${bgHighlightClass} animate-pulse scale-110` 
                          : borderClass
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${bgClass}`} />
                      </span>
                      
                      {/* Content details */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-xs ${isLatest ? "text-slate-900 font-extrabold text-sm" : textClass}`}>
                            {evt.title}
                          </h4>
                          {isLatest && (
                            <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md border ${
                              evt.type === "danger"
                                ? "bg-rose-50 text-rose-700 border-rose-150 animate-pulse"
                                : evt.type === "success"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-150"
                                  : "bg-indigo-50 text-indigo-700 border-indigo-150"
                            }`}>
                              Current State
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-medium text-slate-450 leading-relaxed">
                          {evt.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column - Meta Data */}
          <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-5">
            <h3 className="text-[10px] font-black text-[#8E8E93] uppercase tracking-widest border-b border-slate-100 pb-3.5">Location &amp; Tenant</h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-[#6E6E73]">
                  <Building className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-[#8E8E93] uppercase tracking-wider">Property</p>
                  <p className="font-bold text-slate-800 text-xs mt-0.5 leading-snug">{request.unit.property.name}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-[#6E6E73]">
                  <Home className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-[#8E8E93] uppercase tracking-wider">Unit</p>
                  <p className="font-bold text-slate-800 text-xs mt-0.5 leading-snug">Unit {request.unit.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-50/50 border border-indigo-100/50 flex items-center justify-center shrink-0 text-indigo-500">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wider">Reported By</p>
                  <p className="font-bold text-slate-850 text-xs mt-0.5 leading-snug">{request.tenant.name}</p>
                  <p className="text-[11px] font-medium text-slate-450 mt-0.5">{request.tenant.phone || request.tenant.email}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-5">
            <h3 className="text-[10px] font-black text-[#8E8E93] uppercase tracking-widest border-b border-slate-100 pb-3.5">Assignment Details</h3>
            
            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="flex gap-3">
                <Wrench className="h-4 w-4 text-[#8E8E93] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-black text-[#8E8E93] uppercase tracking-wider mb-1">{request.externalVendor ? "Assigned Vendor" : "Assigned Inspector"}</p>
                  {request.inspector ? (
                    <>
                      <p className="font-bold text-slate-800 text-xs leading-snug">{request.inspector.name}</p>
                      <p className="text-[11px] font-medium text-slate-450 mt-0.5">{request.inspector.phone || "No phone provided"}</p>
                    </>
                  ) : request.externalVendor ? (
                    <>
                      <p className="font-bold text-indigo-650 text-xs leading-snug">{request.externalVendor.name}</p>
                      <p className="text-[11px] font-medium text-slate-450 mt-0.5">{request.externalVendor.phone || "No phone provided"}</p>
                    </>
                  ) : (
                    <p className="font-bold text-[#8E8E93] italic">Unassigned</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <Calendar className="h-4 w-4 text-[#8E8E93] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-black text-[#8E8E93] uppercase tracking-wider mb-1">Created At</p>
                  <p className="font-bold text-slate-800 text-xs">{format(new Date(request.createdAt), "PPp")}</p>
                </div>
              </div>
              {request.scheduledDate && (
                <div className="flex gap-3">
                  <Clock className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wider mb-1">Scheduled For</p>
                    <p className="font-bold text-indigo-950 text-xs">{format(new Date(request.scheduledDate), "PPp")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vendor Dispatch Section for Owner/Inspector */}
          {isOwnerOrAdmin && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-4">
              <h3 className="text-[10px] font-black text-[#8E8E93] uppercase tracking-widest border-b border-slate-100 pb-3.5 flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-indigo-500" /> External Vendor Dispatch
              </h3>

              {request.status === "CLOSED" ? (
                request.externalVendor ? (
                  <div className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl flex justify-between items-center shadow-inner">
                    <div>
                      <p className="text-[9px] font-black text-[#8E8E93] uppercase tracking-wider">Assigned Vendor</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{request.externalVendor.name}</p>
                      <p className="text-[11px] font-medium text-slate-450">{request.externalVendor.email}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-extrabold rounded uppercase tracking-wider">
                      Completed
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-[#8E8E93] italic">No external vendor was assigned to this request.</p>
                )
              ) : (
                <>
                  <p className="text-xs font-semibold text-slate-450 leading-relaxed">Notify an external provider to handle this request. They will receive a secure magic link to submit estimates without needing to log in.</p>
                  
                  <div className="flex gap-2 items-center flex-wrap pt-1">
                    <DispatchVendorModal ticketId={request.id} onDispatched={fetchTicket} isReassign={!!request.externalVendor} />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-[11px] font-bold border-slate-200 text-slate-600 rounded-xl hover:bg-[#F5F5F7] transition-all flex-1 min-w-[140px]"
                      onClick={() => {
                        navigator.clipboard.writeText(typeof window !== "undefined" ? `${window.location.origin}/vendor/ticket/${request.vendorMagicToken || ""}` : "");
                        toast.success("Magic link copied to clipboard!");
                      }}
                    >
                      Copy Link Manually
                    </Button>
                  </div>

                  {request.externalVendor && (
                    <div className="mt-4 p-3.5 bg-indigo-50/20 border border-indigo-100 rounded-xl flex justify-between items-center gap-3 group shadow-xs min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black text-indigo-650 uppercase">Dispatched To</p>
                        <p className="text-xs font-black text-indigo-950 mt-0.5 leading-snug truncate block" title={request.externalVendor.name}>{request.externalVendor.name}</p>
                        <p className="text-[11px] font-semibold text-indigo-700/80 mt-0.5 truncate block" title={request.externalVendor.email}>{request.externalVendor.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[9px] font-black rounded uppercase">Active</span>
                        <button 
                          onClick={async () => {
                            if (!confirm("Are you sure you want to cancel the dispatch for this vendor?")) return;
                            setProcessing(true);
                            try {
                              const res = await fetch("/api/maintenance", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: request.id, externalVendorId: null, status: "SUBMITTED" }),
                              });
                              if (!res.ok) throw new Error("Failed to remove vendor");
                              toast.success("Vendor dispatch cancelled");
                              fetchTicket();
                            } catch (err: any) {
                              toast.error(err.message);
                            } finally {
                              setProcessing(false);
                            }
                          }}
                          className="text-red-500 hover:text-red-750 hover:bg-red-50 h-7 w-7 flex items-center justify-center rounded-lg border border-red-200 bg-white transition-colors"
                          title="Cancel Dispatch"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-base">Request Reschedule</h3>
              <button onClick={() => setShowRescheduleModal(false)} className="text-[#8E8E93] hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-[#6E6E73]">
              Please provide your reason and list some alternative times/days you will be available for the visit.
            </p>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-[#6E6E73] block">Reason & Availability</label>
              <textarea
                className="w-full text-sm border border-slate-200 rounded-xl p-3 bg-white min-h-[100px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="e.g. I am not available on Wednesday. Please schedule for Friday afternoon instead..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setShowRescheduleModal(false)}
                className="rounded-xl text-xs h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!rescheduleReason.trim()) {
                    toast.error("Please enter a reason or availability preference.");
                    return;
                  }
                  setProcessing(true);
                  try {
                    const res = await fetch("/api/maintenance", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ 
                        id: request.id, 
                        rescheduleRequested: true,
                        rescheduleReason: rescheduleReason
                      }),
                    });
                    if (!res.ok) throw new Error("Failed to request reschedule");
                    toast.success("Reschedule request submitted to vendor!");
                    setShowRescheduleModal(false);
                    setRescheduleReason("");
                    fetchTicket();
                  } catch (err: any) {
                    toast.error(err.message);
                  } finally {
                    setProcessing(false);
                  }
                }}
                disabled={processing}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs h-9 px-4"
              >
                Submit Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-base">Disburse Vendor Payout</h3>
              <button onClick={() => setShowPayoutModal(false)} className="text-[#8E8E93] hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-indigo-500" /> Vendor Bank Account Details
              </h4>
              {request.externalVendor?.bankName ? (
                request.externalVendor.bankName === "CASH" ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-800 font-semibold flex items-center gap-2">
                    <span>💵 Vendor Payout Preference: <strong>CASH (Pay vendor physically)</strong></span>
                  </div>
                ) : request.externalVendor.bankName === "CHECK" ? (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 font-semibold flex items-center gap-2">
                    <span>✉️ Vendor Payout Preference: <strong>PAPER CHECK (Offline check payout)</strong></span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-800 font-semibold flex items-center gap-2">
                      <span>🏦 Vendor Payout Preference: <strong>DIRECT DEPOSIT (ACH Payout)</strong></span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-xs pt-2 border-t border-slate-200/50">
                      <div>
                        <span className="text-slate-450 block uppercase font-bold text-[9px]">Vendor Name</span>
                        <span className="font-semibold text-slate-800 block truncate">{request.externalVendor.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-450 block uppercase font-bold text-[9px]">Bank Name</span>
                        <span className="font-semibold text-slate-800 block truncate">{request.externalVendor.bankName}</span>
                      </div>
                      <div>
                        <span className="text-slate-450 block uppercase font-bold text-[9px]">Routing Number</span>
                        <span className="font-mono font-semibold text-slate-800 block break-all">{request.externalVendor.routingNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-450 block uppercase font-bold text-[9px]">Account Number</span>
                        <span className="font-mono font-semibold text-slate-800 block break-all">{request.externalVendor.accountNumber}</span>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <p className="text-xs text-rose-600 font-semibold italic">⚠️ The vendor has not supplied payout details yet. Physical cash/check payout is recommended.</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-[#6E6E73] block">Select Payout Method</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("STRIPE")}
                  disabled={!request.externalVendor?.bankName || request.externalVendor.bankName === "CASH" || request.externalVendor.bankName === "CHECK"}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition ${
                    (!request.externalVendor?.bankName || request.externalVendor.bankName === "CASH" || request.externalVendor.bankName === "CHECK")
                      ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-100" 
                      : paymentMethod === "STRIPE"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                  }`}
                >
                  <span className="text-xs font-bold block">Direct Deposit</span>
                  <span className="text-[9px] text-[#8E8E93]">Electronic ACH</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition ${
                    paymentMethod === "CASH"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                  }`}
                >
                  <span className="text-xs font-bold block">Physical Cash</span>
                  <span className="text-[9px] text-[#8E8E93]">Handled Offline</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("CHECK")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition ${
                    paymentMethod === "CHECK"
                      ? "border-amber-600 bg-amber-50 text-amber-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                  }`}
                >
                  <span className="text-xs font-bold block">Written Check</span>
                  <span className="text-[9px] text-[#8E8E93]">Handled Offline</span>
                </button>
              </div>
            </div>

            {/* Payment Method Explanatory Note */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed font-semibold">
              {paymentMethod === "STRIPE" && (
                <p>
                  ℹ️ <strong>Ledger Logging (ACH)</strong>: Recording this payout creates a completed transaction in your accounting ledger and sends an email notification to the vendor. Please ensure you make the actual transfer to their bank account listed above (via Zelle or online banking).
                </p>
              )}
              {paymentMethod === "CASH" && (
                <p>
                  ℹ️ <strong>Ledger Logging (Cash)</strong>: Recording this payout marks the maintenance expense as paid in cash. Please ensure you physically hand over the cash amount to the vendor.
                </p>
              )}
              {paymentMethod === "CHECK" && (
                <p>
                  ℹ️ <strong>Ledger Logging (Paper Check)</strong>: Recording this payout registers the check expense. Make sure you hand over or mail the check to the vendor.
                </p>
              )}
            </div>

            {/* Reference Memo / Note Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-[#6E6E73] block">
                Reference / Memo (Optional)
              </label>
              <Input
                type="text"
                placeholder={
                  paymentMethod === "STRIPE" 
                    ? "e.g., Zelle transfer ID, ACH Ref #" 
                    : paymentMethod === "CHECK" 
                      ? "e.g., Check #1043" 
                      : "e.g., Handed to technician, cash receipt note"
                }
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                className="bg-white border-slate-200 rounded-xl text-xs h-9"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#8E8E93] block">Amount to Disburse</span>
                <span className="text-lg font-black text-slate-900">
                  ${(Number(request.finalLabor || 0) + Number(request.finalMaterials || 0)).toFixed(2)}
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPayoutModal(false);
                    setReferenceNote("");
                  }}
                  className="rounded-xl text-xs h-9 px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setProcessing(true);
                    try {
                      const res = await fetch("/api/maintenance", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          id: request.id, 
                          action: "PAY_VENDOR",
                          paymentMethod: paymentMethod,
                          referenceNote: referenceNote
                        }),
                      });
                      if (!res.ok) throw new Error("Payout transaction failed");
                      toast.success(`Payout successfully recorded via ${paymentMethod === "STRIPE" ? "Direct Deposit" : paymentMethod}!`);
                      setShowPayoutModal(false);
                      setReferenceNote("");
                      fetchTicket();
                    } catch (err: any) {
                      toast.error(err.message);
                    } finally {
                      setProcessing(false);
                    }
                  }}
                  disabled={processing}
                  className="bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl text-xs h-9 px-4"
                >
                  Confirm Payout
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRejectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-base">Reject Estimate</h3>
              <button 
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionReason("");
                }} 
                className="text-[#8E8E93] hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-xs text-[#6E6E73]">
              Please provide feedback or a reason for rejecting this estimate. This feedback will be sent directly to the vendor/inspector to help them submit a revised quote.
            </p>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-[#6E6E73] block">Rejection Reason / Feedback</label>
              <textarea
                className="w-full text-sm border border-slate-200 rounded-xl p-3 bg-white min-h-[100px] focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="e.g., The labor rate is too high. Please check if you can revise the estimated hours..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionReason("");
                }}
                className="rounded-xl text-xs h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!rejectionReason.trim()) {
                    toast.error("Please enter a reason for rejecting the estimate.");
                    return;
                  }
                  setProcessing(true);
                  try {
                    const res = await fetch("/api/maintenance", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ 
                        id: request.id, 
                        action: "REJECT_ESTIMATE",
                        rejectionReason: rejectionReason
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Failed to reject estimate");
                    toast.success("Estimate rejected. Vendor/inspector has been notified.");
                    setShowRejectionModal(false);
                    setRejectionReason("");
                    fetchTicket();
                  } catch (err: any) {
                    toast.error(err.message);
                  } finally {
                    setProcessing(false);
                  }
                }}
                disabled={processing}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs h-9 px-4"
              >
                Submit Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
