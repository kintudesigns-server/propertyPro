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
    <div className="w-full max-w-4xl mx-auto space-y-6 pt-4 pb-20 px-2 sm:px-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <Link href="/dashboard/team">
          <button className="h-9 w-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Add Team Member</h1>
          <p className="text-xs font-normal text-[#6E6E73] mt-0.5">Invite a new inspector or staff member to your organization</p>
        </div>
      </div>

      {isLimitReached && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Inspector Limit Reached</p>
              <p className="text-red-800 dark:text-red-300 mt-0.5 font-normal">
                You have reached the maximum of {limitMax} inspector{limitMax !== 1 ? "s" : ""} allowed on your {planName || "current"} plan. Upgrade your plan to invite more team members.
              </p>
            </div>
          </div>
          <Link href="/dashboard/owner/billing">
            <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-medium shrink-0 transition shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer">
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
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden font-sans">
        <div className="p-6 md:p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <User className="h-4 w-4 text-slate-700" />
                <h3 className="font-semibold text-slate-900 text-sm tracking-tight">Personal Details</h3>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-normal text-[#6E6E73]">Full Name <span className="text-[#EF4444]">*</span></Label>
                <Input 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  disabled={isLimitReached}
                  placeholder="e.g. John Doe" 
                  className="h-9 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 rounded-xl shadow-2xs font-normal text-xs text-[#1D1D1F]" 
                  required 
                />
              </div>

              {/* Profile Photo File Upload */}
              <div className="space-y-3 p-5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <Label className="text-xs font-normal text-[#6E6E73] block">
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
                    className="h-20 w-20 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100/50 hover:border-slate-400 transition-all relative group overflow-hidden shadow-2xs shrink-0"
                  >
                    {uploadingAvatar ? (
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
                        <span className="text-[9px] font-medium text-slate-700">Uploading</span>
                      </div>
                    ) : formData.avatar ? (
                      <>
                        <img src={formData.avatar} alt="Avatar Preview" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                          <Upload className="h-4 w-4 mb-0.5" />
                          <span className="text-[9px] font-medium">Change</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-slate-400 group-hover:text-slate-700 mb-1 transition-colors" />
                        <span className="text-[10px] font-medium text-[#6E6E73]">Upload</span>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <h4 className="text-xs font-semibold text-[#1D1D1F]">Upload Inspector Photo</h4>
                      <p className="text-xs font-normal text-[#6E6E73] mt-0.5">Supports JPG, PNG, or WEBP (Max 10MB)</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingAvatar || isLimitReached}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-9 border-slate-200 bg-white font-medium rounded-xl text-[#1D1D1F] text-xs hover:bg-slate-50 shadow-2xs cursor-pointer"
                      >
                        {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5 text-slate-500" />}
                        {formData.avatar ? "Change Photo" : "Choose Image File"}
                      </Button>

                      {formData.avatar && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({ ...formData, avatar: "" })}
                          className="h-9 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-normal text-[#6E6E73]">Role <span className="text-[#EF4444]">*</span></Label>
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-2xl border-blue-500 bg-blue-50/50">
                    <ShieldCheck className="h-7 w-7 mb-1 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-900">Inspector</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <Mail className="h-4 w-4 text-slate-700" />
                <h3 className="font-semibold text-slate-900 text-sm tracking-tight">Contact Info</h3>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-normal text-[#6E6E73]">Email Address <span className="text-[#EF4444]">*</span></Label>
                <Input 
                  name="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  disabled={isLimitReached}
                  placeholder="john@example.com" 
                  className="h-9 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 rounded-xl shadow-2xs font-normal text-xs text-[#1D1D1F]" 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-normal text-[#6E6E73]">Phone Number</Label>
                <Input 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  disabled={isLimitReached}
                  placeholder="+1 (555) 000-0000" 
                  className="h-9 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 rounded-xl shadow-2xs font-normal text-xs text-[#1D1D1F]" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-normal text-[#6E6E73]">Temporary Password <span className="text-[#EF4444]">*</span></Label>
                <Input 
                  name="password" 
                  type="password"
                  value={formData.password} 
                  onChange={handleChange} 
                  disabled={isLimitReached}
                  placeholder="Set an initial password" 
                  className="h-9 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 rounded-xl shadow-2xs font-normal text-xs text-[#1D1D1F]" 
                  required
                />
              </div>
              
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <p className="text-xs font-normal text-[#6E6E73] leading-relaxed">
                  <strong className="text-[#1D1D1F] block mb-1 font-semibold">Login Credentials:</strong>
                  Provide this email and password to your new team member securely. They can change their password anytime after their first login.
                </p>
              </div>
            </div>
          </div>

        </div>
        
        {/* Footer Actions */}
        <div className="px-6 md:px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link href="/dashboard/team">
            <Button type="button" variant="ghost" className="h-9 px-4 rounded-xl font-medium text-xs text-[#6E6E73] hover:text-[#1D1D1F]">
              Cancel
            </Button>
          </Link>
          <Button 
            type="submit" 
            disabled={loading || isLimitReached} 
            className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium px-6 rounded-xl shadow-xs transition-all text-xs border-none cursor-pointer"
          >
            {loading ? "Creating..." : isLimitReached ? "Limit Reached" : "Add Team Member"}
          </Button>
        </div>
      </form>
      </PausedAccountGate>
    </div>
  );
}
