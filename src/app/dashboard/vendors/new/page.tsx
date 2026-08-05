"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Wrench, DollarSign, FileText, Landmark, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import PausedAccountGate from "@/components/subscription/PausedAccountGate";
import { toast } from "sonner";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import ModuleLockedBanner from "@/components/subscription/ModuleLockedBanner";

export default function AddVendorPage() {
  const { allowed, loading: checkingAccess } = useModuleAccess("vendors");
  const router = useRouter();

  const [loading, setLoading] = useState(false);
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

  const [isPausedAccount, setIsPausedAccount] = useState(false);
  const [pausedPlanName, setPausedPlanName] = useState<string | null>(null);
  const [blockAddVendor, setBlockAddVendor] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const userRes = await fetch("/api/users");
        if (userRes.ok) {
          const userData = await userRes.json();
          const rulesRes = await fetch("/api/subscription/rules");
          if (rulesRes.ok) {
            const rules = await rulesRes.json();
            if (rules.isPaused && rules.blockAddVendor) {
              setIsPausedAccount(true);
              setPausedPlanName(userData.pricingTier?.name || null);
              setBlockAddVendor(true);
            }
          }
        }
      } catch (err) {
        console.error("Subscription check failed on vendor creation page:", err);
      }
    };
    checkSubscription();
  }, []);

  if (checkingAccess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Loading...</p>
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

    setLoading(true);

    try {
      const res = await fetch("/api/external-vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Vendor created successfully!");
        router.push("/dashboard/team");
        router.refresh();
      } else {
        toast.error(data.message || data.error || "Failed to create vendor");
      }
    } catch (error) {
      console.error("Vendor creation error", error);
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6 pb-20 px-4 sm:px-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/team">
          <button className="h-9 w-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">Add External Vendor</h1>
          <p className="text-xs font-normal text-[#6E6E73] mt-0.5">Register a contractor or service provider for maintenance &amp; inspections</p>
        </div>
      </div>

      <PausedAccountGate
        isLocked={blockAddVendor}
        planName={pausedPlanName}
        reason="Adding vendors"
        allowedActions={[
          "Your existing vendors and active work orders are <strong>safe and unaffected.</strong>",
          "Vendors can still receive work orders and submit service tickets.",
          "Adding new external vendors is restricted until subscription reactivation."
        ]}
      >
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xs border border-slate-200 overflow-hidden font-sans">
          <div className="p-6 md:p-8 space-y-8">

            {/* Section 1: Company & Contact Info */}
            <div className="space-y-5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <Wrench className="h-4 w-4 text-slate-700" />
                <h3 className="text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider">Company &amp; Contact Info</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block">Company / Contractor Name <span className="text-rose-500">*</span></Label>
                  <Input 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    placeholder="e.g. Bob's Plumbing Pro" 
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all" 
                    required 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block">Email Address <span className="text-rose-500">*</span></Label>
                  <Input 
                    name="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    placeholder="dispatch@bobsplumbing.com" 
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
                    placeholder="+1 (555) 123-4567" 
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all" 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block">Specialty <span className="text-rose-500">*</span></Label>
                  <Select value={formData.specialty} onValueChange={(val) => setFormData({ ...formData, specialty: val || "General" })}>
                    <SelectTrigger className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] focus:outline-none focus:border-slate-400 shadow-2xs transition-all cursor-pointer">
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white rounded-2xl shadow-md border-slate-200 font-sans">
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

                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block">Base Call-Out Fee ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6E73]" />
                    <Input 
                      name="baseCallOutFee" 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={formData.baseCallOutFee} 
                      onChange={handleChange} 
                      placeholder="75.00" 
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white pl-9 px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Compliance Verification */}
            <div className="space-y-5 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <FileText className="h-4 w-4 text-slate-700" />
                <h3 className="text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider">Compliance &amp; Verification</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs font-sans">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-[#1D1D1F]">W-9 Form on File</Label>
                    <p className="text-xs font-normal text-[#6E6E73]">Required for 1099 tax reporting</p>
                  </div>
                  <Switch 
                    checked={formData.w9OnFile} 
                    onCheckedChange={(checked) => setFormData({ ...formData, w9OnFile: checked })} 
                  />
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs font-sans">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-[#1D1D1F]">Insurance Certificate</Label>
                    <p className="text-xs font-normal text-[#6E6E73]">General liability coverage verified</p>
                  </div>
                  <Switch 
                    checked={formData.insuranceOnFile} 
                    onCheckedChange={(checked) => setFormData({ ...formData, insuranceOnFile: checked })} 
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Banking & Payout Details */}
            <div className="space-y-5 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <Landmark className="h-4 w-4 text-slate-700" />
                <div>
                  <h3 className="text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider">Banking &amp; Payout Details <span className="text-[#6E6E73] font-normal lowercase">(optional)</span></h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1">
                  <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block">Bank Name</Label>
                  <Input 
                    name="bankName" 
                    value={formData.bankName} 
                    onChange={handleChange} 
                    placeholder="e.g. Chase Bank" 
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all" 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block">Routing Number</Label>
                  <Input 
                    name="routingNumber" 
                    value={formData.routingNumber} 
                    onChange={handleChange} 
                    placeholder="9-digit routing" 
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all" 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block">Account Number</Label>
                  <Input 
                    name="accountNumber" 
                    type="password"
                    value={formData.accountNumber} 
                    onChange={handleChange} 
                    placeholder="Account number" 
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all" 
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="px-6 md:px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 font-sans">
            <Link href="/dashboard/team">
              <Button type="button" variant="outline" className="border border-slate-200 bg-white text-[#1D1D1F] hover:bg-slate-50 font-medium text-xs h-9 px-4 rounded-xl shadow-2xs cursor-pointer">
                Cancel
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={loading} 
              className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 rounded-xl shadow-xs border-none cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? "Creating..." : "Add External Vendor"}
            </Button>
          </div>
        </form>
      </PausedAccountGate>
    </div>
  );
}
