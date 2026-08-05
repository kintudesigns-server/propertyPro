"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-center items-center px-4 py-12 relative font-sans">
      {/* Brand logo header */}
      <Link href="/" className="flex items-center gap-2.5 group mb-8 z-10">
        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-md shadow-slate-900/10 group-hover:bg-slate-800 transition-all">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tight text-slate-900 leading-tight">PropertyPro</span>
          <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">SaaS OS</span>
        </div>
      </Link>

      <div className="w-full max-w-md bg-white border border-slate-200 shadow-sm rounded-2xl p-6 sm:p-8 z-10">
        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Check your inbox!</h1>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              We've sent a password reset link to <strong className="text-slate-800">{email}</strong>.
              The link is valid for <strong>1 hour</strong>.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs text-slate-600 font-medium">
              💡 Didn't see it? Check your <strong>Spam / Junk</strong> folder.
            </div>
            <Link href="/auth/login">
              <Button className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium mt-2 text-sm shadow-xs">
                Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Forgot password?</h1>
              <p className="text-slate-500 text-xs font-medium mt-1">
                Enter your email address and we'll send you a secure reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-medium focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs font-semibold text-rose-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-sm shadow-xs transition-all"
              >
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : "Send Reset Link"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/auth/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
