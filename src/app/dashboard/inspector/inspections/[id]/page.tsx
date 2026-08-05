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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
        <p className="text-slate-500 font-extrabold text-sm tracking-wider uppercase">Loading property details...</p>
      </div>
    );
  }

  if (!lease) return null;

  return (
    <div className="flex flex-col max-w-4xl mx-auto w-full pb-20 pt-4 font-sans space-y-6">
      {/* Breadcrumbs & Header */}
      <div className="px-4 md:px-0 space-y-3">
        <div className="flex items-center gap-2 text-xs font-normal text-[#6E6E73]">
          <Link href="/dashboard/inspector" className="hover:text-[#1D1D1F] transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href="/dashboard/inspector/inspections" className="hover:text-[#1D1D1F] transition-colors">Walkthroughs</Link>
          <span>/</span>
          <span className="text-[#1D1D1F] font-semibold">{lease.unit?.property?.name}</span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/inspector/inspections">
            <button className="h-9 w-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">
              Conduct {inspectionType === "PRELIMINARY" ? "Preliminary" : "Final"} Walkthrough
            </h1>
            <p className="text-xs font-normal text-[#6E6E73] mt-0.5">{lease.unit?.property?.name} &bull; Unit {lease.unit?.name}</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-0 space-y-6">
        
        {/* Info Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs font-sans flex justify-between items-center">
          <div>
            <p className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider mb-0.5">Tenant</p>
            <p className="text-xs font-semibold text-[#1D1D1F]">{lease.tenant?.name || "N/A"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider mb-0.5">Move Out Date</p>
            <p className="text-xs font-semibold text-[#1D1D1F]">{lease.moveOutDate ? new Date(lease.moveOutDate).toLocaleDateString() : "N/A"}</p>
          </div>
        </div>

        {/* Preliminary Inspection Findings */}
        {inspectionType === "FINAL" && lease.preliminaryInspectionStatus === "COMPLETED" && (
          <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-5 shadow-2xs font-sans space-y-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-semibold text-amber-950">
                Preliminary Walkthrough Report (For Reference)
              </h3>
              <p className="text-xs font-normal text-amber-800">
                Completed on {new Date(lease.preliminaryInspectionDate).toLocaleDateString()}
              </p>
            </div>
            {lease.preliminaryInspectionNotes && (
              <div className="text-xs font-normal text-amber-900 leading-relaxed">
                <strong className="font-semibold">Notes:</strong> {lease.preliminaryInspectionNotes}
              </div>
            )}
            {lease.preliminaryDeductions && Array.isArray(lease.preliminaryDeductions) && lease.preliminaryDeductions.length > 0 ? (
              <div className="space-y-2 mt-2">
                <p className="text-xs font-normal text-amber-800 uppercase tracking-wider">Logged Remediation Items:</p>
                {lease.preliminaryDeductions.map((pd: any, idx: number) => (
                  <div key={idx} className="p-3 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-amber-950 shadow-2xs flex justify-between items-center">
                    <span>{pd.description} ({pd.category.replace("_", " ")})</span>
                    <span className="text-amber-700">${Number(pd.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-normal text-amber-800 italic">No deductions logged during preliminary walkthrough.</p>
            )}
          </div>
        )}

        {/* Deductions Builder */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 md:p-8 space-y-6 font-sans">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-slate-700" />
              Log Damages &amp; Deductions
            </h3>
            <p className="text-xs font-normal text-[#6E6E73]">
              Record any issues found during the walkthrough. These will be reviewed by the owner.
            </p>
          </div>

          <div className="space-y-6">
            
            {/* No Damages Checkbox */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs flex items-center gap-3">
              <input
                id="no-damages"
                type="checkbox"
                checked={noDamagesFound}
                onChange={(e) => {
                  setNoDamagesFound(e.target.checked);
                  if (e.target.checked) setDeductions([]);
                }}
                className="h-4 w-4 text-slate-900 border-slate-300 rounded focus:ring-slate-400 cursor-pointer"
              />
              <Label htmlFor="no-damages" className="text-xs font-semibold text-[#1D1D1F] cursor-pointer select-none">
                No damages or issues found (Clear condition)
              </Label>
            </div>

            {/* New Deduction Form */}
            {!noDamagesFound && (
              <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider">Category</Label>
                <select
                  value={newDeduction.category}
                  onChange={(e) => setNewDeduction({ ...newDeduction, category: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] focus:outline-none focus:border-slate-400 shadow-2xs transition-all"
                >
                  <option value="DAMAGE">Physical Damage</option>
                  <option value="CLEANING">Cleaning Required</option>
                  <option value="UNPAID_RENT">Unpaid Rent</option>
                  <option value="UNPAID_FEE">Unpaid Fee</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider">Description</Label>
                <Input
                  placeholder="e.g., Hole in living room wall"
                  value={newDeduction.description}
                  onChange={(e) => setNewDeduction({ ...newDeduction, description: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider">Attach Photo Evidence</Label>
                  <div className="flex items-center gap-3">
                    <label className="h-9 px-3.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl cursor-pointer text-xs font-medium text-slate-700 flex items-center justify-center gap-2 shadow-2xs transition-all shrink-0">
                      <Camera className="h-4 w-4 text-slate-500" />
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
                      <div className="relative h-9 w-9 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-2xs">
                        <img src={newDeductionPhotoUrl} alt="Preview" className="h-full w-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setNewDeductionPhotoUrl("")}
                          className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full p-0.5 text-[8px] font-bold h-3.5 w-3.5 flex items-center justify-center cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button 
                  onClick={handleAddDeduction}
                  className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-xs border-none cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4 text-white" /> Add Damage Finding
                </Button>
              </div>
            </div>
            )}

            {/* List of Deductions */}
            {deductions.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider border-b border-slate-100 pb-2">Logged Items ({deductions.length})</h4>
                {deductions.map((d, index) => (
                  <div key={index} className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl shadow-2xs flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-[#1D1D1F]">{d.description}</p>
                        {d.photoUrl && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs inline-flex items-center gap-1">
                            <Camera className="h-3 w-3 text-emerald-600" /> Photo Attached
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-normal text-rose-700 mt-0.5">{d.category.replace("_", " ")}</p>
                      
                      {d.photoUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 max-w-[120px] shadow-2xs bg-white">
                          <img 
                            src={d.photoUrl} 
                            alt="Damage evidence" 
                            className="w-full h-20 object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                            onClick={() => window.open(d.photoUrl, '_blank')}
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-right flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => removeDeduction(index)}
                        className="text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-100/50 cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider">Inspector Notes</Label>
          <textarea
            placeholder="General assessment of the property's condition..."
            value={inspectionNotes}
            onChange={(e) => setInspectionNotes(e.target.value)}
            className="w-full min-h-[100px] rounded-xl border border-slate-200 bg-white p-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all resize-none"
          />
        </div>

        {/* Declaration Checkbox */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs flex items-start gap-3">
          <input
            id="declaration-checkbox"
            type="checkbox"
            checked={signed}
            onChange={(e) => setSigned(e.target.checked)}
            className="h-4 w-4 text-slate-900 border-slate-300 rounded focus:ring-slate-400 mt-0.5 cursor-pointer shrink-0"
          />
          <Label htmlFor="declaration-checkbox" className="text-xs font-normal text-[#6E6E73] leading-relaxed cursor-pointer select-none">
            I hereby declare that I have personally inspected this unit, and the damages, deductions, and notes logged above represent a true and accurate assessment of the property's condition for this {inspectionType === "PRELIMINARY" ? "preliminary" : "final"} walkthrough.
          </Label>
        </div>

        {/* Submit Button */}
        <div>
          <Button 
            onClick={handleSubmit}
            disabled={submitting || !signed}
            className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-xs border-none cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? "Submitting..." : `Submit ${inspectionType === "PRELIMINARY" ? "Preliminary" : "Final"} Report`}
          </Button>
        </div>

      </div>
    </div>
  );
}
