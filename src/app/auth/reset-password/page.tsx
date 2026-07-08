"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Building, Lock, Eye, EyeOff, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
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
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-emerald-500"][strength];

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
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <Lock className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-black text-slate-800">Invalid Link</h1>
        <p className="text-slate-500 text-sm font-medium">This password reset link is invalid or missing.</p>
        <Link href="/auth/forgot-password">
          <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold">
            Request a New Link
          </Button>
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto animate-bounce">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-800">Password Updated!</h1>
        <p className="text-slate-500 text-sm font-medium">
          Your password has been successfully reset. Redirecting you to sign in...
        </p>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full animate-[progress_3s_linear]" style={{ width: "100%" }} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">Set a new password</h1>
        <p className="text-slate-500 text-sm font-medium mt-1">
          Choose a strong password you haven't used before.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-bold text-slate-700">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-12 bg-slate-50 border-slate-200 rounded-xl text-slate-800 font-medium focus-visible:ring-blue-500 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Password strength bar */}
          {password.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex gap-1.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : "bg-slate-200"}`} />
                ))}
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-slate-400">Password strength: <span className="text-slate-700">{strengthLabel}</span></p>
              </div>
              <div className="space-y-1">
                {[
                  { ok: hasMinLength, label: "At least 8 characters" },
                  { ok: hasUppercase, label: "At least one uppercase letter" },
                  { ok: hasNumber, label: "At least one number" },
                ].map(({ ok, label }) => (
                  <p key={label} className={`text-xs font-semibold flex items-center gap-1.5 ${ok ? "text-emerald-600" : "text-slate-400"}`}>
                    <ShieldCheck className={`h-3 w-3 ${ok ? "text-emerald-500" : "text-slate-300"}`} /> {label}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-sm font-bold text-slate-700">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`pl-10 h-12 bg-slate-50 border-slate-200 rounded-xl text-slate-800 font-medium focus-visible:ring-blue-500 focus:bg-white ${
                confirmPassword && password !== confirmPassword ? "border-red-300 focus-visible:ring-red-400" : ""
              }`}
            />
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs font-semibold text-red-500">Passwords do not match</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || password !== confirmPassword || !hasMinLength}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
        >
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating...</> : "Set New Password"}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center px-4">
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-black text-2xl text-blue-600">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Building className="h-5 w-5 text-white" />
            </div>
            Property<span className="text-slate-800">Pro</span>
          </Link>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-white shadow-xl shadow-blue-900/5 p-8">
          <Suspense fallback={<div className="text-center text-slate-400 font-semibold py-8">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
