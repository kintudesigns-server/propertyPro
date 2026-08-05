"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, FileDown, ShieldAlert, Clock,
  MapPin, CreditCard, AlertTriangle, XCircle
} from "lucide-react";
import Link from "next/link";
import { generateDispositionPDF } from "@/lib/pdfGenerator";

const CATEGORY_LABELS: Record<string, string> = {
  DAMAGE: "Property Damage",
  CLEANING: "Cleaning",
  UNPAID_RENT: "Unpaid Rent",
  UNPAID_FEE: "Unpaid Fee",
  OTHER: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  DAMAGE: "bg-red-50 text-red-700 border-red-200",
  CLEANING: "bg-amber-50 text-amber-700 border-amber-200",
  UNPAID_RENT: "bg-orange-50 text-orange-700 border-orange-200",
  UNPAID_FEE: "bg-purple-50 text-purple-700 border-purple-200",
  OTHER: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function TenantFinalStatementPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: session, status } = useSession();

  const [lease, setLease] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [disputeNote, setDisputeNote] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated") fetchLease();
  }, [status]);

  const fetchLease = async () => {
    try {
      const res = await fetch(`/api/leases/${id}`);
      if (!res.ok) throw new Error("Failed to load lease");
      setLease(await res.json());
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (action: "accept" | "dispute") => {
    if (action === "dispute" && disputeNote.trim().length < 10) {
      toast.error("Please provide a clear reason for disputing (minimum 10 characters).");
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/leases/${id}/tenant-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, tenantDisputeNote: disputeNote.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit review");
      }
      toast.success(
        action === "accept"
          ? excessBalance > 0
            ? "Report accepted. The owner has been notified to finalize the outstanding balance."
            : "Report accepted. The owner has been notified to process your refund."
          : "Dispute submitted. The owner has been notified."
      );
      setDisputeNote("");
      fetchLease();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#007AFF]"></div>
        <p className="text-[#8E8E93] font-bold text-sm">Loading statement...</p>
      </div>
    );
  }

  if (!lease) {
    return <div className="p-8 text-center text-[#6E6E73]">No move-out statement found for this lease.</div>;
  }

  const isCompleted = lease.status === "TERMINATED";
  const canReview = lease.moveOutStatus === "INSPECTION_COMPLETED";
  const isAccepted = lease.moveOutStatus === "TENANT_ACCEPTED";
  const isDisputed = lease.moveOutStatus === "TENANT_DISPUTED";
  const isDisputeFinalized = lease.moveOutStatus === "DISPUTE_FINALIZED";

  const originalDeposit = Number(lease.securityDeposit || 0);
  const deductions = lease.deductions || [];
  const totalDeducted = deductions.reduce((sum: number, d: any) => sum + Number(d.amount), 0);
  const refundAmount = Math.max(0, originalDeposit - totalDeducted);
  const excessBalance = totalDeducted > originalDeposit ? totalDeducted - originalDeposit : 0;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <Link href={`/dashboard/tenant/leases`}>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-slate-200 text-slate-900 hover:bg-slate-50 shadow-2xs cursor-pointer">
            <ArrowLeft className="h-4 w-4 text-slate-700" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Move-Out Final Statement</h1>
          <p className="text-slate-500 font-semibold text-xs mt-0.5">
            Unit {lease.unit?.name} • {lease.unit?.property?.name}
          </p>
        </div>
      </div>

      {/* Status Banner */}
      {isCompleted && (
        <Card className={`rounded-3xl border shadow-xs overflow-hidden font-sans ${
          excessBalance > 0 ? "border-amber-200 bg-amber-50/80 text-amber-950" : "border-emerald-200 bg-emerald-50/80 text-emerald-950"
        }`}>
          <div className="p-6 flex flex-col md:flex-row items-center gap-6">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${
              excessBalance > 0 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
            }`}>
              {excessBalance > 0 ? (
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              ) : (
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h2 className={`text-base font-black ${excessBalance > 0 ? "text-amber-950" : "text-emerald-950"}`}>
                  {excessBalance > 0 ? "Move-Out Finalized (Outstanding Balance)" : "Move-Out Finalized"}
                </h2>
                <p className={`font-semibold mt-1 leading-relaxed text-xs ${excessBalance > 0 ? "text-amber-900" : "text-emerald-900"}`}>
                  {excessBalance > 0
                    ? `Your move-out has been finalized. Deductions exceeded your deposit by $${excessBalance.toFixed(2)}. Please settle this outstanding balance with your landlord.`
                    : `A deposit refund of $${refundAmount.toFixed(2)} has been issued via ${
                        lease.refundMethod === "ORIGINAL" ? "your original payment method" :
                        lease.refundMethod === "CHECK" ? `mailed check to ${lease.forwardingAddress || "your forwarding address"}` :
                        "direct transfer"
                      }.`
                  }
                </p>
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                <Button onClick={() => generateDispositionPDF(lease)} className={`font-black h-9 px-4 rounded-xl text-xs shadow-xs border-none cursor-pointer ${
                  excessBalance > 0 ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}>
                  <FileDown className="h-4 w-4 mr-2" /> Download Disposition PDF
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* DISPUTE_FINALIZED banner */}
      {isDisputeFinalized && (
        <Card className="rounded-3xl border-orange-200 bg-orange-50/80 shadow-xs font-sans">
          <div className="p-6 flex items-start gap-4">
            <ShieldAlert className="h-6 w-6 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-black text-orange-950 text-sm mb-1">Dispute Formally Recorded</h3>
              <p className="text-orange-900 text-xs font-semibold leading-relaxed">
                Your dispute has been logged for a second time. This matter has not been resolved through PropertyPro.
                Both you and your landlord are encouraged to resolve this through mediation or small claims court.
                A Dispute Record document is available to download.
              </p>
              <Button onClick={() => generateDispositionPDF(lease)} variant="outline" className="mt-3 h-9 px-4 rounded-xl text-xs font-black border-orange-300 text-orange-950 hover:bg-orange-100 shadow-2xs cursor-pointer">
                <FileDown className="h-4 w-4 mr-2" /> Download Dispute Record
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Inspection Report — shown when ready */}
      {(canReview || isAccepted || isDisputed || isDisputeFinalized || isCompleted) && (
        <Card className="rounded-3xl shadow-xs border border-slate-200 bg-white font-sans overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center justify-between text-base font-semibold text-slate-900 tracking-tight">
              <span>Itemized Deductions</span>
              {isAccepted && <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold uppercase tracking-wider shadow-2xs">Accepted</Badge>}
              {isDisputed && <Badge className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-semibold uppercase tracking-wider shadow-2xs">Disputed — Awaiting Owner Response</Badge>}
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-slate-500">Review the deductions claimed by your landlord after the move-out inspection.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
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
                    {deductions.map((d: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-bold text-xs text-slate-900">
                          {d.description}
                          {d.photoUrl && (
                            <a href={d.photoUrl} target="_blank" rel="noreferrer" className="text-slate-900 text-[10px] font-black ml-3 underline bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              View Proof
                            </a>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider shadow-2xs ${CATEGORY_COLORS[d.category] || CATEGORY_COLORS.OTHER}`}>
                            {CATEGORY_LABELS[d.category] || d.category || "Other"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-black text-xs text-rose-600">-${Number(d.amount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 font-semibold border border-dashed border-slate-200 rounded-2xl text-xs bg-slate-50/50">
                No deductions were claimed. Full deposit will be refunded.
              </div>
            )}

            {/* Summary */}
            <div className="border-t border-slate-100 pt-5 space-y-2.5">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                <span className="font-extrabold uppercase text-[10px] text-slate-400 tracking-wider">Original Security Deposit</span>
                <span className="font-semibold text-slate-900 text-sm">${originalDeposit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                <span className="font-extrabold uppercase text-[10px] text-slate-400 tracking-wider">Total Deductions</span>
                <span className="font-semibold text-rose-600 text-sm">-${totalDeducted.toFixed(2)}</span>
              </div>
              {excessBalance > 0 ? (
                <div className="flex justify-between items-center text-xs font-extrabold text-amber-950 bg-amber-50/80 p-3 rounded-2xl border border-amber-200/80 shadow-2xs mt-2">
                  <span>Outstanding Balance (Owes Landlord)</span>
                  <span className="font-black text-sm text-rose-600">${excessBalance.toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="font-black text-slate-900 text-xs uppercase tracking-wider">Your Refund</span>
                  <span className="text-2xl font-black text-emerald-700 tracking-tight">${refundAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Lease meta */}
            {(lease.forwardingAddress || lease.refundMethod) && (
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {lease.forwardingAddress && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-slate-500" />
                    <div>
                      <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Forwarding Address</p>
                      <p className="font-black text-slate-900 text-xs mt-0.5 whitespace-pre-wrap">{lease.forwardingAddress}</p>
                    </div>
                  </div>
                )}
                {lease.refundMethod && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs flex items-start gap-2.5">
                    <CreditCard className="h-4 w-4 mt-0.5 shrink-0 text-slate-500" />
                    <div>
                      <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Refund Method</p>
                      <p className="font-black text-slate-900 text-xs mt-0.5">
                        {lease.refundMethod === "ORIGINAL" ? "Original Payment Method" :
                         lease.refundMethod === "CHECK" ? "Mailed Check" : "Offline / Direct Transfer"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Accept / Dispute Actions — only when INSPECTION_COMPLETED */}
      {canReview && (
        <Card className="rounded-3xl shadow-xs border border-slate-200 bg-white font-sans overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 tracking-tight">
                  <Clock className="h-4 w-4 text-amber-600" /> Your Review Required
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-slate-500 mt-1">
                  Please review the deductions above and accept or dispute them within 72 hours.{" "}
                  {excessBalance > 0
                    ? "Once accepted, the outstanding balance will be recorded as due to the landlord."
                    : "Once accepted, the owner will process your refund."}
                </CardDescription>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs shrink-0">
                Action Pending
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Accept Option Box */}
            <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Option A: Accept Statement</h4>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Fastest Refund</span>
              </div>
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                If you agree with the itemized deductions above, click below to accept the final statement.
              </p>
              <Button
                onClick={() => handleReview("accept")}
                disabled={submittingAction}
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs shadow-xs cursor-pointer border-none"
              >
                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400" />
                {submittingAction
                  ? "Submitting..."
                  : excessBalance > 0
                  ? "Accept Deductions & Acknowledge Balance"
                  : "Accept Deductions & Request Refund"}
              </Button>
            </div>

            {/* Dispute Option Box */}
            <div className="p-5 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">Option B: Dispute Deductions</h4>
                <span className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200">Requires Reason</span>
              </div>
              <p className="text-xs text-amber-900 font-semibold leading-relaxed">
                If you disagree with any of the deductions, provide a detailed explanation below and submit a dispute to your landlord.
              </p>
              <div className="space-y-2 pt-1">
                <Textarea
                  placeholder="State why you are disputing these charges (min. 10 characters). Be specific — e.g. 'The carpet damage was pre-existing as noted in my move-in photos.'"
                  value={disputeNote}
                  onChange={e => setDisputeNote(e.target.value)}
                  className="bg-white border-slate-200 rounded-xl p-3 min-h-[90px] resize-none text-slate-900 font-semibold text-xs focus:ring-2 focus:ring-slate-900/10 shadow-2xs"
                />
                <div className="flex justify-between items-center text-[10px] px-1 font-semibold">
                  <span className="text-slate-400">Detailed explanation required to submit dispute.</span>
                  <span className={`font-black transition-colors ${disputeNote.trim().length >= 10 ? "text-emerald-700" : "text-amber-800"}`}>
                    {disputeNote.trim().length}/10 min chars
                  </span>
                </div>
                <Button
                  onClick={() => handleReview("dispute")}
                  disabled={submittingAction || disputeNote.trim().length < 10}
                  variant="outline"
                  className="w-full h-10 rounded-xl text-amber-950 hover:text-amber-950 hover:bg-amber-100 font-black border-amber-300 text-xs disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
                >
                  <AlertTriangle className="h-4 w-4 mr-2 text-amber-600" />
                  {submittingAction ? "Submitting..." : "Dispute These Deductions"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Awaiting owner response after first dispute */}
      {isDisputed && (
        <Card className="rounded-3xl shadow-xs border-amber-200 bg-amber-50/80 font-sans">
          <CardContent className="pt-6 flex items-start gap-4">
            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-amber-950 text-sm">Dispute Submitted — Awaiting Owner Response</h4>
              <p className="text-amber-900 text-xs font-semibold mt-1">
                Your dispute has been sent to the owner. They can revise the deductions and resubmit for your review.
              </p>
              {lease.tenantDisputeNote && (
                <div className="mt-3 p-3 bg-amber-100/80 rounded-xl border border-amber-200 shadow-2xs">
                  <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider mb-1">Your Dispute Note:</p>
                  <p className="text-amber-950 text-xs font-semibold">{lease.tenantDisputeNote}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
