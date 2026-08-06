"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Lock, Eye, EyeOff, CheckCircle2, Loader2, ShieldCheck, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Password strength
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const strength = [hasMinLength, hasUppercase, hasNumber].filter(Boolean).length;
  const strengthLabel = ["", "Weak", "Fair", "Strong"][strength];
  const strengthColor = ["", "bg-rose-400", "bg-amber-400", "bg-emerald-500"][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) { setError("Invalid reset link. Please request a new one."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (!hasMinLength) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
      } else {
        setDone(true);
        setTimeout(() => router.push("/auth/login"), 3000);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4 font-sans">
        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-600 border border-rose-100">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">Invalid Link</h1>
        <p className="text-[#6E6E73] text-xs font-normal">This password reset link is invalid or has expired.</p>
        <Link href="/auth/forgot-password" className="block pt-2">
          <Button className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-xs border-none cursor-pointer">
            Request a New Link
          </Button>
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-4 font-sans">
        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">Password Updated!</h1>
        <p className="text-[#6E6E73] text-xs font-normal leading-relaxed">
          Your password has been successfully reset. Redirecting you to sign in...
        </p>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className="h-full bg-slate-900 rounded-full animate-[progress_3s_linear]" style={{ width: "100%" }} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">Set a new password</h1>
        <p className="text-[#6E6E73] text-xs font-normal mt-1">
          Choose a strong password you haven't used before.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[#6E6E73] font-normal text-xs">New Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 focus-visible:border-slate-900 shadow-2xs transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Password strength bar */}
          {password.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex gap-1.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : "bg-slate-100"}`} />
                ))}
              </div>
              <p className="text-[11px] font-normal text-[#6E6E73]">Password strength: <span className="font-semibold text-[#1D1D1F]">{strengthLabel}</span></p>
              <div className="space-y-1 pt-0.5">
                {[
                  { ok: hasMinLength, label: "At least 8 characters" },
                  { ok: hasUppercase, label: "At least one uppercase letter" },
                  { ok: hasNumber, label: "At least one number" },
                ].map(({ ok, label }) => (
                  <p key={label} className={`text-[11px] font-normal flex items-center gap-1.5 ${ok ? "text-emerald-700" : "text-slate-400"}`}>
                    <ShieldCheck className={`h-3 w-3 ${ok ? "text-emerald-600" : "text-slate-300"}`} /> {label}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-[#6E6E73] font-normal text-xs">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 focus-visible:border-slate-900 shadow-2xs transition-all ${
                confirmPassword && password !== confirmPassword ? "border-rose-300 focus-visible:ring-rose-400" : ""
              }`}
            />
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-[11px] font-normal text-rose-600">Passwords do not match</p>
          )}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || password !== confirmPassword || !hasMinLength}
          className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-xs border-none cursor-pointer flex justify-center items-center gap-2 transition-all mt-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Updating...</span>
            </>
          ) : (
            <>
              <span>Set New Password</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>

        <div className="text-center pt-2">
          <Link href="/auth/login" className="inline-flex items-center gap-1.5 text-xs font-normal text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1D1D1F] flex flex-col justify-center items-center px-4 py-12 relative font-sans">
      {/* Brand logo header */}
      <Link href="/" className="flex items-center gap-2.5 group mb-8 z-10">
        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-xs group-hover:bg-slate-800 transition-all">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-semibold tracking-tight text-[#1D1D1F] leading-tight">PropertyPro</span>
          <span className="text-[10px] text-[#6E6E73] font-normal tracking-wider uppercase">SaaS OS</span>
        </div>
      </Link>

      <div className="w-full max-w-md bg-white border border-slate-200 shadow-xs rounded-3xl p-6 sm:p-8 z-10">
        <Suspense fallback={<div className="text-center text-slate-400 text-xs font-normal py-8">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

