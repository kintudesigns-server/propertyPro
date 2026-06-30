"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, UploadCloud, User, Briefcase, PhoneCall, FileText, Camera } from "lucide-react";
import { toast } from "sonner";

export default function AddTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
    ssn: "",
    password: "",
    confirmPassword: "",
    status: "Application Submitted",
    
    // Employment
    employer: "",
    position: "",
    annualIncome: "",
    employmentStartDate: "",
    
    // Emergency Contact
    emergencyName: "",
    emergencyRelationship: "Parent",
    emergencyPhone: "",
    emergencyEmail: "",
    
    // Additional
    creditScore: "",
    moveInDate: "",
    
    // Notes
    notes: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
      };

      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Tenant created successfully!");
        router.push("/dashboard/tenants");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create tenant");
      }
    } catch (err) {
      toast.error("An error occurred while creating the tenant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto pt-6 space-y-6 pb-24">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/tenants">
          <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl bg-white border border-[#E2E8F0] shadow-sm text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Add New Tenant</h1>
          <p className="text-[#64748B] text-sm mt-1">Create a new tenant profile and invite them to the portal.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Profile Photo */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
            <div className="relative group cursor-pointer">
              <div className="h-32 w-32 rounded-full bg-[#F8FAFC] border-2 border-dashed border-[#CBD5E1] flex flex-col items-center justify-center text-[#94A3B8] group-hover:border-[#3B82F6] group-hover:bg-[#EFF6FF] group-hover:text-[#3B82F6] transition-all">
                <Camera className="h-8 w-8 mb-1" />
                <span className="text-xs font-bold">Upload</span>
              </div>
            </div>
            <div>
              <h2 className="font-bold text-[#0F172A] text-lg">Profile Photo</h2>
              <p className="text-sm text-[#64748B] mt-1 mb-4 max-w-md">Upload a clear, professional photo for the tenant's profile. PNG, JPG, or GIF up to 5MB.</p>
              <Button type="button" variant="outline" className="h-10 px-6 rounded-xl font-bold border-[#E2E8F0] text-[#0F172A]">
                Select Image
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center gap-2">
            <User className="h-5 w-5 text-[#3B82F6]" />
            <h2 className="font-bold text-[#0F172A] text-lg">Personal Information</h2>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">First Name <span className="text-red-500">*</span></label>
                <Input required name="firstName" value={formData.firstName} onChange={handleChange} placeholder="e.g. John" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Last Name <span className="text-red-500">*</span></label>
                <Input required name="lastName" value={formData.lastName} onChange={handleChange} placeholder="e.g. Doe" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Email Address <span className="text-red-500">*</span></label>
                <Input required type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Phone Number</label>
                <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-[#F1F5F9] pt-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Date of Birth</label>
                <Input type="date" name="dob" value={formData.dob} onChange={handleChange} className="h-11 rounded-xl bg-white border-[#E2E8F0] text-[#0F172A]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">SSN (Optional)</label>
                <Input name="ssn" value={formData.ssn} onChange={handleChange} placeholder="XXX-XX-XXXX" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Tenant Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full h-11 bg-white border border-[#E2E8F0] rounded-xl px-4 text-sm text-[#0F172A] outline-none">
                  <option value="Application Submitted">Application Submitted</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Active">Active</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-[#F1F5F9] pt-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Portal Password <span className="text-red-500">*</span></label>
                <Input required type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Confirm Password <span className="text-red-500">*</span></label>
                <Input required type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[#3B82F6]" />
            <h2 className="font-bold text-[#0F172A] text-lg">Employment Information</h2>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Employer</label>
                <Input name="employer" value={formData.employer} onChange={handleChange} placeholder="e.g. Acme Corp" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Position / Title</label>
                <Input name="position" value={formData.position} onChange={handleChange} placeholder="e.g. Software Engineer" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Annual Income ($)</label>
                <Input type="number" name="annualIncome" value={formData.annualIncome} onChange={handleChange} placeholder="e.g. 75000" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Employment Start Date</label>
                <Input type="date" name="employmentStartDate" value={formData.employmentStartDate} onChange={handleChange} className="h-11 rounded-xl bg-white border-[#E2E8F0] text-[#0F172A]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-[#3B82F6]" />
            <h2 className="font-bold text-[#0F172A] text-lg">Emergency Contact</h2>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Contact Name</label>
                <Input name="emergencyName" value={formData.emergencyName} onChange={handleChange} placeholder="e.g. Jane Doe" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Relationship</label>
                <select name="emergencyRelationship" value={formData.emergencyRelationship} onChange={handleChange} className="w-full h-11 bg-white border border-[#E2E8F0] rounded-xl px-4 text-sm text-[#0F172A] outline-none">
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Contact Phone</label>
                <Input name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} placeholder="+1 (555) 000-0000" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Contact Email</label>
                <Input type="email" name="emergencyEmail" value={formData.emergencyEmail} onChange={handleChange} placeholder="jane@example.com" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Additional Information */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50">
              <h2 className="font-bold text-[#0F172A] text-lg">Additional Details</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Credit Score</label>
                <Input type="number" name="creditScore" value={formData.creditScore} onChange={handleChange} placeholder="e.g. 720" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Target Move-in Date</label>
                <Input type="date" name="moveInDate" value={formData.moveInDate} onChange={handleChange} className="h-11 rounded-xl bg-white border-[#E2E8F0] text-[#0F172A]" />
              </div>
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50">
              <h2 className="font-bold text-[#0F172A] text-lg">Administrative Notes</h2>
            </div>
            <CardContent className="p-6">
              <textarea 
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any internal notes about this tenant (e.g., pets, special requirements)..."
                className="w-full h-full min-h-[140px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 text-sm text-[#0F172A] outline-none focus:ring-2 focus:ring-[#3B82F6] resize-y" 
              />
            </CardContent>
          </Card>
        </div>

        {/* Documents Upload */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#3B82F6]" />
            <h2 className="font-bold text-[#0F172A] text-lg">Documents & Verification</h2>
          </div>
          <CardContent className="p-6">
            <div className="border-2 border-dashed border-[#E2E8F0] rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-[#F8FAFC] transition-colors cursor-pointer">
              <div className="h-16 w-16 bg-[#EFF6FF] text-[#3B82F6] rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A]">Upload Tenant Documents</h3>
              <p className="text-sm text-[#64748B] mt-1 mb-4">Drag and drop IDs, proof of income, or references here.</p>
              <div className="flex items-center gap-4 text-xs font-semibold text-[#22C55E] mb-6">
                <span className="flex items-center gap-1">✓ PDF, DOC, JPG</span>
                <span className="flex items-center gap-1">✓ Up to 10MB each</span>
              </div>
              <Button type="button" variant="outline" className="h-10 px-6 rounded-full border-[#3B82F6] text-[#3B82F6] font-bold hover:bg-[#EFF6FF]">
                Choose Files
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Floating Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/80 backdrop-blur-md border-t border-[#E2E8F0] p-4 flex justify-end gap-3 z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
          <Link href="/dashboard/tenants">
            <Button type="button" variant="outline" className="h-11 px-6 rounded-xl font-bold text-[#0F172A] border-[#E2E8F0] shadow-sm hover:bg-[#F8FAFC]">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading} className="bg-[#3B82F6] hover:bg-[#2563EB] text-white h-11 px-8 rounded-xl font-bold shadow-sm flex items-center gap-2">
            {loading ? "Saving..." : "Create Tenant"}
          </Button>
        </div>
      </form>
    </div>
  );
}
