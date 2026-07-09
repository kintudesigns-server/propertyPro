"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, MapPin, Calendar, Camera, UploadCloud, FileText, ArrowLeft, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

export default function EditMaintenanceRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // Data States
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [allTenants, setAllTenants] = useState<any[]>([]);
  
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
    status: "SUBMITTED",
    photos: [] as string[]
  });

  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [propsRes, tenantsRes, inspRes, reqRes] = await Promise.all([
          fetch("/api/properties").then(res => res.json()),
          fetch("/api/tenants").then(res => res.json()),
          fetch("/api/users?role=INSPECTOR").then(res => res.json()),
          fetch(`/api/maintenance?id=${id}`).then(res => res.json())
        ]);

        if (Array.isArray(propsRes)) setProperties(propsRes);
        if (Array.isArray(tenantsRes)) setAllTenants(tenantsRes);
        if (Array.isArray(inspRes)) setInspectors(inspRes);

        if (reqRes && !reqRes.error) {
          setFormData({
            title: reqRes.title || "",
            category: reqRes.category || "GENERAL",
            priority: reqRes.priority || "MEDIUM",
            description: reqRes.description || "",
            propertyId: reqRes.unit?.propertyId || "",
            unitId: reqRes.unitId || "",
            tenantId: reqRes.tenantId || "",
            inspectorId: reqRes.inspectorId || "",
            estimatedCost: reqRes.estimatedCost ? reqRes.estimatedCost.toString() : "",
            scheduledDate: reqRes.scheduledDate ? new Date(reqRes.scheduledDate).toISOString().slice(0, 16) : "",
            status: reqRes.status || "SUBMITTED",
            photos: reqRes.photos || []
          });

          if (reqRes.tenantId) {
            const tenant = tenantsRes.find((t: any) => t.id === reqRes.tenantId);
            setSelectedTenant(tenant || null);
          }
        }
      } catch (err) {
        toast.error("Failed to load request data");
      } finally {
        setFetching(false);
      }
    };
    
    loadData();
  }, [id]);

  // Fetch Units when Property changes
  useEffect(() => {
    if (formData.propertyId) {
      fetch(`/api/properties?id=${formData.propertyId}`)
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.units)) {
            setUnits(data.units);
          }
        });
    } else {
      setUnits([]);
    }
  }, [formData.propertyId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        id,
        ...formData
      };

      const res = await fetch("/api/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update request");
      }

      toast.success("Maintenance request updated successfully!");
      router.push("/dashboard/maintenance");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-12 text-center text-[#64748B] font-medium">Loading ticket details...</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20 pt-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/maintenance">
          <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-[28px] font-black text-[#0F172A] tracking-tight">Edit Request</h1>
          <p className="text-[#64748B] text-sm font-medium mt-0.5">Ticket ID: {id.split("-")[0]}</p>
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#E2E8F0]">
                    <SelectItem value="LOW">Low - Routine</SelectItem>
                    <SelectItem value="MEDIUM">Medium - Standard</SelectItem>
                    <SelectItem value="HIGH">High - Urgent</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency - Immediate Action</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Status <span className="text-[#EF4444]">*</span></Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v || "SUBMITTED"})} required>
                  <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#E2E8F0]">
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2.5">
              <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Description <span className="text-[#EF4444]">*</span></Label>
              <Textarea 
                required
                placeholder="Please describe the issue in detail..."
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, description: e.target.value})}
                className="min-h-[120px] rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-medium text-[#0F172A] shadow-sm resize-y"
              />
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
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Assignment & Scheduling */}
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

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Link href="/dashboard/maintenance">
            <Button type="button" variant="outline" className="h-12 px-8 rounded-xl border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] font-bold shadow-sm">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading} className="h-12 px-8 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold shadow-sm">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
