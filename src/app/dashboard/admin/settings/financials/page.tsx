"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, Save } from "lucide-react";

export default function FinancialSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminFeePercent, setAdminFeePercent] = useState<number>(2.00);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setAdminFeePercent(Number(data.adminFeePercent));
      } else {
        toast.error("Failed to load settings");
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
        body: JSON.stringify({ adminFeePercent }),
      });
      if (res.ok) {
        toast.success("Financial settings updated successfully!");
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
    <div className="p-8 max-w-4xl space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-[#1D1D1F]">Financial Settings</h1>
        <p className="text-sm text-[#6E6E73]">
          Manage platform revenue and fee configurations.
        </p>
      </div>

      <div className="bg-white border border-[#E5E5EA] rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#1D1D1F]">Platform Commission Rate</h2>
              <p className="text-sm text-[#6E6E73] mt-1">
                This percentage is deducted from rent payments before funds are disbursed to the property owner. 
                Tenants are unaffected by this fee (they pay processing fees separately).
              </p>
            </div>
            
            <div className="w-full max-w-xs">
              <label className="block text-sm font-semibold text-[#1D1D1F] mb-1">Commission Percentage (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={adminFeePercent}
                  onChange={(e) => setAdminFeePercent(parseFloat(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg h-10 px-3 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent font-medium"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E8E93] font-bold">%</span>
              </div>
            </div>

            <Button
              onClick={saveSettings}
              disabled={saving}
              className="mt-4 bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold h-10 px-6 rounded-xl flex items-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
