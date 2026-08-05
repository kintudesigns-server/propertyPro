"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Wrench, DollarSign, FileText, Landmark, ShieldCheck, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import ModuleLockedBanner from "@/components/subscription/ModuleLockedBanner";

export default function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();
  const { allowed, loading: checkingAccess } = useModuleAccess("vendors");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "General",
    baseCallOutFee: "0",
    w9OnFile: false,
    insuranceOnFile: false,
    bankName: "",
    routingNumber: "",
    accountNumber: "",
  });

  useEffect(() => {
    const fetchVendor = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/external-vendors/${id}`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            specialty: data.specialty || "General",
            baseCallOutFee: data.baseCallOutFee !== undefined ? String(data.baseCallOutFee) : "0",
            w9OnFile: Boolean(data.w9OnFile),
            insuranceOnFile: Boolean(data.insuranceOnFile),
            bankName: data.bankName || "",
            routingNumber: data.routingNumber || "",
            accountNumber: data.accountNumber || "",
          });
        } else {
          toast.error("Vendor profile not found");
          router.push("/dashboard/team");
        }
      } catch (err) {
        toast.error("Failed to load vendor profile");
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [id, router]);

  if (checkingAccess || loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
        <p className="text-slate-400 font-extrabold text-xs uppercase tracking-wider">Loading Vendor Data...</p>
      </div>
    );
  }

  if (!allowed) {
    return <ModuleLockedBanner module="vendors" />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      return toast.error("Vendor name and email are required");
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/external-vendors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Vendor profile updated successfully!");
        router.push(`/dashboard/vendors/${id}`);
        router.refresh();
      } else {
        toast.error(data.error || "Failed to update vendor");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6 pb-28 px-4 sm:px-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/vendors/${id}`}>
          <button className="h-9 w-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">Edit Vendor Profile</h1>
          <p className="text-xs font-normal text-[#6E6E73] mt-0.5">
            Update contractor details, trade specialty, call-out rate, and compliance verification status.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xs border border-slate-200 overflow-hidden font-sans">
        <div className="p-6 md:p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Column 1: Company & Contact Information */}
            <div className="space-y-5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <Wrench className="h-4 w-4 text-slate-700" />
                <h3 className="text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider">Company &amp; Specialty</h3>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block">
                  Company / Vendor Name <span className="text-rose-500">*</span>
                </Label>
                <Input 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="e.g. Apex Plumbing Solutions" 
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all" 
                  required 
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block">Trade Specialty</Label>
                <Select value={formData.specialty} onValueChange={(val) => setFormData({ ...formData, specialty: val || "General" })}>
                  <SelectTrigger className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] focus:outline-none focus:border-slate-400 shadow-2xs transition-all cursor-pointer">
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-2xl shadow-md border-slate-200 font-sans">
                    <SelectItem value="Plumbing">Plumbing</SelectItem>
                    <SelectItem value="Electrical">Electrical</SelectItem>
                    <SelectItem value="HVAC">HVAC &amp; Climate</SelectItem>
                    <SelectItem value="Appliance Repair">Appliance Repair</SelectItem>
                    <SelectItem value="Handyman">Handyman / General Repair</SelectItem>
                    <SelectItem value="Roofing">Roofing &amp; Gutters</SelectItem>
                    <SelectItem value="Landscaping">Landscaping &amp; Grounds</SelectItem>
                    <SelectItem value="Pest Control">Pest Control</SelectItem>
                    <SelectItem value="Cleaning">Cleaning &amp; Janitorial</SelectItem>
                    <SelectItem value="General">General Trade Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block">Base Call-Out Fee ($)</Label>
                <Input 
                  name="baseCallOutFee" 
                  type="number"
                  step="0.01"
                  value={formData.baseCallOutFee} 
                  onChange={handleChange} 
                  placeholder="e.g. 75.00" 
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all" 
                />
              </div>
            </div>

            {/* Column 2: Contact & Compliance Status */}
            <div className="space-y-5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <Mail className="h-4 w-4 text-slate-700" />
                <h3 className="text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider">Contact &amp; Compliance</h3>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block">
                  Email Address <span className="text-rose-500">*</span>
                </Label>
                <Input 
                  name="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="contact@vendor.com" 
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all" 
                  required 
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block">Phone Number</Label>
                <Input 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  placeholder="+1 (555) 000-0000" 
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all" 
                />
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 shadow-2xs font-sans">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-slate-700" /> W-9 Tax Form Verified
                    </Label>
                    <p className="text-xs font-normal text-[#6E6E73]">Toggle if valid W-9 tax document is on file.</p>
                  </div>
                  <Switch 
                    checked={formData.w9OnFile} 
                    onCheckedChange={(val) => setFormData({ ...formData, w9OnFile: val })} 
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-slate-700" /> General Liability Insurance
                    </Label>
                    <p className="text-xs font-normal text-[#6E6E73]">Toggle if active liability insurance is verified.</p>
                  </div>
                  <Switch 
                    checked={formData.insuranceOnFile} 
                    onCheckedChange={(val) => setFormData({ ...formData, insuranceOnFile: val })} 
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
        
        {/* Footer Actions */}
        <div className="px-6 md:px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 font-sans">
          <Link href={`/dashboard/vendors/${id}`}>
            <Button type="button" variant="outline" className="border border-slate-200 bg-white text-[#1D1D1F] hover:bg-slate-50 font-medium text-xs h-9 px-4 rounded-xl shadow-2xs cursor-pointer">
              Cancel
            </Button>
          </Link>
          <Button 
            type="submit" 
            disabled={submitting} 
            className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 rounded-xl shadow-xs border-none cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? "Saving Changes..." : "Save Vendor Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
