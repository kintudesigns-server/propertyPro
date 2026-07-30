"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, ShieldCheck, User, DollarSign, Key, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function EditTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    newPassword: "",
    approvalThreshold: "200",
    emergencyOverrideLimit: "1500",
  });

  useEffect(() => {
    const fetchInspector = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            newPassword: "",
            approvalThreshold: data.approvalThreshold !== undefined ? String(data.approvalThreshold) : "200",
            emergencyOverrideLimit: data.emergencyOverrideLimit !== undefined ? String(data.emergencyOverrideLimit) : "1500",
          });
        } else {
          toast.error("Inspector profile not found");
          router.push("/dashboard/team");
        }
      } catch (err) {
        toast.error("Failed to load inspector profile");
      } finally {
        setLoading(false);
      }
    };
    fetchInspector();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          approvalThreshold: formData.approvalThreshold,
          emergencyOverrideLimit: formData.emergencyOverrideLimit,
          ...(formData.newPassword ? { newPassword: formData.newPassword } : {}),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Inspector profile updated successfully!");
        router.push(`/dashboard/team/${id}`);
        router.refresh();
      } else {
        toast.error(data.error || data.message || "Failed to update profile");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-slate-400 font-extrabold text-xs uppercase tracking-wider">
          Loading Staff Profile...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6 pb-28 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/team/${id}`}>
          <button className="h-10 w-10 bg-white border border-[#E5E5EA] rounded-xl flex items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] shadow-sm transition-all">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#1D1D1F] tracking-tight">Edit Staff Inspector</h1>
          <p className="text-sm font-medium text-[#6E6E73] mt-0.5">
            Update credentials, contact information, and financial approval caps for this inspector.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA] overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Column 1: Personal & Role Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-[#E5E5EA]">
                <User className="h-5 w-5 text-[#007AFF]" />
                <h3 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-wider">Personal &amp; Role Details</h3>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">
                  Full Name <span className="text-[#EF4444]">*</span>
                </Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                  className="h-12 bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] rounded-xl shadow-sm font-medium text-[#1D1D1F]"
                  required
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">Role</Label>
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-xl border-[#007AFF] bg-[#EFF6FF]">
                    <ShieldCheck className="h-7 w-7 mb-1 text-[#007AFF]" />
                    <span className="text-sm font-bold text-[#1D4ED8]">Field Inspector</span>
                  </div>
                </div>
              </div>

              {/* Financial Approval Caps */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Financial Approval Caps</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Approval Cap ($)</Label>
                    <Input
                      name="approvalThreshold"
                      type="number"
                      value={formData.approvalThreshold}
                      onChange={handleChange}
                      className="h-11 rounded-xl bg-white border-[#E5E5EA] font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Emergency Cap ($)</Label>
                    <Input
                      name="emergencyOverrideLimit"
                      type="number"
                      value={formData.emergencyOverrideLimit}
                      onChange={handleChange}
                      className="h-11 rounded-xl bg-white border-[#E5E5EA] font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Contact Info & Reset Password */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-[#E5E5EA]">
                <Mail className="h-5 w-5 text-[#007AFF]" />
                <h3 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-wider">Contact &amp; Credentials</h3>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">
                  Email Address <span className="text-[#EF4444]">*</span>
                </Label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  className="h-12 bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] rounded-xl shadow-sm font-medium text-[#1D1D1F]"
                  required
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">Phone Number</Label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="h-12 bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] rounded-xl shadow-sm font-medium text-[#1D1D1F]"
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide flex items-center justify-between">
                  <span>Reset Login Password</span>
                  <span className="text-xs font-normal text-slate-400 lowercase">(optional)</span>
                </Label>
                <Input
                  name="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Leave blank to keep existing password"
                  className="h-12 bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] rounded-xl shadow-sm font-medium text-[#1D1D1F]"
                />
              </div>

              <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl">
                <p className="text-xs font-medium text-blue-800 leading-relaxed">
                  <strong className="block mb-0.5">Note on Password Resets:</strong>
                  Entering a new password here will immediately overwrite the inspector's password so they can log in with their new credentials.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 md:px-8 py-5 bg-[#F2F2F7] border-t border-[#E5E5EA] flex items-center justify-end gap-4">
          <Link href={`/dashboard/team/${id}`}>
            <Button type="button" variant="ghost" className="h-12 px-6 rounded-xl font-bold text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#E5E5EA]">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            className="h-12 bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold px-8 rounded-xl shadow-sm shadow-blue-500/20 transition-all text-sm"
          >
            {submitting ? "Saving Changes..." : "Save Inspector Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
