"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, CheckCircle2, Home, Loader2, Mail, Lock, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const [form, setForm] = useState({ name: "", phone: "", password: "", confirmPassword: "" });

  useEffect(() => {
    if (!params.token) return;
    fetch(`/api/tenant-invitations/${params.token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else {
          setInvitation(data);
          setForm(f => ({ ...f, name: data.tenantName }));
        }
      })
      .catch(() => setError("Failed to load invitation."))
      .finally(() => setLoading(false));
  }, [params.token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tenant-invitations/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, phone: form.phone, password: form.password }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to accept invitation");
        return;
      }

      setAccepted(true);

      // Auto sign in
      await signIn("credentials", {
        email: invitation.tenantEmail,
        password: form.password,
        redirect: false,
      });

      setTimeout(() => router.push("/dashboard"), 2000);
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="h-9 w-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">PropertyPro</span>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
              <p className="text-slate-400">Loading invitation...</p>
            </div>
          )}

          {error && (
            <div className="p-8 text-center">
              <p className="text-white font-bold text-lg mb-2">Invitation Unavailable</p>
              <p className="text-slate-400">{error}</p>
            </div>
          )}

          {accepted && (
            <div className="p-8 text-center">
              <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-white font-black text-2xl mb-2">Welcome Aboard! 🎉</h2>
              <p className="text-slate-400">Your account is ready. Redirecting to your dashboard...</p>
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400 mx-auto mt-4" />
            </div>
          )}

          {invitation && !accepted && (
            <>
              {/* Unit Details Banner */}
              <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-b border-white/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                    <Home className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold">{invitation.unit?.property?.name}</p>
                    <p className="text-slate-400 text-sm">{invitation.unit?.property?.address}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-slate-400 text-xs mb-1">Unit</p>
                    <p className="text-white font-bold text-sm">{invitation.unit?.name}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-slate-400 text-xs mb-1">Monthly Rent</p>
                    <p className="text-emerald-400 font-bold">${Number(invitation.monthlyRent).toLocaleString()}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-slate-400 text-xs mb-1">Lease Start</p>
                    <p className="text-white font-bold text-xs">{new Date(invitation.leaseStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h2 className="text-white font-black text-xl mb-1">Create Your Account</h2>
                <p className="text-slate-400 text-sm mb-6">Complete your details to accept this invitation and access your tenant portal.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 font-semibold text-sm">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your full name" className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus-visible:ring-indigo-500" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300 font-semibold text-sm">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input disabled value={invitation.tenantEmail} className="pl-10 h-11 bg-white/5 border-white/10 text-slate-400 rounded-xl opacity-70" />
                    </div>
                    <p className="text-slate-600 text-xs">This email was pre-set by your landlord.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300 font-semibold text-sm">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 000-0000" className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus-visible:ring-indigo-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-slate-300 font-semibold text-sm">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 chars" className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus-visible:ring-indigo-500" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-300 font-semibold text-sm">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input required type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Repeat" className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus-visible:ring-indigo-500" />
                      </div>
                    </div>
                  </div>

                  <Button disabled={submitting} type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl mt-2">
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating Account...</> : "Accept Invitation & Join →"}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
