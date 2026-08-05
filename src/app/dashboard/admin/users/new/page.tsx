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
  Sparkles,
  CheckCircle2,
  XCircle,
  BadgeCheck,
  UserCheck
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";

const ROLES = [
  {
    id: "TENANT",
    title: "Tenant / Resident",
    subtitle: "Resident portal, digital lease & online rent payments",
    icon: User,
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    activeBorder: "border-2 border-slate-900 shadow-xs bg-slate-50/50",
    iconBg: "bg-blue-50 text-blue-600 border border-blue-200/80 shadow-2xs",
  },
  {
    id: "OWNER",
    title: "Property Owner",
    subtitle: "Landlord dashboard, listing management & payout ledgers",
    icon: Building,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    activeBorder: "border-2 border-slate-900 shadow-xs bg-slate-50/50",
    iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs",
  },
  {
    id: "INSPECTOR",
    title: "Property Inspector",
    subtitle: "Walkthrough inspections, itemized damages & sign-offs",
    icon: Wrench,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    activeBorder: "border-2 border-slate-900 shadow-xs bg-slate-50/50",
    iconBg: "bg-purple-50 text-purple-600 border border-purple-200/80 shadow-2xs",
  },
  {
    id: "SUPERADMIN",
    title: "System Administrator",
    subtitle: "Unrestricted root access, platform settings & audit logs",
    icon: ShieldAlert,
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 font-extrabold",
    activeBorder: "border-2 border-slate-900 shadow-xs bg-slate-50/50",
    iconBg: "bg-rose-50 text-rose-600 border border-rose-200/80 shadow-2xs",
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

    if (score <= 2) return { score, label: "Weak", color: "text-rose-600 bg-rose-50 border-rose-200" };
    if (score <= 4) return { score, label: "Medium", color: "text-amber-600 bg-amber-50 border-amber-200" };
    return { score, label: "Strong & Secure", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
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
    <div className="max-w-6xl mx-auto space-y-6 pt-4 pb-28 px-4 sm:px-8 font-sans">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs font-sans">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link 
              href="/dashboard/admin/users" 
              className="text-slate-600 hover:text-[#1D1D1F] transition-colors flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Users Directory
            </Link>
          </div>
          <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">
            Add New User Account
          </h1>
          <p className="text-[#6E6E73] text-sm mt-0.5 font-normal">
            Register a new platform member and configure their account role & access permissions.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 font-sans">
          <Button 
            variant="outline" 
            className="border-slate-200 text-slate-900 font-medium text-xs h-9 px-4 rounded-xl hover:bg-slate-50 bg-white shadow-2xs cursor-pointer"
            onClick={() => router.push("/dashboard/admin/users")}
          >
            Cancel
          </Button>
          <Button 
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 h-9 px-5 shadow-xs transition-all cursor-pointer border-none"
            onClick={handleSubmit}
            disabled={loading || uploadingAvatar || emailStatus === "TAKEN"}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />} 
            Create Account
          </Button>
        </div>
      </div>

      {/* Main Grid: Form Left (2 cols), Sidebar Right (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-sans">
        
        {/* LEFT COLUMN: Main Form Sections */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Role Selection Cards */}
          <div className="space-y-4 font-sans">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-700" /> 1. Account Role &amp; Access Level
                </h3>
                <p className="text-xs text-[#6E6E73] font-normal mt-0.5">
                  Select the system role to assign default permissions and feature access.
                </p>
              </div>
              <span className="text-[9px] font-black text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                Required *
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ROLES.map((r) => {
                const IconComp = r.icon;
                const isSelected = formData.role === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setFormData(prev => ({ ...prev, role: r.id }))}
                    className={`p-5 rounded-3xl border bg-white cursor-pointer transition-all relative flex flex-col justify-between ${
                      isSelected ? r.activeBorder : "border-slate-200 hover:border-slate-400 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl ${r.iconBg} shrink-0`}>
                          <IconComp className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 text-sm">
                            {r.title}
                          </h4>
                        </div>
                      </div>
                      
                      {isSelected ? (
                        <span className="h-5 w-5 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="h-5 w-5 rounded-full border border-slate-300 shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-[#6E6E73] font-normal mt-3 leading-relaxed">
                      {r.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* SUPERADMIN WARNING BANNER */}
            {formData.role === "SUPERADMIN" && (
              <div className="bg-rose-50/80 border border-rose-200 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in duration-200 shadow-2xs font-sans">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-black text-rose-950 uppercase tracking-wider">
                    High Privilege Administrator Role
                  </h4>
                  <p className="text-xs font-semibold text-rose-700 mt-0.5 leading-relaxed">
                    Assigning <strong>SuperAdmin</strong> role grants full root permissions across PropertyPro. This user will have unrestricted access to manage users, override ledgers, and modify platform settings.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Personal Details */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden font-sans">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-700" /> 2. Personal Information
                </h3>
                <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider">Step 2 of 4</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {/* First Name */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">First Name *</Label>
                  <Input 
                    name="firstName"
                    placeholder="e.g. Sarah"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="bg-slate-50 border-slate-200/80 focus-visible:bg-white focus-visible:ring-slate-900/10 focus-visible:border-slate-900 rounded-xl h-9 text-xs font-semibold text-slate-900 shadow-2xs"
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Last Name</Label>
                  <Input 
                    name="lastName"
                    placeholder="e.g. Jenkins"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="bg-slate-50 border-slate-200/80 focus-visible:bg-white focus-visible:ring-slate-900/10 focus-visible:border-slate-900 rounded-xl h-9 text-xs font-semibold text-slate-900 shadow-2xs"
                  />
                </div>

                {/* Email Address with Real-time Check */}
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Email Address *</Label>
                    {checkingEmail && (
                      <span className="text-[10px] text-slate-700 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Checking availability...
                      </span>
                    )}
                    {!checkingEmail && emailStatus === "AVAILABLE" && (
                      <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Email available
                      </span>
                    )}
                    {!checkingEmail && emailStatus === "TAKEN" && (
                      <span className="text-[10px] text-rose-600 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5" /> Email already registered in system
                      </span>
                    )}
                    {!checkingEmail && emailStatus === "INVALID" && (
                      <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider">
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
                      className={`bg-slate-50 border-slate-200/80 focus-visible:bg-white focus-visible:ring-2 rounded-xl h-9 text-xs font-semibold text-slate-900 shadow-2xs ${
                        emailStatus === "TAKEN" ? "border-rose-300 bg-rose-50/30 focus-visible:ring-rose-500/20 focus-visible:border-rose-500" :
                        emailStatus === "AVAILABLE" ? "border-emerald-300 bg-emerald-50/20 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500" :
                        "focus-visible:ring-slate-900/10 focus-visible:border-slate-900"
                      }`}
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Phone Number (Optional)</Label>
                  <Input 
                    type="tel"
                    name="phone"
                    placeholder="+1 (555) 234-5678"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="bg-slate-50 border-slate-200/80 focus-visible:bg-white focus-visible:ring-slate-900/10 focus-visible:border-slate-900 rounded-xl h-9 text-xs font-semibold text-slate-900 shadow-2xs"
                  />
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Section 3: Password & Authentication Credentials */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden font-sans">
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-emerald-600" /> 3. Security &amp; Credentials
                </h3>

                {/* Mode Selector Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-extrabold self-start sm:self-auto font-sans">
                  <button
                    type="button"
                    onClick={() => setPasswordMode("EMAIL_LINK")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      passwordMode === "EMAIL_LINK" 
                        ? "bg-white text-slate-900 shadow-2xs font-black" 
                        : "text-slate-500 hover:text-slate-900 font-bold"
                    }`}
                  >
                    Email Setup Link (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswordMode("MANUAL")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      passwordMode === "MANUAL" 
                        ? "bg-white text-slate-900 shadow-2xs font-black" 
                        : "text-slate-500 hover:text-slate-900 font-bold"
                    }`}
                  >
                    Set Password Manually
                  </button>
                </div>
              </div>

              {passwordMode === "EMAIL_LINK" ? (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3 shadow-2xs font-sans">
                  <Mail className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                      Automated Email Setup Link
                    </h4>
                    <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                      A secure password setup invitation will be automatically dispatched to <strong>{formData.email || "the user's email address"}</strong>. The user will establish their initial password during first-time login.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in duration-200 font-sans">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider">Manual Password Configuration</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGeneratePassword}
                      className="text-xs font-medium text-slate-900 hover:bg-slate-100 h-8 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Generate Random Password
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    
                    {/* Password Input */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Initial Password *</Label>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"}
                          name="password"
                          placeholder="Enter secure password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="bg-slate-50 border-slate-200/80 focus-visible:bg-white focus-visible:ring-slate-900/10 focus-visible:border-slate-900 rounded-xl h-9 text-xs font-semibold pr-10 shadow-2xs text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password Input */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Confirm Password *</Label>
                      <div className="relative">
                        <Input 
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          placeholder="Re-enter password"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className="bg-slate-50 border-slate-200/80 focus-visible:bg-white focus-visible:ring-slate-900/10 focus-visible:border-slate-900 rounded-xl h-9 text-xs font-semibold pr-10 shadow-2xs text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs font-sans">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-500 uppercase text-[10px]">Password Strength</span>
                        <span className={`font-black px-2 py-0.5 rounded-md text-[9px] uppercase border ${passwordStrength.color}`}>
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
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden font-sans">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="h-4 w-4 text-purple-600" /> 4. Internal Admin Notes (Optional)
              </h3>
              <textarea
                name="notes"
                rows={3}
                placeholder="e.g. Created manually per phone request from On-Site Property Manager..."
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 shadow-2xs transition-all resize-none font-sans"
              />
              <p className="text-[11px] text-slate-400 font-semibold">
                Internal reference notes are restricted exclusively to platform administrators in audit records.
              </p>
            </CardContent>
          </Card>

        </div>

        {/* RIGHT COLUMN: Sidebar (Avatar, Controls & Creation Summary) */}
        <div className="space-y-6 font-sans">
          
          {/* Avatar Upload Card */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden font-sans">
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
                className="h-28 w-28 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center mb-4 cursor-pointer hover:bg-slate-200/60 hover:border-slate-400 transition-all relative group overflow-hidden shadow-inner shrink-0"
              >
                {uploadingAvatar ? (
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
                    <span className="text-[10px] font-black text-slate-900">Uploading...</span>
                  </div>
                ) : avatarUrl ? (
                  <>
                    <img src={avatarUrl} alt="Avatar Preview" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                      <Upload className="h-5 w-5 mb-1" />
                      <span className="text-[10px] font-black">Change Photo</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-slate-400 group-hover:text-slate-900 mb-1 transition-colors" />
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Upload Photo</span>
                  </>
                )}
              </div>

              <h3 className="font-semibold text-slate-900 text-sm">Profile Avatar</h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-4 font-semibold">Supports JPG, PNG, or WEBP up to 10MB</p>
              
              {avatarUrl ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  onClick={() => setAvatarUrl("")}
                >
                  <X className="h-3.5 w-3.5" /> Remove Photo
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={uploadingAvatar}
                  className="w-full border-slate-200 font-medium rounded-xl text-slate-900 text-xs hover:bg-slate-50 bg-white shadow-2xs cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select Photo File
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Account Status & Welcome Email Settings */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden font-sans">
            <CardContent className="p-6 space-y-5">
              <h3 className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-slate-700" /> Account Configurations
              </h3>

              {/* Active Account Switch */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900 text-xs">Active Status</h4>
                    <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      formData.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}>
                      {formData.isActive ? "ACTIVE" : "SUSPENDED"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-semibold leading-normal">
                    {formData.isActive ? "User can log in immediately after registration." : "Account created in suspended state."}
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
                  <h4 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-700" /> Welcome Email
                  </h4>
                  <p className="text-[11px] text-slate-500 font-semibold leading-normal">
                    Dispatches onboarding email with login link.
                  </p>
                </div>
                <Switch 
                  checked={formData.sendWelcomeEmail}
                  onCheckedChange={(checked) => setFormData(prev => ({...prev, sendWelcomeEmail: checked}))}
                />
              </div>

            </CardContent>
          </Card>

          {/* Quick Summary Preview Box — Clean Modern SaaS Styling */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden p-5 space-y-4 font-sans">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Creation Summary</p>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Target Role</span>
                <span className="font-black text-slate-900">{selectedRoleObj?.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Status</span>
                <span className={`font-black px-2 py-0.5 rounded-md text-[9px] uppercase border ${
                  formData.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  {formData.isActive ? "Active" : "Suspended"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Password Mode</span>
                <span className="font-black text-slate-900">
                  {passwordMode === "EMAIL_LINK" ? "Email Setup Link" : "Manual Password"}
                </span>
              </div>
            </div>
          </Card>

        </div>

      </div>
    </div>
  );
}

