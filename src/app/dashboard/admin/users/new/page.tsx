"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  UserPlus, 
  Upload, 
  ShieldAlert, 
  Check, 
  Building, 
  Loader2, 
  X, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Mail, 
  User, 
  Phone, 
  FileText, 
  ShieldCheck, 
  AlertTriangle,
  Wrench,
  Key,
  Sparkles,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";

const ROLES = [
  {
    id: "TENANT",
    title: "Tenant / Resident",
    subtitle: "Renter account for residents",
    icon: User,
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    activeBorder: "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20",
    iconBg: "bg-blue-100 text-blue-600",
    features: [
      "Access resident portal & digital lease",
      "Pay rent online via Stripe",
      "Submit & track maintenance requests",
      "Rate completed property tours"
    ]
  },
  {
    id: "OWNER",
    title: "Property Owner",
    subtitle: "Landlord / Property Manager",
    icon: Building,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    activeBorder: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20",
    iconBg: "bg-emerald-100 text-emerald-600",
    features: [
      "Register properties & listing units",
      "Review tenant rental applications",
      "Track move-out deposit settlements",
      "Receive automated payout ledgers"
    ]
  },
  {
    id: "INSPECTOR",
    title: "Property Inspector",
    subtitle: "Field Inspection Specialist",
    icon: Wrench,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    activeBorder: "border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20",
    iconBg: "bg-purple-100 text-purple-600",
    features: [
      "Conduct preliminary & final walkthroughs",
      "Log itemized damages & upload photos",
      "Sign off digital walkthrough reports",
      "View assigned property schedules"
    ]
  },
  {
    id: "SUPERADMIN",
    title: "System Administrator",
    subtitle: "Full Unrestricted Root Access",
    icon: ShieldAlert,
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 font-extrabold",
    activeBorder: "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20",
    iconBg: "bg-rose-100 text-rose-600",
    features: [
      "Manage all users, roles & system settings",
      "Override lease statuses & deposit settlements",
      "Access global platform profit & payout metrics",
      "Inspect full audit logs & system activity"
    ]
  }
];

