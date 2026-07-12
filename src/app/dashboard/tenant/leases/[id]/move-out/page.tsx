"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, FileDown, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { generateDispositionPDF } from "@/lib/pdfGenerator";
import { Input } from "@/components/ui/input";

export default function TenantFinalStatementPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: session, status } = useSession();

  const [lease, setLease] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [disputeNote, setDisputeNote] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated") {
      fetchLease();
    }
  }, [status]);

  const fetchLease = async () => {
    try {
      const res = await fetch(`/api/leases/${id}`);
      if (!res.ok) throw new Error("Failed to load lease");
      const data = await res.json();
      setLease(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeNote.trim()) {
      toast.error("Please provide a reason for the dispute.");
      return;
    }
    setSubmittingDispute(true);
    try {
      const res = await fetch(`/api/leases/${id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: disputeNote }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit dispute");
      }
      toast.success("Dispute logged successfully. The owner has been notified.");
      setDisputeNote("");
      fetchLease();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingDispute(false);
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

  if (!lease || lease.status !== "TERMINATED") {
    return <div className="p-8 text-center text-slate-500">No finalized move-out statement available for this lease.</div>;
  }

  const originalDeposit = Number(lease.securityDeposit || 0);
  const deductions = lease.deductions || [];
  const totalDeducted = deductions.reduce((sum: number, d: any) => sum + Number(d.amount), 0);
  const refundAmount = Math.max(0, originalDeposit - totalDeducted);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/dashboard/tenant/leases`}>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-slate-200">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Final Disposition Statement</h1>
          <p className="text-slate-500 font-semibold mt-1">
            Unit {lease.unit?.name} • {lease.unit?.property?.name}
          </p>
        </div>
      </div>

      <Card className="rounded-[24px] border-emerald-200 bg-emerald-50 shadow-sm overflow-hidden">
        <div className="p-8 flex flex-col md:flex-row items-center gap-8">
          <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-2xl font-black text-emerald-900">Move-Out Finalized</h2>
              <p className="text-emerald-700 font-medium mt-2 leading-relaxed">
                Your landlord has finalized the security deposit disposition. A refund of <strong className="text-emerald-900">${refundAmount.toFixed(2)}</strong> has been issued.
                <br /><br />
                {lease.refundMethod?.toLowerCase().includes("check") 
                  ? `Your landlord has mailed a check to your forwarding address (${lease.forwardingAddress || 'No Address Provided'}). Please allow 5-7 business days for delivery.`
                  : `Your landlord has processed this refund digitally via ${lease.refundMethod || "Direct Transfer"}. Please check your accounts.`}
              </p>
            </div>
            <div className="flex gap-4 pt-2">
              <Button onClick={() => generateDispositionPDF(lease)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 rounded-xl">
                <FileDown className="h-4 w-4 mr-2" /> Download Disposition PDF
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-[24px] shadow-sm border-[#E2E8F0]">
        <CardHeader className="border-b border-[#F1F5F9] pb-6">
          <CardTitle>Itemized Deductions</CardTitle>
          <CardDescription>Review the final deductions claimed by your landlord.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {deductions.length > 0 ? (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-600">Deduction Description</TableHead>
                    <TableHead className="text-right font-bold text-slate-600">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductions.map((d: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-semibold text-slate-800">
                        {d.description} 
                        {d.photoUrl && (
                          <a href={d.photoUrl} target="_blank" rel="noreferrer" className="text-blue-500 text-xs ml-3 underline bg-blue-50 px-2 py-1 rounded-md">View Proof</a>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-black text-red-600">-${Number(d.amount).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 font-bold">No deductions were claimed. Full deposit refunded.</div>
          )}

          <div className="mt-8 border-t border-slate-200 pt-6 space-y-4">
             <div className="flex justify-between items-center text-sm font-bold text-slate-500">
               <span>Original Security Deposit</span>
               <span>${originalDeposit.toFixed(2)}</span>
             </div>
             <div className="flex justify-between items-center text-sm font-bold text-red-400">
               <span>Total Deductions</span>
               <span>-${totalDeducted.toFixed(2)}</span>
             </div>
             <div className="flex justify-between items-center text-lg font-black text-slate-800">
               <span>Final Refund</span>
               <span className="text-emerald-500">${refundAmount.toFixed(2)}</span>
             </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[24px] shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Dispute Deductions</CardTitle>
          <CardDescription>If you disagree with these charges, you can log a formal dispute for your records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lease.tenantDisputeNote ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-2"><ShieldAlert className="h-4 w-4"/> Dispute Logged</h4>
              <p className="text-amber-800 text-sm">{lease.tenantDisputeNote}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Input 
                placeholder="State why you are disputing these charges (e.g. Damage was pre-existing)..." 
                value={disputeNote}
                onChange={e => setDisputeNote(e.target.value)}
                className="bg-slate-50 h-12 rounded-xl"
              />
              <Button onClick={handleDispute} disabled={submittingDispute} variant="outline" className="h-11 rounded-xl self-end text-red-600 hover:text-red-700 hover:bg-red-50 font-bold">
                {submittingDispute ? "Submitting..." : "Submit Formal Dispute"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
