"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Key, Loader2, CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";

export default function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    setIsSuccess(false);

    try {
      const res = await fetch("/api/users/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      toast.success("Your password has been updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white border-0 rounded-3xl shadow-sm p-8 max-w-3xl">
        <h3 className="text-lg font-bold text-[#111111] border-b border-slate-100 pb-2 mb-6">Change Password</h3>
        
        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-slate-700">Current Password</Label>
            <div className="relative">
              <Input 
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11 pl-10"
              />
              <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-slate-700">New Password</Label>
            <div className="relative">
              <Input 
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11 pl-10"
              />
              <Key className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-slate-700">Confirm New Password</Label>
            <div className="relative">
              <Input 
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11 pl-10"
              />
              <Key className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting || isSuccess}
              className={`text-white font-bold h-11 px-8 rounded-xl transition-colors ${
                isSuccess ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Updating...</>
              ) : isSuccess ? (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Password Updated</>
              ) : (
                "Update Password"
              )}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="bg-white border-0 rounded-3xl shadow-sm p-8 max-w-3xl">
        <h3 className="text-lg font-bold text-[#111111] border-b border-slate-100 pb-2 mb-6 flex items-center gap-2">
          <Shield className="h-5 w-5 text-slate-400" /> Two-Factor Authentication
        </h3>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">2FA is not enabled</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              We strongly recommend enabling 2FA to prevent unauthorized access to your account.
            </p>
          </div>
          <Button variant="outline" className="shrink-0 font-bold rounded-xl h-10 px-6 bg-white border-slate-200 hover:bg-slate-100">
            Enable 2FA
          </Button>
        </div>
      </Card>
    </div>
  );
}
