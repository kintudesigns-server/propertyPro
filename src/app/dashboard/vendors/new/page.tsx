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

export default function AddVendorPage() {
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
    <div className="max-w-4xl mx-auto space-y-6 pt-6 pb-20 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/team">
          <button className="h-10 w-10 bg-white border border-[#E5E5EA] rounded-xl flex items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] shadow-sm transition-all cursor-pointer">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#1D1D1F] tracking-tight">Add External Vendor</h1>
          <p className="text-sm font-medium text-[#6E6E73] mt-0.5">Register a contractor or service provider for maintenance &amp; inspections</p>
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
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA] overflow-hidden">
          <div className="p-6 md:p-8 space-y-8">

            {/* Section 1: Company & Contact Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-[#E5E5EA]">
                <Wrench className="h-5 w-5 text-[#007AFF]" />
                <h3 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-wider">Company &amp; Contact Info</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">Company / Contractor Name <span className="text-[#EF4444]">*</span></Label>
                  <Input 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    placeholder="e.g. Bob's Plumbing Pro" 
                    className="h-12 bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] rounded-xl shadow-sm font-medium text-[#1D1D1F]" 
                    required 
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">Email Address <span className="text-[#EF4444]">*</span></Label>
                  <Input 
                    name="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    placeholder="dispatch@bobsplumbing.com" 
                    className="h-12 bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] rounded-xl shadow-sm font-medium text-[#1D1D1F]" 
                    required 
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">Phone Number</Label>
                  <Input 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange} 
                    placeholder="+1 (555) 123-4567" 
                    className="h-12 bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] rounded-xl shadow-sm font-medium text-[#1D1D1F]" 
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">Specialty <span className="text-[#EF4444]">*</span></Label>
                  <Select value={formData.specialty} onValueChange={(val) => setFormData({ ...formData, specialty: val || "General" })}>
                    <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E5E5EA] focus:ring-[#007AFF] shadow-sm font-medium text-[#1D1D1F]">
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

                <div className="space-y-2.5 md:col-span-2">
                  <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">Base Call-Out Fee ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
                    <Input 
                      name="baseCallOutFee" 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={formData.baseCallOutFee} 
                      onChange={handleChange} 
                      placeholder="75.00" 
                      className="pl-9 h-12 bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] rounded-xl shadow-sm font-medium text-[#1D1D1F]" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Compliance Verification */}
            <div className="space-y-6 pt-4 border-t border-[#E5E5EA]">
              <div className="flex items-center gap-3 pb-2 border-b border-[#E5E5EA]">
                <FileText className="h-5 w-5 text-[#007AFF]" />
                <h3 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-wider">Compliance &amp; Verification</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-[#E5E5EA] rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-[#1D1D1F]">W-9 Form on File</Label>
                    <p className="text-xs text-[#6E6E73]">Required for 1099 tax reporting</p>
                  </div>
                  <Switch 
                    checked={formData.w9OnFile} 
                    onCheckedChange={(checked) => setFormData({ ...formData, w9OnFile: checked })} 
                  />
                </div>

                <div className="p-4 bg-slate-50 border border-[#E5E5EA] rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-[#1D1D1F]">Insurance Certificate</Label>
                    <p className="text-xs text-[#6E6E73]">General liability coverage verified</p>
                  </div>
                  <Switch 
                    checked={formData.insuranceOnFile} 
                    onCheckedChange={(checked) => setFormData({ ...formData, insuranceOnFile: checked })} 
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Banking & Payout Details */}
            <div className="space-y-6 pt-4 border-t border-[#E5E5EA]">
              <div className="flex items-center gap-3 pb-2 border-b border-[#E5E5EA]">
                <Landmark className="h-5 w-5 text-[#007AFF]" />
                <div>
                  <h3 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-wider">Banking &amp; Payout Details <span className="text-[#8E8E93] font-normal lowercase">(optional)</span></h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">Bank Name</Label>
                  <Input 
                    name="bankName" 
                    value={formData.bankName} 
                    onChange={handleChange} 
                    placeholder="e.g. Chase Bank" 
                    className="h-12 bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] rounded-xl shadow-sm font-medium text-[#1D1D1F]" 
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">Routing Number</Label>
                  <Input 
                    name="routingNumber" 
                    value={formData.routingNumber} 
                    onChange={handleChange} 
                    placeholder="9-digit routing" 
                    className="h-12 bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] rounded-xl shadow-sm font-medium text-[#1D1D1F]" 
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">Account Number</Label>
                  <Input 
                    name="accountNumber" 
                    type="password"
                    value={formData.accountNumber} 
                    onChange={handleChange} 
                    placeholder="Account number" 
                    className="h-12 bg-[#FFFFFF] border-[#E5E5EA] focus-visible:ring-[#007AFF] rounded-xl shadow-sm font-medium text-[#1D1D1F]" 
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="px-6 md:px-8 py-5 bg-[#F2F2F7] border-t border-[#E5E5EA] flex items-center justify-end gap-4">
            <Link href="/dashboard/team">
              <Button type="button" variant="ghost" className="h-12 px-6 rounded-xl font-bold text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#E5E5EA]">
                Cancel
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={loading} 
              className="h-12 bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold px-8 rounded-xl shadow-sm shadow-blue-500/20 transition-all text-sm cursor-pointer"
            >
              {loading ? "Creating..." : "Add External Vendor"}
            </Button>
          </div>
        </form>
      </PausedAccountGate>
    </div>
  );
}
