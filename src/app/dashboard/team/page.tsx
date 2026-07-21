"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Briefcase, Trash2, Mail, Phone, ShieldCheck, Wrench, Search, MoreHorizontal, Edit, CheckCircle2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function InspectorsAndVendorsPage() {
  const [activeTab, setActiveTab] = useState<"inspectors" | "vendors">("inspectors");
  const [loading, setLoading] = useState(true);

  // Inspectors State
  const [inspectors, setInspectors] = useState<any[]>([]);

  // Vendors State
  const [vendors, setVendors] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("All");

  const [open, setOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: "", email: "", phone: "", specialty: "General", w9OnFile: false, insuranceOnFile: false, baseCallOutFee: "0" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<any>(null);

  // Fetch functions
  const fetchInspectors = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users?role=INSPECTOR");
      const data = await res.json();
      if (Array.isArray(data)) {
        setInspectors(data);
      }
    } catch (error) {
      console.error("Failed to fetch inspectors:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/external-vendors");
      const data = await res.json();
      if (Array.isArray(data)) {
        setVendors(data);
      }
    } catch (err) {
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "inspectors") {
      fetchInspectors();
    } else {
      fetchVendors();
    }
  }, [activeTab]);

  // Inspector handlers
  const handleInspectorDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this staff member?")) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchInspectors();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Failed to delete staff member:", error);
    }
  };

  // Vendor handlers
  const handleVendorCreate = async () => {
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

  const handleVendorEdit = async () => {
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

  const handleVendorDelete = async (id: string) => {
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

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || v.specialty.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterSpecialty === "All" || v.specialty === filterSpecialty;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-8 pt-24 md:pt-12 max-w-7xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1D1D1F] tracking-tight">Inspectors &amp; Vendors</h1>
          <p className="text-[#6E6E73] mt-1 text-sm font-medium">Manage both your internal inspection team and external contractors in one hub.</p>
        </div>

        {activeTab === "inspectors" ? (
          <Link href="/dashboard/team/new">
            <Button className="w-full md:w-auto h-11 bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold px-6 rounded-xl shadow-sm transition-all text-sm gap-2 border-none">
              <Plus className="h-5 w-5" /> Add Staff Member
            </Button>
          </Link>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className="inline-flex items-center justify-center bg-[#007AFF] hover:bg-blue-600 text-white font-bold gap-2 rounded-xl h-11 px-5 shadow-sm text-sm transition-colors">
              <Plus className="h-5 w-5" /> Add New Vendor
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Add External Vendor</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="font-bold text-[12px] text-[#1D1D1F] uppercase">Company / Name *</Label>
                  <Input value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} className="h-11 rounded-xl bg-slate-50" placeholder="e.g. Bob's Plumbing Pro" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[12px] text-[#1D1D1F] uppercase">Email *</Label>
                  <Input value={newVendor.email} onChange={e => setNewVendor({...newVendor, email: e.target.value})} type="email" className="h-11 rounded-xl bg-slate-50" placeholder="dispatch@bobsplumbing.com" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[12px] text-[#1D1D1F] uppercase">Phone</Label>
                  <Input value={newVendor.phone} onChange={e => setNewVendor({...newVendor, phone: e.target.value})} className="h-11 rounded-xl bg-slate-50" placeholder="(555) 123-4567" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[12px] text-[#1D1D1F] uppercase">Specialty *</Label>
                  <Select value={newVendor.specialty} onValueChange={v => setNewVendor({...newVendor, specialty: v || "General"})}>
                    <SelectTrigger className="w-full h-11 rounded-xl bg-slate-50 border-[#E5E5EA]">
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white">
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
                  <Input value={newVendor.baseCallOutFee} onChange={e => setNewVendor({...newVendor, baseCallOutFee: e.target.value})} type="number" min="0" step="0.01" className="h-11 rounded-xl bg-slate-50" placeholder="e.g. 75" />
                </div>
                
                <div className="space-y-4 pt-4 border-t border-[#E5E5EA] mt-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold text-[#1D1D1F]">W-9 Form on File</Label>
                      <p className="text-[11px] text-[#6E6E73]">Required for 1099 tax reporting.</p>
                    </div>
                    <Switch checked={newVendor.w9OnFile} onCheckedChange={c => setNewVendor({...newVendor, w9OnFile: c})} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold text-[#1D1D1F]">Liability Insurance</Label>
                      <p className="text-[11px] text-[#6E6E73]">Verify active insurance coverage.</p>
                    </div>
                    <Switch checked={newVendor.insuranceOnFile} onCheckedChange={c => setNewVendor({...newVendor, insuranceOnFile: c})} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl font-bold border-[#E5E5EA]">
                  Cancel
                </Button>
                <Button onClick={handleVendorCreate} disabled={isSubmitting} className="bg-[#10B981] hover:bg-emerald-600 text-white font-bold rounded-xl px-8 shadow-sm border-none">
                  Save Vendor
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-[#E5E5EA] pb-px">
        <button
          onClick={() => setActiveTab("inspectors")}
          className={`pb-4 px-6 text-sm font-bold border-b-2 transition-all ${
            activeTab === "inspectors"
              ? "border-[#007AFF] text-[#007AFF]"
              : "border-transparent text-[#6E6E73] hover:text-[#1D1D1F]"
          }`}
        >
          🕵️ Internal Inspectors ({inspectors.length})
        </button>
        <button
          onClick={() => setActiveTab("vendors")}
          className={`pb-4 px-6 text-sm font-bold border-b-2 transition-all ${
            activeTab === "vendors"
              ? "border-[#007AFF] text-[#007AFF]"
              : "border-transparent text-[#6E6E73] hover:text-[#1D1D1F]"
          }`}
        >
          🔧 External Contractors ({vendors.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "inspectors" ? (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F2F2F7] border-b border-[#E5E5EA]">
                  <th className="py-4 px-6 text-xs font-extrabold text-[#6E6E73] uppercase tracking-widest">Name</th>
                  <th className="py-4 px-6 text-xs font-extrabold text-[#6E6E73] uppercase tracking-widest">Contact Info</th>
                  <th className="py-4 px-6 text-xs font-extrabold text-[#6E6E73] uppercase tracking-widest">Designation</th>
                  <th className="py-4 px-6 text-xs font-extrabold text-[#6E6E73] uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm font-semibold text-[#6E6E73]">Loading inspectors...</td>
                  </tr>
                ) : inspectors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm font-semibold text-[#6E6E73]">No inspectors registered.</td>
                  </tr>
                ) : (
                  inspectors.map((member) => (
                    <tr key={member.id} className="border-b border-[#E5E5EA] last:border-0 hover:bg-[#F2F2F7]/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 min-w-[40px] bg-slate-100 text-[#6E6E73] rounded-full flex items-center justify-center font-bold text-sm">
                            {member.name.charAt(0)}
                          </div>
                          <span className="font-bold text-sm text-[#1D1D1F]">{member.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-xs font-medium text-[#6E6E73]">
                            <Mail className="h-3.5 w-3.5" />
                            {member.email}
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-2 text-xs font-medium text-[#6E6E73]">
                              <Phone className="h-3.5 w-3.5" />
                              {member.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit">
                          <ShieldCheck className="h-3 w-3" /> Inspector
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleInspectorDelete(member.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Vendor Filters */}
          <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-[#E5E5EA]">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
              <Input
                placeholder="Search vendor name or specialty..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>
            <Select value={filterSpecialty} onValueChange={(v) => setFilterSpecialty(v || "All")}>
              <SelectTrigger className="w-full sm:w-48 h-10 rounded-xl border-slate-200 bg-slate-50">
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="All">All Specialties</SelectItem>
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

          {/* Vendors List */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F2F2F7] border-b border-[#E5E5EA]">
                    <th className="py-4 px-6 text-xs font-extrabold text-[#6E6E73] uppercase tracking-widest">Company / Specialist</th>
                    <th className="py-4 px-6 text-xs font-extrabold text-[#6E6E73] uppercase tracking-widest">Specialty</th>
                    <th className="py-4 px-6 text-xs font-extrabold text-[#6E6E73] uppercase tracking-widest">Call-Out Fee</th>
                    <th className="py-4 px-6 text-xs font-extrabold text-[#6E6E73] uppercase tracking-widest">Compliance</th>
                    <th className="py-4 px-6 text-xs font-extrabold text-[#6E6E73] uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm font-semibold text-[#6E6E73]">Loading contractors...</td>
                    </tr>
                  ) : filteredVendors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm font-semibold text-[#6E6E73]">No contractors found.</td>
                    </tr>
                  ) : (
                    filteredVendors.map((vendor) => (
                      <tr key={vendor.id} className="border-b border-[#E5E5EA] last:border-0 hover:bg-[#F2F2F7]/50 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <span className="font-bold text-sm text-[#1D1D1F]">{vendor.name}</span>
                            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 mt-1 text-[11px] font-medium text-[#6E6E73]">
                              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {vendor.email}</span>
                              {vendor.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {vendor.phone}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit">
                            <Wrench className="h-3 w-3" /> {vendor.specialty}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-sm text-[#1D1D1F]">
                          ${parseFloat(vendor.baseCallOutFee || "0").toFixed(2)}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-2">
                            {vendor.w9OnFile ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">W-9 Active</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">Missing W-9</span>
                            )}
                            {vendor.insuranceOnFile ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">Insured</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200 text-center">Uninsured</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#E5E5EA] rounded-lg outline-none">
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-white border-[#E5E5EA] p-1 shadow-md z-50">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditVendor(vendor);
                                  setEditOpen(true);
                                }}
                                className="cursor-pointer flex items-center gap-2 text-sm font-medium text-[#1D1D1F] p-2 rounded-lg hover:bg-[#F5F5F7]"
                              >
                                <Edit className="h-4 w-4 text-[#6E6E73]" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleVendorDelete(vendor.id)}
                                className="cursor-pointer flex items-center gap-2 text-sm font-medium text-red-600 p-2 rounded-lg hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog for Vendor */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl max-h-[90vh] overflow-y-auto z-50 bg-white">
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
                  <SelectContent className="z-50 bg-white">
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
            <Button onClick={handleVendorEdit} disabled={isSubmitting} className="bg-[#007AFF] hover:bg-blue-600 text-white font-bold rounded-xl px-8 shadow-sm border-none">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
