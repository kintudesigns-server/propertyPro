"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UserPlus, Upload, ShieldAlert, Check, Building, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AddNewUserPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "TENANT", // Default role
    sendWelcomeEmail: true,
    isActive: true,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    } else if (status === "authenticated" && (session?.user as any)?.role !== "SUPERADMIN") {
      router.push("/dashboard");
    }
  }, [status, router, session]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!formData.firstName || !formData.email || !formData.password || !formData.role) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: formData.role,
        }),
      });

      if (res.ok) {
        toast.success("User created successfully!");
        router.push("/dashboard/admin/users");
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to create user");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pt-6 pb-20 px-2 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard/admin/users" className="text-[#64748B] hover:text-[#0F172A] transition-colors flex items-center gap-1 text-sm font-semibold">
              <ArrowLeft className="h-4 w-4" /> Back to Users
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">Add New User</h1>
          <p className="text-[#64748B] text-base mt-0.5">Create a new platform account and assign roles</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-[#E2E8F0] text-[#0F172A] font-semibold h-11 px-5 rounded-xl" onClick={() => router.push("/dashboard/admin/users")}>
            Cancel
          </Button>
          <Button 
            className="bg-[#1E293B] hover:bg-[#0F172A] text-white font-semibold rounded-xl flex items-center gap-2 h-11 px-6 shadow-sm"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} 
            Create User
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar & Basic Status */}
        <div className="space-y-6">
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-28 w-28 rounded-full bg-[#F8FAFC] border-2 border-dashed border-[#CBD5E1] flex flex-col items-center justify-center mb-4 cursor-pointer hover:bg-[#F1F5F9] transition-colors relative group">
                <Upload className="h-6 w-6 text-[#94A3B8] group-hover:text-[#64748B] mb-1" />
                <span className="text-xs font-semibold text-[#64748B]">Upload Photo</span>
              </div>
              <h3 className="font-bold text-[#0F172A] text-lg">Profile Photo</h3>
              <p className="text-sm text-[#64748B] mt-1 mb-4">Recommended size: 400x400px</p>
              <Button variant="outline" className="w-full border-[#E2E8F0] font-semibold rounded-xl text-[#0F172A]">
                Select Image
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[#0F172A] text-sm">Active Account</h4>
                  <p className="text-xs text-[#64748B] mt-0.5">User can log in to the platform</p>
                </div>
                <Switch 
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({...prev, isActive: checked}))}
                />
              </div>
              
              <div className="h-px w-full bg-[#E2E8F0]" />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[#0F172A] text-sm">Send Welcome Email</h4>
                  <p className="text-xs text-[#64748B] mt-0.5">Send login credentials via email</p>
                </div>
                <Switch 
                  checked={formData.sendWelcomeEmail}
                  onCheckedChange={(checked) => setFormData(prev => ({...prev, sendWelcomeEmail: checked}))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
            <CardContent className="p-6 space-y-8">
              
              {/* Account Information */}
              <div>
                <h3 className="text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#475569]">First Name *</Label>
                    <Input 
                      name="firstName"
                      placeholder="e.g. John"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="bg-[#F8FAFC] border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#3B82F6] rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#475569]">Last Name</Label>
                    <Input 
                      name="lastName"
                      placeholder="e.g. Doe"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="bg-[#F8FAFC] border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#3B82F6] rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#475569]">Email Address *</Label>
                    <Input 
                      type="email"
                      name="email"
                      placeholder="john.doe@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="bg-[#F8FAFC] border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#3B82F6] rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#475569]">Phone Number</Label>
                    <Input 
                      type="tel"
                      name="phone"
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="bg-[#F8FAFC] border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#3B82F6] rounded-xl h-11"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-[#E2E8F0]" />

              {/* Role & Permissions */}
              <div>
                <h3 className="text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  Role & Access Level
                </h3>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#475569]">Platform Role *</Label>
                  <Select value={formData.role} onValueChange={(val) => setFormData(prev => ({...prev, role: val || "TENANT"}))}>
                    <SelectTrigger className="w-full bg-[#F8FAFC] border-[#E2E8F0] h-11 rounded-xl">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPERADMIN">System Administrator (Full Access)</SelectItem>
                      <SelectItem value="OWNER">Property Owner / Landlord</SelectItem>
                      <SelectItem value="TENANT">Tenant / Resident</SelectItem>
                      <SelectItem value="INSPECTOR">Maintenance Inspector</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#64748B] mt-2">
                    This determines what menus and data the user can access when they log in.
                  </p>
                </div>
              </div>

              <div className="h-px w-full bg-[#E2E8F0]" />

              {/* Password */}
              <div>
                <h3 className="text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center">
                    <Check className="h-4 w-4" />
                  </div>
                  Security
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#475569]">Temporary Password *</Label>
                    <Input 
                      type="password"
                      name="password"
                      placeholder="Enter a secure password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="bg-[#F8FAFC] border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#3B82F6] rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#475569]">Confirm Password *</Label>
                    <Input 
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm the password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="bg-[#F8FAFC] border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#3B82F6] rounded-xl h-11"
                    />
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
