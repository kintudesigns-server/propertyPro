"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, User, Phone, Mail, Building, Landmark, Percent, Wrench,
  Shield, CheckCircle2, Camera, Wallet, Heart, Briefcase, DollarSign,
  Settings, Lock, ChevronRight, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import SecuritySettings from "@/components/settings/SecuritySettings";
import { getUserAvatar } from "@/lib/avatar";

const ROLE_CONFIG: Record<string, { label: string; dot: string }> = {
  SUPER_ADMIN: { label: "Super Admin",    dot: "bg-purple-500" },
  OWNER:       { label: "Property Owner", dot: "bg-blue-500"   },
  TENANT:      { label: "Tenant",         dot: "bg-emerald-500" },
  INSPECTOR:   { label: "Inspector",      dot: "bg-amber-500"  },
};

interface FieldProps {
  id: string;
  label: string;
  icon: React.ElementType;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
}

function FormField({
  id, label, icon: Icon, value, onChange, type = "text", placeholder, disabled, hint,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest">
        {label}
      </Label>
      <div className="relative group">
        <div
          className={`absolute left-3.5 top-3 transition-colors ${
            disabled ? "text-slate-300" : "text-slate-400 group-focus-within:text-slate-600"
          }`}
        >
          <Icon className="h-[17px] w-[17px]" />
        </div>
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`h-11 pl-10 pr-4 rounded-xl text-sm border transition-all font-medium ${
            disabled
              ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          }`}
        />
      </div>
      {hint && <p className="text-[11px] text-slate-400 leading-relaxed">{hint}</p>}
    </div>
  );
}

