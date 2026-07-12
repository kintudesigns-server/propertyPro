"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Trash2, ShieldAlert, CheckCircle2, FileDown } from "lucide-react";
import Link from "next/link";
import { generateDispositionPDF } from "@/lib/pdfGenerator";

export default function FinalStatementPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: session, status } = useSession();

  const [lease, setLease] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [processing, setProcessing] = useState(false);
  const [refundMethod, setRefundMethod] = useState("Mailed Check");
  const [refundRef, setRefundRef] = useState("");
  
  const [deductions, setDeductions] = useState<{ amount: string; description: string; photoUrl: string }[]>([]);
  const [newDeduction, setNewDeduction] = useState({ amount: "", description: "", photoUrl: "" });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      
      let initialDeductions = data.deductions || [];
      // Auto-inject unpaid invoices if we haven't terminated yet
      if (data.status !== "TERMINATED" && data.invoices) {
        const unpaid = data.invoices.filter((inv: any) => inv.status === "UNPAID" || inv.status === "OVERDUE");
        unpaid.forEach((inv: any) => {
           const desc = `Unpaid Invoice: ${inv.invoiceType || "Rent"}`;
           if (!initialDeductions.find((d: any) => d.description === desc)) {
              initialDeductions.push({ amount: inv.amount.toString(), description: desc, photoUrl: "" });
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

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", e.target.files[0]);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setNewDeduction(prev => ({ ...prev, photoUrl: data.url }));
      toast.success("Photo uploaded!");
    } catch (err) {
      toast.error("Failed to upload photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleAddDeduction = () => {
    if (!newDeduction.amount || !newDeduction.description) {
      toast.error("Amount and description are required.");
      return;
    }
    setDeductions([...deductions, { ...newDeduction }]);
    setNewDeduction({ amount: "", description: "", photoUrl: "" });
  };

  const handleAddEarlyTerminationFee = () => {
    const fee = Number(lease?.earlyTerminationFee || 0);
    if (fee <= 0) {
      toast.error("No Early Termination Fee set on this lease.");
      return;
    }
    setDeductions([...deductions, { amount: fee.toString(), description: "Early Termination Fee", photoUrl: "" }]);
  };

  const handleRemoveDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const handleFinalizeMoveOut = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/leases/${id}/move-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deductions, refundMethod, refundRef }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process move out");
      }
      toast.success("Lease terminated and Final Statement generated.");
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

  if (!lease) {
    return <div className="p-8 text-center text-slate-500">Lease not found.</div>;
  }

  const isShortNotice = lease.isShortNotice;
  const originalDeposit = Number(lease.securityDeposit || 0);
  const totalDeducted = deductions.reduce((sum, d) => sum + Number(d.amount), 0);
  const refundAmount = Math.max(0, originalDeposit - totalDeducted);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/dashboard/leases/${id}`}>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-slate-200">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Final Disposition Statement</h1>
          <p className="text-slate-500 font-semibold mt-1">
            Unit {lease.unit?.name} • Tenant: {lease.tenant?.name}
          </p>
        </div>
      </div>

      {lease.status !== "TERMINATED" && (
        <Card className="rounded-[24px] border-amber-200 bg-amber-50 shadow-sm overflow-hidden">
          <div className="p-4 flex items-center gap-4">
             <ShieldAlert className="h-8 w-8 text-amber-600" />
             <div>
                <h3 className="font-bold text-amber-900">Compliance Deadline</h3>
                <p className="text-sm text-amber-700">
                  State law requires the deposit disposition to be sent within {lease.depositReturnDays || 21} days of move-out. 
                  {lease.moveOutDate && (
                     <> Deadline: <strong>{new Date(new Date(lease.moveOutDate).getTime() + (lease.depositReturnDays || 21) * 24 * 60 * 60 * 1000).toLocaleDateString()}</strong></>
                  )}
                </p>
             </div>
          </div>
        </Card>
      )}

      {lease.status === "TERMINATED" ? (
        lease.tenantDisputeNote ? (
          <Card className="rounded-[24px] border-amber-200 bg-amber-50 shadow-sm overflow-hidden">
            <div className="p-8 flex flex-col md:flex-row items-center gap-8">
              <div className="h-24 w-24 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <ShieldAlert className="h-12 w-12 text-amber-600" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-black text-amber-900">⚠️ Tenant Disputed Deductions</h2>
                  <p className="text-amber-700 font-medium mt-2 leading-relaxed">
                    The security deposit disposition has been recorded, but the tenant has logged a formal dispute regarding the charges.
                  </p>
                </div>
                <div className="p-4 bg-white/60 rounded-xl border border-amber-100 backdrop-blur-sm">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Tenant's Note:</p>
                  <p className="font-semibold text-amber-950 italic">"{lease.tenantDisputeNote}"</p>
                </div>
                <div className="flex gap-4 pt-2">
                  <Button onClick={() => generateDispositionPDF(lease)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-11 px-6 rounded-xl">
                    <FileDown className="h-4 w-4 mr-2" /> Download Disposition PDF
                  </Button>
                  <Link href={`/dashboard/leases/${lease.id}`}>
                    <Button variant="outline" className="border-amber-200 bg-white hover:bg-amber-50 text-amber-800 font-bold h-11 px-6 rounded-xl">
                      Return to Lease Ledger
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="rounded-[24px] border-emerald-200 bg-emerald-50 shadow-sm overflow-hidden">
            <div className="p-8 flex flex-col md:flex-row items-center gap-8">
              <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-black text-emerald-900">Lease Officially Terminated</h2>
                  <p className="text-emerald-700 font-medium mt-2 leading-relaxed">
                    The security deposit disposition has been recorded. You must now remit the final refund of <strong className="text-emerald-900">${refundAmount.toFixed(2)}</strong> to the tenant's forwarding address.
                  </p>
                </div>
                <div className="p-4 bg-white/60 rounded-xl border border-emerald-100 backdrop-blur-sm">
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Mail Check To:</p>
                  <p className="font-semibold text-emerald-950">{lease.forwardingAddress || 'No Forwarding Address Provided'}</p>
                </div>
                <div className="flex gap-4 pt-2">
                  <Button onClick={() => generateDispositionPDF(lease)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 rounded-xl">
                    <FileDown className="h-4 w-4 mr-2" /> Download Disposition PDF
                  </Button>
                  <Link href={`/dashboard/leases/${lease.id}`}>
                    <Button variant="outline" className="border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-800 font-bold h-11 px-6 rounded-xl">
                      Return to Lease Ledger
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        )
      ) : (
        <>
          <Card className="rounded-[24px] shadow-sm border-[#E2E8F0]">
            <CardHeader className="border-b border-[#F1F5F9] pb-6">
              <CardTitle>Tenant & Move-Out Information</CardTitle>
              <CardDescription>Review the tenant's requested details before finalizing deductions.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Move-Out Date</Label>
                <div className="font-black text-slate-900 mt-1">{lease.moveOutDate ? new Date(lease.moveOutDate).toLocaleDateString() : 'N/A'}</div>
                {isShortNotice && (
                  <div className="text-amber-600 text-[10px] font-bold mt-2 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3"/> Short Notice (&lt;{lease.moveOutNoticeDays} days)
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Reason</Label>
                <div className="font-bold text-slate-900 mt-1">{lease.moveOutReason || "Not provided"}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 md:col-span-2">
                <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Forwarding Address</Label>
                <div className="font-bold text-slate-900 mt-1 whitespace-pre-wrap">{lease.forwardingAddress || "Not provided"}</div>
                <p className="text-[10px] text-slate-500 mt-2 font-semibold">You will need to mail the final disposition letter and check here.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] shadow-sm border-[#E2E8F0]">
            <CardHeader className="border-b border-[#F1F5F9] pb-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle>Deductions Calculator</CardTitle>
                <CardDescription>Itemize cleaning, repairs, or fees.</CardDescription>
              </div>
              {isShortNotice && lease.earlyTerminationFee && (
                <Button onClick={handleAddEarlyTerminationFee} variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold rounded-xl h-9 text-xs">
                  + Apply Early Termination Fee (${Number(lease.earlyTerminationFee).toFixed(2)})
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="space-y-2 flex-1">
                    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Item Description</Label>
                    <Input
                      placeholder="e.g. Deep cleaning fee"
                      value={newDeduction.description}
                      onChange={(e) => setNewDeduction({ ...newDeduction, description: e.target.value })}
                      className="bg-white rounded-xl h-11 focus:ring-[#3B82F6]"
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-32">
                    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Amount ($)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={newDeduction.amount}
                      onChange={(e) => setNewDeduction({ ...newDeduction, amount: e.target.value })}
                      className="bg-white rounded-xl h-11 focus:ring-[#3B82F6]"
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-44">
                    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Proof (Optional)</Label>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleUploadFile}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-white h-11 border-slate-200 text-xs text-slate-600 font-bold hover:bg-slate-50 rounded-xl"
                      >
                        {uploading ? "Uploading..." : newDeduction.photoUrl ? "✓ Attached" : "Upload Photo"}
                      </Button>
                    </div>
                  </div>
                  <Button onClick={handleAddDeduction} className="w-full md:w-auto font-bold rounded-xl h-11 bg-[#0F172A] hover:bg-[#1E293B] text-white">
                    Add Item
                  </Button>
                </div>
              </div>

              {deductions.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-slate-600">Deduction Description</TableHead>
                        <TableHead className="text-right font-bold text-slate-600">Amount</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deductions.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-semibold text-slate-800">
                            {d.description} 
                            {d.photoUrl && <a href={d.photoUrl} target="_blank" rel="noreferrer" className="text-blue-500 text-xs ml-2 underline">View Proof</a>}
                          </TableCell>
                          <TableCell className="text-right font-black text-red-600">-${Number(d.amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 hover:text-red-600 rounded-lg" onClick={() => handleRemoveDeduction(i)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

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
                  <span className="text-slate-300 font-black uppercase tracking-wider text-sm">Final Refund Due</span>
                  <span className="text-4xl font-black text-emerald-400">${refundAmount.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="w-full md:w-[320px] bg-slate-800 rounded-2xl p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Refund Method</Label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="w-full h-11 bg-slate-700 border-0 rounded-xl px-3 text-white focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="Mailed Check">Mailed Check</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Venmo / Zelle">Venmo / Zelle</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ref # (Optional)</Label>
                  <Input
                    value={refundRef}
                    onChange={(e) => setRefundRef(e.target.value)}
                    placeholder="Check # or TXN ID"
                    className="h-11 bg-slate-700 border-0 rounded-xl px-3 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button 
                  onClick={handleFinalizeMoveOut} 
                  disabled={processing} 
                  className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-sm transition-colors mt-2"
                >
                  {processing ? "Processing..." : "Finalize & Terminate Lease"}
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