export default function AddNewUserPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

  // Email verification state
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"IDLE" | "AVAILABLE" | "TAKEN" | "INVALID">("IDLE");

  // Password mode: "EMAIL_LINK" (default recommended) or "MANUAL"
  const [passwordMode, setPasswordMode] = useState<"EMAIL_LINK" | "MANUAL">("EMAIL_LINK");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "TENANT",
    sendWelcomeEmail: true,
    isActive: true,
    notes: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    } else if (status === "authenticated" && (session?.user as any)?.role !== "SUPERADMIN") {
      router.push("/dashboard");
    }
  }, [status, router, session]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === "email") {
      setEmailStatus("IDLE");
    }
  };

  // Real-time email validation & duplicate check
  const handleEmailBlur = async () => {
    const email = formData.email.trim();
    if (!email) {
      setEmailStatus("IDLE");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailStatus("INVALID");
      return;
    }

    setCheckingEmail(true);
    try {
      const res = await fetch(`/api/admin/users?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          setEmailStatus("TAKEN");
        } else {
          setEmailStatus("AVAILABLE");
        }
      } else {
        setEmailStatus("IDLE");
      }
    } catch {
      setEmailStatus("IDLE");
    } finally {
      setCheckingEmail(false);
    }
  };

  // Cloudinary / File Upload Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setAvatarUrl(data.url);
        toast.success("Profile photo uploaded successfully!");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to upload image");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error uploading image");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Generate strong random password helper
  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
    let newPassword = "";
    for (let i = 0; i < 16; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({
      ...prev,
      password: newPassword,
      confirmPassword: newPassword,
    }));
    setShowPassword(true);
    toast.success("Generated strong 16-character password!");
  };

  // Password Strength Calculator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score, label: "Weak", color: "bg-rose-500 text-rose-700" };
    if (score <= 4) return { score, label: "Medium", color: "bg-amber-500 text-amber-700" };
    return { score, label: "Strong & Secure", color: "bg-emerald-500 text-emerald-700" };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim()) {
      toast.error("First Name is required.");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("Email address is required.");
      return;
    }

    if (emailStatus === "TAKEN") {
      toast.error("This email address is already registered in PropertyPro.");
      return;
    }

    if (emailStatus === "INVALID") {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (passwordMode === "MANUAL") {
      if (!formData.password) {
        toast.error("Please enter a password or switch to Email Setup Link mode.");
        return;
      }
      if (formData.password.length < 6) {
        toast.error("Password must be at least 6 characters long.");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        sendWelcomeEmail: formData.sendWelcomeEmail,
        isActive: formData.isActive,
        avatar: avatarUrl || null,
        notes: formData.notes.trim() || null,
        ...(passwordMode === "MANUAL" ? { password: formData.password } : {}),
      };

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newUser = await res.json();
        toast.success(`User "${newUser.name || newUser.email}" created successfully!`);
        router.push("/dashboard/admin/users");
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to create user");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred while creating user.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  const selectedRoleObj = ROLES.find(r => r.id === formData.role);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pt-6 pb-24 px-2 sm:px-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link 
              href="/dashboard/admin/users" 
              className="text-[#6E6E73] hover:text-[#1D1D1F] transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Users Directory
            </Link>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Add New User Account
          </h1>
          <p className="text-[#6E6E73] text-sm mt-0.5 font-medium">
            Register a new platform member and assign their role & access permissions
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="border-slate-200 text-slate-700 font-bold h-11 px-5 rounded-xl flex-1 sm:flex-initial"
            onClick={() => router.push("/dashboard/admin/users")}
          >
            Cancel
          </Button>
          <Button 
            className="bg-slate-900 hover:bg-[#007AFF] text-white font-bold rounded-xl flex items-center justify-center gap-2 h-11 px-7 shadow-sm transition-all flex-1 sm:flex-initial"
            onClick={handleSubmit}
            disabled={loading || uploadingAvatar || emailStatus === "TAKEN"}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} 
            Create Account
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar Upload & Status Controls */}
        <div className="space-y-6">
          
          {/* Avatar Upload Card */}
          <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/jpeg,image/png,image/webp" 
                onChange={handleFileChange}
              />
              
              <div 
                onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
                className="h-32 w-32 rounded-full bg-slate-50 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center mb-4 cursor-pointer hover:bg-[#F2F2F7] hover:border-slate-400 transition-all relative group overflow-hidden shadow-inner"
              >
                {uploadingAvatar ? (
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                    <span className="text-[10px] font-bold text-blue-600">Uploading...</span>
                  </div>
                ) : avatarUrl ? (
                  <>
                    <img src={avatarUrl} alt="Avatar Preview" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                      <Upload className="h-5 w-5 mb-1" />
                      <span className="text-[10px] font-bold">Change Photo</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="h-7 w-7 text-[#8E8E93] group-hover:text-[#6E6E73] mb-1 transition-colors" />
                    <span className="text-xs font-bold text-[#6E6E73]">Upload Photo</span>
                  </>
                )}
              </div>

              <h3 className="font-bold text-slate-900 text-sm">Profile Avatar</h3>
              <p className="text-xs text-[#8E8E93] mt-0.5 mb-4 font-medium">Supports JPG, PNG, or WEBP up to 10MB</p>
              
              {avatarUrl ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                  onClick={() => setAvatarUrl("")}
                >
                  <X className="h-3.5 w-3.5" /> Remove Photo
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={uploadingAvatar}
                  className="w-full border-slate-200 font-bold rounded-xl text-slate-800 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select Photo File
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Account Status & Notification Toggles */}
          <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
            <CardContent className="p-6 space-y-6">
              
              {/* Active Account Switch */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">Active Account Status</h4>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      formData.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}>
                      {formData.isActive ? "ACTIVE" : "SUSPENDED"}
                    </span>
                  </div>
                  <p className="text-xs text-[#6E6E73] font-medium">
                    {formData.isActive ? "User can immediately log in & access features." : "User account will be created in deactivated status."}
                  </p>
                </div>
                <Switch 
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({...prev, isActive: checked}))}
                />
              </div>

              <div className="h-px w-full bg-slate-100" />

              {/* Welcome Email Switch */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-blue-600" /> Send Welcome Email
                  </h4>
                  <p className="text-xs text-[#6E6E73] font-medium">
                    Dispatches setup email with one-time login link.
                  </p>
                </div>
                <Switch 
                  checked={formData.sendWelcomeEmail}
                  onCheckedChange={(checked) => setFormData(prev => ({...prev, sendWelcomeEmail: checked}))}
                />
              </div>

            </CardContent>
          </Card>

          {/* Quick Summary Preview Box */}
          <div className="bg-[#007AFF] text-white rounded-3xl p-5 space-y-3 shadow-md">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#8E8E93]">Creation Summary</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8E8E93]">Target Role:</span>
                <span className="font-bold text-white">{selectedRoleObj?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E8E93]">Status:</span>
                <span className={`font-bold ${formData.isActive ? "text-emerald-400" : "text-rose-400"}`}>
                  {formData.isActive ? "Active" : "Suspended"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E8E93]">Password Mode:</span>
                <span className="font-bold text-blue-300">
                  {passwordMode === "EMAIL_LINK" ? "Email Setup Link" : "Manual Password"}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Form Fields */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Role Selection Cards */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" /> Select Account Role *
              </h3>
              <p className="text-xs text-[#6E6E73] font-medium mt-0.5">
                Role controls what navigation menus, property data, and actions the user can access.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ROLES.map((r) => {
                const IconComp = r.icon;
                const isSelected = formData.role === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setFormData(prev => ({ ...prev, role: r.id }))}
                    className={`p-5 rounded-2xl border bg-white cursor-pointer transition-all relative space-y-3 ${
                      isSelected ? r.activeBorder : "border-slate-200 hover:border-slate-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${r.iconBg}`}>
                          <IconComp className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                            {r.title}
                          </h4>
                          <p className="text-[11px] text-[#8E8E93] font-semibold">{r.subtitle}</p>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <span className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <ul className="space-y-1 pt-1 border-t border-slate-100">
                      {r.features.map((feat, idx) => (
                        <li key={idx} className="text-xs text-[#6E6E73] flex items-center gap-1.5 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* SUPERADMIN WARNING BANNER */}
            {formData.role === "SUPERADMIN" && (
              <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in duration-200">
                <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider">
                    ⚠️ High Privilege Role Selected
                  </h4>
                  <p className="text-xs font-semibold text-rose-700 mt-0.5 leading-relaxed">
                    You are assigning <strong>SuperAdmin</strong> root permissions. This account will have full power to manage all users, override financial ledgers, and modify global platform configuration across PropertyPro.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Personal Information */}
          <Card className="bg-white border-slate-200 shadow-xs rounded-3xl">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <User className="h-4 w-4 text-blue-600" /> Personal Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {/* First Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">First Name *</Label>
                  <Input 
                    name="firstName"
                    placeholder="e.g. Sarah"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-xl h-11 text-xs font-semibold text-slate-900"
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Last Name</Label>
                  <Input 
                    name="lastName"
                    placeholder="e.g. Jenkins"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-xl h-11 text-xs font-semibold text-slate-900"
                  />
                </div>

                {/* Email Address with Real-time Check */}
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-slate-700">Email Address *</Label>
                    {checkingEmail && (
                      <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Checking availability...
                      </span>
                    )}
                    {!checkingEmail && emailStatus === "AVAILABLE" && (
                      <span className="text-[11px] text-emerald-600 font-extrabold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Email available
                      </span>
                    )}
                    {!checkingEmail && emailStatus === "TAKEN" && (
                      <span className="text-[11px] text-rose-600 font-extrabold flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5" /> Email already registered in system
                      </span>
                    )}
                    {!checkingEmail && emailStatus === "INVALID" && (
                      <span className="text-[11px] text-amber-600 font-extrabold">
                        Invalid email format
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input 
                      type="email"
                      name="email"
                      placeholder="sarah.jenkins@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      onBlur={handleEmailBlur}
                      className={`bg-slate-50 border-slate-200 focus-visible:ring-1 rounded-xl h-11 text-xs font-semibold text-slate-900 ${
                        emailStatus === "TAKEN" ? "border-rose-300 bg-rose-50/50 focus-visible:ring-rose-500" :
                        emailStatus === "AVAILABLE" ? "border-emerald-300 bg-emerald-50/20 focus-visible:ring-emerald-500" :
                        "focus-visible:ring-blue-500"
                      }`}
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700">Phone Number (Optional)</Label>
                  <Input 
                    type="tel"
                    name="phone"
                    placeholder="+1 (555) 234-5678"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-xl h-11 text-xs font-semibold text-slate-900"
                  />
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Section 3: Password & Authentication Credentials */}
          <Card className="bg-white border-slate-200 shadow-xs rounded-3xl">
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-emerald-600" /> Authentication Method
                </h3>

                {/* Mode Selector Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setPasswordMode("EMAIL_LINK")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      passwordMode === "EMAIL_LINK" 
                        ? "bg-white text-blue-600 shadow-xs font-extrabold" 
                        : "text-[#6E6E73] hover:text-[#1D1D1F]"
                    }`}
                  >
                    Email Setup Link (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswordMode("MANUAL")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      passwordMode === "MANUAL" 
                        ? "bg-white text-blue-600 shadow-xs font-extrabold" 
                        : "text-[#6E6E73] hover:text-[#1D1D1F]"
                    }`}
                  >
                    Set Password Manually
                  </button>
                </div>
              </div>

              {passwordMode === "EMAIL_LINK" ? (
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-blue-950 uppercase tracking-wider">
                      Automated Email Setup Link
                    </h4>
                    <p className="text-xs font-medium text-blue-800 leading-relaxed">
                      A secure, 7-day password setup link will be automatically generated and emailed to <strong>{formData.email || "the user's email"}</strong>. The user will set their own secret password during their first login.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[#6E6E73]">Manual Password Configuration</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGeneratePassword}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 rounded-lg flex items-center gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Generate Random Password
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    
                    {/* Password Input */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Initial Password *</Label>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"}
                          name="password"
                          placeholder="Enter secure password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-xl h-11 text-xs font-semibold pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-[#8E8E93] hover:text-[#6E6E73]"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password Input */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Confirm Password *</Label>
                      <div className="relative">
                        <Input 
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          placeholder="Re-enter password"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className="bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-xl h-11 text-xs font-semibold pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-3 text-[#8E8E93] hover:text-[#6E6E73]"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[#6E6E73]">Password Strength:</span>
                        <span className={`font-black ${passwordStrength.color}`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex gap-1">
                        <div className={`h-full transition-all duration-300 ${passwordStrength.score >= 1 ? "w-1/4 bg-rose-500" : "w-0"}`} />
                        <div className={`h-full transition-all duration-300 ${passwordStrength.score >= 3 ? "w-2/4 bg-amber-500" : "w-0"}`} />
                        <div className={`h-full transition-all duration-300 ${passwordStrength.score >= 5 ? "w-full bg-emerald-500" : "w-0"}`} />
                      </div>
                    </div>
                  )}

                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 4: Internal Admin Notes */}
          <Card className="bg-white border-slate-200 shadow-xs rounded-3xl">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="h-4 w-4 text-purple-600" /> Internal Admin Notes (Optional)
              </h3>
              <textarea
                name="notes"
                rows={3}
                placeholder="e.g. Created manually per phone request from On-Site Property Manager..."
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              />
              <p className="text-[11px] text-[#8E8E93] font-medium">
                These notes are visible only to platform administrators in audit logs.
              </p>
            </CardContent>
          </Card>

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <Button 
              variant="outline" 
              className="border-slate-200 text-slate-700 font-bold h-11 px-6 rounded-xl"
              onClick={() => router.push("/dashboard/admin/users")}
            >
              Cancel
            </Button>
            <Button 
              className="bg-slate-900 hover:bg-[#007AFF] text-white font-bold rounded-xl flex items-center gap-2 h-11 px-8 shadow-sm transition-all"
              onClick={handleSubmit}
              disabled={loading || uploadingAvatar || emailStatus === "TAKEN"}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} 
              Create Account
            </Button>
          </div>

        </div>

      </div>
    </div>
  );
}
