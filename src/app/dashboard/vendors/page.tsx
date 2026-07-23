"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Wrench, Mail, Phone, MoreHorizontal, FileText, CheckCircle2, Edit, Trash, Filter } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DollarSign, ShieldAlert, FileSignature, Lock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function VendorsPage() {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1D1D1F] tracking-tight">Vendor Directory</h1>
          <p className="text-[#6E6E73] mt-1 text-sm font-medium">Manage your network of 3rd-party contractors and specialists.</p>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <Link href="/dashboard/vendors/new">
            <Button
              className="bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold gap-2 rounded-xl h-11 px-5 shadow-sm text-sm border-none"
            >
              <Plus className="h-5 w-5" />
              <span>Add New Vendor</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Vendor</DialogTitle>
          </DialogHeader>
          {editVendor && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label className="font-bold text-[12px] text-[#1D1D1F] uppercase">Company / Name *</Label>
                <Input value={editVendor.name} onChange={e => setEditVendor({...editVendor, name: e.target.value})} className="h-11 rounded-xl bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-[12px] text-[#1D1D1F] uppercase">Email *</Label>
                <Input value={editVendor.email} onChange={e => setEditVendor({...editVendor, email: e.target.value})} type="email" className="h-11 rounded-xl bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-[12px] text-[#1D1D1F] uppercase">Phone</Label>
                <Input value={editVendor.phone} onChange={e => setEditVendor({...editVendor, phone: e.target.value})} className="h-11 rounded-xl bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-[12px] text-[#1D1D1F] uppercase">Specialty *</Label>
                <Select value={editVendor.specialty} onValueChange={v => setEditVendor({...editVendor, specialty: v || "General"})}>
                  <SelectTrigger className="w-full h-11 rounded-xl bg-slate-50 border-[#E5E5EA]">
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
              <div className="space-y-2">
                <Label className="font-bold text-[12px] text-[#1D1D1F] uppercase">Base Call-Out Fee ($)</Label>
                <Input value={editVendor.baseCallOutFee} onChange={e => setEditVendor({...editVendor, baseCallOutFee: e.target.value})} type="number" min="0" step="0.01" className="h-11 rounded-xl bg-slate-50" />
              </div>
              
              <div className="space-y-4 pt-4 border-t border-[#E5E5EA] mt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-[#1D1D1F]">W-9 Form on File</Label>
                    <p className="text-[11px] text-[#6E6E73]">Required for 1099 tax reporting.</p>
                  </div>
                  <Switch checked={editVendor.w9OnFile} onCheckedChange={c => setEditVendor({...editVendor, w9OnFile: c})} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-[#1D1D1F]">Liability Insurance</Label>
                    <p className="text-[11px] text-[#6E6E73]">Verify active insurance coverage.</p>
                  </div>
                  <Switch checked={editVendor.insuranceOnFile} onCheckedChange={c => setEditVendor({...editVendor, insuranceOnFile: c})} />
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl font-bold border-[#E5E5EA]">
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting} className="bg-[#007AFF] hover:bg-blue-600 text-white font-bold rounded-xl px-8 shadow-sm">
              Update Vendor
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E5E5EA] flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8]" />
            <Input 
              placeholder="Search vendors or specialties..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-slate-50 border-[#E5E5EA] rounded-xl text-sm font-medium focus-visible:ring-[#007AFF]"
            />
          </div>
          <Select value={filterSpecialty} onValueChange={(v) => setFilterSpecialty(v || "All")}>
            <SelectTrigger className="w-full sm:w-[200px] h-11 bg-slate-50 border-[#E5E5EA] rounded-xl">
              <Filter className="h-4 w-4 mr-2 text-[#94A3B8]" />
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-[#6E6E73] font-medium">Loading directory...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white border border-dashed border-[#CBD5E1] rounded-2xl">
            <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Wrench className="h-6 w-6 text-[#94A3B8]" />
            </div>
            <h3 className="text-[#1D1D1F] font-bold text-lg mb-1">No Vendors Found</h3>
            <p className="text-[#6E6E73] text-sm">Add a vendor to your directory to start dispatching maintenance requests.</p>
          </div>
        ) : (
          filtered.map((vendor) => (
            <Card key={vendor.id} className="bg-white border border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                      <Wrench className="h-6 w-6" />
                    </div>
                    <div className="truncate pr-4 min-w-0">
                      <h3 className="font-bold text-[#1D1D1F] text-lg leading-tight truncate">{vendor.name}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 mt-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-[#6E6E73]">
                        {vendor.specialty}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-8 w-8 text-[#94A3B8] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-lg flex items-center justify-center transition-colors shrink-0 outline-none">
                      <MoreHorizontal className="h-5 w-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
                      <DropdownMenuItem onClick={() => { setEditVendor(vendor); setEditOpen(true); }} className="cursor-pointer font-medium text-slate-700 py-2 focus:bg-slate-50 focus:text-slate-900 rounded-lg">
                        <Edit className="h-4 w-4 mr-2 text-[#8E8E93]" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(vendor.id)} className="cursor-pointer font-medium text-red-600 py-2 focus:bg-red-50 focus:text-red-700 rounded-lg">
                        <Trash className="h-4 w-4 mr-2 text-red-500" /> Remove Vendor
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-sm font-medium text-[#6E6E73]">
                    <Mail className="h-4 w-4 text-[#94A3B8]" />
                    <a href={`mailto:${vendor.email}`} className="hover:text-[#007AFF] hover:underline truncate">{vendor.email}</a>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-[#6E6E73]">
                    <Phone className="h-4 w-4 text-[#94A3B8]" />
                    <span>{vendor.phone || "No phone provided"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-[#6E6E73]">
                    <DollarSign className="h-4 w-4 text-[#94A3B8]" />
                    <span>{vendor.baseCallOutFee > 0 ? `$${vendor.baseCallOutFee.toFixed(2)} Base Fee` : "No base fee set"}</span>
                  </div>
                </div>

                {/* Compliance Badges */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${vendor.w9OnFile ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    <FileSignature className="h-3 w-3" /> W-9 {vendor.w9OnFile ? 'On File' : 'Missing'}
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${vendor.insuranceOnFile ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    <ShieldAlert className="h-3 w-3" /> Insurance {vendor.insuranceOnFile ? 'Active' : 'Missing'}
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-[#94A3B8] uppercase">
                  <span>Jobs Completed: <span className="text-[#1D1D1F]">{vendor._count?.maintenanceRequests || 0}</span></span>
                  <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Active</span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
