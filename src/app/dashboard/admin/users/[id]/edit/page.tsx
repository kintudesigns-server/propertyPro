"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Building, 
  Wrench, 
  ShieldAlert, 
  Loader2, 
  PenTool, 
  Upload, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Briefcase, 
  DollarSign, 
  CreditCard,
  FileText,
  UserCheck,
  ShieldX
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const ROLES = [
  {
    id: "TENANT",
    title: "Tenant / Resident",
    subtitle: "Resident portal, digital lease & online rent payments",
    icon: User,
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    activeBorder: "border-blue-600 ring-2 ring-blue-600/15 bg-blue-50/20",
    iconBg: "bg-blue-100 text-blue-600",
  },
  {
    id: "OWNER",
    title: "Property Owner",
    subtitle: "Landlord dashboard, listing management & payout ledgers",
    icon: Building,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    activeBorder: "border-emerald-600 ring-2 ring-emerald-600/15 bg-emerald-50/20",
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  {
    id: "INSPECTOR",
    title: "Property Inspector",
    subtitle: "Walkthrough inspections, itemized damages & sign-offs",
    icon: Wrench,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    activeBorder: "border-purple-600 ring-2 ring-purple-600/15 bg-purple-50/20",
    iconBg: "bg-purple-100 text-purple-600",
  },
  {
    id: "SUPERADMIN",
    title: "System Administrator",
    subtitle: "Unrestricted root access, platform settings & audit logs",
    icon: ShieldAlert,
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 font-extrabold",
    activeBorder: "border-rose-600 ring-2 ring-rose-600/15 bg-rose-50/20",
    iconBg: "bg-rose-100 text-rose-600",
  }
];

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "TENANT",
    accountStatus: "ACTIVE",
    avatar: "",
    dob: "",
    employer: "",
    position: "",
    annualIncome: "",
    emergencyName: "",
    emergencyRelationship: "",
    emergencyPhone: "",
    emergencyEmail: "",
    creditScore: "",
    bankName: "",
    accountName: "",
    notes: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    } else if (status === "authenticated" && (session?.user as any)?.role !== "SUPERADMIN") {
      router.push("/dashboard");
    }
  }, [status, router, session]);

  useEffect(() => {
    if (!params.id) return;
    setFetching(true);
    fetch(`/api/admin/users/${params.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          toast.error(data.error);
          router.push("/dashboard/admin/users");
        } else {
          setFormData({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            role: data.role || "TENANT",
            accountStatus: data.accountStatus || "ACTIVE",
            avatar: data.avatar || "",
            dob: data.dob || "",
            employer: data.employer || "",
            position: data.position || "",
            annualIncome: data.annualIncome ? String(data.annualIncome) : "",
            emergencyName: data.emergencyName || "",
            emergencyRelationship: data.emergencyRelationship || "",
            emergencyPhone: data.emergencyPhone || "",
            emergencyEmail: data.emergencyEmail || "",
            creditScore: data.creditScore ? String(data.creditScore) : "",
            bankName: data.bankName || "",
            accountName: data.accountName || "",
            notes: data.notes || "",
          });
        }
      })
      .catch(() => toast.error("Failed to load user profile"))
      .finally(() => setFetching(false));
  }, [params.id, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload image");

      setFormData(prev => ({ ...prev, avatar: data.url }));
      toast.success("Profile photo uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Image upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("User name is required.");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("Email address is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user profile");

      toast.success(`User account for ${formData.name} updated successfully!`);
      router.push(`/dashboard/admin/users/${params.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const selectedRoleObj = ROLES.find(r => r.id === formData.role) || ROLES[0];

  if (fetching) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#007AFF]" />
        <p className="text-[#6E6E73] font-bold text-sm uppercase tracking-wider">Loading user profile details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pt-6 pb-20 px-4 sm:px-6">
      
      {/* Header & Navigation */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/admin/users/${params.id}`}
          className="p-2.5 bg-white border border-[#E5E5EA] rounded-xl text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-all shadow-xs"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Edit User Profile</h1>
            <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-bold text-xs">
              ID: {params.id?.slice(0, 8)}...
            </Badge>
          </div>
          <p className="text-[#6E6E73] text-xs font-medium mt-0.5">Update profile information, role assignment, and account settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT / MAIN COLUMN (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* STEP 1: SELECT USER ROLE */}
          <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-3xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-3">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">1</span>
                <h3 className="text-sm font-semibold text-[#1D1D1F] tracking-tight">System Role Authorization</h3>
              </div>
              <Badge className={selectedRoleObj.badgeColor}>{selectedRoleObj.title}</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLES.map((roleOption) => {
                const IconComp = roleOption.icon;
                const isSelected = formData.role === roleOption.id;

                return (
                  <div
                    key={roleOption.id}
                    onClick={() => setFormData(prev => ({ ...prev, role: roleOption.id }))}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                      isSelected 
                        ? roleOption.activeBorder 
                        : "border-[#E5E5EA] bg-white hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 ${roleOption.iconBg}`}>
                      <IconComp className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-extrabold text-sm text-[#1D1D1F] tracking-tight">{roleOption.title}</p>
                      <p className="text-[11px] font-medium text-[#6E6E73] mt-0.5 line-clamp-1">{roleOption.subtitle}</p>
                    </div>

                    {isSelected && (
                      <div className="absolute top-3 right-3 h-5 w-5 bg-slate-900 text-white rounded-full flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* STEP 2: PERSONAL INFORMATION */}
          <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-3xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-[#F2F2F7] pb-3">
              <span className="h-6 w-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">2</span>
              <h3 className="text-sm font-semibold text-[#1D1D1F] tracking-tight">Personal & Contact Details</h3>
            </div>

            {/* Profile Avatar Upload */}
            <div className="flex items-center gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60">
              <div className="relative shrink-0">
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt="Avatar preview"
                    className="h-16 w-16 rounded-full object-cover shadow-sm border border-slate-200"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-sm">
                    {formData.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <p className="text-xs font-bold text-[#1D1D1F]">Profile Photo</p>
                <p className="text-[11px] font-medium text-[#6E6E73]">JPG, PNG or WEBP (Max 5MB)</p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl text-xs font-bold h-8 border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-slate-50"
                >
                  {uploadingAvatar ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload Photo
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Jane Doe"
                    className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="jane@example.com"
                    className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Date of Birth</label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] transition-all"
                />
              </div>
            </div>
          </Card>

          {/* STEP 3: ROLE-SPECIFIC EXTENDED FIELDS */}
          {formData.role === "TENANT" && (
            <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-3xl overflow-hidden p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-[#F2F2F7] pb-3">
                <span className="h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">3</span>
                <h3 className="text-sm font-semibold text-[#1D1D1F] tracking-tight">Tenant Screening & Employment Profile</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Employer</label>
                  <input
                    type="text"
                    name="employer"
                    value={formData.employer}
                    onChange={handleInputChange}
                    placeholder="Company name"
                    className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Position</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    placeholder="Job title"
                    className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Annual Income ($)</label>
                  <input
                    type="number"
                    name="annualIncome"
                    value={formData.annualIncome}
                    onChange={handleInputChange}
                    placeholder="95000"
                    className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#F2F2F7]">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Emergency Contact Name</label>
                  <input
                    type="text"
                    name="emergencyName"
                    value={formData.emergencyName}
                    onChange={handleInputChange}
                    placeholder="Contact name"
                    className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Emergency Phone</label>
                  <input
                    type="text"
                    name="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={handleInputChange}
                    placeholder="+1 555-0000"
                    className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Credit Score</label>
                  <input
                    type="number"
                    name="creditScore"
                    value={formData.creditScore}
                    onChange={handleInputChange}
                    placeholder="720"
                    className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] transition-all"
                  />
                </div>
              </div>
            </Card>
          )}

          {formData.role === "OWNER" && (
            <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-3xl overflow-hidden p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-[#F2F2F7] pb-3">
                <span className="h-6 w-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">3</span>
                <h3 className="text-sm font-semibold text-[#1D1D1F] tracking-tight">Direct Deposit & Banking Configuration</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Bank Entity Name</label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    placeholder="e.g. Chase Bank, Wells Fargo"
                    className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Account Holder Name</label>
                  <input
                    type="text"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleInputChange}
                    placeholder="e.g. Atlas Properties LLC"
                    className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] transition-all"
                  />
                </div>
              </div>
            </Card>
          )}

        </div>

        {/* RIGHT COLUMN SIDEBAR (1/3 width) */}
        <div className="space-y-6">
          
          {/* Account Status Card */}
          <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-3xl overflow-hidden p-5 space-y-4">
            <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Account Status & Authorization</h3>

            <div className="space-y-3">
              <label className="text-xs font-bold text-[#6E6E73] block uppercase tracking-wider">Account Access Status</label>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, accountStatus: "ACTIVE" }))}
                  className={`p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                    formData.accountStatus === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-600/15"
                      : "bg-white text-slate-600 border-[#E5E5EA] hover:bg-slate-50"
                  }`}
                >
                  <UserCheck className="h-4 w-4" /> Active
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, accountStatus: "SUSPENDED" }))}
                  className={`p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                    formData.accountStatus === "SUSPENDED"
                      ? "bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-600/15"
                      : "bg-white text-slate-600 border-[#E5E5EA] hover:bg-slate-50"
                  }`}
                >
                  <ShieldX className="h-4 w-4" /> Suspended
                </button>
              </div>
            </div>
          </Card>

          {/* Internal Admin Notes */}
          <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-3xl overflow-hidden p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-500" />
                Internal Admin Notes
              </h3>
              <span className={`text-[10px] font-bold ${formData.notes.length > 450 ? "text-amber-600" : "text-slate-400"}`}>
                {formData.notes.length}/500
              </span>
            </div>

            <textarea
              name="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value.slice(0, 500) }))}
              placeholder="Add confidential admin logs, audit flags, or dispute notes..."
              className="w-full min-h-[120px] bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-[#007AFF] resize-none transition-all"
            />
          </Card>

          {/* Submit / Action Buttons */}
          <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-3xl overflow-hidden p-5 space-y-3">
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-xl font-medium text-xs h-11 shadow-xs transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving Changes...
                </>
              ) : (
                "Save Profile Changes"
              )}
            </Button>

            <Link
              href={`/dashboard/admin/users/${params.id}`}
              className="w-full inline-flex items-center justify-center rounded-xl font-medium text-xs h-10 border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-[#F2F2F7] transition-all"
            >
              Cancel & Discard
            </Link>
          </Card>

        </div>

      </form>

    </div>
  );
}
