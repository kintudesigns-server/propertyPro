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
import { ArrowLeft, Trash2, ShieldAlert, CheckCircle2, FileDown, AlertTriangle, MapPin, Clock, Key } from "lucide-react";
import Link from "next/link";
import { generateDispositionPDF } from "@/lib/pdfGenerator";
import { UnmaskAccountNumber } from "@/components/UnmaskAccountNumber";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BypassConfirmationModal } from "@/components/modals/BypassConfirmationModal";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureBlockedOverlay } from "@/components/subscription/FeatureBlockedBanner";

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
  const featureAccess = useFeatureAccess("request_move_out");
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: session, status } = useSession();

  const isTenant = (session?.user as any)?.role === "TENANT";

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
  const [deleteDeductionIndex, setDeleteDeductionIndex] = useState<number | null>(null);

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

  const handleConfirmKeyReturn = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/leases/${id}/confirm-key-return`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to confirm key return");
      }
      toast.success("Key return confirmed! Final settlement is now unlocked.");
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
        <p className="text-[#8E8E93] font-bold text-sm">Loading...</p>
      </div>
    );
  }

  if (!lease) return <div className="p-8 text-center text-[#6E6E73]">Lease not found.</div>;

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
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 relative">
      {isTenant && !featureAccess.allowed && (
        <FeatureBlockedOverlay
          featureLabel={featureAccess.featureLabel || "Request Move-Out / Departure"}
          reason={featureAccess.reason}
          adminNote={featureAccess.adminNote}
          expiresAt={featureAccess.expiresAt}
        />
      )}
      <div className="flex items-center gap-4 mb-2 font-sans">
        <Link href={`/dashboard/leases/${id}`}>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-slate-200 text-slate-900 hover:bg-slate-50 shadow-2xs cursor-pointer">
            <ArrowLeft className="h-4 w-4 text-slate-700" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Final Disposition Statement</h1>
          <p className="text-slate-500 font-semibold text-xs mt-0.5">Unit {lease.unit?.name} • Tenant: {lease.tenant?.name}</p>
        </div>
      </div>

      {/* Visual Step Progress Tracker */}
      <Card className="rounded-3xl shadow-xs border border-slate-200 p-6 bg-white overflow-hidden font-sans">
        <div className="relative flex items-center justify-between w-full">
          {/* Connector Line */}
          <div className="absolute left-6 right-6 top-[11px] h-1.5 bg-slate-100 z-0 rounded-full border border-slate-200/60" />
          <div 
            className="absolute left-6 top-[11px] h-1.5 bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-400 z-0 rounded-full border border-emerald-400/80 shadow-2xs transition-all duration-500" 
            style={{ width: `calc(${(getActiveStepIndex(lease.moveOutStatus, isTerminated) / 5) * 100}% * 0.9)` }}
          />

          {steps.map((st, idx) => {
            const activeIdx = getActiveStepIndex(lease.moveOutStatus, isTerminated);
            const isCompleted = idx < activeIdx;
            const isActive = idx === activeIdx;
            
            return (
              <div key={idx} className="flex flex-col items-center gap-1.5 relative z-10">
                <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all ${
                  isCompleted ? "bg-emerald-100 border-emerald-400 text-slate-900 shadow-2xs" :
                  isActive ? "bg-emerald-200 border-emerald-400 text-slate-900 shadow-2xs ring-4 ring-emerald-100" :
                  "bg-white border-slate-200 text-slate-400"
                }`}>
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <div className="text-center hidden md:block">
                  <p className={`text-[10px] font-black uppercase tracking-wider ${isCompleted || isActive ? "text-slate-900 font-black" : "text-slate-400"}`}>{st.label}</p>
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
        let actionBg = "bg-amber-50/80 border-amber-200";
        let actionColor = "text-amber-950";
        let actionDescColor = "text-amber-900";
        let primaryBtn: React.ReactNode = null;
        let secondaryBtn: React.ReactNode = null;

        if (!walkthroughCompleted) {
          actionTitle = "⚡ Go back and complete the inspection first";
          actionDesc = "This page is in preview mode. Go back to the lease page and either self-inspect or assign a professional inspector. You can also bypass the walkthrough below if necessary.";
          actionBg = "bg-amber-50/80 border-amber-200";
          actionColor = "text-amber-950";
          actionDescColor = "text-amber-900";
          secondaryBtn = (
            <button
              onClick={() => setShowBypassModal(true)}
              disabled={processing}
              className="text-xs font-black text-amber-950 underline hover:text-amber-900 mt-2 self-start cursor-pointer"
            >
              Skip inspection and proceed anyway →
            </button>
          );
        } else if (lease.moveOutStatus === "OWNER_REVIEWING") {
          actionTitle = "👇 Set amounts for each deduction below, then send to tenant";
          actionDesc = `Inspection is complete. ${deductions.filter(d => Number(d.amount) === 0).length} item(s) still have $0 — set the correct amounts and hit "Submit Statement."` ;
          actionBg = "bg-slate-50 border-slate-200";
          actionColor = "text-slate-900";
          actionDescColor = "text-slate-600";
        } else if (lease.moveOutStatus === "TENANT_DISPUTED") {
          actionTitle = "🔴 Tenant disputed the charges — review and respond";
          actionDesc = lease.tenantDisputeNote ? `Tenant's reason: "${lease.tenantDisputeNote}"` : "Tenant has filed a dispute. Revise the amounts or send a response.";
          actionBg = "bg-rose-50/80 border-rose-200";
          actionColor = "text-rose-950";
          actionDescColor = "text-rose-900";
        } else if (lease.moveOutStatus === "INSPECTION_COMPLETED") {
          actionTitle = "⏳ Waiting for tenant to accept the statement";
          actionDesc = getRemainingTimeText();
          actionBg = "bg-slate-50 border-slate-200";
          actionColor = "text-slate-900";
          actionDescColor = "text-slate-600";
        } else if (["TENANT_ACCEPTED", "DISPUTE_FINALIZED"].includes(lease.moveOutStatus)) {
          if (isDateOrKeyGated) {
            actionTitle = "🔑 Key Return / Move-Out Date Pending";
            actionDesc = lease.moveOutDate
              ? `Tenant accepted statement. Move-out date is ${new Date(lease.moveOutDate).toLocaleDateString()}. Confirm key return below to unlock finalization.`
              : "Tenant accepted statement. Confirm key return below to unlock finalization.";
            actionBg = "bg-amber-50/80 border-amber-200";
            actionColor = "text-amber-950";
            actionDescColor = "text-amber-900";
            primaryBtn = (
              <Button
                onClick={handleConfirmKeyReturn}
                disabled={processing}
                className="mt-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs h-8 px-4 rounded-xl shadow-xs cursor-pointer"
              >
                <Key className="h-3.5 w-3.5 mr-1.5" /> Confirm Keys Returned &amp; Unlock
              </Button>
            );
          } else {
            actionTitle = "✅ Tenant accepted — finalize the refund below";
            actionDesc = `Refund amount: $${refundAmount.toFixed(2)}. Choose the refund method and click Finalize.`;
            actionBg = "bg-emerald-50/80 border-emerald-200";
            actionColor = "text-emerald-950";
            actionDescColor = "text-emerald-900";
          }
        }

        if (!actionTitle) return null;

        return (
          <Card className={`rounded-3xl shadow-xs border p-5 font-sans ${actionBg} ${overdue || urgent ? "ring-2 ring-rose-400" : ""}`}>
            <div>
              <h3 className={`font-black text-sm leading-snug tracking-tight ${actionColor}`}>{actionTitle}</h3>
              <p className={`text-xs font-semibold mt-1 leading-relaxed ${actionDescColor}`}>{actionDesc}</p>
              {primaryBtn}
              {secondaryBtn}
              {(overdue || urgent) && daysLeft !== null && (
                <div className={`inline-flex items-center gap-1.5 mt-2 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${overdue ? "bg-rose-200 text-rose-900" : "bg-amber-200 text-amber-950"}`}>
                  <Clock className="h-3 w-3" />
                  {overdue ? "Deposit overdue — legal risk!" : `${daysLeft} days until deposit deadline`}
                </div>
              )}
            </div>
          </Card>
        );
      })()}

      {/* Three-Column Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-sans">
        <Card className="rounded-3xl shadow-xs border border-slate-200 p-5 bg-white flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Current Status</p>
            <h3 className="text-base font-black text-slate-900 mt-1.5 tracking-tight">
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

        <Card className="rounded-3xl shadow-xs border border-slate-200 p-5 bg-white flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Deposit Summary</p>
            <div className="space-y-2 mt-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Security Deposit:</span>
                <span className="font-black text-slate-900">${originalDeposit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-500">Total Deductions:</span>
                <span className="font-black text-rose-600">-${totalDeducted.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1">
                <span className="font-black text-slate-900">{isExcess ? "Balance Owed:" : "Estimated Refund:"}</span>
                <span className={`font-black text-base ${isExcess ? "text-rose-600" : "text-emerald-700"}`}>
                  ${isExcess ? Math.abs(netBalance).toFixed(2) : refundAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl shadow-xs border border-slate-200 p-5 bg-white flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Timeline &amp; Deadlines</p>
            <div className="space-y-2 mt-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500">Move-Out Date:</span>
                <span className="font-black text-slate-900">
                  {lease.moveOutDate ? new Date(lease.moveOutDate).toLocaleDateString() : "Pending"}
                </span>
              </div>
              {lease.depositDueBy && (
                <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                  <span className="font-semibold text-slate-500">Deposit Deadline:</span>
                  <span className="font-black text-slate-900">
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
                return daysLeft <= 5 ? "bg-rose-50 text-rose-800 border border-rose-200" : "bg-amber-50 text-amber-900 border border-amber-200";
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
                  <MapPin className="h-3.5 w-3.5 text-[#8E8E93]" />
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
      <Card className="rounded-3xl shadow-xs border border-slate-200 bg-white font-sans">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-base font-black text-slate-900 tracking-tight">Tenant &amp; Move-Out Information</CardTitle>
          <CardDescription className="text-xs font-semibold text-slate-500">Verify these details before finalizing the disposition.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
            <Label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Planned Move-Out Date</Label>
            <div className="font-black text-slate-900 text-sm mt-1">{lease.moveOutDate ? new Date(lease.moveOutDate).toLocaleDateString() : "N/A"}</div>
            {isShortNotice && (
              <div className="text-amber-800 text-[10px] font-extrabold mt-2 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> Short Notice (&lt;{lease.moveOutNoticeDays} days)
              </div>
            )}
          </div>
          {lease.actualMoveOutDate && (
            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 shadow-2xs">
              <Label className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider">Actual Move-Out (Keys Returned)</Label>
              <div className="font-black text-emerald-950 text-sm mt-1">{new Date(lease.actualMoveOutDate).toLocaleDateString()}</div>
              {lease.depositDueBy && (
                <div className="text-xs text-emerald-800 font-semibold mt-1">
                  Deposit Due By: <strong className="font-black">{new Date(lease.depositDueBy).toLocaleDateString()}</strong>
                </div>
              )}
            </div>
          )}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
            <Label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Reason</Label>
            <div className="font-black text-slate-900 text-sm mt-1">{lease.moveOutReason || "Not provided"}</div>
          </div>
          <div className={`p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs ${lease.refundMethod === "BANK_TRANSFER" ? "md:col-span-2" : ""}`}>
            <Label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Requested Refund Method</Label>
            <div className="font-black text-slate-900 text-sm mt-1">
              {lease.refundMethod === "ORIGINAL" ? "Original Payment Method" :
               lease.refundMethod === "CHECK" ? "Mailed Check" :
               lease.refundMethod === "BANK_TRANSFER" ? "Direct Bank Transfer" :
               lease.refundMethod || "Not specified"}
            </div>
            {lease.refundMethod === "BANK_TRANSFER" && (
              <div className="mt-3 bg-white p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 shadow-2xs">
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Bank Name</p>
                  <p className="text-xs font-black text-slate-900">{lease.refundBankName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Account Holder</p>
                  <p className="text-xs font-black text-slate-900">{lease.refundAccountName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-0.5">Account Number</p>
                  <UnmaskAccountNumber apiUrl={`/api/leases/${lease.id}/unmask-refund`} maskedNumber={"••••••••"} />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Walkthrough Inspection Reports Card */}
      {(walkthroughCompleted || lease.preliminaryInspectionStatus === "COMPLETED") && (
        <Card className="rounded-3xl shadow-xs border border-slate-200 bg-white overflow-hidden font-sans">
          <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
            <CardTitle className="text-base font-black text-slate-900 tracking-tight">Walkthrough Inspection Reports &amp; Sign-Offs</CardTitle>
            <CardDescription className="text-xs font-semibold text-slate-500">Legal sign-offs and findings logged by the inspector.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Preliminary Walkthrough */}
              <div className="p-4 rounded-2xl border border-slate-200 space-y-3 bg-white shadow-2xs">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 flex justify-between">
                  <span>Preliminary Walkthrough</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    lease.preliminaryInspectionStatus === "COMPLETED" ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs" : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}>
                    {lease.preliminaryInspectionStatus === "COMPLETED" ? "COMPLETED" : "NOT COMPLETED"}
                  </span>
                </h4>
                {lease.preliminaryInspectionStatus === "COMPLETED" ? (
                  <div className="space-y-2 text-xs font-semibold">
                    <p className="text-slate-600"><strong>Date:</strong> {new Date(lease.preliminaryInspectionDate).toLocaleString()}</p>
                    {lease.preliminaryInspectorSignedAt && (
                      <p className="text-emerald-800 font-extrabold flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Signed off by Inspector: {new Date(lease.preliminaryInspectorSignedAt).toLocaleString()}
                      </p>
                    )}
                    {lease.preliminaryInspectionNotes && (
                      <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80"><strong>Notes:</strong> {lease.preliminaryInspectionNotes}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic font-semibold">No preliminary walkthrough report was submitted.</p>
                )}
              </div>

              {/* Final Walkthrough */}
              <div className="p-4 rounded-2xl border border-slate-200 space-y-3 bg-white shadow-2xs">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 flex justify-between">
                  <span>Final Walkthrough</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    walkthroughCompleted ? "bg-slate-100 text-slate-900 border border-slate-200 shadow-2xs" : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}>
                    {walkthroughCompleted ? "COMPLETED" : "PENDING"}
                  </span>
                </h4>
                {walkthroughCompleted ? (
                  <div className="space-y-2 text-xs font-semibold">
                    <p className="text-slate-600"><strong>Date:</strong> {new Date(lease.inspectionDate).toLocaleString()}</p>
                    {lease.inspectorSignedAt && (
                      <p className="text-emerald-800 font-extrabold flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Signed off by Inspector: {new Date(lease.inspectorSignedAt).toLocaleString()}
                      </p>
                    )}
                    {lease.inspectionNotes && (
                      <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80"><strong>Notes:</strong> {lease.inspectionNotes}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic font-semibold">Final walkthrough report has not been submitted yet.</p>
                )}
              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {/* Deductions Calculator */}
      <Card className="rounded-3xl shadow-xs border border-slate-200 bg-white font-sans">
        <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between bg-slate-50/50">
          <div>
            <CardTitle className="text-base font-black text-slate-900 tracking-tight">Approved Deductions &amp; Unpaid Invoices</CardTitle>
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
              className="text-slate-900 hover:bg-slate-50 font-black border-slate-200 shadow-2xs rounded-xl text-xs cursor-pointer"
            >
              Add Early Term Fee
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-5 space-y-5">

          {/* Add Custom Deduction Form */}
          {["OWNER_REVIEWING", "TENANT_DISPUTED"].includes(lease.moveOutStatus) && !isTerminated && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 mb-2 shadow-2xs">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">Add Custom Deduction / Charge</h4>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Description (e.g. Damaged kitchen floor)"
                    value={customDeductionDesc}
                    onChange={(e) => setCustomDeductionDesc(e.target.value)}
                    className="h-9 text-xs bg-white border-slate-200 rounded-xl"
                  />
                </div>
                <div className="w-full md:w-48">
                  <select
                    value={customDeductionCat}
                    onChange={(e) => setCustomDeductionCat(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
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
                    className="h-9 text-xs bg-white border-slate-200 rounded-xl flex-1 font-black text-slate-900"
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
                    className="bg-slate-900 hover:bg-slate-800 text-white h-9 w-9 p-0 rounded-xl shrink-0 font-black text-xs cursor-pointer shadow-xs"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Deductions Table */}
          {deductions.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-extrabold text-xs text-slate-600">Description</TableHead>
                    <TableHead className="font-extrabold text-xs text-slate-600">Category</TableHead>
                    <TableHead className="text-right font-extrabold text-xs text-slate-600">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductions.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-bold text-xs text-slate-900">
                        {d.description}
                        {d.photoUrl && (
                          <a href={d.photoUrl} target="_blank" rel="noreferrer" className="inline-block ml-2 align-middle">
                            <img src={d.photoUrl} alt="Evidence" className="h-7 w-7 rounded-lg object-cover border border-slate-200 hover:scale-110 transition-transform inline shadow-2xs" title="View photo evidence" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider shadow-2xs ${CATEGORY_COLORS[(d as any).category] || CATEGORY_COLORS.OTHER}`}>
                          {DEDUCTION_CATEGORIES.find(c => c.value === (d as any).category)?.label || (d as any).category || "Other"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {["OWNER_REVIEWING", "TENANT_DISPUTED"].includes(lease.moveOutStatus) && !isTerminated ? (
                          <div className="flex items-center justify-end gap-2">
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
                              className="w-24 h-8 text-right font-black bg-white text-slate-900 border-slate-200 rounded-lg text-xs"
                            />
                            <button
                              onClick={() => setDeleteDeductionIndex(i)}
                              title="Delete deduction"
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors p-1.5 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-black text-xs text-rose-600">-${Number(d.amount).toFixed(2)}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic font-semibold text-center py-6">No deductions logged.</p>
          )}
        </CardContent>
      </Card>

      {/* Final Summary + Finalize */}
      <Card className="rounded-3xl shadow-xs border border-slate-200 overflow-hidden bg-white text-slate-900 font-sans">
        <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-1 w-full space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">Original Security Deposit</span>
              <span className="text-base font-black text-slate-900">${originalDeposit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">Total Deductions</span>
              <span className="text-base font-black text-rose-600">-${totalDeducted.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-900 font-black uppercase tracking-wider text-xs">
                {isExcess ? "Outstanding Balance (Owes You)" : "Final Refund Due to Tenant"}
              </span>
              <span className={`text-3xl font-black tracking-tight ${isExcess ? "text-rose-600" : "text-emerald-700"}`}>
                ${isExcess ? Math.abs(netBalance).toFixed(2) : refundAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="w-full md:w-[340px] bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
            {isDateOrKeyGated && !isTerminated && (
              <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-3.5 space-y-2 text-xs shadow-2xs font-sans">
                <div className="flex items-start gap-2">
                  <Key className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-amber-950">Key Return Confirmation Pending</p>
                    <p className="text-amber-900 text-[11px] font-semibold mt-0.5 leading-relaxed">
                      {lease.moveOutDate
                        ? `Move-out date is ${new Date(lease.moveOutDate).toLocaleDateString()}. Confirm key return to unlock final settlement.`
                        : "Confirm key return to unlock final settlement."}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleConfirmKeyReturn}
                  disabled={processing}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs h-8 rounded-xl shadow-xs cursor-pointer mt-1"
                >
                  <Key className="h-3.5 w-3.5 mr-1.5" /> Confirm Keys Returned &amp; Unlock
                </Button>
              </div>
            )}

            {isExcess ? (
              <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-3.5 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-950 font-semibold leading-relaxed">
                  Deductions exceed deposit by <strong className="font-black text-rose-700">${Math.abs(netBalance).toFixed(2)}</strong>.
                </p>
              </div>
            ) : (
              <>
                {/* Refund Method Override */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Refund Method</Label>
                  <select
                    value={refundMethodOverride ?? (lease?.refundMethod || "OFFLINE")}
                    onChange={(e) => setRefundMethodOverride(e.target.value)}
                    disabled={!canFinalize}
                    className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:opacity-50 cursor-pointer"
                  >
                    <option value="OFFLINE">Bank Wire / External Transfer</option>
                    <option value="CHECK">Mail a Physical Check</option>
                    <option value="ORIGINAL">Original Payment Method (Stripe)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                    Reference # <span className="text-slate-400 normal-case font-normal">(optional)</span>
                  </Label>
                  <input
                    type="text"
                    value={refundRef}
                    onChange={(e) => setRefundRef(e.target.value)}
                    placeholder="Wire ref, TXN ID, check #..."
                    disabled={!canFinalize}
                    className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:opacity-50 text-xs font-semibold transition-all"
                  />
                </div>
              </>
            )}

            {lease.moveOutStatus === "OWNER_REVIEWING" ? (
              <Button
                onClick={handleSubmitDisposition}
                disabled={processing || isTerminated}
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-xs transition-all text-xs cursor-pointer border-none"
              >
                {processing ? "Processing..." : "Submit Statement & Send to Tenant"}
              </Button>
            ) : lease.moveOutStatus === "TENANT_DISPUTED" ? (
              <Button
                onClick={handleSaveDeductions}
                disabled={processing || isTerminated}
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-xs transition-all text-xs cursor-pointer border-none"
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
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-xs transition-all text-xs cursor-pointer border-none disabled:opacity-50"
              >
                {processing ? "Processing..." : isExcess ? "Finalize & Record Balance" : "Finalize & Process Refund"}
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

      {/* Delete Deduction Confirmation Alert Dialog */}
      <Dialog open={deleteDeductionIndex !== null} onOpenChange={(open) => !open && setDeleteDeductionIndex(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 rounded-3xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
              Remove Deduction / Charge?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6E6E73] mt-1">
              Are you sure you want to remove this deduction item from the move-out settlement statement?
            </DialogDescription>
          </DialogHeader>

          {deleteDeductionIndex !== null && deductions[deleteDeductionIndex] && (
            <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-4 space-y-1 my-2">
              <p className="text-xs font-bold text-rose-950">
                {deductions[deleteDeductionIndex].description}
              </p>
              <p className="text-base font-black text-rose-700">
                ${Number(deductions[deleteDeductionIndex].amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="ghost"
              className="rounded-xl font-bold text-xs"
              onClick={() => setDeleteDeductionIndex(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs"
              onClick={() => {
                if (deleteDeductionIndex !== null) {
                  const removed = deductions[deleteDeductionIndex];
                  setDeductions(deductions.filter((_, idx) => idx !== deleteDeductionIndex));
                  setDeleteDeductionIndex(null);
                  toast.success(`Removed "${removed?.description || 'Deduction'}" from settlement statement.`);
                }
              }}
            >
              Yes, Remove Deduction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
