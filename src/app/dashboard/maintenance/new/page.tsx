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

export default function NewMaintenanceRequestPage() {
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

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link href={isTenant ? "/dashboard/maintenance/my-requests" : "/dashboard/maintenance"}>
          <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-[28px] font-black text-[#0F172A] tracking-tight">Submit Request</h1>
          <p className="text-[#64748B] text-sm font-medium mt-0.5">Create a new maintenance or repair ticket.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Request Details */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] overflow-hidden">
          <div className="px-6 py-5 border-b border-[#F1F5F9] bg-[#FAFAFA] flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6]">
              <FileText className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-[#0F172A]">Request Details</h2>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2.5">
              <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Issue Title <span className="text-[#EF4444]">*</span></Label>
              <Input 
                required
                placeholder="e.g. Leaking faucet in master bathroom"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="h-12 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm"
              />
            </div>

            <div className="space-y-2.5">
              <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Description <span className="text-[#EF4444]">*</span></Label>
              <Textarea 
                required
                placeholder="Please describe the issue in detail. What is happening? When did it start?"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, description: e.target.value})}
                className="min-h-[120px] rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-medium text-[#0F172A] shadow-sm resize-y"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Category <span className="text-[#EF4444]">*</span></Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v || "GENERAL"})} required>
                  <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#E2E8F0]">
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

              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Priority <span className="text-[#EF4444]">*</span></Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v || "MEDIUM"})} required>
                  <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#E2E8F0]">
                    <SelectItem value="LOW">Low - Routine</SelectItem>
                    <SelectItem value="MEDIUM">Medium - Standard</SelectItem>
                    <SelectItem value="HIGH">High - Urgent</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency - Immediate Action</SelectItem>
                  </SelectContent>
                </Select>
                {formData.priority === "EMERGENCY" && (
                  <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-700">Emergency Protocol</p>
                      <p className="text-xs font-medium text-red-600 mt-0.5">For life-threatening issues, severe flooding, or active fires, immediately call 911 or the 24/7 property emergency hotline.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Pets in Unit? <span className="text-[#EF4444]">*</span></Label>
                <Select value={formData.hasPets} onValueChange={(v) => setFormData({...formData, hasPets: v || "No"})} required>
                  <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#E2E8F0]">
                    <SelectItem value="No">No pets</SelectItem>
                    <SelectItem value="Yes">Yes, pets are present</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Permission to Enter <span className="text-[#EF4444]">*</span></Label>
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
                  <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm">
                    <SelectValue placeholder="Select permission">
                      {formData.entryPermission ? "Yes, enter if I am not home" : "No, I must be home"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#E2E8F0]">
                    <SelectItem value="true">Yes, enter if I am not home</SelectItem>
                    <SelectItem value="false">No, I must be home</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5 md:col-span-2">
                <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Preferred Scheduling <span className="text-[#EF4444]">*</span></Label>
                <div className="flex gap-3">
                  <div className="w-1/2">
                    <Input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={prefDate}
                      onChange={(e) => setPrefDate(e.target.value)}
                      disabled={formData.entryPermission}
                      className="w-full h-12 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm disabled:bg-gray-50 disabled:opacity-80"
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
                      <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm disabled:bg-gray-50 disabled:opacity-80">
                        <SelectValue placeholder="Time Window" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-[#E2E8F0]">
                        <SelectItem value="Morning (8 AM - 12 PM)">Morning (8 AM - 12 PM)</SelectItem>
                        <SelectItem value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</SelectItem>
                        <SelectItem value="Evening (4 PM - 7 PM)">Evening (4 PM - 7 PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.entryPermission && <p className="text-xs text-emerald-600 font-bold mt-1">Permission to enter granted. Vendor will schedule automatically.</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Property & Tenant */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] overflow-hidden">
          <div className="px-6 py-5 border-b border-[#F1F5F9] bg-[#FAFAFA] flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#ECFDF5] flex items-center justify-center text-[#10B981]">
              <MapPin className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-[#0F172A]">Location & Tenant</h2>
          </div>
          <CardContent className="p-6 space-y-6">
            {isTenant ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Property <span className="text-[#EF4444]">*</span></Label>
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
                      <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm">
                        <SelectValue placeholder="Select a property">
                          {formData.propertyId
                            ? (tenantLeases.find(l => l.unit?.propertyId === formData.propertyId)?.unit?.property?.name || "Select a property")
                            : ""}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-[#E2E8F0] bg-white">
                        {Array.from(new Map(tenantLeases.map(l => [l.unit?.propertyId, l.unit?.property])).values())
                          .filter(Boolean)
                          .map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Unit <span className="text-[#EF4444]">*</span></Label>
                    <Select 
                      value={formData.unitId} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, unitId: v || "" }))} 
                      required 
                      disabled={!formData.propertyId}
                    >
                      <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm disabled:bg-gray-50 disabled:opacity-80">
                        <SelectValue placeholder="Select a unit">
                          {formData.unitId
                            ? (tenantLeases.find(l => l.unitId === formData.unitId)?.unit?.name || "Select a unit")
                            : ""}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-[#E2E8F0] bg-white">
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
                <div className="space-y-2.5">
                  <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Tenant <span className="text-[#EF4444]">*</span></Label>
                  <Select value={formData.tenantId} onValueChange={handleTenantSelect} required>
                    <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm">
                      <SelectValue placeholder="Select a tenant">
                        {formData.tenantId ? `${allTenants.find(t => t.id === formData.tenantId)?.name || ''} (${allTenants.find(t => t.id === formData.tenantId)?.email || ''})` : ""}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#E2E8F0] max-h-60">
                      {allTenants.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#64748B] font-medium mt-1">Selecting a tenant will automatically fetch their property and unit.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Property <span className="text-[#EF4444]">*</span></Label>
                    <Select value={formData.propertyId} onValueChange={(v) => setFormData({...formData, propertyId: v || ""})} required disabled={!!formData.tenantId}>
                      <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm disabled:bg-gray-50 disabled:opacity-80">
                        <SelectValue placeholder="Property">
                          {formData.propertyId 
                            ? (properties.find(p => p.id === formData.propertyId)?.name 
                               || allTenants.find(t => t.id === formData.tenantId)?.leases?.find((l: any) => l.unit?.propertyId === formData.propertyId)?.unit?.property?.name) 
                            : ""}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-[#E2E8F0]">
                        {properties.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Unit <span className="text-[#EF4444]">*</span></Label>
                    <Select value={formData.unitId} onValueChange={(v) => setFormData({...formData, unitId: v || ""})} disabled={!!formData.tenantId || (!formData.propertyId && units.length === 0)} required>
                      <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm disabled:bg-gray-50 disabled:opacity-80">
                        <SelectValue placeholder="Unit">
                          {formData.unitId ? units.find(u => u.id === formData.unitId)?.name : ""}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-[#E2E8F0]">
                        {units.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedTenant && (
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#E2E8F0] flex items-center justify-center">
                        <User className="h-5 w-5 text-[#64748B]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0F172A]">{selectedTenant.name}</p>
                        <p className="text-xs font-medium text-[#64748B]">{selectedTenant.email}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-[#ECFDF5] text-[#10B981] text-[10px] font-bold rounded-full uppercase tracking-wide border border-green-200">
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
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#F1F5F9] bg-[#FAFAFA] flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#FEF2F2] flex items-center justify-center text-[#EF4444]">
                <Calendar className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-[#0F172A]">Assignment & Scheduling</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Assign Inspector (Optional)</Label>
                <Select value={formData.inspectorId} onValueChange={(v) => setFormData({...formData, inspectorId: v === "none" ? "" : (v || "")})}>
                  <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm">
                    <SelectValue placeholder="Leave unassigned">
                      {formData.inspectorId && formData.inspectorId !== "none" ? `${inspectors.find(i => i.id === formData.inspectorId)?.name || ''}` : ""}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#E2E8F0]">
                    <SelectItem value="none">Leave unassigned</SelectItem>
                    {inspectors.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.name} ({i.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Estimated Cost ($)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({...formData, estimatedCost: e.target.value})}
                    className="h-12 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Scheduled Date</Label>
                  <Input 
                    type="datetime-local"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})}
                    className="h-12 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 4: Photos */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] overflow-hidden">
          <div className="px-6 py-5 border-b border-[#F1F5F9] bg-[#FAFAFA] flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#F3E8FF] flex items-center justify-center text-[#A855F7]">
              <Camera className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-[#0F172A]">Photos & Documents</h2>
          </div>
          <CardContent className="p-6">
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
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group ${
                dragOver ? "border-[#3B82F6] bg-blue-50" : "border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9]"
              }`}
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="h-14 w-14 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {uploading
                  ? <Loader2 className="h-6 w-6 text-[#3B82F6] animate-spin" />
                  : <UploadCloud className={`h-6 w-6 ${dragOver ? "text-[#3B82F6]" : "text-[#94A3B8]"}`} />
                }
              </div>
              <h3 className="text-[15px] font-bold text-[#0F172A]">
                {uploading ? "Uploading..." : dragOver ? "Drop files here" : "Upload files or drag and drop"}
              </h3>
              <p className="text-xs font-medium text-[#64748B] mt-1">PNG, JPG, WEBP, PDF up to 10MB each</p>

              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                className="mt-6 h-9 rounded-lg border-[#E2E8F0] text-[#0F172A] font-semibold text-xs shadow-sm"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                {uploading ? "Uploading..." : "Browse Files"}
              </Button>
            </div>

            {/* Uploaded Photo Previews */}
            {formData.photos.length > 0 && (
              <div className="mt-5">
                <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-3">{formData.photos.length} file{formData.photos.length > 1 ? "s" : ""} attached</p>
                <div className="flex gap-3 flex-wrap">
                  {formData.photos.map((url, i) => (
                    <div key={i} className="relative group h-20 w-20 rounded-xl overflow-hidden border-2 border-[#E2E8F0] shadow-sm bg-[#F8FAFC]">
                      {url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                        <img src={url} alt={`upload-${i}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-[#94A3B8]" />
                          <span className="text-[9px] text-[#94A3B8] mt-1 font-medium">PDF</span>
                        </div>
                      )}
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
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
        <div className="flex justify-end gap-3 pt-4">
          <Link href={isTenant ? "/dashboard/maintenance/my-requests" : "/dashboard/maintenance"}>
            <Button type="button" variant="outline" className="h-12 px-8 rounded-xl border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] font-bold shadow-sm">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading} className="h-12 px-8 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold shadow-sm">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit Request"}
          </Button>
        </div>
      </form>
    </div>
  );
}
