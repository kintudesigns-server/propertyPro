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
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl space-y-8 pb-20">
      <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-[#1D1D1F] flex items-center gap-2">
          <Shield className="h-7 w-7 text-blue-600" />
          Financial & Operational Settings
        </h1>
        <p className="text-sm text-[#6E6E73]">
          Manage platform revenue commission rates, financial disbursement policies, and tour security rate limits.
        </p>
      </div>

      {/* Platform Commission Rate Card */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#1D1D1F]">Global Rent Commission Rate</h2>
              <p className="text-sm text-[#6E6E73] mt-1">
                This flat percentage cut is automatically deducted from rent and deposit payments before funds are disbursed to property owners. 
                This directly impacts your platform "Rent Commissions" revenue.
              </p>
            </div>
            
            <div className="w-full max-w-xs">
              <label className="block text-sm font-semibold text-[#1D1D1F] mb-1">Commission Percentage (%)</label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={platformSettings.adminFeePercent}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, adminFeePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg h-11 px-3 pr-8 focus:ring-2 focus:ring-[#007AFF] font-bold text-base"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E93] font-bold">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tour Booking & Anti-Spam Controls Card */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Calendar className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#1D1D1F]">Tour Booking & Rate Limiting Controls</h2>
              <p className="text-sm text-[#6E6E73] mt-1">
                Configure spam-prevention rules and email OTP expiration settings for public tour bookings across all property listings.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Max Request Limits</Label>
                <div className="relative">
                  <Input 
                    type="number"
                    min="1"
                    value={platformSettings.tourMaxRequestsPerEmail}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, tourMaxRequestsPerEmail: parseInt(e.target.value) || 1 })}
                    className="rounded-xl h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500 pr-20 font-bold text-slate-800"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8E8E93]">tours</span>
                </div>
                <p className="text-[11px] text-[#8E8E93]">Maximum active/pending requests allowed per email.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rate Limit Window</Label>
                <div className="relative">
                  <Input 
                    type="number"
                    min="1"
                    value={platformSettings.tourRateLimitWindowHours}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, tourRateLimitWindowHours: parseInt(e.target.value) || 1 })}
                    className="rounded-xl h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500 pr-20 font-bold text-slate-800"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8E8E93]">hours</span>
                </div>
                <p className="text-[11px] text-[#8E8E93]">Rolling window time frame for request limits.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">OTP Code Expiry</Label>
                <div className="relative">
                  <Input 
                    type="number"
                    min="1"
                    value={platformSettings.tourOtpExpiryMinutes}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, tourOtpExpiryMinutes: parseInt(e.target.value) || 1 })}
                    className="rounded-xl h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500 pr-20 font-bold text-slate-800"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8E8E93]">minutes</span>
                </div>
                <p className="text-[11px] text-[#8E8E93]">Email verification OTP code expiration time.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="pt-2 flex justify-end">
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold h-12 px-8 rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
