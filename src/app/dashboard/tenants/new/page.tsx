"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, UploadCloud, User, Briefcase, PhoneCall, FileText, Camera, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import PausedAccountGate from "@/components/subscription/PausedAccountGate";

export default function AddTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [blockAddTenant, setBlockAddTenant] = useState(false);
  const [gracePeriodEnd, setGracePeriodEnd] = useState<string | null>(null);
  const [pausedAt, setPausedAt] = useState<string | null>(null);
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

  useEffect(() => {
    fetch("/api/properties")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProperties(data);
      })
      .catch(() => toast.error("Failed to load properties"))
      .finally(() => setHasLoaded(true));

    fetch("/api/subscription/rules")
      .then(res => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then(rules => {
        setBlockAddTenant(!!rules.blockAddTenant);
        setGracePeriodEnd(rules.gracePeriodEnd || null);
        setPausedAt(rules.pausedAt || null);
      })
      .catch(() => {});
  }, []);

  const hasApprovedProperty = properties.some(p => p.approvalStatus === "APPROVED");

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
    <div className="w-full max-w-5xl mx-auto pt-4 space-y-6 pb-24 px-2 sm:px-6 font-sans">
      {/* Page Header */}
      <div className="flex items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <Link href="/dashboard/tenants">
          <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Add New Tenant</h1>
          <p className="text-xs text-[#6E6E73] font-normal mt-0.5">Create a new tenant profile and invite them to the portal.</p>
        </div>
      </div>

      {hasLoaded && !hasApprovedProperty && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-amber-100 text-amber-900 rounded-2xl shrink-0">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-950 text-base">Property Approval Required</h3>
              <p className="text-amber-800 text-xs mt-0.5 font-semibold leading-relaxed">
                You do not have any properties approved by administrative review. You must have at least one approved property before registering a tenant.
              </p>
            </div>
          </div>
          <Link href="/dashboard/properties">
            <Button type="button" className="bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-medium whitespace-nowrap px-5 py-2 h-10 shrink-0 border-0 text-xs">
              View Properties
            </Button>
          </Link>
        </div>
      )}

      <PausedAccountGate 
        isLocked={blockAddTenant} 
        reason="Registering new tenants" 
        gracePeriodEnd={gracePeriodEnd} 
        pausedAt={pausedAt}
        allowedActions={[
          "All your existing tenant records and lease history are safe.",
          "Existing tenants can still pay rent, submit maintenance, and message you."
        ]}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Profile Photo */}
        <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
          <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 sm:gap-8">
            <div className="relative group cursor-pointer shrink-0">
              <div className="h-28 w-28 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 group-hover:border-slate-400 group-hover:bg-slate-100/60 group-hover:text-slate-700 transition-all">
                <Camera className="h-7 w-7 mb-1 text-slate-400" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Upload</span>
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-base">Profile Photo</h2>
              <p className="text-xs text-slate-500 font-medium mt-1 mb-4 max-w-md leading-relaxed">Upload a clear, professional photo for the tenant's profile. PNG, JPG, or GIF up to 5MB.</p>
              <Button type="button" variant="outline" className="h-9 px-4 rounded-xl font-medium text-xs border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-xs">
                Select Image
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <User className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Personal Information</h2>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name <span className="text-rose-500">*</span></label>
                <Input required name="firstName" value={formData.firstName} onChange={handleChange} placeholder="e.g. John" className="h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 font-semibold text-xs text-slate-900 shadow-xs" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name <span className="text-rose-500">*</span></label>
                <Input required name="lastName" value={formData.lastName} onChange={handleChange} placeholder="e.g. Doe" className="h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 font-semibold text-xs text-slate-900 shadow-xs" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address <span className="text-rose-500">*</span></label>
                <Input required type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" className="h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 font-semibold text-xs text-slate-900 shadow-xs" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" className="h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 font-semibold text-xs text-slate-900 shadow-xs" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth</label>
                <Input type="date" name="dob" value={formData.dob} onChange={handleChange} className="h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 font-semibold text-xs text-slate-900 shadow-xs" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">SSN (Optional)</label>
                <Input name="ssn" value={formData.ssn} onChange={handleChange} placeholder="XXX-XX-XXXX" className="h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 font-semibold text-xs text-slate-900 shadow-xs" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tenant Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-semibold text-slate-900 outline-none shadow-xs">
                  <option value="Application Submitted">Application Submitted</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Active">Active</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Portal Password <span className="text-rose-500">*</span></label>
                <Input required type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className="h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 font-semibold text-xs text-slate-900 shadow-xs" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password <span className="text-rose-500">*</span></label>
                <Input required type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className="h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 font-semibold text-xs text-slate-900 shadow-xs" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <Briefcase className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Employment Information</h2>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employer</label>
                <Input name="employer" value={formData.employer} onChange={handleChange} placeholder="e.g. Acme Corp" className="h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 font-semibold text-xs text-slate-900 shadow-xs" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Position / Title</label>
                <Input name="position" value={formData.position} onChange={handleChange} placeholder="e.g. Software Engineer" className="h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 font-semibold text-xs text-slate-900 shadow-xs" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Annual Income ($)</label>
                <Input type="number" name="annualIncome" value={formData.annualIncome} onChange={handleChange} placeholder="e.g. 75000" className="h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 font-semibold text-xs text-slate-900 shadow-xs" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employment Start Date</label>
                <Input type="date" name="employmentStartDate" value={formData.employmentStartDate} onChange={handleChange} className="h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 font-semibold text-xs text-slate-900 shadow-xs" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <PhoneCall className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Emergency Contact</h2>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Name</label>
                <Input name="emergencyName" value={formData.emergencyName} onChange={handleChange} placeholder="e.g. Jane Doe" className="h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 font-semibold text-xs text-slate-900 shadow-xs" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Relationship</label>
                <select name="emergencyRelationship" value={formData.emergencyRelationship} onChange={handleChange} className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-semibold text-slate-900 outline-none shadow-xs">
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
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Phone</label>
                <Input name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} placeholder="+1 (555) 000-0000" className="h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 font-semibold text-xs text-slate-900 shadow-xs" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Email</label>
                <Input type="email" name="emergencyEmail" value={formData.emergencyEmail} onChange={handleChange} placeholder="jane@example.com" className="h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 font-semibold text-xs text-slate-900 shadow-xs" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Additional Information */}
          <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-semibold text-slate-900">Additional Details</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Credit Score</label>
                <Input type="number" name="creditScore" value={formData.creditScore} onChange={handleChange} placeholder="e.g. 720" className="h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 font-semibold text-xs text-slate-900 shadow-xs" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Move-in Date</label>
                <Input type="date" name="moveInDate" value={formData.moveInDate} onChange={handleChange} className="h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 font-semibold text-xs text-slate-900 shadow-xs" />
              </div>
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-semibold text-slate-900">Administrative Notes</h2>
            </div>
            <CardContent className="p-6">
              <textarea 
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any internal notes about this tenant (e.g., pets, special requirements)..."
                className="w-full h-full min-h-[140px] bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-y shadow-xs" 
              />
            </CardContent>
          </Card>
        </div>

        {/* Documents Upload */}
        <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Documents & Verification</h2>
          </div>
          <CardContent className="p-6">
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50/60 transition-colors cursor-pointer">
              <div className="h-14 w-14 bg-slate-100 text-slate-800 rounded-2xl flex items-center justify-center mb-3 border border-slate-200">
                <UploadCloud className="h-7 w-7 text-slate-700" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Upload Tenant Documents</h3>
              <p className="text-xs text-slate-500 font-medium mt-1 mb-4">Drag and drop IDs, proof of income, or references here.</p>
              <div className="flex items-center gap-4 text-xs font-bold text-emerald-700 mb-5">
                <span className="flex items-center gap-1">✓ PDF, DOC, JPG</span>
                <span className="flex items-center gap-1">✓ Up to 10MB each</span>
              </div>
              <Button type="button" variant="outline" className="h-9 px-5 rounded-xl border-slate-200 text-slate-800 font-medium text-xs bg-white hover:bg-slate-50 shadow-xs">
                Choose Files
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Floating Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 flex justify-end gap-3 z-20 shadow-md">
          <Link href="/dashboard/tenants">
            <Button type="button" variant="outline" className="h-10 px-5 rounded-xl font-medium text-xs text-slate-700 border-slate-200 bg-white hover:bg-slate-50 shadow-xs">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading || !hasApprovedProperty} className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-6 rounded-xl font-medium text-xs shadow-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            {loading ? "Saving..." : "Create Tenant"}
          </Button>
        </div>
      </form>
      </PausedAccountGate>
    </div>
  );
}

