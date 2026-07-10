"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid or missing setup link. Please contact your property manager.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-3xl font-black tracking-tight text-white">
            Property<span className="text-blue-400">Pro</span>
          </div>
          <p className="text-slate-400 text-sm mt-1 font-medium">Secure Account Setup</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {done ? (
            <div className="text-center py-6 space-y-4">
              <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
              <h2 className="text-xl font-black text-slate-900">Password Set Successfully!</h2>
              <p className="text-slate-500 text-sm">Redirecting you to the login page...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <KeyRound className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900">Set Your Password</h1>
                  <p className="text-xs text-slate-500 font-medium">Create a secure password for your PropertyPro account</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <input
                    type={showPw ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Repeat password"
                    required
                    minLength={8}
                  />
                </div>

                {password.length > 0 && (
                  <div className="space-y-1">
                    <div className={`text-xs font-semibold flex items-center gap-1.5 ${password.length >= 8 ? "text-emerald-600" : "text-slate-400"}`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${password.length >= 8 ? "bg-emerald-500" : "bg-slate-300"}`} />
                      At least 8 characters
                    </div>
                    <div className={`text-xs font-semibold flex items-center gap-1.5 ${password === confirm && confirm.length > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${password === confirm && confirm.length > 0 ? "bg-emerald-500" : "bg-slate-300"}`} />
                      Passwords match
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || password.length < 8 || password !== confirm}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl text-sm"
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Setting Password...</> : "Set Password & Continue →"}
                </Button>
              </form>

              <p className="text-center text-xs text-slate-400 mt-4">
                Having trouble? Contact your property manager for a new setup link.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="text-white text-sm font-medium flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
          Loading secure setup...
        </div>
      </div>
    }>
      <SetPasswordForm />
    </Suspense>
  );
}
