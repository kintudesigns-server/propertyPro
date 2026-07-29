"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Camera, ClipboardCheck } from "lucide-react";
import Link from "next/link";

export default function ConductInspectionPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { status } = useSession();
  
  const searchParams = useSearchParams();
  const inspectionType = searchParams ? (searchParams.get("type") || "FINAL") : "FINAL";
  
  const [lease, setLease] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [deductions, setDeductions] = useState<any[]>([]);
  const [noDamagesFound, setNoDamagesFound] = useState(false);
  const [newDeduction, setNewDeduction] = useState({ amount: "", description: "", category: "DAMAGE" });
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [newDeductionPhotoUrl, setNewDeductionPhotoUrl] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      fetchLease();
    }
  }, [status, id]);

  const fetchLease = async () => {
    try {
      const res = await fetch(`/api/leases/${id}`);
      if (!res.ok) throw new Error("Failed to load lease or forbidden.");
      const data = await res.json();
      setLease(data);
      // Auto-preload preliminary walkthrough deductions into the active checklist
      if (inspectionType === "FINAL" && data.preliminaryInspectionStatus === "COMPLETED" && data.preliminaryDeductions && Array.isArray(data.preliminaryDeductions)) {
        setDeductions(data.preliminaryDeductions);
      }
    } catch (err: any) {
      toast.error(err.message);
      router.push("/dashboard/inspector");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to upload photo.");
      }
      const data = await res.json();
      setNewDeductionPhotoUrl(data.url);
      toast.success("Photo uploaded successfully.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddDeduction = () => {
    if (!newDeduction.description) {
      toast.error("Description is required.");
      return;
    }
    
    setDeductions([...deductions, { ...newDeduction, amount: "0.00", photoUrl: newDeductionPhotoUrl }]);
    setNewDeduction({ amount: "", description: "", category: "DAMAGE" });
    setNewDeductionPhotoUrl("");
  };

  const removeDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!signed) {
      toast.error("You must sign the declaration before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leases/${id}/inspection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deductions,
          inspectionNotes,
          inspectionType
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit inspection");
      }
      toast.success("Inspection completed successfully!");
      router.push("/dashboard/inspector");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
        <p className="text-[#8E8E93] font-extrabold text-sm tracking-wider uppercase">Loading property details...</p>
      </div>
    );
  }

  if (!lease) return null;

  return (
    <div className="flex flex-col max-w-2xl mx-auto w-full pb-20 pt-4">
      {/* Mobile-friendly Header */}
      <div className="flex items-center gap-3 mb-6 px-4 md:px-0">
        <Link href="/dashboard/inspector">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-slate-200 bg-white">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-900 leading-tight">
            Conduct {inspectionType === "PRELIMINARY" ? "Preliminary" : "Final"} Walkthrough
          </h1>
          <p className="text-sm font-semibold text-[#6E6E73]">{lease.unit?.property?.name} - {lease.unit?.name}</p>
        </div>
      </div>

      <div className="px-4 md:px-0 space-y-6">
        
        {/* Info Card */}
        <Card className="bg-indigo-50/50 border-indigo-100 shadow-none rounded-2xl">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Tenant</p>
              <p className="font-bold text-indigo-900">{lease.tenant?.name || "N/A"}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Move Out Date</p>
              <p className="font-bold text-indigo-900">{lease.moveOutDate ? new Date(lease.moveOutDate).toLocaleDateString() : "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Preliminary Inspection Findings */}
        {inspectionType === "FINAL" && lease.preliminaryInspectionStatus === "COMPLETED" && (
          <Card className="border-amber-200 bg-amber-50/50 shadow-none rounded-2xl overflow-hidden">
            <CardHeader className="py-4 px-5 border-b border-amber-100 bg-amber-50">
              <CardTitle className="text-sm font-black text-amber-900">
                Preliminary Walkthrough Report (For Reference)
              </CardTitle>
              <CardDescription className="text-xs text-amber-700 font-semibold mt-0.5">
                Completed on {new Date(lease.preliminaryInspectionDate).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {lease.preliminaryInspectionNotes && (
                <div className="text-xs text-amber-800 font-medium">
                  <strong>Notes:</strong> {lease.preliminaryInspectionNotes}
                </div>
              )}
              {lease.preliminaryDeductions && Array.isArray(lease.preliminaryDeductions) && lease.preliminaryDeductions.length > 0 ? (
                <div className="space-y-2 mt-2">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Logged Remediation Items:</p>
                  {lease.preliminaryDeductions.map((pd: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-amber-100 font-semibold text-amber-900">
                      <span>{pd.description} ({pd.category.replace("_", " ")})</span>
                      <span className="text-amber-600">${Number(pd.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-700 italic">No deductions logged during preliminary walkthrough.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Deductions Builder */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-5">
            <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-indigo-600" />
              Log Damages & Deductions
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-[#6E6E73]">
              Record any issues found during the walkthrough. These will be reviewed by the owner.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-6">
            
            {/* No Damages Checkbox */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <input
                id="no-damages"
                type="checkbox"
                checked={noDamagesFound}
                onChange={(e) => {
                  setNoDamagesFound(e.target.checked);
                  if (e.target.checked) setDeductions([]);
                }}
                className="h-5 w-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <Label htmlFor="no-damages" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                No damages or issues found (Clear condition)
              </Label>
            </div>

            {/* New Deduction Form */}
            {!noDamagesFound && (
              <div className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-[#6E6E73] uppercase">Category</Label>
                <select
                  value={newDeduction.category}
                  onChange={(e) => setNewDeduction({ ...newDeduction, category: e.target.value })}
                  className="mt-1 w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="DAMAGE">Physical Damage</option>
                  <option value="CLEANING">Cleaning Required</option>
                  <option value="UNPAID_RENT">Unpaid Rent</option>
                  <option value="UNPAID_FEE">Unpaid Fee</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#6E6E73] uppercase">Description</Label>
                <Input
                  placeholder="e.g., Hole in living room wall"
                  value={newDeduction.description}
                  onChange={(e) => setNewDeduction({ ...newDeduction, description: e.target.value })}
                  className="mt-1 h-11 bg-white border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-xs font-bold text-[#6E6E73] uppercase">Attach Photo Evidence</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <label className="flex items-center justify-center h-11 px-4 border border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-[#F2F2F7] cursor-pointer text-xs font-bold text-slate-600 gap-2 shrink-0">
                      <Camera className="h-5 w-5 text-[#6E6E73]" />
                      {uploadingPhoto ? "Uploading..." : newDeductionPhotoUrl ? "Change Photo" : "Take Photo / Upload"}
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        onChange={handlePhotoUpload}
                        className="hidden" 
                      />
                    </label>
                    {newDeductionPhotoUrl && (
                      <div className="relative h-11 w-11 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                        <img src={newDeductionPhotoUrl} alt="Preview" className="h-full w-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setNewDeductionPhotoUrl("")}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5 text-[8px] font-bold h-4 w-4 flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleAddDeduction}
                  className="w-full h-11 bg-slate-900 hover:bg-[#007AFF] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-none"
                >
                  <Plus className="h-5 w-5" /> Add Damage Finding
                </Button>
              </div>
            </div>
            )}

            {/* List of Deductions */}
            {deductions.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-xs font-bold text-[#8E8E93] uppercase border-b border-slate-100 pb-2">Logged Items ({deductions.length})</h4>
                {deductions.map((d, index) => (
                  <div key={index} className="flex justify-between items-start p-3 bg-red-50 border border-red-100 rounded-xl gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-900">{d.description}</p>
                        {d.photoUrl && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Camera className="h-3 w-3" /> Photo Attached
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-red-500 mt-0.5">{d.category.replace("_", " ")}</p>
                      
                      {d.photoUrl && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-slate-100 max-w-[120px] shadow-sm bg-slate-50">
                          <img 
                            src={d.photoUrl} 
                            alt="Damage evidence" 
                            className="w-full h-20 object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                            onClick={() => window.open(d.photoUrl, '_blank')}
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-right flex items-center gap-4 shrink-0">
                      <button 
                        onClick={() => removeDeduction(index)}
                        className="text-red-400 hover:text-red-600 p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </CardContent>
        </Card>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-[#6E6E73] uppercase pl-1">Inspector Notes</Label>
          <textarea
            placeholder="General assessment of the property's condition..."
            value={inspectionNotes}
            onChange={(e) => setInspectionNotes(e.target.value)}
            className="w-full h-32 bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-sm"
          />
        </div>

        {/* Declaration Checkbox */}
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-sm">
          <input
            id="declaration-checkbox"
            type="checkbox"
            checked={signed}
            onChange={(e) => setSigned(e.target.checked)}
            className="h-5 w-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 mt-0.5 cursor-pointer"
          />
          <Label htmlFor="declaration-checkbox" className="text-xs font-semibold text-slate-600 leading-normal cursor-pointer select-none">
            I hereby declare that I have personally inspected this unit, and the damages, deductions, and notes logged above represent a true and accurate assessment of the property's condition for this {inspectionType === "PRELIMINARY" ? "preliminary" : "final"} walkthrough.
          </Label>
        </div>

        {/* Submit Button - Fixed to bottom on mobile, inline on desktop */}
        <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-slate-200 md:relative md:bg-transparent md:border-0 md:p-0 z-10">
          <Button 
            onClick={handleSubmit}
            disabled={submitting || !signed}
            className="w-full h-14 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-lg shadow-indigo-500/30 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : `Submit ${inspectionType === "PRELIMINARY" ? "Preliminary" : "Final"} Report`}
          </Button>
        </div>

      </div>
    </div>
  );
}
