"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, KeyRound, Eye, EyeOff, CheckCircle2, Loader2, ShieldCheck, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Password rules
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const matches = password.length > 0 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid or missing setup link. Please contact support.");
      return;
    }
    if (!hasMinLength) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (res.ok) {
        setDone(true);
        toast.success("Password set successfully! Redirecting to login...");
        setTimeout(() => router.push("/auth/login"), 2500);
      } else {
        toast.error(data.error || "Failed to set password.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md bg-white border border-slate-200 shadow-xs rounded-3xl z-10 overflow-hidden font-sans">
        <CardContent className="p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#1D1D1F] tracking-tight">Invalid Setup Link</h2>
            <p className="text-xs text-[#6E6E73] font-normal mt-1 leading-relaxed">
              This setup link is missing or invalid. Setup links are single-use and expire after 48 hours for security reasons.
            </p>
          </div>
          <Link href="/auth/login" className="block pt-2">
            <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 font-medium text-xs shadow-xs">
              Go to Login
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md bg-white border border-slate-200 shadow-xs rounded-3xl z-10 overflow-hidden font-sans">
      <CardHeader className="space-y-1.5 pt-8 px-6 sm:px-8 text-center border-b border-slate-100">
        <CardTitle className="text-2xl sm:text-3xl font-semibold text-[#1D1D1F] tracking-tight">
          Set Your Password
        </CardTitle>
        <CardDescription className="text-[#6E6E73] text-xs font-normal">
          Create a secure password to activate your PropertyPro account.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 sm:p-8 space-y-5">
        {done ? (
          <div className="text-center py-6 space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-2xs">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#1D1D1F] tracking-tight">Password Set Successfully!</h3>
              <p className="text-xs text-[#6E6E73] font-normal mt-1">
                Your account is ready. Redirecting you to the login page...
              </p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full animate-pulse" style={{ width: "100%" }} />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 bg-[#F8FAFC] border-slate-200 rounded-xl text-xs text-[#1D1D1F] font-medium focus-visible:ring-slate-900 placeholder:text-[#AEAEB2]"
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-[#1D1D1F] transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
                <Input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`pl-10 h-11 bg-[#F8FAFC] border-slate-200 rounded-xl text-xs text-[#1D1D1F] font-medium focus-visible:ring-slate-900 placeholder:text-[#AEAEB2] ${
                    confirm && password !== confirm ? "border-rose-300 focus-visible:ring-rose-500" : ""
                  }`}
                  placeholder="Repeat new password"
                  required
                  minLength={8}
                />
              </div>
              {confirm && password !== confirm && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Security checklist */}
            {password.length > 0 && (
              <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider mb-1">Security Requirements</p>
                <div className={`text-xs font-medium flex items-center gap-1.5 ${hasMinLength ? "text-emerald-700" : "text-[#6E6E73]"}`}>
                  <ShieldCheck className={`h-3.5 w-3.5 ${hasMinLength ? "text-emerald-600" : "text-slate-300"}`} />
                  At least 8 characters
                </div>
                <div className={`text-xs font-medium flex items-center gap-1.5 ${hasUppercase ? "text-emerald-700" : "text-[#6E6E73]"}`}>
                  <ShieldCheck className={`h-3.5 w-3.5 ${hasUppercase ? "text-emerald-600" : "text-slate-300"}`} />
                  At least one uppercase letter (A-Z)
                </div>
                <div className={`text-xs font-medium flex items-center gap-1.5 ${hasNumber ? "text-emerald-700" : "text-[#6E6E73]"}`}>
                  <ShieldCheck className={`h-3.5 w-3.5 ${hasNumber ? "text-emerald-600" : "text-slate-300"}`} />
                  At least one number (0-9)
                </div>
                <div className={`text-xs font-medium flex items-center gap-1.5 ${matches ? "text-emerald-700" : "text-[#6E6E73]"}`}>
                  <ShieldCheck className={`h-3.5 w-3.5 ${matches ? "text-emerald-600" : "text-slate-300"}`} />
                  Passwords match
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !hasMinLength || password !== confirm}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 font-medium text-xs shadow-xs transition-all border-none cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving Password...
                </>
              ) : (
                "Set Password & Continue →"
              )}
            </Button>
          </form>
        )}

        <div className="pt-2 text-center border-t border-slate-100">
          <p className="text-[11px] text-[#6E6E73] font-normal">
            Need help? Contact{" "}
            <a href="mailto:support@propertypro.com" className="text-[#1D1D1F] font-semibold underline hover:text-slate-700">
              support@propertypro.com
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1D1D1F] flex flex-col justify-center items-center px-4 py-12 relative font-sans">
      {/* Brand logo header */}
      <Link href="/" className="flex items-center gap-2.5 group mb-8 z-10">
        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-xs group-hover:bg-slate-800 transition-all">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-semibold tracking-tight text-[#1D1D1F] leading-tight">PropertyPro</span>
          <span className="text-[10px] text-[#6E6E73] font-normal tracking-wider uppercase">Secure Account Setup</span>
        </div>
      </Link>

      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-[#6E6E73]">
            <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
            <p className="text-xs font-semibold uppercase tracking-wider">Loading secure setup...</p>
          </div>
        }
      >
        <SetPasswordForm />
      </Suspense>
    </div>
  );
}
