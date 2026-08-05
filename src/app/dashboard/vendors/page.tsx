"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Wrench, Mail, Phone, MoreHorizontal, FileText, CheckCircle2, Edit, Trash, Filter, Eye } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DollarSign, ShieldAlert, FileSignature, Lock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useModuleAccess } from "@/hooks/useModuleAccess";
import ModuleLockedBanner from "@/components/subscription/ModuleLockedBanner";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureBlockedOverlay } from "@/components/subscription/FeatureBlockedBanner";
import { useRouter } from "next/navigation";

export default function VendorsPage() {
  const router = useRouter();
  const { allowed: moduleAllowed, loading: checkingAccess } = useModuleAccess("vendors");
  const featureAccess = useFeatureAccess("access_vendor_portal");

  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [blockAddVendor, setBlockAddVendor] = useState(false);

  const [open, setOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: "", email: "", phone: "", specialty: "General", w9OnFile: false, insuranceOnFile: false, baseCallOutFee: "0" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<any>(null);

  const [filterSpecialty, setFilterSpecialty] = useState("All");

  if (checkingAccess || featureAccess.loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Verifying vendor access...</p>
      </div>
    );
  }

  const isBlocked = !featureAccess.allowed;

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/external-vendors");
      const data = await res.json();
      if (Array.isArray(data)) setVendors(data);
    } catch (err) {
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    // Query subscription rules
    const checkSubscription = async () => {
      try {
        const rulesRes = await fetch("/api/subscription/rules");
        if (rulesRes.ok) {
          const rules = await rulesRes.json();
          if (rules.isPaused && rules.blockAddVendor) {
            setIsPaused(true);
            setBlockAddVendor(true);
          }
        }
      } catch (err) {
        console.error("Subscription check in Vendors failed:", err);
      }
    };
    checkSubscription();
  }, []);

  const handleCreate = async () => {
    if (!newVendor.name || !newVendor.email) return toast.error("Name and email required");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/external-vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVendor),
      });
      if (!res.ok) throw new Error("Failed to create vendor");
      toast.success("Vendor created successfully");
      setOpen(false);
      setNewVendor({ name: "", email: "", phone: "", specialty: "General", w9OnFile: false, insuranceOnFile: false, baseCallOutFee: "0" });
      fetchVendors();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editVendor.name || !editVendor.email) return toast.error("Name and email required");
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/external-vendors/${editVendor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editVendor),
      });
      if (!res.ok) throw new Error("Failed to update vendor");
      toast.success("Vendor updated successfully");
      setEditOpen(false);
      fetchVendors();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this vendor?")) return;
    try {
      const res = await fetch(`/api/external-vendors/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Vendor deleted successfully");
      fetchVendors();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = vendors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || v.specialty.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterSpecialty === "All" || v.specialty === filterSpecialty;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="relative">
      {isBlocked && (
        <FeatureBlockedOverlay
          featureLabel={featureAccess.featureLabel || "Vendor Portal Access"}
          reason={featureAccess.reason}
          adminNote={featureAccess.adminNote}
          expiresAt={featureAccess.expiresAt}
        />
      )}
      <div className={isBlocked ? "pointer-events-none select-none blur-[2.5px] opacity-70" : ""}>
      <div className="p-8 pt-24 md:pt-12 max-w-7xl mx-auto space-y-8 pb-24">
      {isPaused && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs animate-in fade-in slide-in-from-top-4">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800">
            Your account is currently paused. Adding new vendors is restricted. Reactivate your subscription in{" "}
            <a href="/dashboard/owner/billing" className="underline font-bold hover:text-amber-900">
              Billing Settings
            </a>.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
        <div>
          <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">Vendor Directory</h1>
          <p className="text-xs font-normal text-[#6E6E73] mt-1">Manage your network of 3rd-party contractors and specialists.</p>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <Link href="/dashboard/vendors/new">
            <Button
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-9 px-4 rounded-xl shadow-xs border-none cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Vendor</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 md:p-8 font-sans border border-slate-200 bg-white shadow-2xs max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#1D1D1F] tracking-tight">Edit Vendor</DialogTitle>
          </DialogHeader>
          {editVendor && (
            <div className="grid gap-4 py-2 font-sans">
              <div className="space-y-1">
                <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block">Company / Name *</Label>
                <Input value={editVendor.name} onChange={e => setEditVendor({...editVendor, name: e.target.value})} className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] focus:outline-none focus:border-slate-400 shadow-2xs transition-all" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block">Email *</Label>
                <Input value={editVendor.email} onChange={e => setEditVendor({...editVendor, email: e.target.value})} type="email" className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] focus:outline-none focus:border-slate-400 shadow-2xs transition-all" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block">Phone</Label>
                <Input value={editVendor.phone} onChange={e => setEditVendor({...editVendor, phone: e.target.value})} className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] focus:outline-none focus:border-slate-400 shadow-2xs transition-all" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block">Specialty *</Label>
                <Select value={editVendor.specialty} onValueChange={v => setEditVendor({...editVendor, specialty: v || "General"})}>
                  <SelectTrigger className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] focus:outline-none focus:border-slate-400 shadow-2xs transition-all cursor-pointer">
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Plumbing">Plumbing</SelectItem>
                    <SelectItem value="Electrical">Electrical</SelectItem>
                    <SelectItem value="HVAC">HVAC</SelectItem>
                    <SelectItem value="Appliance Repair">Appliance Repair</SelectItem>
                    <SelectItem value="Handyman">Handyman</SelectItem>
                    <SelectItem value="Pest Control">Pest Control</SelectItem>
                    <SelectItem value="Landscaping">Landscaping</SelectItem>
                    <SelectItem value="Cleaning">Cleaning</SelectItem>
                    <SelectItem value="General">General Construction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block">Base Call-Out Fee ($)</Label>
                <Input value={editVendor.baseCallOutFee} onChange={e => setEditVendor({...editVendor, baseCallOutFee: e.target.value})} type="number" min="0" step="0.01" className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] focus:outline-none focus:border-slate-400 shadow-2xs transition-all" />
              </div>
              
              <div className="space-y-4 pt-3 border-t border-slate-100 mt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-[#1D1D1F]">W-9 Form on File</Label>
                    <p className="text-xs font-normal text-[#6E6E73]">Required for 1099 tax reporting.</p>
                  </div>
                  <Switch checked={editVendor.w9OnFile} onCheckedChange={c => setEditVendor({...editVendor, w9OnFile: c})} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-[#1D1D1F]">Liability Insurance</Label>
                    <p className="text-xs font-normal text-[#6E6E73]">Verify active insurance coverage.</p>
                  </div>
                  <Switch checked={editVendor.insuranceOnFile} onCheckedChange={c => setEditVendor({...editVendor, insuranceOnFile: c})} />
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4 font-sans">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="border border-slate-200 bg-white text-[#1D1D1F] hover:bg-slate-50 font-medium text-xs h-9 px-4 rounded-xl shadow-2xs cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-9 px-4 rounded-xl shadow-xs border-none cursor-pointer">
              Update Vendor
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-2xs border border-slate-200 flex flex-col md:flex-row gap-4 justify-between font-sans">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6E73]" />
            <Input 
              placeholder="Search vendors or specialties..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 bg-white pl-10 px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all"
            />
          </div>
          <Select value={filterSpecialty} onValueChange={(v) => setFilterSpecialty(v || "All")}>
            <SelectTrigger className="w-full sm:w-[200px] h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] focus:outline-none focus:border-slate-400 shadow-2xs transition-all cursor-pointer">
              <Filter className="h-3.5 w-3.5 mr-2 text-[#6E6E73]" />
              <SelectValue placeholder="All Specialties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Specialties</SelectItem>
              <SelectItem value="Plumbing">Plumbing</SelectItem>
              <SelectItem value="Electrical">Electrical</SelectItem>
              <SelectItem value="HVAC">HVAC</SelectItem>
              <SelectItem value="Appliance Repair">Appliance Repair</SelectItem>
              <SelectItem value="Handyman">Handyman</SelectItem>
              <SelectItem value="Pest Control">Pest Control</SelectItem>
              <SelectItem value="Landscaping">Landscaping</SelectItem>
              <SelectItem value="Cleaning">Cleaning</SelectItem>
              <SelectItem value="General">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
        {loading ? (
          <div className="col-span-full py-12 text-center text-[#6E6E73] font-normal text-xs">Loading directory...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white border border-dashed border-slate-300 rounded-3xl p-8 font-sans">
            <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-700 shadow-2xs">
              <Wrench className="h-5 w-5" />
            </div>
            <h3 className="text-[#1D1D1F] font-semibold text-base mb-1">No Vendors Found</h3>
            <p className="text-[#6E6E73] text-xs font-normal">Add a vendor to your directory to start dispatching maintenance requests.</p>
          </div>
        ) : (
          filtered.map((vendor) => (
            <div key={vendor.id} className="bg-white border border-slate-200 shadow-2xs rounded-3xl overflow-hidden hover:shadow-xs transition-all group font-sans">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/60 shrink-0 shadow-2xs">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div className="truncate pr-2 min-w-0">
                      <h3 className="font-semibold text-[#1D1D1F] text-base leading-tight truncate">{vendor.name}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 mt-1 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                        {vendor.specialty}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-8 w-8 text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-slate-100 rounded-xl flex items-center justify-center transition-colors shrink-0 outline-none cursor-pointer">
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 shadow-md border-slate-200 font-sans">
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/vendors/${vendor.id}`)} className="cursor-pointer font-medium text-xs text-[#1D1D1F] py-2 focus:bg-slate-50 rounded-xl">
                        <Eye className="h-4 w-4 mr-2 text-slate-700" /> View Vendor Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/vendors/${vendor.id}/edit`)} className="cursor-pointer font-medium text-xs text-[#1D1D1F] py-2 focus:bg-slate-50 rounded-xl">
                        <Edit className="h-4 w-4 mr-2 text-slate-500" /> Edit Vendor Info
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(vendor.id)} className="cursor-pointer font-medium text-xs text-rose-600 py-2 focus:bg-rose-50 rounded-xl">
                        <Trash className="h-4 w-4 mr-2 text-rose-500" /> Remove Vendor
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2.5 pt-3.5 border-t border-slate-100">
                  <div className="flex items-center gap-2.5 text-xs font-normal text-[#6E6E73]">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <a href={`mailto:${vendor.email}`} className="hover:text-[#1D1D1F] hover:underline truncate">{vendor.email}</a>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-normal text-[#6E6E73]">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{vendor.phone || "No phone provided"}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-normal text-[#6E6E73]">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <span>{vendor.baseCallOutFee > 0 ? `$${vendor.baseCallOutFee.toFixed(2)} Base Fee` : "No base fee set"}</span>
                  </div>
                </div>

                {/* Compliance Badges */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border shadow-2xs flex items-center gap-1 ${vendor.w9OnFile ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    <FileSignature className="h-3 w-3" /> W-9 {vendor.w9OnFile ? 'On File' : 'Missing'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border shadow-2xs flex items-center gap-1 ${vendor.insuranceOnFile ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    <ShieldAlert className="h-3 w-3" /> Insurance {vendor.insuranceOnFile ? 'Active' : 'Missing'}
                  </span>
                </div>
                
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex justify-between items-center text-xs font-normal text-[#6E6E73]">
                  <span>Jobs Completed: <strong className="font-semibold text-[#1D1D1F]">{vendor._count?.maintenanceRequests || 0}</strong></span>
                  <span className="flex items-center gap-1 text-slate-700 font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Active</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    </div>
    </div>
  );
}
