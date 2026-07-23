"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, ShieldCheck, User, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import PausedAccountGate from "@/components/subscription/PausedAccountGate";
import { toast } from "sonner";

export default function AddTeamMember() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "INSPECTOR",
  });

  const [isPausedAccount, setIsPausedAccount] = useState(false);
  const [pausedPlanName, setPausedPlanName] = useState<string | null>(null);
  const [blockAddInspector, setBlockAddInspector] = useState(false);

  const [isLimitReached, setIsLimitReached] = useState(false);
  const [limitMax, setLimitMax] = useState(1);
  const [planName, setPlanName] = useState("");

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const userRes = await fetch("/api/users");
        if (userRes.ok) {
          const userData = await userRes.json();
          const rulesRes = await fetch("/api/subscription/rules");
          if (rulesRes.ok) {
            const rules = await rulesRes.json();
            if (rules.isPaused && rules.blockAddInspector) {
              setIsPausedAccount(true);
              setPausedPlanName(userData.pricingTier?.name || null);
              setBlockAddInspector(true);
            }
          }
        }
        const usageRes = await fetch("/api/billing/usage");
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          const { current, max } = usageData.usage.inspectors;
          setPlanName(usageData.tier.name);
          setLimitMax(max);
          if (current >= max) {
            setIsLimitReached(true);
          }
        }
      } catch (err) {
        console.error("Subscription check failed on team member creation page:", err);
      }
    };
    checkSubscription();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success("Team member added successfully!");
        router.push("/dashboard/team");
        router.refresh();
      } else {
        toast.error(data.message || data.error || "Failed to create team member");
      }
    } catch (error) {
      console.error("Submission error", error);
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/team">
          <button className="h-10 w-10 bg-white border border-[#E5E5EA] rounded-xl flex items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] shadow-sm transition-all">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#1D1D1F] tracking-tight">Add Team Member</h1>
          <p className="text-sm font-medium text-[#6E6E73] mt-0.5">Invite a new inspector or staff member to your organization</p>
        </div>
      </div>

      {isLimitReached && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="font-extrabold text-sm">Inspector Limit Reached</p>
              <p className="text-red-800 dark:text-red-300 mt-0.5 font-medium">
                You have reached the maximum of {limitMax} inspector{limitMax !== 1 ? "s" : ""} allowed on your {planName || "current"} plan. Upgrade your plan to invite more team members.
              </p>
            </div>
          </div>
          <Link href="/dashboard/owner/billing">
            <button className="px-4 py-2 bg-red-650 hover:bg-red-750 text-white rounded-lg text-xs font-bold shrink-0 transition shadow-xs flex items-center gap-1.5 self-start sm:self-auto">
              Upgrade Subscription
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      )}

      <PausedAccountGate
        isLocked={blockAddInspector}
        planName={pausedPlanName}
        reason="Adding inspectors"
        allowedActions={[
          "Your existing team members and assignments are <strong>safe and unaffected.</strong>",
          "Inspectors can still perform their scheduled inspections and submit feedback.",
          "Adding new inspectors or team members is restricted until subscription reactivation."
        ]}
      >
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA] overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-[#E5E5EA]">
                <User className="h-5 w-5 text-[#007AFF]" />
                <h3 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-wider">Personal Details</h3>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">Full Name <span className="text-[#EF4444]">*</span></Label>
                <Input 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  disabled={isLimitReached}
                  placeholder="e.g. John Doe" 
                  className="h-12 bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] rounded-xl shadow-sm font-medium text-[#1D1D1F]" 
                  required 
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">Role <span className="text-[#EF4444]">*</span></Label>
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-xl border-[#007AFF] bg-[#EFF6FF]">
                    <ShieldCheck className="h-8 w-8 mb-2 text-[#007AFF]" />
                    <span className="text-sm font-bold text-[#1D4ED8]">Inspector</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-[#E5E5EA]">
                <Mail className="h-5 w-5 text-[#007AFF]" />
                <h3 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-wider">Contact Info</h3>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">Email Address <span className="text-[#EF4444]">*</span></Label>
                <Input 
                  name="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  disabled={isLimitReached}
                  placeholder="john@example.com" 
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
                  disabled={isLimitReached}
                  placeholder="+1 (555) 000-0000" 
                  className="h-12 bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] rounded-xl shadow-sm font-medium text-[#1D1D1F]" 
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">Temporary Password <span className="text-[#EF4444]">*</span></Label>
                <Input 
                  name="password" 
                  type="password"
                  value={formData.password} 
                  onChange={handleChange} 
                  disabled={isLimitReached}
                  placeholder="Set an initial password" 
                  className="h-12 bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] rounded-xl shadow-sm font-medium text-[#1D1D1F]" 
                  required
                />
              </div>
              
              <div className="p-4 bg-slate-50 border border-[#E5E5EA] rounded-xl">
                <p className="text-xs font-medium text-[#6E6E73] leading-relaxed">
                  <strong className="text-[#1D1D1F] block mb-1">Login Credentials:</strong>
                  Provide this email and password to your new team member securely. They can change their password anytime after their first login.
                </p>
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
            disabled={loading || isLimitReached} 
            className="h-12 bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold px-8 rounded-xl shadow-sm shadow-blue-500/20 transition-all text-sm disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : isLimitReached ? "Limit Reached" : "Add Team Member"}
          </Button>
        </div>
      </form>
      </PausedAccountGate>
    </div>
  );
}
