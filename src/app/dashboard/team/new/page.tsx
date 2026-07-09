"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Briefcase, Mail, Phone, ShieldCheck, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AddTeamMember() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "INSPECTOR",
  });

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
        router.push("/dashboard/team");
        router.refresh();
      } else {
        alert(data.error || "Failed to create team member");
      }
    } catch (error) {
      console.error("Submission error", error);
      alert("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/team">
          <button className="h-10 w-10 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] shadow-sm transition-all">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Add Team Member</h1>
          <p className="text-sm font-medium text-[#64748B] mt-0.5">Invite a new inspector or staff member to your organization</p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-[#E2E8F0]">
                <User className="h-5 w-5 text-[#3B82F6]" />
                <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">Personal Details</h3>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Full Name <span className="text-[#EF4444]">*</span></Label>
                <Input 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="e.g. John Doe" 
                  className="h-12 bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] rounded-xl shadow-sm font-medium text-[#0F172A]" 
                  required 
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Role <span className="text-[#EF4444]">*</span></Label>
                <div className="flex gap-4">
                  <div className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.role === "INSPECTOR" ? "border-[#3B82F6] bg-[#EFF6FF]" : "border-[#E2E8F0] hover:border-[#CBD5E1]"}`} onClick={() => setFormData({...formData, role: "INSPECTOR"})}>
                    <ShieldCheck className={`h-8 w-8 mb-2 ${formData.role === "INSPECTOR" ? "text-[#3B82F6]" : "text-[#94A3B8]"}`} />
                    <span className={`text-sm font-bold ${formData.role === "INSPECTOR" ? "text-[#1D4ED8]" : "text-[#64748B]"}`}>Inspector</span>
                  </div>
                  <div className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.role === "ACCOUNTANT" ? "border-[#3B82F6] bg-[#EFF6FF]" : "border-[#E2E8F0] hover:border-[#CBD5E1]"}`} onClick={() => setFormData({...formData, role: "ACCOUNTANT"})}>
                    <Briefcase className={`h-8 w-8 mb-2 ${formData.role === "ACCOUNTANT" ? "text-[#3B82F6]" : "text-[#94A3B8]"}`} />
                    <span className={`text-sm font-bold ${formData.role === "ACCOUNTANT" ? "text-[#1D4ED8]" : "text-[#64748B]"}`}>Accountant</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-[#E2E8F0]">
                <Mail className="h-5 w-5 text-[#3B82F6]" />
                <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">Contact Info</h3>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Email Address <span className="text-[#EF4444]">*</span></Label>
                <Input 
                  name="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="john@example.com" 
                  className="h-12 bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] rounded-xl shadow-sm font-medium text-[#0F172A]" 
                  required 
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Phone Number</Label>
                <Input 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  placeholder="+1 (555) 000-0000" 
                  className="h-12 bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] rounded-xl shadow-sm font-medium text-[#0F172A]" 
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Temporary Password <span className="text-[#EF4444]">*</span></Label>
                <Input 
                  name="password" 
                  type="password"
                  value={formData.password} 
                  onChange={handleChange} 
                  placeholder="Set an initial password" 
                  className="h-12 bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] rounded-xl shadow-sm font-medium text-[#0F172A]" 
                  required
                />
              </div>
              
              <div className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl">
                <p className="text-xs font-medium text-[#64748B] leading-relaxed">
                  <strong className="text-[#0F172A] block mb-1">Login Credentials:</strong>
                  Provide this email and password to your new team member securely. They can change their password anytime after their first login.
                </p>
              </div>
            </div>
          </div>

        </div>
        
        {/* Footer Actions */}
        <div className="px-6 md:px-8 py-5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-4">
          <Link href="/dashboard/team">
            <Button type="button" variant="ghost" className="h-12 px-6 rounded-xl font-bold text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading} className="h-12 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold px-8 rounded-xl shadow-sm shadow-blue-500/20 transition-all text-sm">
            {loading ? "Creating..." : "Add Team Member"}
          </Button>
        </div>
      </form>
    </div>
  );
}
