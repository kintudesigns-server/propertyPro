"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, MapPin, Calendar, Camera, UploadCloud, FileText, ArrowLeft, Loader2, User, X, ImageIcon, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureBlockedOverlay } from "@/components/subscription/FeatureBlockedBanner";

export default function NewMaintenanceRequestPage() {
  const featureAccess = useFeatureAccess("submit_maintenance");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const role = (session?.user as any)?.role;
  const isTenant = role === "TENANT";

  // Data States
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [allTenants, setAllTenants] = useState<any[]>([]);
  
  // Tenant Specific Auto-population State
  const [tenantProperty, setTenantProperty] = useState<any>(null);
  const [tenantUnit, setTenantUnit] = useState<any>(null);
  const [tenantLeases, setTenantLeases] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    priority: "MEDIUM",
    description: "",
    propertyId: "",
    unitId: "",
    tenantId: "",
    inspectorId: "",
    estimatedCost: "",
    scheduledDate: "",
    photos: [] as string[],
    entryPermission: false,
    hasPets: "No",
    preferredTimes: ""
  });

  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  const [prefDate, setPrefDate] = useState("");
  const [prefTime, setPrefTime] = useState("");

  useEffect(() => {
    if (formData.entryPermission) {
      setFormData(prev => ({ ...prev, preferredTimes: "Anytime (Permission Granted)" }));
    } else if (prefDate && prefTime) {
      setFormData(prev => ({ ...prev, preferredTimes: `${prefDate} | Window: ${prefTime}` }));
    } else if (prefDate) {
      setFormData(prev => ({ ...prev, preferredTimes: prefDate }));
    } else if (prefTime) {
      setFormData(prev => ({ ...prev, preferredTimes: prefTime }));
    } else {
      setFormData(prev => ({ ...prev, preferredTimes: "" }));
    }
  }, [prefDate, prefTime, formData.entryPermission]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (isTenant) {
      // Load lease to auto-populate unit/property details
      fetch("/api/leases")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const activeLeases = data.filter((l: any) => l.status === "ACTIVE");
            setTenantLeases(activeLeases);
            if (activeLeases.length > 0) {
              const firstLease = activeLeases[0];
              setFormData(prev => ({
                ...prev,
                tenantId: firstLease.tenantId || (session?.user as any)?.id,
                propertyId: firstLease.unit?.propertyId || "",
                unitId: firstLease.unitId || "",
              }));
              setTenantProperty(firstLease.unit?.property);
              setTenantUnit(firstLease.unit);
            }
          }
        });
    } else {
      // Landlord/Admin data loads
      fetch("/api/properties")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setProperties(data);
        });

      fetch("/api/tenants")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAllTenants(data);
        });

      fetch("/api/users?role=INSPECTOR")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setInspectors(data);
          }
        });
    }
  }, [status, isTenant, session, router]);

  // Fetch Units when Property changes (Landlord view only)
  useEffect(() => {
    if (!isTenant && formData.propertyId) {
      fetch(`/api/properties?id=${formData.propertyId}`)
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.units)) {
            setUnits(data.units);
          }
        });
    } else if (!isTenant) {
      setUnits([]);
    }
  }, [formData.propertyId, isTenant]);

  const handleTenantSelect = (tenantId: string | null) => {
    if (!tenantId) {
      setFormData(prev => ({ ...prev, tenantId: "" }));
      setSelectedTenant(null);
      return;
    }
    setFormData(prev => ({ ...prev, tenantId }));
    
    const tenant = allTenants.find(t => t.id === tenantId);
    if (tenant) {
      setSelectedTenant(tenant);
      
      const activeLease = tenant.leases?.find((l: any) => l.status === "ACTIVE") || tenant.leases?.[0];
      if (activeLease && activeLease.unit) {
        setFormData(prev => ({ 
          ...prev, 
          tenantId,
          propertyId: activeLease.unit.propertyId,
          unitId: activeLease.unitId 
        }));
      }
    } else {
      setSelectedTenant(null);
    }
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const allowed = fileArray.filter(f => f.size <= 10 * 1024 * 1024); // max 10MB
    if (allowed.length < fileArray.length) toast.error("Some files exceed 10MB and were skipped.");
    if (allowed.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of allowed) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Upload failed for " + file.name);
        const data = await res.json();
        uploadedUrls.push(data.url);
      }
      setFormData(prev => ({ ...prev, photos: [...prev.photos, ...uploadedUrls] }));
      toast.success(`${uploadedUrls.length} file${uploadedUrls.length > 1 ? "s" : ""} uploaded successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files);
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Append pet info to description if they have pets
      const finalDescription = formData.hasPets === "Yes" 
        ? `${formData.description}\n\n[Tenant Note: Pets are present in the unit]` 
        : formData.description;
        
      const submitData = { ...formData, description: finalDescription };
      delete (submitData as any).hasPets; // Remove before sending to API

      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit request");
      }

      toast.success("Maintenance request submitted successfully!");
      router.push(isTenant ? "/dashboard/maintenance/my-requests" : "/dashboard/maintenance");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (isTenant && featureAccess.loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
        <p className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Checking maintenance permissions...</p>
      </div>
    );
  }

  const isTenantBlocked = isTenant && !featureAccess.allowed;

  return (
    <div className="relative">
      {isTenantBlocked && (
        <FeatureBlockedOverlay
          featureLabel={featureAccess.featureLabel || "Submit Maintenance Requests"}
          reason={featureAccess.reason}
          adminNote={featureAccess.adminNote}
          expiresAt={featureAccess.expiresAt}
        />
      )}
      <div className={isTenantBlocked ? "pointer-events-none select-none blur-[2.5px] opacity-70" : ""}>
      <div className="w-full max-w-4xl mx-auto space-y-6 pt-4 pb-20 px-2 sm:px-6 font-sans">
      <div className="flex items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <Link href={isTenant ? "/dashboard/maintenance/my-requests" : "/dashboard/maintenance"}>
          <button className="h-9 w-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Submit Request</h1>
          <p className="text-[#6E6E73] text-xs font-normal mt-0.5">Create a new maintenance or repair ticket.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 font-sans">
        {/* Section 1: Request Details */}
        <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden font-sans">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <FileText className="h-4 w-4 text-slate-700" />
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">Request Details</h2>
              <p className="text-[#6E6E73] text-xs font-normal">Describe the issue and specify repair urgency</p>
            </div>
          </div>
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-normal text-[#6E6E73]">Issue Title <span className="text-rose-500">*</span></Label>
              <Input 
                required
                placeholder="e.g. Leaking faucet in master bathroom"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="h-9 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 font-normal text-xs text-[#1D1D1F] shadow-2xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-normal text-[#6E6E73]">Description <span className="text-rose-500">*</span></Label>
              <Textarea 
                required
                placeholder="Please describe the issue in detail. What is happening? When did it start?"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, description: e.target.value})}
                className="min-h-[100px] rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 font-normal text-xs text-[#1D1D1F] shadow-2xs resize-y"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-normal text-[#6E6E73]">Category <span className="text-[#EF4444]">*</span></Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v || "GENERAL"})} required>
                  <SelectTrigger className="w-full h-9 rounded-xl bg-white border-slate-200 focus:ring-slate-900/10 font-normal text-xs text-[#1D1D1F] shadow-2xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white">
                    <SelectItem value="PLUMBING">Plumbing</SelectItem>
                    <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                    <SelectItem value="HVAC">HVAC</SelectItem>
                    <SelectItem value="APPLIANCES">Appliances</SelectItem>
                    <SelectItem value="FLOORING">Flooring</SelectItem>
                    <SelectItem value="PAINTING">Painting</SelectItem>
                    <SelectItem value="ROOFING">Roofing</SelectItem>
                    <SelectItem value="LANDSCAPING">Landscaping</SelectItem>
                    <SelectItem value="CLEANING">Cleaning</SelectItem>
                    <SelectItem value="PEST_CONTROL">Pest Control</SelectItem>
                    <SelectItem value="SECURITY">Security</SelectItem>
                    <SelectItem value="GENERAL_REPAIR">General Repair</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-normal text-[#6E6E73]">Priority <span className="text-[#EF4444]">*</span></Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v || "MEDIUM"})} required>
                  <SelectTrigger className="w-full h-9 rounded-xl bg-white border-slate-200 focus:ring-slate-900/10 font-normal text-xs text-[#1D1D1F] shadow-2xs">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white">
                    <SelectItem value="LOW">Low - Routine</SelectItem>
                    <SelectItem value="MEDIUM">Medium - Standard</SelectItem>
                    <SelectItem value="HIGH">High - Urgent</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency - Immediate Action</SelectItem>
                  </SelectContent>
                </Select>
                {formData.priority === "EMERGENCY" && (
                  <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-red-700">Emergency Protocol</p>
                      <p className="text-xs font-normal text-red-600 mt-0.5">For life-threatening issues, severe flooding, or active fires, immediately call 911 or the 24/7 property emergency hotline.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-normal text-[#6E6E73]">Pets in Unit? <span className="text-[#EF4444]">*</span></Label>
                <Select value={formData.hasPets} onValueChange={(v) => setFormData({...formData, hasPets: v || "No"})} required>
                  <SelectTrigger className="w-full h-9 rounded-xl bg-white border-slate-200 focus:ring-slate-900/10 font-normal text-xs text-[#1D1D1F] shadow-2xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white">
                    <SelectItem value="No">No pets</SelectItem>
                    <SelectItem value="Yes">Yes, pets are present</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-normal text-[#6E6E73]">Permission to Enter <span className="text-[#EF4444]">*</span></Label>
                <Select 
                  value={formData.entryPermission ? "true" : "false"} 
                  onValueChange={(v) => {
                    const granted = v === "true";
                    setFormData({
                      ...formData, 
                      entryPermission: granted,
                      preferredTimes: granted ? "Anytime (Permission Granted)" : ""
                    });
                  }} 
                  required
                >
                  <SelectTrigger className="w-full h-9 rounded-xl bg-white border-slate-200 focus:ring-slate-900/10 font-normal text-xs text-[#1D1D1F] shadow-2xs">
                    <SelectValue placeholder="Select permission">
                      {formData.entryPermission ? "Yes, enter if I am not home" : "No, I must be home"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white">
                    <SelectItem value="true">Yes, enter if I am not home</SelectItem>
                    <SelectItem value="false">No, I must be home</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-normal text-[#6E6E73]">Preferred Scheduling <span className="text-[#EF4444]">*</span></Label>
                <div className="flex gap-3">
                  <div className="w-1/2">
                    <Input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={prefDate}
                      onChange={(e) => setPrefDate(e.target.value)}
                      disabled={formData.entryPermission}
                      className="w-full h-9 rounded-xl bg-white border-slate-200 focus:ring-slate-900/10 font-normal text-xs text-[#1D1D1F] shadow-2xs disabled:bg-slate-100 disabled:opacity-80"
                      required={!formData.entryPermission}
                    />
                  </div>
                  <div className="w-1/2">
                    <Select 
                      value={prefTime} 
                      onValueChange={(v) => setPrefTime(v || "")} 
                      disabled={formData.entryPermission}
                      required={!formData.entryPermission}
                    >
                      <SelectTrigger className="w-full h-9 rounded-xl bg-white border-slate-200 focus:ring-slate-900/10 font-normal text-xs text-[#1D1D1F] shadow-2xs disabled:bg-slate-100 disabled:opacity-80">
                        <SelectValue placeholder="Time Window" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 bg-white">
                        <SelectItem value="Morning (8 AM - 12 PM)">Morning (8 AM - 12 PM)</SelectItem>
                        <SelectItem value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</SelectItem>
                        <SelectItem value="Evening (4 PM - 7 PM)">Evening (4 PM - 7 PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.entryPermission && <p className="text-xs text-emerald-700 font-normal mt-1">Permission to enter granted. Vendor will schedule automatically.</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Property & Tenant */}
        <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden font-sans">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <MapPin className="h-4 w-4 text-slate-700" />
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">Location &amp; Tenant</h2>
              <p className="text-[#6E6E73] text-xs font-normal">Select the affected property, unit, and tenant details</p>
            </div>
          </div>
          <CardContent className="p-6 md:p-8 space-y-6">
            {isTenant ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-normal text-[#6E6E73]">Property <span className="text-rose-500">*</span></Label>
                    <Select 
                      value={formData.propertyId} 
                      onValueChange={(v) => {
                        const safeV = v || "";
                        const matchingLeases = tenantLeases.filter(l => l.unit?.propertyId === safeV);
                        setFormData(prev => ({
                          ...prev,
                          propertyId: safeV,
                          unitId: matchingLeases.length > 0 ? matchingLeases[0].unitId : ""
                        }));
                      }}
                      required
                    >
                      <SelectTrigger className="w-full h-9 rounded-xl bg-white border-slate-200 focus:ring-slate-900/10 font-normal text-xs text-[#1D1D1F] shadow-2xs">
                        <SelectValue placeholder="Select a property">
                          {formData.propertyId
                            ? (tenantLeases.find(l => l.unit?.propertyId === formData.propertyId)?.unit?.property?.name || "Select a property")
                            : ""}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 bg-white">
                        {Array.from(new Map(tenantLeases.map(l => [l.unit?.propertyId, l.unit?.property])).values())
                          .filter(Boolean)
                          .map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-normal text-[#6E6E73]">Unit <span className="text-rose-500">*</span></Label>
                    <Select 
                      value={formData.unitId} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, unitId: v || "" }))} 
                      required 
                      disabled={!formData.propertyId}
                    >
                      <SelectTrigger className="w-full h-9 rounded-xl bg-white border-slate-200 focus:ring-slate-900/10 font-normal text-xs text-[#1D1D1F] shadow-2xs disabled:bg-slate-100 disabled:opacity-70">
                        <SelectValue placeholder="Select a unit">
                          {formData.unitId
                            ? (tenantLeases.find(l => l.unitId === formData.unitId)?.unit?.name || "Select a unit")
                            : ""}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 bg-white">
                        {tenantLeases
                          .filter(l => l.unit?.propertyId === formData.propertyId)
                          .map((l: any) => (
                            <SelectItem key={l.unitId} value={l.unitId}>{l.unit?.name}</SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-normal text-[#6E6E73]">Tenant <span className="text-rose-500">*</span></Label>
                  <Select value={formData.tenantId} onValueChange={handleTenantSelect} required>
                    <SelectTrigger className="w-full h-9 rounded-xl bg-white border-slate-200 focus:ring-slate-900/10 font-normal text-xs text-[#1D1D1F] shadow-2xs">
                      <SelectValue placeholder="Select a tenant">
                        {formData.tenantId ? `${allTenants.find(t => t.id === formData.tenantId)?.name || ''} (${allTenants.find(t => t.id === formData.tenantId)?.email || ''})` : ""}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white max-h-60">
                      {allTenants.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#6E6E73] font-normal mt-1">Selecting a tenant will automatically fetch their property and unit.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-normal text-[#6E6E73]">Property <span className="text-rose-500">*</span></Label>
                    <Select value={formData.propertyId} onValueChange={(v) => setFormData({...formData, propertyId: v || ""})} required disabled={!!formData.tenantId}>
                      <SelectTrigger className="w-full h-9 rounded-xl bg-white border-slate-200 focus:ring-slate-900/10 font-normal text-xs text-[#1D1D1F] shadow-2xs disabled:bg-slate-100 disabled:opacity-70">
                        <SelectValue placeholder="Property">
                          {formData.propertyId 
                            ? (properties.find(p => p.id === formData.propertyId)?.name 
                               || allTenants.find(t => t.id === formData.tenantId)?.leases?.find((l: any) => l.unit?.propertyId === formData.propertyId)?.unit?.property?.name) 
                            : ""}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 bg-white">
                        {properties.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-normal text-[#6E6E73]">Unit <span className="text-rose-500">*</span></Label>
                    <Select value={formData.unitId} onValueChange={(v) => setFormData({...formData, unitId: v || ""})} disabled={!!formData.tenantId || (!formData.propertyId && units.length === 0)} required>
                      <SelectTrigger className="w-full h-9 rounded-xl bg-white border-slate-200 focus:ring-slate-900/10 font-normal text-xs text-[#1D1D1F] shadow-2xs disabled:bg-slate-100 disabled:opacity-70">
                        <SelectValue placeholder="Unit">
                          {formData.unitId ? units.find(u => u.id === formData.unitId)?.name : ""}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 bg-white">
                        {units.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedTenant && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center">
                        <User className="h-4 w-4 text-slate-700" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#1D1D1F]">{selectedTenant.name}</p>
                        <p className="text-xs font-normal text-[#6E6E73]">{selectedTenant.email}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium rounded-md uppercase tracking-wider">
                      Active Tenant
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Assignment & Scheduling (Landlord/Admin only) */}
        {!isTenant && (
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden font-sans">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Calendar className="h-4 w-4 text-slate-700" />
              <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">Assignment &amp; Scheduling</h2>
                <p className="text-[#6E6E73] text-xs font-normal">Assign an inspector and schedule the repair slot</p>
              </div>
            </div>
            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-normal text-[#6E6E73]">Assign Inspector (Optional)</Label>
                <Select value={formData.inspectorId} onValueChange={(v) => setFormData({...formData, inspectorId: v === "none" ? "" : (v || "")})}>
                  <SelectTrigger className="w-full h-9 rounded-xl bg-white border-slate-200 focus:ring-slate-900/10 font-normal text-xs text-[#1D1D1F] shadow-2xs">
                    <SelectValue placeholder="Leave unassigned">
                      {formData.inspectorId && formData.inspectorId !== "none" ? `${inspectors.find(i => i.id === formData.inspectorId)?.name || ''}` : ""}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white">
                    <SelectItem value="none">Leave unassigned</SelectItem>
                    {inspectors.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.name} ({i.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-normal text-[#6E6E73]">Estimated Cost ($)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({...formData, estimatedCost: e.target.value})}
                    className="h-9 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 font-normal text-xs text-[#1D1D1F] shadow-2xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-normal text-[#6E6E73]">Scheduled Date</Label>
                  <Input 
                    type="datetime-local"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})}
                    className="h-9 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 font-normal text-xs text-[#1D1D1F] shadow-2xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 4: Photos */}
        <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden font-sans">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <Camera className="h-4 w-4 text-slate-700" />
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">Photos &amp; Documents</h2>
              <p className="text-[#6E6E73] text-xs font-normal">Attach relevant photos or issue documentation</p>
            </div>
          </div>
          <CardContent className="p-6 md:p-8">
            {/* Hidden real file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />

            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group ${
                dragOver ? "border-slate-900 bg-slate-100" : "border-slate-200 bg-slate-50 hover:bg-slate-100/60"
              }`}
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="h-10 w-10 rounded-xl bg-white shadow-2xs border border-slate-200 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                {uploading
                  ? <Loader2 className="h-4 w-4 text-slate-900 animate-spin" />
                  : <UploadCloud className={`h-4 w-4 ${dragOver ? "text-slate-900" : "text-slate-400"}`} />
                }
              </div>
              <h3 className="text-xs font-semibold text-[#1D1D1F]">
                {uploading ? "Uploading..." : dragOver ? "Drop files here" : "Upload files or drag and drop"}
              </h3>
              <p className="text-xs font-normal text-[#6E6E73] mt-0.5">PNG, JPG, WEBP, PDF up to 10MB each</p>

              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                className="mt-4 h-9 rounded-xl border border-slate-200 text-[#1D1D1F] bg-white hover:bg-slate-50 font-medium text-xs shadow-2xs cursor-pointer"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                {uploading ? "Uploading..." : "Browse Files"}
              </Button>
            </div>

            {/* Uploaded Photo Previews */}
            {formData.photos.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-normal text-[#6E6E73] mb-3">{formData.photos.length} file{formData.photos.length > 1 ? "s" : ""} attached</p>
                <div className="flex gap-3 flex-wrap">
                  {formData.photos.map((url, i) => (
                    <div key={i} className="relative group h-20 w-20 rounded-xl overflow-hidden border border-slate-200 shadow-2xs bg-slate-100">
                      {url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                        <img src={url} alt={`upload-${i}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-slate-400" />
                          <span className="text-[9px] text-slate-500 mt-1 font-medium">PDF</span>
                        </div>
                      )}
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow cursor-pointer border-none"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end items-center gap-3 pt-4 font-sans">
          <Link href={isTenant ? "/dashboard/maintenance/my-requests" : "/dashboard/maintenance"}>
            <Button type="button" variant="ghost" className="h-9 px-4 rounded-xl font-medium text-xs text-[#6E6E73] hover:text-[#1D1D1F]">
              Cancel
            </Button>
          </Link>
          <Button 
            type="submit" 
            disabled={loading} 
            className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium px-6 rounded-xl shadow-xs transition-all text-xs border-none cursor-pointer flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : "Submit Request"}
          </Button>
        </div>
      </form>
    </div>
    </div>
    </div>
  );
}

