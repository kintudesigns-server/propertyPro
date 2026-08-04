"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign, Save, Shield, Calendar, Clock } from "lucide-react";

export default function FinancialSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [platformSettings, setPlatformSettings] = useState({
    adminFeePercent: 2.00,
    tourMaxRequestsPerEmail: 3,
    tourRateLimitWindowHours: 24,
    tourOtpExpiryMinutes: 10,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setPlatformSettings({
          adminFeePercent: Number(data.adminFeePercent ?? 2.00),
          tourMaxRequestsPerEmail: Number(data.tourMaxRequestsPerEmail ?? 3),
          tourRateLimitWindowHours: Number(data.tourRateLimitWindowHours ?? 24),
          tourOtpExpiryMinutes: Number(data.tourOtpExpiryMinutes ?? 10),
        });
      } else {
        toast.error("Failed to load platform settings");
      }
    } catch (error) {
      toast.error("An error occurred loading settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminFeePercent: Number(platformSettings.adminFeePercent),
          tourMaxRequestsPerEmail: Number(platformSettings.tourMaxRequestsPerEmail),
          tourRateLimitWindowHours: Number(platformSettings.tourRateLimitWindowHours),
          tourOtpExpiryMinutes: Number(platformSettings.tourOtpExpiryMinutes),
        }),
      });

      if (res.ok) {
        toast.success("Financial & platform settings updated successfully!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update settings");
      }
    } catch (error) {
      toast.error("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-slate-800" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 pb-28 font-sans">
      {/* ─── PAGE HEADER ─── */}
      <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 bg-slate-900 rounded-2xl flex items-center justify-center text-amber-400 shadow-2xs">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Financial &amp; Operational Settings
            </h1>
            <p className="text-slate-500 text-xs font-semibold mt-0.5">
              Manage platform revenue commission rates, financial disbursement policies, and tour security rate limits.
            </p>
          </div>
        </div>
      </div>

      {/* ─── PLATFORM COMMISSION RATE CARD ─── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs font-sans">
        <div className="flex items-start gap-5">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <DollarSign className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Global Rent Commission Rate</h2>
              <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed">
                This flat percentage cut is automatically deducted from rent and deposit payments before funds are disbursed to property owners. 
                This directly impacts your platform "Rent Commissions" revenue.
              </p>
            </div>
            
            <div className="w-full max-w-xs space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Commission Percentage (%)</label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={platformSettings.adminFeePercent}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, adminFeePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl h-10 px-3 pr-8 focus:bg-white focus:border-slate-900 font-extrabold text-sm text-slate-900 shadow-2xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-xs">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TOUR BOOKING & ANTI-SPAM CONTROLS CARD ─── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs font-sans">
        <div className="flex items-start gap-5">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <Calendar className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Tour Booking &amp; Rate Limiting Controls</h2>
              <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed">
                Configure spam-prevention rules and email OTP expiration settings for public tour bookings across all property listings.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Max Request Limits</Label>
                <div className="relative">
                  <Input 
                    type="number"
                    min="1"
                    value={platformSettings.tourMaxRequestsPerEmail}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, tourMaxRequestsPerEmail: parseInt(e.target.value) || 1 })}
                    className="bg-slate-50 border border-slate-200 rounded-xl h-10 pr-16 font-extrabold text-xs text-slate-900 focus:bg-white focus:border-slate-900 shadow-2xs"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-extrabold text-slate-400">tours</span>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold">Maximum active/pending requests allowed per email.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Rate Limit Window</Label>
                <div className="relative">
                  <Input 
                    type="number"
                    min="1"
                    value={platformSettings.tourRateLimitWindowHours}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, tourRateLimitWindowHours: parseInt(e.target.value) || 1 })}
                    className="bg-slate-50 border border-slate-200 rounded-xl h-10 pr-16 font-extrabold text-xs text-slate-900 focus:bg-white focus:border-slate-900 shadow-2xs"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-extrabold text-slate-400">hours</span>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold">Rolling window time frame for request limits.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">OTP Code Expiry</Label>
                <div className="relative">
                  <Input 
                    type="number"
                    min="1"
                    value={platformSettings.tourOtpExpiryMinutes}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, tourOtpExpiryMinutes: parseInt(e.target.value) || 1 })}
                    className="bg-slate-50 border border-slate-200 rounded-xl h-10 pr-16 font-extrabold text-xs text-slate-900 focus:bg-white focus:border-slate-900 shadow-2xs"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-extrabold text-slate-400">minutes</span>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold">Email verification OTP code expiration time.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SAVE BUTTON BAR ─── */}
      <div className="pt-2 flex justify-end">
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="bg-slate-900 hover:bg-slate-800 text-white font-black h-10 px-6 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer border-none text-xs"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