function SectionCard({
  title, icon: Icon, children,
}: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100">
        <Icon className="h-[17px] w-[17px] text-slate-400" />
        <h3 className="text-[14px] font-bold text-slate-700">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const [activeTab, setActiveTab]     = useState("profile");
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [role, setRole]   = useState("");

  const [entityType, setEntityType]   = useState("INDIVIDUAL");
  const [bankName, setBankName]       = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [approvalThreshold, setApprovalThreshold] = useState<number | string>("");
  const [emergencyOverrideLimit, setEmergencyOverrideLimit] = useState<number | string>("");

  const [employmentStatus, setEmploymentStatus]           = useState("EMPLOYED");
  const [employer, setEmployer]                           = useState("");
  const [position, setPosition]                           = useState("");
  const [annualIncome, setAnnualIncome]                   = useState<number | string>("");
  const [emergencyName, setEmergencyName]                 = useState("");
  const [emergencyPhone, setEmergencyPhone]               = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [emergencyEmail, setEmergencyEmail]               = useState("");

  const fetchProfileData = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setName(data.name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setAvatar(data.avatar || "");
        setRole(data.role || "");
        setEntityType(data.employmentStatus === "BUSINESS" ? "BUSINESS" : "INDIVIDUAL");
        setBankName(data.bankName || "");
        setAccountName(data.accountName || "");
        setAccountNumber(data.accountNumber || "");
        setApprovalThreshold(data.approvalThreshold ?? "");
        setEmergencyOverrideLimit(data.emergencyOverrideLimit ?? "");
        setEmploymentStatus(data.employmentStatus || "EMPLOYED");
        setEmployer(data.employer || "");
        setPosition(data.position || "");
        setAnnualIncome(data.annualIncome ?? "");
        setEmergencyName(data.emergencyName || "");
        setEmergencyPhone(data.emergencyPhone || "");
        setEmergencyRelationship(data.emergencyRelationship || "");
        setEmergencyEmail(data.emergencyEmail || "");
      } else {
        toast.error("Failed to load profile data.");
      }
    } catch {
      toast.error("Error loading profile settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchProfileData();
  }, [status]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB."); return; }
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => { setAvatar(reader.result as string); setAvatarUploading(false); };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { name, phone, avatar };
      if (role === "OWNER") {
        Object.assign(body, {
          employmentStatus: entityType, bankName, accountName, accountNumber,
          approvalThreshold: approvalThreshold === "" ? null : Number(approvalThreshold),
          emergencyOverrideLimit: emergencyOverrideLimit === "" ? null : Number(emergencyOverrideLimit),
        });
      } else if (role === "TENANT") {
        Object.assign(body, {
          employmentStatus, employer, position,
          annualIncome: annualIncome === "" ? null : Number(annualIncome),
          emergencyName, emergencyPhone, emergencyRelationship, emergencyEmail,
        });
      }
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await update();
        toast.success("Profile updated successfully!");
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchProfileData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save profile changes.");
      }
    } catch {
      toast.error("An error occurred while saving your changes.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
        <p className="text-slate-400 font-medium text-sm">Loading settings…</p>
      </div>
    );
  }

  const isOwner  = role === "OWNER";
  const isTenant = role === "TENANT";
  const roleInfo = ROLE_CONFIG[role] || ROLE_CONFIG["TENANT"];
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const tabs = [
    { id: "profile",  label: "Profile Settings",   icon: User },
    { id: "security", label: "Security & Password", icon: Shield },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 py-6 pb-20 font-sans">

      {/* ── Page Title ── */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Settings</h1>
        <p className="text-xs text-slate-500 font-semibold mt-0.5">Manage your profile, credentials and account preferences.</p>
      </div>

      {/* ── Profile Identity Strip ── */}
      <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-3xl px-6 py-5 mb-6 shadow-xs">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-xs">
            <img 
              src={avatar || getUserAvatar({ id: (session?.user as any)?.id, name, avatar })} 
              alt="Profile" 
              className="h-full w-full object-cover" 
            />
            {avatarUploading && (
              <div className="absolute inset-0 rounded-2xl bg-black/30 flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              </div>
            )}
          </div>
          <label
            htmlFor="avatar-strip-upload"
            title="Change photo"
            className="absolute -bottom-1.5 -right-1.5 h-6 w-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Camera className="h-3 w-3 text-slate-500" />
            <input id="avatar-strip-upload" type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" />
          </label>
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[15px] font-bold text-slate-900 truncate">{name || "—"}</p>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600`}>
              <span className={`h-1.5 w-1.5 rounded-full ${roleInfo.dot}`} />
              {roleInfo.label}
            </span>
          </div>
          <p className="text-[13px] text-slate-400 truncate mt-0.5">{email}</p>
        </div>

        {/* Status */}
        <div className="hidden sm:flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              activeTab === id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ── */}
      {activeTab === "profile" ? (
        <form onSubmit={handleSaveProfile} className="space-y-4">

          {/* Personal Details */}
          <SectionCard title="Personal Details" icon={User}>
            {/* Photo row */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6">
              <div className="h-14 w-14 shrink-0 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-slate-400 font-black text-lg">{initials || "?"}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-700">Profile Photo</p>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-3">JPEG, PNG or GIF — max 5MB</p>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="avatar-field-upload"
                    className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <Camera className="h-3 w-3" />
                    Change Photo
                    <input id="avatar-field-upload" type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" />
                  </label>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar("")}
                      className="text-xs font-semibold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField id="fullName"  label="Full Name"     icon={User}  value={name}  onChange={setName}  placeholder="Your full name" />
              <FormField
                id="emailAddr" label="Email Address" icon={Mail}  value={email} onChange={() => {}}
                placeholder="—" disabled hint="Email address cannot be changed."
              />
              <FormField id="phoneNumber" label="Phone Number" icon={Phone} value={phone} onChange={setPhone} placeholder="+1 (555) 000-0000" />
            </div>
          </SectionCard>

          {/* Owner */}
          {isOwner && (
            <>
              <SectionCard title="Landlord & Portfolio Settings" icon={Building}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest">Entity Type</Label>
                    <Select value={entityType} onValueChange={(v) => setEntityType(v || "INDIVIDUAL")}>
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 text-sm font-medium bg-white">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INDIVIDUAL">Individual Landlord</SelectItem>
                        <SelectItem value="BUSINESS">Property Business / Firm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <FormField
                    id="threshold" label="Maintenance Threshold ($)" icon={Percent}
                    value={approvalThreshold} onChange={setApprovalThreshold} type="number"
                    placeholder="e.g. 200" hint="Repairs below this amount are auto-approved."
                  />
                  <FormField
                    id="override" label="Emergency Repair Limit ($)" icon={Wrench}
                    value={emergencyOverrideLimit} onChange={setEmergencyOverrideLimit} type="number"
                    placeholder="e.g. 1500" hint="Max contractors can bill for emergency repairs."
                  />
                </div>
              </SectionCard>

              <SectionCard title="Escrow & Payout Details" icon={Landmark}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField id="bank"     label="Bank Name"            icon={Landmark} value={bankName}      onChange={setBankName}      placeholder="e.g. Chase Bank" />
                  <FormField id="acctName" label="Account Holder Name"  icon={User}     value={accountName}   onChange={setAccountName}   placeholder="e.g. Atlas Properties LLC" />
                  <FormField id="acctNum"  label="Account Number"       icon={Wallet}   value={accountNumber} onChange={setAccountNumber} placeholder="Enter account number" />
                </div>
              </SectionCard>
            </>
          )}

          {/* Tenant */}
          {isTenant && (
            <>
              <SectionCard title="Employment & Financial Profile" icon={Briefcase}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest">Employment Status</Label>
                    <Select value={employmentStatus} onValueChange={(v) => setEmploymentStatus(v || "EMPLOYED")}>
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 text-sm font-medium bg-white">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMPLOYED">Employed (Full-Time)</SelectItem>
                        <SelectItem value="SELF_EMPLOYED">Self-Employed</SelectItem>
                        <SelectItem value="STUDENT">Student</SelectItem>
                        <SelectItem value="UNEMPLOYED">Unemployed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <FormField id="employer" label="Employer"             icon={Building}   value={employer}     onChange={setEmployer}     placeholder="Company Name" />
                  <FormField id="position" label="Job Title / Position" icon={Briefcase}  value={position}     onChange={setPosition}     placeholder="e.g. Software Engineer" />
                  <FormField id="income"   label="Annual Income ($)"    icon={DollarSign} value={annualIncome} onChange={setAnnualIncome} type="number" placeholder="e.g. 85000" />
                </div>
              </SectionCard>

              <SectionCard title="Emergency Contact" icon={Heart}>
                <div className="flex gap-2.5 items-start p-3 bg-slate-50 border border-slate-100 rounded-xl mb-5">
                  <AlertCircle className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    This person will be contacted in case of an emergency involving your tenancy.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField id="emergName"  label="Contact Name"  icon={Heart} value={emergencyName}        onChange={setEmergencyName}        placeholder="Full name" />
                  <FormField id="emergRel"   label="Relationship"  icon={User}  value={emergencyRelationship} onChange={setEmergencyRelationship} placeholder="e.g. Spouse, Parent" />
                  <FormField id="emergPhone" label="Phone Number"  icon={Phone} value={emergencyPhone}        onChange={setEmergencyPhone}        placeholder="+1 (555) 000-0000" />
                  <FormField id="emergEmail" label="Email Address" icon={Mail}  value={emergencyEmail}        onChange={setEmergencyEmail}        placeholder="email@example.com" />
                </div>
              </SectionCard>
            </>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-[12px] text-slate-400">Changes are saved securely and reflected immediately.</p>
            <Button
              type="submit"
              disabled={submitting || saveSuccess}
              className={`h-10 px-6 rounded-xl font-bold text-sm transition-all ${
                saveSuccess
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              {submitting ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving…</span>
              ) : saveSuccess ? (
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Saved!</span>
              ) : (
                <span className="flex items-center gap-2">Save Changes <ChevronRight className="h-4 w-4" /></span>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <SecuritySettings />
      )}
    </div>
  );
}
