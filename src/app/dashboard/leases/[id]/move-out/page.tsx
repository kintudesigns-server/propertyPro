"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ShieldCheck, Receipt, DollarSign, ArrowLeft, Download, Camera, Info, Calendar, User, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { generatePDF } from "@/lib/pdfGenerator";

export default function MoveOutPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: session, status } = useSession();

  const [lease, setLease] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Step States
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Inspection
  const [inspectionDate, setInspectionDate] = useState("");
  const [moveOutInspectorId, setMoveOutInspectorId] = useState("");
  const [isSelfInspect, setIsSelfInspect] = useState(true);
  
  // Deductions
  const [deductions, setDeductions] = useState<{ amount: string; description: string; photoUrl: string }[]>([]);
  const [newDeduction, setNewDeduction] = useState({ amount: "", description: "", photoUrl: "" });
  const [inspectionNotes, setInspectionNotes] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated") {
      fetchLease();
      fetchTeam();
    }
  }, [status]);

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/users?role=INSPECTOR");
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLease = async () => {
    try {
      const res = await fetch(`/api/leases/${id}`);
      if (!res.ok) throw new Error("Failed to load lease");
      const data = await res.json();
      setLease(data);
      if (data.deductions) setDeductions(data.deductions);
      if (data.inspectionNotes) setInspectionNotes(data.inspectionNotes);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await fetch(`/api/leases/${id}/inspection`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspectionDate,
          moveOutInspectorId: isSelfInspect ? null : moveOutInspectorId
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Inspection scheduled");
      fetchLease();
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setProcessing(false);
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
      toast.success("Damage photo uploaded successfully!");
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

  const handleRemoveDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const handleSubmitInspection = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/leases/${id}/inspection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deductions, inspectionNotes, inspectionPhotos: [] }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Inspection submitted. Awaiting tenant review.");
      fetchLease();
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setProcessing(false);
    }
  };

  const handleFinalizeMoveOut = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/leases/${id}/move-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deductions }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process move out");
      }
      toast.success("Move-out finalized and sent to admin!");
      fetchLease();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Stepper logic
  const steps = [
    { label: "Request", status: "MOVE_OUT_REQUESTED" },
    { label: "Schedule", status: "INSPECTION_SCHEDULED" },
    { label: "Review", status: "INSPECTION_COMPLETED" },
    { label: "Finalize", status: "TENANT_ACCEPTED" }
  ];
  
  const getStepStatus = (stepStatus: string) => {
    if (!lease) return "waiting";
    const statusMap: Record<string, number> = {
      "NONE": 0,
      "MOVE_OUT_REQUESTED": 1,
      "INSPECTION_SCHEDULED": 2,
      "INSPECTION_COMPLETED": 3,
      "TENANT_DISPUTED": 3,
      "ADMIN_MEDIATION": 3,
      "TENANT_ACCEPTED": 4,
      "PENDING_ADMIN_PAYOUT": 5,
      "COMPLETED": 6
    };
    const currentIdx = statusMap[lease.moveOutStatus] || 0;
    const stepIdx = statusMap[stepStatus];
    if (currentIdx > stepIdx) return "completed";
    if (currentIdx === stepIdx) return "current";
    return "waiting";
  };

  if (loading || status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-slate-400 font-extrabold text-sm tracking-wider uppercase">Loading...</p>
      </div>
    );
  }

  if (!lease) {
    return <div className="p-8 text-center text-slate-500">Lease not found.</div>;
  }

  const isShortNotice = lease.moveOutDate && 
    (new Date(lease.moveOutDate).getTime() - new Date(lease.moveOutRequestDate).getTime()) / (1000 * 3600 * 24) < lease.moveOutNoticeDays;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/dashboard/leases/${id}`}>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-slate-200">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Move-Out Lifecycle</h1>
          <p className="text-slate-500 font-semibold mt-1">
            Unit {lease.unit?.name} • Tenant: {lease.tenant?.name}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <Card className="bg-white p-6 rounded-2xl shadow-sm border-slate-200">
        <div className="flex justify-between items-center relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10 rounded-full" />
          {steps.map((step, idx) => {
            const st = getStepStatus(step.status);
            return (
              <div key={idx} className="flex flex-col items-center gap-2 bg-white px-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                  st === "completed" ? "bg-emerald-500 text-white" :
                  st === "current" ? "bg-blue-600 text-white ring-4 ring-blue-100" :
                  "bg-slate-100 text-slate-400"
                }`}>
                  {st === "completed" ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                </div>
                <span className={`text-xs font-bold ${st === "waiting" ? "text-slate-400" : "text-slate-700"}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Step Content */}
      {lease.moveOutStatus === "MOVE_OUT_REQUESTED" && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Schedule Inspection</CardTitle>
            <CardDescription>Tenant has requested to move out.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <Label className="text-xs text-slate-500">Preferred Date</Label>
                <div className="font-bold">{new Date(lease.moveOutDate).toLocaleDateString()}</div>
                {isShortNotice && (
                  <div className="text-amber-600 text-[10px] font-bold mt-1">
                    <AlertCircle className="h-3 w-3 inline mr-1"/> Short Notice (&lt;{lease.moveOutNoticeDays} days)
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <Label className="text-xs text-slate-500">Reason</Label>
                <div className="font-bold">{lease.moveOutReason || "Not provided"}</div>
              </div>
            </div>

            <form onSubmit={handleScheduleInspection} className="space-y-4">
              <div className="space-y-2">
                <Label>Inspection Date</Label>
                <Input type="date" required value={inspectionDate} onChange={e => setInspectionDate(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <Label>Inspector Assignment</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input type="radio" checked={isSelfInspect} onChange={() => setIsSelfInspect(true)} /> Self-Inspect
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input type="radio" checked={!isSelfInspect} onChange={() => setIsSelfInspect(false)} /> Assign Team Member
                  </label>
                </div>
                {!isSelfInspect && (
                  <select 
                    value={moveOutInspectorId}
                    onChange={e => setMoveOutInspectorId(e.target.value)}
                    className="w-full h-10 mt-2 rounded-xl border border-slate-200 px-3"
                    required
                  >
                    <option value="">Select Inspector...</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <Button type="submit" disabled={processing} className="w-full bg-blue-600 hover:bg-blue-700 font-bold rounded-xl h-11">
                Confirm & Schedule Inspection
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {(lease.moveOutStatus === "INSPECTION_SCHEDULED" || lease.moveOutStatus === "TENANT_DISPUTED") && (
        <Card className="rounded-2xl shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Conduct Inspection</CardTitle>
            <CardDescription>Record deductions and upload photo evidence.</CardDescription>
            {lease.moveOutStatus === "TENANT_DISPUTED" && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl mt-4 border border-red-100">
                <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4"/> Tenant Disputed Previous Estimate (Count: {lease.disputeCount}/2)
                </h4>
                <p className="text-xs italic">"{lease.tenantDisputeNote}"</p>
                <p className="text-xs mt-2 font-bold">Please revise deductions and re-submit.</p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Deductions Form */}
            <div className="p-6 border rounded-xl bg-slate-50">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="space-y-1.5 flex-1">
                    <Label className="text-xs font-bold text-slate-600">Damage Description</Label>
                    <Input
                      placeholder="e.g. Broken blinds in living room"
                      value={newDeduction.description}
                      onChange={(e) => setNewDeduction({ ...newDeduction, description: e.target.value })}
                      className="bg-white hover:border-[#3B82F6] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5 w-full md:w-32">
                    <Label className="text-xs font-bold text-slate-600">Amount ($)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={newDeduction.amount}
                      onChange={(e) => setNewDeduction({ ...newDeduction, amount: e.target.value })}
                      className="bg-white hover:border-[#3B82F6] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5 w-full md:w-44">
                    <Label className="text-xs font-bold text-slate-600">Proof of Damage (Photo)</Label>
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
                        className="w-full bg-white h-10 border-slate-200 text-xs text-slate-600 font-bold hover:bg-slate-50"
                      >
                        {uploading ? "Uploading..." : newDeduction.photoUrl ? "✓ Attached" : "Upload Image"}
                      </Button>
                    </div>
                  </div>
                  <Button onClick={handleAddDeduction} className="w-full md:w-auto font-bold rounded-xl h-10 bg-[#3B82F6] hover:bg-[#2563EB] text-white">
                    Add Item
                  </Button>
                </div>
              </div>

            {/* Deductions Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deductions.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell>{d.description} {d.photoUrl && <a href={d.photoUrl} target="_blank" className="text-blue-500 text-xs ml-2 underline">Photo</a>}</TableCell>
                    <TableCell className="text-right font-bold text-red-500">-${Number(d.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveDeduction(i)}><Trash2 className="h-4 w-4 text-red-400"/></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Button onClick={handleSubmitInspection} disabled={processing} className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold">
              Submit Inspection & Send to Tenant
            </Button>
          </CardContent>
        </Card>
      )}

      {lease.moveOutStatus === "INSPECTION_COMPLETED" && (
        <Card className="rounded-2xl border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">Awaiting Tenant Review</CardTitle>
            <CardDescription className="text-amber-700">The refund estimate has been sent. Waiting for tenant to accept or dispute.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {lease.moveOutStatus === "ADMIN_MEDIATION" && (
        <Card className="rounded-2xl border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Escalated to Admin Mediation</CardTitle>
            <CardDescription className="text-red-700">Tenant disputed the estimate 2 times. An Admin must now step in to resolve this.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {lease.moveOutStatus === "TENANT_ACCEPTED" && (
        <Card className="rounded-2xl border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-blue-500"/> Tenant Accepted</CardTitle>
            <CardDescription>Tenant has accepted deductions and verified bank details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
               <div>
                 <p className="text-xs text-slate-500 font-bold uppercase">Final Refund Amount</p>
                 <p className="text-2xl font-black text-emerald-600">
                   ${(Number(lease.securityDeposit || 0) - deductions.reduce((sum, d) => sum + Number(d.amount), 0)).toFixed(2)}
                 </p>
               </div>
               <div className="text-right">
                 <p className="text-xs text-slate-500 font-bold uppercase">Tenant Bank Info</p>
                 <p className="text-sm font-bold text-slate-800">Verified ✓</p>
               </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl flex gap-3 text-sm text-blue-800 font-medium">
              <Info className="h-5 w-5 flex-shrink-0 text-blue-600"/>
              Once finalized, this will create a Payout Request for the Admin to execute the final bank transfer.
            </div>
            <Button onClick={handleFinalizeMoveOut} disabled={processing} className="w-full bg-blue-600 hover:bg-blue-700 font-bold h-11 rounded-xl text-white">
              Finalize & Submit to Admin
            </Button>
          </CardContent>
        </Card>
      )}
      
      {(lease.moveOutStatus === "PENDING_ADMIN_PAYOUT" || lease.moveOutStatus === "COMPLETED") && (
          <Card className="rounded-2xl border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5"/> 
                {lease.moveOutStatus === "COMPLETED" ? "Payout Completed" : "Pending Admin Payout"}
            </CardTitle>
            <CardDescription className="text-emerald-700">This move-out process is finalized.</CardDescription>
          </CardHeader>
        </Card>
      )}

    </div>
  );
}
