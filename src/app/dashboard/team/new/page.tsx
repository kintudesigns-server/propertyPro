"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, ShieldCheck, User, AlertTriangle, ArrowUpRight, Upload, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import PausedAccountGate from "@/components/subscription/PausedAccountGate";
import { toast } from "sonner";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import ModuleLockedBanner from "@/components/subscription/ModuleLockedBanner";
import { useSession } from "next-auth/react";

export default function AddTeamMember() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const isOwner = (session?.user as any)?.role === "OWNER";
  const { allowed: teamAllowed, loading: teamLoading } = useModuleAccess("team_management");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "INSPECTOR",
    avatar: "",
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be under 10MB");
      return;
    }

    setUploadingAvatar(true);
    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, avatar: data.url }));
        toast.success("Profile photo uploaded successfully!");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to upload image");
      }
    } catch (error) {
      console.error("Upload error", error);
      toast.error("Error uploading image");
    } finally {
      setUploadingAvatar(false);
    }
  };

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

              {/* Profile Photo File Upload */}
              <div className="space-y-3 p-5 bg-[#F2F2F7]/60 rounded-2xl border border-[#E5E5EA]">
                <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide block">
                  Profile Photo (Optional)
                </Label>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/webp" 
                  onChange={handleFileUpload}
                />

                <div className="flex items-center gap-5">
                  <div 
                    onClick={() => !uploadingAvatar && !isLimitReached && fileInputRef.current?.click()}
                    className="h-20 w-20 rounded-2xl bg-white border-2 border-dashed border-[#CBD5E1] flex flex-col items-center justify-center cursor-pointer hover:bg-[#F8FAFC] hover:border-[#007AFF] transition-all relative group overflow-hidden shadow-2xs shrink-0"
                  >
                    {uploadingAvatar ? (
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <Loader2 className="h-5 w-5 animate-spin text-[#007AFF]" />
                        <span className="text-[9px] font-bold text-[#007AFF]">Uploading</span>
                      </div>
                    ) : formData.avatar ? (
                      <>
                        <img src={formData.avatar} alt="Avatar Preview" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-[#1D1D1F]/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                          <Upload className="h-4 w-4 mb-0.5" />
                          <span className="text-[9px] font-bold">Change</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-[#8E8E93] group-hover:text-[#007AFF] mb-1 transition-colors" />
                        <span className="text-[10px] font-bold text-[#6E6E73]">Upload</span>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <h4 className="text-xs font-bold text-[#1D1D1F]">Upload Inspector Photo</h4>
                      <p className="text-[11px] text-[#6E6E73] mt-0.5 font-medium">Supports JPG, PNG, or WEBP (Max 10MB)</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingAvatar || isLimitReached}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-9 border-[#E5E5EA] bg-white font-bold rounded-xl text-[#1D1D1F] text-xs hover:bg-[#F5F5F7] shadow-2xs"
                      >
                        {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5 text-[#007AFF]" />}
                        {formData.avatar ? "Change Photo" : "Choose Image File"}
                      </Button>

                      {formData.avatar && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({ ...formData, avatar: "" })}
                          className="h-9 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
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
