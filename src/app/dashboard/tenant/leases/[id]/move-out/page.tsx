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
      toast.success(action === "accept" ? "Report accepted. The owner has been notified to process your refund." : "Dispute submitted. The owner has been notified.");
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
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <Link href={`/dashboard/tenant/leases`}>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-slate-200">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Move-Out Final Statement</h1>
          <p className="text-[#6E6E73] font-semibold mt-1">
            Unit {lease.unit?.name} • {lease.unit?.property?.name}
          </p>
        </div>
      </div>

      {/* Status Banner */}
      {isCompleted && (
        <Card className="rounded-[24px] border-emerald-200 bg-emerald-50 shadow-sm overflow-hidden">
          <div className="p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-xl font-black text-emerald-900">Move-Out Finalized</h2>
                <p className="text-emerald-700 font-medium mt-1.5 leading-relaxed text-sm">
                  {excessBalance > 0
                    ? `Your move-out has been finalized. Deductions exceeded your deposit by $${excessBalance.toFixed(2)}. Your landlord will contact you regarding the outstanding balance.`
                    : `A deposit refund of $${refundAmount.toFixed(2)} has been issued via ${
                        lease.refundMethod === "ORIGINAL" ? "your original payment method" :
                        lease.refundMethod === "CHECK" ? `mailed check to ${lease.forwardingAddress || "your forwarding address"}` :
                        "direct transfer"
                      }.`
                  }
                </p>
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                <Button onClick={() => generateDispositionPDF(lease)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-5 rounded-xl text-sm">
                  <FileDown className="h-4 w-4 mr-2" /> Download Disposition PDF
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* DISPUTE_FINALIZED banner */}
      {isDisputeFinalized && (
        <Card className="rounded-[24px] border-orange-200 bg-orange-50 shadow-sm">
          <div className="p-6 flex items-start gap-4">
            <ShieldAlert className="h-8 w-8 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-extrabold text-orange-900 mb-1">Dispute Formally Recorded</h3>
              <p className="text-orange-800 text-sm font-medium leading-relaxed">
                Your dispute has been logged for a second time. This matter has not been resolved through PropertyPro.
                Both you and your landlord are encouraged to resolve this through mediation or small claims court.
                A Dispute Record document is available to download.
              </p>
              <Button onClick={() => generateDispositionPDF(lease)} variant="outline" className="mt-3 h-9 px-4 rounded-xl text-sm font-semibold border-orange-300 text-orange-700 hover:bg-orange-100">
                <FileDown className="h-4 w-4 mr-2" /> Download Dispute Record
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Inspection Report — shown when ready */}
      {(canReview || isAccepted || isDisputed || isDisputeFinalized || isCompleted) && (
        <Card className="rounded-[24px] shadow-sm border-[#E5E5EA]">
          <CardHeader className="border-b border-[#F1F5F9] pb-4">
            <CardTitle className="flex items-center justify-between">
              <span>Itemized Deductions</span>
              {isAccepted && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Accepted</Badge>}
              {isDisputed && <Badge className="bg-amber-100 text-amber-700 border-amber-200">Disputed — Awaiting Owner Response</Badge>}
            </CardTitle>
            <CardDescription>Review the deductions claimed by your landlord after the move-out inspection.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {deductions.length > 0 ? (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-[#F5F5F7]">
                    <TableRow>
                      <TableHead className="font-bold text-slate-600">Description</TableHead>
                      <TableHead className="font-bold text-slate-600">Category</TableHead>
                      <TableHead className="text-right font-bold text-slate-600">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deductions.map((d: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-semibold text-slate-800">
                          {d.description}
                          {d.photoUrl && (
                            <a href={d.photoUrl} target="_blank" rel="noreferrer" className="text-blue-500 text-xs ml-3 underline bg-blue-50 px-2 py-1 rounded-md">
                              View Proof
                            </a>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[d.category] || CATEGORY_COLORS.OTHER}`}>
                            {CATEGORY_LABELS[d.category] || d.category || "Other"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-black text-red-600">-${Number(d.amount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-8 text-center text-[#6E6E73] font-bold border border-dashed border-slate-200 rounded-xl">
                No deductions were claimed. Full deposit will be refunded.
              </div>
            )}

            {/* Summary */}
            <div className="mt-6 border-t border-slate-200 pt-5 space-y-3">
              <div className="flex justify-between items-center text-sm font-bold text-[#6E6E73]">
                <span>Original Security Deposit</span>
                <span>${originalDeposit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-red-400">
                <span>Total Deductions</span>
                <span>-${totalDeducted.toFixed(2)}</span>
              </div>
              {excessBalance > 0 ? (
                <div className="flex justify-between items-center text-sm font-extrabold text-orange-600 bg-orange-50 p-3 rounded-xl border border-orange-200">
                  <span>Outstanding Balance (Owes Landlord)</span>
                  <span>${excessBalance.toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center text-lg font-black text-slate-800">
                  <span>Your Refund</span>
                  <span className="text-emerald-500">${refundAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Lease meta */}
            {(lease.forwardingAddress || lease.refundMethod) && (
              <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lease.forwardingAddress && (
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#8E8E93]" />
                    <div>
                      <p className="font-bold text-[#6E6E73] uppercase tracking-wide text-[10px]">Forwarding Address</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{lease.forwardingAddress}</p>
                    </div>
                  </div>
                )}
                {lease.refundMethod && (
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <CreditCard className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#8E8E93]" />
                    <div>
                      <p className="font-bold text-[#6E6E73] uppercase tracking-wide text-[10px]">Refund Method</p>
                      <p className="font-semibold text-slate-800 mt-0.5">
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
        <Card className="rounded-[24px] shadow-sm border-[#E5E5EA]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Your Review Required
            </CardTitle>
            <CardDescription>
              Please review the deductions above and accept or dispute them within 72 hours.
              Once accepted, the owner will process your refund.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => handleReview("accept")}
              disabled={submittingAction}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              {submittingAction ? "Submitting..." : "Accept Deductions & Request Refund"}
            </Button>

            <div className="space-y-2">
              <Textarea
                placeholder="State why you are disputing these charges (min. 10 characters). Be specific — e.g. 'The carpet damage was pre-existing as noted in my move-in photos.'"
                value={disputeNote}
                onChange={e => setDisputeNote(e.target.value)}
                className="bg-slate-50 rounded-xl min-h-[80px] resize-none"
              />
              {disputeNote.length > 0 && disputeNote.length < 10 && (
                <p className="text-red-500 text-xs">{10 - disputeNote.length} more characters required.</p>
              )}
              <Button
                onClick={() => handleReview("dispute")}
                disabled={submittingAction || disputeNote.trim().length < 10}
                variant="outline"
                className="w-full h-10 rounded-xl text-amber-700 hover:text-amber-800 hover:bg-amber-50 font-bold border-amber-200 text-sm"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {submittingAction ? "Submitting..." : "Dispute These Deductions"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Awaiting owner response after first dispute */}
      {isDisputed && (
        <Card className="rounded-[24px] shadow-sm border-amber-200 bg-amber-50">
          <CardContent className="pt-6 flex items-start gap-4">
            <Clock className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-amber-900">Dispute Submitted — Awaiting Owner Response</h4>
              <p className="text-amber-800 text-sm mt-1">
                Your dispute has been sent to the owner. They can revise the deductions and resubmit for your review.
              </p>
              {lease.tenantDisputeNote && (
                <div className="mt-3 p-3 bg-amber-100 rounded-lg border border-amber-200">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Your Dispute Note:</p>
                  <p className="text-amber-900 text-sm">{lease.tenantDisputeNote}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
