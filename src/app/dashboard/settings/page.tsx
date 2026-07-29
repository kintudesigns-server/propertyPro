"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, Phone, Mail, Building, Landmark, Percent, Wrench, Shield, CheckCircle2, ShieldCheck, FileText, Heart, Wallet } from "lucide-react";
import { toast } from "sonner";
import SecuritySettings from "@/components/settings/SecuritySettings";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Profile Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [role, setRole] = useState("");

  // Owner specific states
  const [entityType, setEntityType] = useState("INDIVIDUAL");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [approvalThreshold, setApprovalThreshold] = useState<number | string>("");
  const [emergencyOverrideLimit, setEmergencyOverrideLimit] = useState<number | string>("");

  // Tenant specific states
  const [dob, setDob] = useState("");
  const [ssn, setSsn] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("EMPLOYED");
  const [employer, setEmployer] = useState("");
  const [position, setPosition] = useState("");
  const [annualIncome, setAnnualIncome] = useState<number | string>("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [emergencyEmail, setEmergencyEmail] = useState("");

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

        // Owner details
        setEntityType(data.employmentStatus === "BUSINESS" ? "BUSINESS" : "INDIVIDUAL");
        setBankName(data.bankName || "");
        setAccountName(data.accountName || "");
        setAccountNumber(data.accountNumber || "");
        setApprovalThreshold(data.approvalThreshold ?? "");
        setEmergencyOverrideLimit(data.emergencyOverrideLimit ?? "");

        // Tenant details
        setDob(data.dob || "");
        setSsn(data.ssn || "");
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
    } catch (err) {
      toast.error("Error loading profile settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchProfileData();
    }
  }, [status]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image file size must be less than 5MB.");
        return;
      }
      setAvatarUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
        setAvatarUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: any = {
        name,
        phone,
        avatar,
      };

      if (role === "OWNER") {
        body.employmentStatus = entityType;
        body.bankName = bankName;
        body.accountName = accountName;
        body.accountNumber = accountNumber;
        body.approvalThreshold = approvalThreshold === "" ? null : Number(approvalThreshold);
        body.emergencyOverrideLimit = emergencyOverrideLimit === "" ? null : Number(emergencyOverrideLimit);
      } else if (role === "TENANT") {
        body.dob = dob;
        body.ssn = ssn;
        body.employmentStatus = employmentStatus;
        body.employer = employer;
        body.position = position;
        body.annualIncome = annualIncome === "" ? null : Number(annualIncome);
        body.emergencyName = emergencyName;
        body.emergencyPhone = emergencyPhone;
        body.emergencyRelationship = emergencyRelationship;
        body.emergencyEmail = emergencyEmail;
      }

      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await update(); // refresh NextAuth session info
        toast.success("Profile settings updated successfully!");
        fetchProfileData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save profile changes.");
      }
    } catch (err) {
      toast.error("An error occurred while saving your changes.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-slate-400 font-extrabold text-sm uppercase tracking-wider">Loading settings...</p>
      </div>
    );
  }

  const isOwner = role === "OWNER";
  const isTenant = role === "TENANT";

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Manage your personal profile and account credentials</p>
      </div>

      {/* Tabs list */}
      <div className="flex items-center space-x-6 border-b border-[#E5E5EA] mb-8">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "profile" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          Profile Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "security" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          Security & Password
        </button>
      </div>

      {activeTab === "profile" ? (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <Card className="bg-white border-0 rounded-3xl shadow-sm p-6 md:p-8">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2.5 mb-6">Personal Details</h3>
            
            {/* Avatar Upload */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 mb-6 border-b border-slate-100">
              <div className="h-24 w-24 shrink-0 rounded-full bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center relative shadow-inner">
                {avatar ? (
                  <img src={avatar} alt="Profile Avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-slate-400" />
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Button type="button" variant="outline" className="h-9 px-4 text-xs font-bold rounded-lg border-slate-300">
                      Upload Image
                    </Button>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleAvatarUpload} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  {avatar && (
                    <Button type="button" variant="ghost" className="h-9 px-4 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setAvatar("")}>
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-medium">JPEG, PNG or GIF. Maximum file size 5MB.</p>
              </div>
            </div>

            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-bold text-slate-700">Full Name</Label>
                <div className="relative">
                  <Input 
                    id="fullName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11 pl-10"
                    required
                  />
                  <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emailAddress" className="text-sm font-bold text-slate-700">Email Address (Read-Only)</Label>
                <div className="relative">
                  <Input 
                    id="emailAddress"
                    value={email}
                    disabled
                    placeholder="name@example.com"
                    className="bg-slate-100 border-slate-200 rounded-xl text-sm h-11 pl-10 cursor-not-allowed text-slate-500"
                  />
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phoneNumber" className="text-sm font-bold text-slate-700">Phone Number</Label>
                <div className="relative">
                  <Input 
                    id="phoneNumber"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 000-0000"
                    className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11 pl-10"
                  />
                  <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>
            </div>
          </Card>

          {/* Owner specific section */}
          {isOwner && (
            <Card className="bg-white border-0 rounded-3xl shadow-sm p-6 md:p-8">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2.5 mb-6">Landlord & Portfolio Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold text-slate-700">Entity Type</Label>
                  <Select value={entityType} onValueChange={(val) => setEntityType(val || "INDIVIDUAL")}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-11">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INDIVIDUAL">Individual Landlord</SelectItem>
                      <SelectItem value="BUSINESS">Property Business / Firm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="threshold" className="text-sm font-bold text-slate-700">Maintenance Threshold ($)</Label>
                  <div className="relative">
                    <Input 
                      id="threshold"
                      type="number"
                      value={approvalThreshold}
                      onChange={(e) => setApprovalThreshold(e.target.value)}
                      placeholder="e.g. 200"
                      className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11 pl-10"
                    />
                    <Percent className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Repairs below this amount are auto-approved without owner intervention.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="override" className="text-sm font-bold text-slate-700">Emergency Repair Limit ($)</Label>
                  <div className="relative">
                    <Input 
                      id="override"
                      type="number"
                      value={emergencyOverrideLimit}
                      onChange={(e) => setEmergencyOverrideLimit(e.target.value)}
                      placeholder="e.g. 1500"
                      className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11 pl-10"
                    />
                    <Wrench className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Maximum amount contractors can bill for emergency safety repairs.</p>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2.5 mb-6 mt-10">Escrow & Payout Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label htmlFor="bank" className="text-sm font-bold text-slate-700">Bank Name</Label>
                  <div className="relative">
                    <Input 
                      id="bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Chase Bank"
                      className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11 pl-10"
                    />
                    <Landmark className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bankName" className="text-sm font-bold text-slate-700">Account holder Name</Label>
                  <div className="relative">
                    <Input 
                      id="bankName"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="e.g. Atlas Properties LLC"
                      className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11 pl-10"
                    />
                    <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bankNo" className="text-sm font-bold text-slate-700">Account Number</Label>
                  <div className="relative">
                    <Input 
                      id="bankNo"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Enter account number"
                      className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11 pl-10"
                    />
                    <Wallet className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Tenant specific section */}
          {isTenant && (
            <Card className="bg-white border-0 rounded-3xl shadow-sm p-6 md:p-8">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2.5 mb-6">Employment & Financial Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold text-slate-700">Employment Status</Label>
                  <Select value={employmentStatus} onValueChange={(val) => setEmploymentStatus(val || "EMPLOYED")}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-11">
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

                <div className="space-y-1.5">
                  <Label htmlFor="employer" className="text-sm font-bold text-slate-700">Employer</Label>
                  <Input 
                    id="employer"
                    value={employer}
                    onChange={(e) => setEmployer(e.target.value)}
                    placeholder="Company Name"
                    className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="position" className="text-sm font-bold text-slate-700">Job Title / Position</Label>
                  <Input 
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g. Software Engineer"
                    className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="income" className="text-sm font-bold text-slate-700">Annual Income ($)</Label>
                  <Input 
                    id="income"
                    type="number"
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(e.target.value)}
                    placeholder="e.g. 85000"
                    className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                  />
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2.5 mb-6 mt-10">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label htmlFor="emergName" className="text-sm font-bold text-slate-700">Contact Name</Label>
                  <div className="relative">
                    <Input 
                      id="emergName"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="Full Name"
                      className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11 pl-10"
                    />
                    <Heart className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="emergRel" className="text-sm font-bold text-slate-700">Relationship</Label>
                  <Input 
                    id="emergRel"
                    value={emergencyRelationship}
                    onChange={(e) => setEmergencyRelationship(e.target.value)}
                    placeholder="e.g. Spouse, Parent, Friend"
                    className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="emergPhone" className="text-sm font-bold text-slate-700">Phone Number</Label>
                  <div className="relative">
                    <Input 
                      id="emergPhone"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="Phone"
                      className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11 pl-10"
                    />
                    <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="emergEmail" className="text-sm font-bold text-slate-700">Email Address</Label>
                  <div className="relative">
                    <Input 
                      id="emergEmail"
                      value={emergencyEmail}
                      onChange={(e) => setEmergencyEmail(e.target.value)}
                      placeholder="Email"
                      className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11 pl-10"
                    />
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-4 max-w-4xl mx-auto">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 px-8 rounded-xl shrink-0 shadow-sm"
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </div>
              ) : (
                "Save Changes"
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
