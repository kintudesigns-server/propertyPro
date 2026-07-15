"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Trash2, ShieldAlert, CheckCircle2, FileDown, AlertTriangle, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { generateDispositionPDF } from "@/lib/pdfGenerator";
import { UnmaskAccountNumber } from "@/components/UnmaskAccountNumber";
import { BypassConfirmationModal } from "@/components/modals/BypassConfirmationModal";

const DEDUCTION_CATEGORIES = [
  { value: "DAMAGE", label: "Property Damage" },
  { value: "CLEANING", label: "Cleaning" },
  { value: "UNPAID_RENT", label: "Unpaid Rent" },
  { value: "UNPAID_FEE", label: "Unpaid Fee" },
  { value: "OTHER", label: "Other" },
];

const CATEGORY_COLORS: Record<string, string> = {
  DAMAGE: "bg-red-50 text-red-700 border-red-200",
  CLEANING: "bg-amber-50 text-amber-700 border-amber-200",
  UNPAID_RENT: "bg-orange-50 text-orange-700 border-orange-200",
  UNPAID_FEE: "bg-purple-50 text-purple-700 border-purple-200",
  OTHER: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function FinalStatementPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: session, status } = useSession();

  const steps = [
    { label: "Request", desc: "Notice Given" },
    { label: "Scheduled", desc: "Inspection Set" },
    { label: "Reviewing", desc: "Owner Review" },
    { label: "Reviewing", desc: "Tenant Review" },
    { label: "Settlement", desc: "Ready to Pay" },
    { label: "Closed", desc: "Lease Ended" }
  ];

  const getActiveStepIndex = (moveOutStatus: string, isTerminated: boolean) => {
    if (isTerminated) return 5;
    if (["TENANT_ACCEPTED", "DISPUTE_FINALIZED"].includes(moveOutStatus)) return 4;
    if (moveOutStatus === "INSPECTION_COMPLETED") return 3;
    if (moveOutStatus === "OWNER_REVIEWING") return 2;
    if (moveOutStatus === "INSPECTION_SCHEDULED") return 1;
    return 0;
  };

  const [lease, setLease] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [refundRef, setRefundRef] = useState("");
  const [showBypassModal, setShowBypassModal] = useState(false);
  const [refundMethodOverride, setRefundMethodOverride] = useState<string | null>(null);

  // Dispute & Custom deduction addition states
  const [disputeResponseText, setDisputeResponseText] = useState("");
  const [customDeductionDesc, setCustomDeductionDesc] = useState("");
  const [customDeductionAmount, setCustomDeductionAmount] = useState("");
  const [customDeductionCat, setCustomDeductionCat] = useState("DAMAGE");

  type DeductionItem = { amount: string; description: string; category: string; photoUrl: string; invoiceId?: string };
  const [deductions, setDeductions] = useState<DeductionItem[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated") fetchLease();
  }, [status]);

  const fetchLease = async () => {
    try {
      const res = await fetch(`/api/leases/${id}`);
      if (!res.ok) throw new Error("Failed to load lease");
      const data = await res.json();
      setLease(data);

      let initialDeductions = data.deductions || [];
      // Auto-inject unpaid invoices
      if (data.status !== "TERMINATED" && data.invoices) {
        const unpaid = data.invoices.filter((inv: any) => inv.status === "UNPAID" || inv.status === "OVERDUE");
        unpaid.forEach((inv: any) => {
          const desc = `Unpaid Invoice: ${inv.invoiceType || "Rent"}`;
          if (!initialDeductions.find((d: any) => d.description === desc)) {
            initialDeductions.push({
              amount: inv.amount.toString(),
              description: desc,
              category: inv.invoiceType === "EARLY_TERMINATION" ? "UNPAID_FEE" : "UNPAID_RENT",
              photoUrl: "",
              invoiceId: inv.id,
            });
          }
        });
      }
      setDeductions(initialDeductions);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };



  const handleBypassWalkthrough = async () => {
    if (!confirm("Are you sure you want to bypass the walkthrough inspection? You will be settling the deposit without an official inspection report.")) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/leases/${id}/bypass-inspection`, {
        method: "POST"
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to bypass walkthrough");
      }
      toast.success("Walkthrough bypassed successfully.");
      fetchLease();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitDisposition = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/leases/${id}/submit-disposition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deductions, inspectionNotes: lease?.inspectionNotes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit statement");
      }
      toast.success("Final disposition statement sent to tenant for review.");
      fetchLease();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleResolveDispute = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/leases/${id}/dispute-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: disputeResponseText }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to respond to dispute");
      }
      toast.success("Dispute responded to and resolved.");
      setDisputeResponseText("");
      fetchLease();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveDeductions = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/leases/${id}/revise-deductions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deductions, inspectionNotes: lease?.inspectionNotes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to revise deductions");
      }
      toast.success("Deductions updated and sent to tenant.");
      fetchLease();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleAddEarlyTerminationFee = () => {
    const fee = Number(lease?.earlyTerminationFee || 0);
    if (fee <= 0) { toast.error("No Early Termination Fee set on this lease."); return; }
    setDeductions([...deductions, { amount: fee.toString(), description: "Early Termination Fee", category: "UNPAID_FEE", photoUrl: "" }]);
  };



  const handleFinalizeMoveOut = async () => {
    setProcessing(true);
    try {
      const effectiveMethod = refundMethodOverride || lease?.refundMethod || "OFFLINE";
      const res = await fetch(`/api/leases/${id}/move-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deductions, refundMethod: effectiveMethod, refundRef }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process move out");
      }
      toast.success("Lease terminated. Final Statement generated.");
      fetchLease();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-slate-400 font-bold text-sm">Loading...</p>
      </div>
    );
  }

  if (!lease) return <div className="p-8 text-center text-slate-500">Lease not found.</div>;

  const isShortNotice = lease.isShortNotice;
  const originalDeposit = Number(lease.securityDeposit || 0);
  const totalDeducted = deductions.reduce((sum, d) => sum + Number(d.amount), 0);
  const netBalance = originalDeposit - totalDeducted;
  const isExcess = netBalance < 0;
  const refundAmount = Math.max(0, netBalance);
  const isTerminated = lease.status === "TERMINATED";

  // Date and Key Handover Guard
  const moveOutDatePassed = lease.moveOutDate ? new Date() >= new Date(lease.moveOutDate) : false;
  const keysReturned = lease.actualMoveOutDate != null;
  const isDateOrKeyGated = !moveOutDatePassed && !keysReturned;

  // Walkthrough Status
  const walkthroughCompleted = !["NONE", "MOVE_OUT_REQUESTED", "INSPECTION_SCHEDULED"].includes(lease.moveOutStatus);

  // Can finalize requires walkthrough completed, lease not already terminated, and not date/key gated
  const canFinalize = walkthroughCompleted && !isTerminated && !isDateOrKeyGated;

  const getRemainingTimeText = () => {
    if (!lease.inspectionDate) return "Awaiting tenant signature";
    const submitDate = new Date(lease.inspectionDate);
    const deadline = new Date(submitDate.getTime() + 72 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    if (diffMs <= 0) return "Auto-acceptance window has closed. You can force-finalize.";
    const hours = Math.ceil(diffMs / (1000 * 60 * 60));
    return `Awaiting tenant signature (${hours} hours remaining for auto-acceptance)`;
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href={`/dashboard/leases/${id}`}>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-slate-200">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Final Disposition Statement</h1>
          <p className="text-slate-500 font-semibold mt-1">Unit {lease.unit?.name} • Tenant: {lease.tenant?.name}</p>
        </div>
      </div>

      {/* Visual Step Progress Tracker */}
      <Card className="rounded-[24px] shadow-sm border-[#E2E8F0] p-6 bg-white overflow-hidden">
        <div className="relative flex items-center justify-between w-full">
          {/* Connector Line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-100 -z-10 rounded-full" />
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 -z-10 rounded-full transition-all duration-500" 
            style={{ width: `${(getActiveStepIndex(lease.moveOutStatus, isTerminated) / 5) * 100}%` }}
          />

          {steps.map((st, idx) => {
            const activeIdx = getActiveStepIndex(lease.moveOutStatus, isTerminated);
            const isCompleted = idx < activeIdx;
            const isActive = idx === activeIdx;
            
            return (
              <div key={idx} className="flex flex-col items-center gap-2 relative z-10 bg-white px-2">
                <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all ${
                  isCompleted ? "bg-blue-600 border-blue-600 text-white shadow-sm" :
                  isActive ? "bg-white border-blue-600 text-blue-600 shadow-md scale-110" :
                  "bg-white border-slate-200 text-slate-400"
                }`}>
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <div className="text-center hidden md:block">
                  <p className={`text-[10px] font-black uppercase tracking-wider ${isActive ? "text-blue-600" : "text-slate-500"}`}>{st.label}</p>
                  <p className="text-[9px] text-slate-400 font-semibold">{st.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── YOUR NEXT ACTION BANNER ── */}
      {!isTerminated && (() => {
        const daysLeft = lease.depositDueBy
          ? Math.ceil((new Date(lease.depositDueBy).getTime() - Date.now()) / 86400000)
          : null;
        const overdue = daysLeft !== null && daysLeft <= 0;
        const urgent = daysLeft !== null && daysLeft <= 5 && !overdue;

        let actionTitle = "";
        let actionDesc = "";
        let actionBg = "bg-blue-50 border-blue-200";
        let actionColor = "text-blue-900";
        let actionDescColor = "text-blue-700";
        let primaryBtn: React.ReactNode = null;
        let secondaryBtn: React.ReactNode = null;

        if (!walkthroughCompleted) {
          actionTitle = "⚡ Go back and complete the inspection first";
          actionDesc = "This page is in preview mode. Go back to the lease page and either self-inspect or assign a professional inspector. You can also bypass the walkthrough below if necessary.";
          actionBg = "bg-yellow-50 border-yellow-200";
          actionColor = "text-yellow-900";
          actionDescColor = "text-yellow-700";
          secondaryBtn = (
            <button
              onClick={() => setShowBypassModal(true)}
              disabled={processing}
              className="text-xs font-bold text-yellow-700 underline hover:text-yellow-900 mt-2 self-start"
            >
              Skip inspection and proceed anyway →
            </button>
          );
        } else if (lease.moveOutStatus === "OWNER_REVIEWING") {
          actionTitle = "👇 Set amounts for each deduction below, then send to tenant";
          actionDesc = `Inspection is complete. ${deductions.filter(d => Number(d.amount) === 0).length} item(s) still have $0 — set the correct amounts and hit "Submit Statement."` ;
          actionBg = "bg-indigo-50 border-indigo-200";
          actionColor = "text-indigo-900";
          actionDescColor = "text-indigo-700";
        } else if (lease.moveOutStatus === "TENANT_DISPUTED") {
          actionTitle = "🔴 Tenant disputed the charges — review and respond";
          actionDesc = lease.tenantDisputeNote ? `Tenant's reason: "${lease.tenantDisputeNote}"` : "Tenant has filed a dispute. Revise the amounts or send a response.";
          actionBg = "bg-red-50 border-red-200";
          actionColor = "text-red-900";
          actionDescColor = "text-red-700";
        } else if (lease.moveOutStatus === "INSPECTION_COMPLETED") {
          actionTitle = "⏳ Waiting for tenant to accept the statement";
          actionDesc = getRemainingTimeText();
          actionBg = "bg-slate-50 border-slate-200";
          actionColor = "text-slate-900";
          actionDescColor = "text-slate-600";
        } else if (["TENANT_ACCEPTED", "DISPUTE_FINALIZED"].includes(lease.moveOutStatus)) {
          actionTitle = "✅ Tenant accepted — finalize the refund below";
          actionDesc = `Refund amount: $${refundAmount.toFixed(2)}. Choose the refund method and click Finalize.`;
          actionBg = "bg-emerald-50 border-emerald-200";
          actionColor = "text-emerald-900";
          actionDescColor = "text-emerald-700";
        }

        if (!actionTitle) return null;

        return (
          <Card className={`rounded-[20px] shadow-sm border ${actionBg} ${overdue || urgent ? "ring-2 ring-red-400" : ""}`}>
            <div className="px-5 py-4">
              <h3 className={`font-black text-sm leading-snug ${actionColor}`}>{actionTitle}</h3>
              <p className={`text-xs font-semibold mt-1 leading-relaxed ${actionDescColor}`}>{actionDesc}</p>
              {secondaryBtn}
              {(overdue || urgent) && daysLeft !== null && (
                <div className={`inline-flex items-center gap-1.5 mt-2 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${overdue ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-900"}`}>
                  <Clock className="h-3 w-3" />
                  {overdue ? "Deposit overdue — legal risk!" : `${daysLeft} days until deposit deadline`}
                </div>
              )}
            </div>
          </Card>
        );
      })()}

      {/* Three-Column Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[24px] shadow-sm border-[#E2E8F0] p-5 bg-white flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Status</p>
            <h3 className="text-base font-black text-slate-900 mt-2">
              {isTerminated ? "Lease Closed" :
               lease.moveOutStatus === "MOVE_OUT_REQUESTED" ? "Move-Out Requested" :
               lease.moveOutStatus === "INSPECTION_SCHEDULED" ? "Inspection Scheduled" :
               lease.moveOutStatus === "OWNER_REVIEWING" ? "Owner Review Phase" :
               lease.moveOutStatus === "INSPECTION_COMPLETED" ? "Awaiting Tenant Review" :
               lease.moveOutStatus === "TENANT_ACCEPTED" ? "Statement Accepted" :
               lease.moveOutStatus === "TENANT_DISPUTED" ? "Statement Disputed" :
               lease.moveOutStatus === "DISPUTE_FINALIZED" ? "Dispute Finalized" :
               lease.moveOutStatus?.replace(/_/g, " ")}
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-4">
            {isTerminated ? "The lease has been terminated and deposit settled." :
             lease.moveOutStatus === "MOVE_OUT_REQUESTED" ? "Awaiting walkthrough scheduling or bypass option." :
             lease.moveOutStatus === "INSPECTION_SCHEDULED" ? "Walkthrough is scheduled. Awaiting inspector submission." :
             lease.moveOutStatus === "OWNER_REVIEWING" ? "Inspection done. Review findings and assign final dollar deductions." :
             lease.moveOutStatus === "INSPECTION_COMPLETED" ? "Pricing complete. Tenant is reviewing the charges." :
             lease.moveOutStatus === "TENANT_ACCEPTED" ? "Tenant accepted. Confirm key return and process payment." :
             lease.moveOutStatus === "TENANT_DISPUTED" ? "Tenant disputed. Resolve dispute or submit revised prices." :
             lease.moveOutStatus === "DISPUTE_FINALIZED" ? "Dispute resolved. You can now finalize the refund." :
             "Active move-out lifecycle stage."}
          </p>
        </Card>

        <Card className="rounded-[24px] shadow-sm border-[#E2E8F0] p-5 bg-white flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Deposit Summary</p>
            <div className="space-y-2 mt-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Security Deposit:</span>
                <span className="font-bold text-slate-900">${originalDeposit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-500">Total Deductions:</span>
                <span className="font-bold text-red-500">-${totalDeducted.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1">
                <span className="font-black text-slate-800">{isExcess ? "Balance Owed:" : "Estimated Refund:"}</span>
                <span className={`font-black text-base ${isExcess ? "text-red-500" : "text-emerald-600"}`}>
                  ${isExcess ? Math.abs(netBalance).toFixed(2) : refundAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-[24px] shadow-sm border-[#E2E8F0] p-5 bg-white flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Timeline & Deadlines</p>
            <div className="space-y-2 mt-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500">Move-Out Date:</span>
                <span className="font-bold text-slate-900">
                  {lease.moveOutDate ? new Date(lease.moveOutDate).toLocaleDateString() : "Pending"}
                </span>
              </div>
              {lease.depositDueBy && (
                <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                  <span className="font-semibold text-slate-500">Deposit Deadline:</span>
                  <span className="font-bold text-slate-950">
                    {new Date(lease.depositDueBy).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          {lease.depositDueBy && !isTerminated && (
            <div className={`mt-3 p-2 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-wider text-center ${
              (() => {
                const daysLeft = Math.ceil((new Date(lease.depositDueBy).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return daysLeft <= 5 ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100";
              })()
            }`}>
              {(() => {
                const daysLeft = Math.ceil((new Date(lease.depositDueBy).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return daysLeft <= 0 ? "Refund Overdue!" : `${daysLeft} days until deadline`;
              })()}
            </div>
          )}
        </Card>
      </div>

      {/* Legal deadline compliance info — only show when not yet terminated, collapsed into deposit summary card */}


      {/* Completed State */}
      {isTerminated && (
        <Card className={`rounded-[24px] shadow-sm overflow-hidden ${lease.tenantDisputeNote ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
          <div className="p-6 flex flex-col md:flex-row items-center gap-6">
            <div className={`h-20 w-20 rounded-full flex items-center justify-center shrink-0 ${lease.tenantDisputeNote ? "bg-amber-100" : "bg-emerald-100"}`}>
              {lease.tenantDisputeNote
                ? <ShieldAlert className="h-10 w-10 text-amber-600" />
                : <CheckCircle2 className="h-10 w-10 text-emerald-600" />}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h2 className={`text-xl font-black ${lease.tenantDisputeNote ? "text-amber-900" : "text-emerald-900"}`}>
                  {lease.tenantDisputeNote ? "⚠️ Dispute Recorded" : "Lease Officially Terminated"}
                </h2>
                <p className={`font-medium mt-1.5 leading-relaxed text-sm ${lease.tenantDisputeNote ? "text-amber-700" : "text-emerald-700"}`}>
                  {lease.tenantDisputeNote
                    ? `The tenant disputed the deductions. Note: "${lease.tenantDisputeNote}"`
                    : `A refund of $${refundAmount.toFixed(2)} has been issued via ${
                        lease.refundMethod === "ORIGINAL" ? "original payment method" :
                        lease.refundMethod === "CHECK" ? "mailed check" : "bank transfer"
                      }.`}
                </p>
              </div>
              {lease.forwardingAddress && lease.refundMethod === "CHECK" && (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>Forwarding Address: <strong>{lease.forwardingAddress}</strong></span>
                </div>
              )}
              <Button onClick={() => generateDispositionPDF(lease)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-5 rounded-xl text-sm">
                <FileDown className="h-4 w-4 mr-2" /> Download Disposition PDF
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tenant Info Card */}
      <Card className="rounded-[24px] shadow-sm border-[#E2E8F0]">
        <CardHeader className="border-b border-[#F1F5F9] pb-5">
          <CardTitle>Tenant & Move-Out Information</CardTitle>
          <CardDescription>Verify these details before finalizing the disposition.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Planned Move-Out Date</Label>
            <div className="font-black text-slate-900 mt-1">{lease.moveOutDate ? new Date(lease.moveOutDate).toLocaleDateString() : "N/A"}</div>
            {isShortNotice && (
              <div className="text-amber-600 text-[10px] font-bold mt-2 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> Short Notice (&lt;{lease.moveOutNoticeDays} days)
              </div>
            )}
          </div>
          {lease.actualMoveOutDate && (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <Label className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Actual Move-Out (Keys Returned)</Label>
              <div className="font-black text-emerald-900 mt-1">{new Date(lease.actualMoveOutDate).toLocaleDateString()}</div>
              {lease.depositDueBy && (
                <div className="text-xs text-emerald-700 font-semibold mt-1">
                  Deposit Due By: <strong>{new Date(lease.depositDueBy).toLocaleDateString()}</strong>
                </div>
              )}
            </div>
          )}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Reason</Label>
            <div className="font-bold text-slate-900 mt-1">{lease.moveOutReason || "Not provided"}</div>
          </div>
          <div className={`p-4 bg-slate-50 rounded-xl border border-slate-100 ${lease.refundMethod === "BANK_TRANSFER" ? "md:col-span-2" : ""}`}>
            <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Requested Refund Method</Label>
            <div className="font-bold text-slate-900 mt-1">
              {lease.refundMethod === "ORIGINAL" ? "Original Payment Method" :
               lease.refundMethod === "CHECK" ? "Mailed Check" :
               lease.refundMethod === "BANK_TRANSFER" ? "Direct Bank Transfer" :
               lease.refundMethod || "Not specified"}
            </div>
            {lease.refundMethod === "BANK_TRANSFER" && (
              <div className="mt-3 bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bank Name</p>
                  <p className="text-sm font-semibold text-slate-800">{lease.refundBankName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Account Holder</p>
                  <p className="text-sm font-semibold text-slate-800">{lease.refundAccountName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Account Number</p>
                  <UnmaskAccountNumber apiUrl={`/api/leases/${lease.id}/unmask-refund`} maskedNumber={"••••••••"} />
                </div>
              </div>
            )}
          </div>

          {/* Tenant Acknowledgements */}
          {(lease.utilitiesAcknowledgedAt || lease.cleaningAcknowledgedAt) && (
            <div className="md:col-span-2 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <Label className="text-xs text-blue-700 font-bold uppercase tracking-wider mb-2 block">Tenant Acknowledgements</Label>
              <div className="flex flex-wrap gap-3">
                {lease.utilitiesAcknowledgedAt && (
                  <span className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    Utilities confirmed {new Date(lease.utilitiesAcknowledgedAt).toLocaleDateString()}
                  </span>
                )}
                {lease.cleaningAcknowledgedAt && (
                  <span className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    Cleaning standards confirmed {new Date(lease.cleaningAcknowledgedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Walkthrough Inspection Reports Card */}
      {(walkthroughCompleted || lease.preliminaryInspectionStatus === "COMPLETED") && (
        <Card className="rounded-[24px] shadow-sm border-[#E2E8F0] overflow-hidden">
          <CardHeader className="border-b border-[#F1F5F9] pb-5 bg-slate-50">
            <CardTitle>Walkthrough Inspection Reports & Sign-Offs</CardTitle>
            <CardDescription>Legal sign-offs and findings logged by the inspector.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Preliminary Walkthrough */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1 flex justify-between">
                  <span>Preliminary Walkthrough</span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                    lease.preliminaryInspectionStatus === "COMPLETED" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}>
                    {lease.preliminaryInspectionStatus === "COMPLETED" ? "COMPLETED" : "NOT COMPLETED"}
                  </span>
                </h4>
                {lease.preliminaryInspectionStatus === "COMPLETED" ? (
                  <div className="space-y-2 text-xs">
                    <p className="text-slate-600"><strong>Date:</strong> {new Date(lease.preliminaryInspectionDate).toLocaleString()}</p>
                    {lease.preliminaryInspectorSignedAt && (
                      <p className="text-emerald-600 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Signed off by Inspector: {new Date(lease.preliminaryInspectorSignedAt).toLocaleString()}
                      </p>
                    )}
                    {lease.preliminaryInspectionNotes && (
                      <p className="text-slate-600 bg-slate-50 p-2 rounded-lg"><strong>Notes:</strong> {lease.preliminaryInspectionNotes}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No preliminary walkthrough report was submitted.</p>
                )}
              </div>

              {/* Final Walkthrough */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1 flex justify-between">
                  <span>Final Walkthrough</span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                    walkthroughCompleted ? "bg-indigo-50 text-indigo-600 border border-indigo-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}>
                    {walkthroughCompleted ? "COMPLETED" : "PENDING"}
                  </span>
                </h4>
                {walkthroughCompleted ? (
                  <div className="space-y-2 text-xs">
                    <p className="text-slate-600"><strong>Date:</strong> {new Date(lease.inspectionDate).toLocaleString()}</p>
                    {lease.inspectorSignedAt && (
                      <p className="text-emerald-600 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Signed off by Inspector: {new Date(lease.inspectorSignedAt).toLocaleString()}
                      </p>
                    )}
                    {lease.inspectionNotes && (
                      <p className="text-slate-600 bg-slate-50 p-2 rounded-lg"><strong>Notes:</strong> {lease.inspectionNotes}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Final walkthrough report has not been submitted yet.</p>
                )}
              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {/* Tenant Dispute Thread */}
      {lease.moveOutStatus === "TENANT_DISPUTED" && !isTerminated && (
        <Card className="rounded-[24px] shadow-sm border-amber-200 bg-amber-50/40 overflow-hidden">
          <CardHeader className="border-b border-amber-100 pb-4 bg-amber-50/50">
            <CardTitle className="text-amber-900 text-base font-black flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Tenant Dispute Resolution Thread
            </CardTitle>
            <CardDescription className="text-amber-700 text-xs font-semibold">
              The tenant has disputed the deductions. Review their reasoning and submit your final response to settle this dispute.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-amber-100 text-sm">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tenant's Dispute Reason</p>
              <p className="text-slate-800 italic font-medium">"{lease.tenantDisputeNote}"</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Resolution Response note</Label>
              <textarea
                placeholder="Explain the resolution or final decision (e.g. Waived cleaning fee, or verified physical damage per inspection report)..."
                value={disputeResponseText}
                onChange={(e) => setDisputeResponseText(e.target.value)}
                className="w-full h-24 p-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all resize-none text-slate-800 font-semibold"
              />
            </div>
            <Button
              onClick={handleResolveDispute}
              disabled={processing || disputeResponseText.trim().length < 5}
              className="bg-amber-600 hover:bg-amber-500 text-white font-black h-11 px-6 rounded-xl text-xs transition-colors disabled:opacity-50"
            >
              Submit Response & Finalize Dispute
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resolved Dispute History */}
      {lease.disputeResolutionNotes && (
        <Card className="rounded-[24px] shadow-sm border-slate-200 bg-slate-50/50 overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-bold text-slate-700">Dispute Resolution History</CardTitle>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded-xl border border-slate-200/50">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tenant Dispute Reason</p>
              <p className="text-xs font-semibold text-slate-700 mt-1 italic">"{lease.tenantDisputeNote}"</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200/50">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Owner Resolution Notes</p>
              <p className="text-xs font-semibold text-slate-800 mt-1">{lease.disputeResolutionNotes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deductions Calculator */}
      <Card className="rounded-[24px] shadow-sm border-[#E2E8F0]">
        <CardHeader className="border-b border-[#F1F5F9] pb-5 flex flex-row items-center justify-between bg-slate-50/50">
          <div>
            <CardTitle className="text-lg font-black text-slate-900">Approved Deductions & Unpaid Invoices</CardTitle>
            <CardDescription className="text-xs font-semibold text-slate-500">
              {["OWNER_REVIEWING", "TENANT_DISPUTED"].includes(lease.moveOutStatus) && !isTerminated 
                ? "Enter the final amounts for the damages found by the inspector or add custom charges."
                : "These deductions are locked and submitted on the disposition statement."
              }
            </CardDescription>
          </div>
          {["OWNER_REVIEWING", "TENANT_DISPUTED"].includes(lease.moveOutStatus) && !isTerminated && (
            <Button
              onClick={handleAddEarlyTerminationFee}
              variant="outline"
              size="sm"
              className="text-indigo-600 hover:text-indigo-700 font-bold border-indigo-200 hover:bg-indigo-50 rounded-xl"
            >
              Add Early Term Fee
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-5 space-y-5">

          {/* Add Custom Deduction Form */}
          {["OWNER_REVIEWING", "TENANT_DISPUTED"].includes(lease.moveOutStatus) && !isTerminated && (
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80 space-y-3 mb-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Add Custom Deduction / Charge</h4>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Description (e.g. Damaged kitchen floor)"
                    value={customDeductionDesc}
                    onChange={(e) => setCustomDeductionDesc(e.target.value)}
                    className="h-10 text-xs bg-white border-slate-200"
                  />
                </div>
                <div className="w-full md:w-48">
                  <select
                    value={customDeductionCat}
                    onChange={(e) => setCustomDeductionCat(e.target.value)}
                    className="w-full h-10 bg-white border border-slate-200 rounded-xl px-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="DAMAGE">Physical Damage</option>
                    <option value="CLEANING">Cleaning Required</option>
                    <option value="UNPAID_RENT">Unpaid Rent</option>
                    <option value="UNPAID_FEE">Unpaid Fee</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="flex gap-2 w-full md:w-48">
                  <Input
                    type="number"
                    placeholder="Amount ($)"
                    value={customDeductionAmount}
                    onChange={(e) => setCustomDeductionAmount(e.target.value)}
                    className="h-10 text-xs bg-white border-slate-200 flex-1 font-bold text-slate-900"
                  />
                  <Button
                    onClick={() => {
                      if (!customDeductionDesc || !customDeductionAmount) {
                        toast.error("Description and amount required.");
                        return;
                      }
                      if (isNaN(Number(customDeductionAmount)) || Number(customDeductionAmount) < 0) {
                        toast.error("Amount must be a non-negative number.");
                        return;
                      }
                      setDeductions([...deductions, {
                        amount: customDeductionAmount,
                        description: customDeductionDesc,
                        category: customDeductionCat,
                        photoUrl: ""
                      }]);
                      setCustomDeductionDesc("");
                      setCustomDeductionAmount("");
                      setCustomDeductionCat("DAMAGE");
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white h-10 w-10 p-0 rounded-xl shrink-0 font-bold"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Deductions Table */}
          {deductions.length > 0 ? (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-600">Description</TableHead>
                    <TableHead className="font-bold text-slate-600">Category</TableHead>
                    <TableHead className="text-right font-bold text-slate-600">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductions.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-semibold text-slate-800">
                        {d.description}
                        {d.photoUrl && (
                          <a href={d.photoUrl} target="_blank" rel="noreferrer" className="inline-block ml-2 align-middle">
                            <img src={d.photoUrl} alt="Evidence" className="h-7 w-7 rounded object-cover border border-slate-200 hover:scale-110 transition-transform inline" title="View photo evidence" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[(d as any).category] || CATEGORY_COLORS.OTHER}`}>
                          {DEDUCTION_CATEGORIES.find(c => c.value === (d as any).category)?.label || (d as any).category || "Other"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {["OWNER_REVIEWING", "TENANT_DISPUTED"].includes(lease.moveOutStatus) && !isTerminated ? (
                          <div className="flex items-center justify-end gap-3">
                            <span className="text-xs text-slate-400 font-bold">$</span>
                            <Input
                              type="number"
                              value={d.amount}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = [...deductions];
                                updated[i] = { ...d, amount: val };
                                setDeductions(updated);
                              }}
                              className="w-24 h-9 text-right font-black bg-white text-slate-800 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-lg text-xs"
                            />
                            <button
                              onClick={() => {
                                setDeductions(deductions.filter((_, idx) => idx !== i));
                              }}
                              className="text-red-400 hover:text-red-600 transition-colors p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-black text-red-600">-${Number(d.amount).toFixed(2)}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-6">No deductions logged.</p>
          )}
        </CardContent>
      </Card>

      {/* Final Summary + Finalize */}
      <Card className="rounded-[24px] shadow-sm border-[#E2E8F0] overflow-hidden">
        <div className="p-8 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-1 w-full space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-700">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">Original Security Deposit</span>
              <span className="text-xl font-bold">${originalDeposit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-700">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">Total Deductions</span>
              <span className="text-xl font-bold text-red-400">-${totalDeducted.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-300 font-black uppercase tracking-wider text-sm">
                {isExcess ? "Outstanding Balance (Owes You)" : "Final Refund Due to Tenant"}
              </span>
              <span className={`text-4xl font-black ${isExcess ? "text-orange-400" : "text-emerald-400"}`}>
                ${isExcess ? Math.abs(netBalance).toFixed(2) : refundAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="w-full md:w-[320px] bg-slate-800 rounded-2xl p-6 space-y-4">
            {isExcess ? (
              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4">
                <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                  Deductions exceed the deposit by <strong>${Math.abs(netBalance).toFixed(2)}</strong>. Finalizing will generate a Notice of Outstanding Balance. You may need to pursue collection through small claims court.
                </p>
              </div>
            ) : (
              <>
                {/* Refund Method Override */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Refund Method</Label>
                  <select
                    value={refundMethodOverride ?? (lease?.refundMethod || "OFFLINE")}
                    onChange={(e) => setRefundMethodOverride(e.target.value)}
                    disabled={!canFinalize}
                    className="w-full h-11 bg-slate-700 border-0 rounded-xl px-3 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="OFFLINE">Bank Wire / External Transfer</option>
                    <option value="CHECK">Mail a Physical Check</option>
                    <option value="ORIGINAL">Original Payment Method (Stripe)</option>
                  </select>
                  {lease?.refundMethod && refundMethodOverride && refundMethodOverride !== lease.refundMethod && (
                    <p className="text-[10px] text-amber-400 font-semibold">⚠ Tenant requested: {lease.refundMethod === "ORIGINAL" ? "Stripe refund" : lease.refundMethod === "CHECK" ? "check" : "bank wire"}. You have overridden this.</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Reference # <span className="text-slate-600 normal-case font-normal">(optional)</span>
                  </Label>
                  <Input
                    value={refundRef}
                    onChange={(e) => setRefundRef(e.target.value)}
                    placeholder="Wire ref, TXN ID, check #..."
                    disabled={!canFinalize}
                    className="h-11 bg-slate-700 border-0 rounded-xl px-3 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
              </>
            )}


            {lease.moveOutStatus === "OWNER_REVIEWING" ? (
              <Button
                onClick={handleSubmitDisposition}
                disabled={processing || isTerminated}
                className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {processing ? "Processing..." : "Submit Statement & Send to Tenant"}
              </Button>
            ) : lease.moveOutStatus === "TENANT_DISPUTED" ? (
              <Button
                onClick={handleSaveDeductions}
                disabled={processing || isTerminated}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {processing ? "Processing..." : "Send Revised Statement to Tenant"}
              </Button>
            ) : (
              <Button
                onClick={handleFinalizeMoveOut}
                disabled={
                  processing ||
                  isTerminated ||
                  !canFinalize
                }
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {processing ? "Processing..." : isExcess ? "Finalize & Record Outstanding Balance" : "Finalize & Process Refund"}
              </Button>
            )}

          </div>
        </div>
      </Card>
      
      <BypassConfirmationModal
        leaseId={id}
        open={showBypassModal}
        onOpenChange={setShowBypassModal}
        onSuccess={fetchLease}
      />
    </div>
  );
}
