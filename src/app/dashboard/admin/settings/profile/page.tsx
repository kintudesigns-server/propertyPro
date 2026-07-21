"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Lock, 
  Upload, 
  Loader2, 
  Check, 
  Eye, 
  EyeOff, 
  Bell, 
  KeyRound, 
  X,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

export default function AdminProfileSettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Notification preferences state
  const [notifyOwnerApplications, setNotifyOwnerApplications] = useState(true);
  const [notifyPayoutRequests, setNotifyPayoutRequests] = useState(true);
  const [notifyMaintenanceEscalations, setNotifyMaintenanceEscalations] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (status === "authenticated") {
      if ((session?.user as any)?.role !== "SUPERADMIN") {
        router.push("/dashboard");
        return;
      }
      fetchAdminProfile();
    }
  }, [status, session, router]);

  const fetchAdminProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setName(data.name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setAvatarUrl(data.avatar || "");
      }
    } catch (err) {
      toast.error("Failed to load admin profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be under 10MB");
      return;
    }

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.url);
        toast.success("Profile avatar uploaded!");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to upload avatar");
      }
    } catch (error) {
      toast.error("Error uploading photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    if (newPassword) {
      if (!currentPassword) {
        toast.error("Please enter your current password to set a new password.");
        return;
      }
      if (newPassword.length < 6) {
        toast.error("New password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("New password and confirm password do not match.");
        return;
      }
    }

    setSaving(true);

    try {
      const payload: any = {
        name: name.trim(),
        phone: phone.trim(),
        avatar: avatarUrl || null,
      };

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Admin profile updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        // Trigger session refresh if name or avatar changed
        update({ name, image: avatarUrl });
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update profile.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pt-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Admin Profile & Security Settings
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">
            Manage your personal administrator credentials, profile details, and security configuration
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
            <ShieldCheck className="h-4 w-4 text-rose-600" /> SuperAdmin Privileges
          </span>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-8">
        
        {/* Avatar & Basic Profile Card */}
        <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" /> Personal Profile Information
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 font-medium">
              Your name and contact details visible across administrator audit logs
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            {/* Avatar Row */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b border-slate-100">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/jpeg,image/png,image/webp" 
                onChange={handleAvatarUpload}
              />
              <div 
                onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
                className="h-24 w-24 rounded-full bg-slate-900 text-white flex flex-col items-center justify-center cursor-pointer hover:opacity-90 transition-all relative overflow-hidden shrink-0 border-2 border-slate-200 shadow-md group"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : avatarUrl ? (
                  <>
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                      Change
                    </div>
                  </>
                ) : (
                  <span className="text-2xl font-black">{name ? name.charAt(0).toUpperCase() : "A"}</span>
                )}
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1">
                <h4 className="font-bold text-slate-900 text-sm">Administrator Photo</h4>
                <p className="text-xs text-slate-500 font-medium">Upload your profile image (JPG, PNG, WEBP up to 10MB)</p>
                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    disabled={uploadingAvatar}
                    className="border-slate-200 font-bold rounded-xl text-slate-800 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" /> Select Image
                  </Button>
                  {avatarUrl && (
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm"
                      className="text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-xs"
                      onClick={() => setAvatarUrl("")}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Full Name *</Label>
                <div className="relative">
                  <User className="h-4 w-4 absolute left-3 top-3.5 text-slate-400" />
                  <Input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="SuperAdmin Name"
                    className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-xl h-11 text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Email (Read only) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Email Address (Account ID)</Label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-3.5 text-slate-400" />
                  <Input 
                    value={email}
                    disabled
                    className="pl-9 bg-slate-100 border-slate-200 rounded-xl h-11 text-xs font-semibold text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-700">Contact Phone Number</Label>
                <div className="relative">
                  <Phone className="h-4 w-4 absolute left-3 top-3.5 text-slate-400" />
                  <Input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-xl h-11 text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

            </div>

          </CardContent>
        </Card>

        {/* Security & Password Change */}
        <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-emerald-600" /> Security & Password Update
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 font-medium">
              Leave blank if you do not wish to change your current password
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            
            {/* Current Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Current Password</Label>
              <div className="relative">
                <Input 
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-xl h-11 text-xs font-semibold pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* New Password */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">New Password</Label>
                <div className="relative">
                  <Input 
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-xl h-11 text-xs font-semibold pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Confirm New Password</Label>
                <Input 
                  type={showNewPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-xl h-11 text-xs font-semibold"
                />
              </div>

            </div>

          </CardContent>
        </Card>

        {/* Administrator Alert Preferences */}
        <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Bell className="h-4 w-4 text-purple-600" /> Platform Event Notification Preferences
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 font-medium">
              Choose which high-priority platform events dispatch instant alert notifications to you
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">New Owner Registrations</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Receive notifications when property owners submit applications</p>
              </div>
              <Switch 
                checked={notifyOwnerApplications}
                onCheckedChange={setNotifyOwnerApplications}
              />
            </div>

            <div className="h-px w-full bg-slate-100" />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Owner Payout Requests</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Receive alert when landlord requests withdrawal payout</p>
              </div>
              <Switch 
                checked={notifyPayoutRequests}
                onCheckedChange={setNotifyPayoutRequests}
              />
            </div>

            <div className="h-px w-full bg-slate-100" />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Maintenance Escalations</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Alert on emergency maintenance requests exceeding threshold limit</p>
              </div>
              <Switch 
                checked={notifyMaintenanceEscalations}
                onCheckedChange={setNotifyMaintenanceEscalations}
              />
            </div>

          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button 
            type="submit"
            disabled={saving || uploadingAvatar}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 h-12 px-8 shadow-sm transition-all text-sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save Profile & Security Changes
          </Button>
        </div>

      </form>

    </div>
  );
}
