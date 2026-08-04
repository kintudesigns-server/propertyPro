"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Shield, Key, Loader2, CheckCircle2, Lock, Eye, EyeOff,
  ShieldCheck, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface PasswordStrength {
  label: string;
  color: string;
  width: string;
  bars: number;
}

function getPasswordStrength(pw: string): PasswordStrength {
  if (!pw) return { label: "", color: "", width: "0%", bars: 0 };
  let score = 0;
  if (pw.length >= 8)           score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map: PasswordStrength[] = [
    { label: "Too weak", color: "bg-red-400",    width: "25%",  bars: 1 },
    { label: "Weak",     color: "bg-orange-400", width: "50%",  bars: 2 },
    { label: "Good",     color: "bg-yellow-400", width: "75%",  bars: 3 },
    { label: "Strong",   color: "bg-emerald-500",width: "100%", bars: 4 },
  ];
  return map[Math.max(0, score - 1)];
}

function PasswordInput({
  id, label, placeholder, value, onChange,
}: { id: string; label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest">
        {label}
      </Label>
      <div className="relative group">
        <Lock className="h-[17px] w-[17px] text-slate-400 group-focus-within:text-slate-600 absolute left-3.5 top-3 transition-colors" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 pl-10 pr-10 rounded-xl border-slate-200 bg-white text-sm font-medium
            hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(!show)}
          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100">
        <Icon className="h-[17px] w-[17px] text-slate-400" />
        <h3 className="text-[14px] font-bold text-slate-700">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [isSuccess, setIsSuccess]             = useState(false);

  const strength = getPasswordStrength(newPassword);
  const passwordsMatch = confirmPassword ? newPassword === confirmPassword : null;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) { toast.error("New passwords do not match."); return; }
    if (newPassword.length < 6)          { toast.error("Password must be at least 6 characters."); return; }

    setIsSubmitting(true);
    setIsSuccess(false);
    try {
      const res = await fetch("/api/users/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      toast.success("Password updated successfully.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">

      {/* Change Password */}
      <SectionCard title="Change Password" icon={Key}>
        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <PasswordInput
            id="currentPw" label="Current Password"
            placeholder="Enter your current password"
            value={currentPassword} onChange={setCurrentPassword}
          />
          <PasswordInput
            id="newPw" label="New Password"
            placeholder="Enter a strong new password"
            value={newPassword} onChange={setNewPassword}
          />

          {/* Strength meter */}
          {newPassword && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-400 font-medium">Password strength</p>
                <p className={`text-[11px] font-bold ${
                  strength.bars >= 4 ? "text-emerald-600" : strength.bars >= 3 ? "text-yellow-600" : "text-red-500"
                }`}>{strength.label}</p>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${strength.color}`}
                  style={{ width: strength.width }}
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(["≥ 8 chars", "Uppercase", "Number", "Symbol"] as const).map((req, i) => {
                  const checks = [
                    newPassword.length >= 8,
                    /[A-Z]/.test(newPassword),
                    /[0-9]/.test(newPassword),
                    /[^A-Za-z0-9]/.test(newPassword),
                  ];
                  return (
                    <span
                      key={req}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        checks[i] ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {req}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <PasswordInput
              id="confirmPw" label="Confirm New Password"
              placeholder="Re-enter your new password"
              value={confirmPassword} onChange={setConfirmPassword}
            />
            {passwordsMatch === false && (
              <p className="flex items-center gap-1.5 text-[11px] text-red-500 font-semibold pt-1">
                <AlertTriangle className="h-3 w-3" /> Passwords do not match
              </p>
            )}
            {passwordsMatch === true && (
              <p className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold pt-1">
                <CheckCircle2 className="h-3 w-3" /> Passwords match
              </p>
            )}
          </div>

          <div className="pt-1">
            <Button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className={`h-10 px-6 rounded-xl font-bold text-sm transition-all ${
                isSuccess
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Updating…</span>
              ) : isSuccess ? (
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Password Updated!</span>
              ) : (
                "Update Password"
              )}
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* Two-Factor Authentication */}
      <SectionCard title="Two-Factor Authentication" icon={Shield}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-[13px] font-bold text-slate-800">2FA is not enabled</h4>
              <p className="text-[12px] text-slate-500 mt-0.5 max-w-sm">
                We strongly recommend enabling 2FA to protect your account from unauthorized access.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="shrink-0 font-semibold rounded-xl h-9 px-4 text-sm border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            Enable 2FA
          </Button>
        </div>
      </SectionCard>

      {/* Login Sessions */}
      <SectionCard title="Login Sessions" icon={Lock}>
        <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-800">Current session is active</p>
              <p className="text-[11px] text-slate-400">Browser session — PropertyPro Dashboard</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Now
          </span>
        </div>
      </SectionCard>

    </div>
  );
}
