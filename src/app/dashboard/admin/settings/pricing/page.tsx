"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Settings, Loader2, Save, Trash2, Edit2, Shield } from "lucide-react";
import { toast } from "sonner";

export default function PricingSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tiers, setTiers] = useState<any[]>([]);
  const [platformSettings, setPlatformSettings] = useState<any>({ 
    adminFeePercent: 2.0,
    tourMaxRequestsPerEmail: 3,
    tourRateLimitWindowHours: 24,
    tourOtpExpiryMinutes: 10
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Edit state
  const [editingTier, setEditingTier] = useState<any>(null);

  useEffect(() => {
    if (status === "unauthenticated" || (session?.user as any)?.role !== "SUPERADMIN") {
      router.push("/dashboard");
    }
  }, [status, router]);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      const [tiersRes, settingsRes] = await Promise.all([
        fetch("/api/pricing-tiers"),
        fetch("/api/admin/settings")
      ]);
      
      if (tiersRes.ok) setTiers(await tiersRes.json());
      if (settingsRes.ok) setPlatformSettings(await settingsRes.json());
    } catch (err) {
      toast.error("Failed to load pricing tiers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchTiers();
  }, [status]);

  const handleSaveTier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTier) return;
    
    try {
      if (editingTier.maxUnits < editingTier.minUnits) {
        toast.error("Maximum units cannot be less than minimum units.");
        return;
      }
      if (editingTier.features.length === 0 || editingTier.features.some((f: string) => !f.trim())) {
        toast.error("Please provide valid features for this tier.");
        return;
      }

      const url = editingTier.id ? `/api/pricing-tiers/${editingTier.id}` : "/api/pricing-tiers";
      const method = editingTier.id ? "PUT" : "POST";
      
      const payload = {
        ...editingTier,
        features: editingTier.features.filter((f: string) => f.trim() !== "")
      };
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save");
      
      toast.success(editingTier.id ? "Tier updated successfully" : "Tier created successfully");
      setEditingTier(null);
      fetchTiers();
    } catch (err) {
      toast.error("An error occurred while saving the tier.");
    }
  };

  const handleAddFeature = () => {
    setEditingTier({ ...editingTier, features: [...editingTier.features, ""] });
  };

  const handleUpdateFeature = (index: number, value: string) => {
    const newFeatures = [...editingTier.features];
    newFeatures[index] = value;
    setEditingTier({ ...editingTier, features: newFeatures });
  };

  const handleRemoveFeature = (index: number) => {
    const newFeatures = editingTier.features.filter((_: any, i: number) => i !== index);
    setEditingTier({ ...editingTier, features: newFeatures });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pricing tier? This may break subscriptions for assigned users.")) return;
    try {
      const res = await fetch(`/api/pricing-tiers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Tier deleted successfully");
      fetchTiers();
    } catch (err) {
      toast.error("Failed to delete tier.");
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          adminFeePercent: Number(platformSettings.adminFeePercent),
          tourMaxRequestsPerEmail: Number(platformSettings.tourMaxRequestsPerEmail),
          tourRateLimitWindowHours: Number(platformSettings.tourRateLimitWindowHours),
          tourOtpExpiryMinutes: Number(platformSettings.tourOtpExpiryMinutes)
        })
      });
      
      if (!res.ok) throw new Error("Failed to save platform settings");
      toast.success("Platform settings updated successfully!");
    } catch (err) {
      toast.error("Failed to update platform settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#EF4444]" />
        <p className="text-[#6E6E73] font-bold text-sm uppercase tracking-wider">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-6 pb-20 px-2 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
            <Settings className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#1D1D1F] tracking-tight">Pricing Tiers</h1>
            <p className="text-[#6E6E73] text-base mt-0.5">Manage subscription plans and features</p>
          </div>
        </div>
        <Button onClick={() => setEditingTier({ name: "", description: "", price: 0, minUnits: 0, maxUnits: 0, features: [], isCustom: false, isActive: true })} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Add New Tier
        </Button>
      </div>

      {/* Global Platform Settings */}
      <Card className="bg-gradient-to-br from-[#1D1D1F] to-[#1E293B] border-none shadow-lg rounded-2xl text-white mb-8">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              Global Rent Commission Rate
            </h2>
            <p className="text-[#8E8E93] text-sm max-w-xl">
              This is the flat percentage cut PropertyPro takes from every single rent and security deposit payment processed across the entire platform. This affects your "Rent Commissions" profit.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="relative">
              <Input 
                type="number" 
                step="0.1"
                min="0"
                max="100"
                value={platformSettings?.adminFeePercent || 0}
                onChange={(e) => setPlatformSettings({ ...platformSettings, adminFeePercent: e.target.value })}
                className="w-24 h-12 bg-white/10 border-white/20 text-white font-bold text-lg text-center pr-8 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 font-bold">%</span>
            </div>
            <Button 
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 px-6 rounded-lg transition-colors"
            >
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Rate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tour Booking Settings */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 md:p-8 mb-8">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              🗓️ Tour Booking & Rate Limiting Controls
            </h2>
            <p className="text-[#6E6E73] text-sm mt-1">
              Configure spam-prevention rules and email OTP settings for showing tour requests.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Max Request Limits</Label>
              <div className="relative">
                <Input 
                  type="number"
                  min="1"
                  value={platformSettings?.tourMaxRequestsPerEmail || 3}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, tourMaxRequestsPerEmail: e.target.value })}
                  className="rounded-xl h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 pr-24 font-bold text-slate-800"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8E8E93]">tours</span>
              </div>
              <p className="text-[11px] text-[#8E8E93]">Maximum active/pending requests allowed per email address.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rate Limit Window</Label>
              <div className="relative">
                <Input 
                  type="number"
                  min="1"
                  value={platformSettings?.tourRateLimitWindowHours || 24}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, tourRateLimitWindowHours: e.target.value })}
                  className="rounded-xl h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 pr-24 font-bold text-slate-800"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8E8E93]">hours</span>
              </div>
              <p className="text-[11px] text-[#8E8E93]">The rolling window time frame enforced for the request limits.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">OTP Verification Code Expiry</Label>
              <div className="relative">
                <Input 
                  type="number"
                  min="1"
                  value={platformSettings?.tourOtpExpiryMinutes || 10}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, tourOtpExpiryMinutes: e.target.value })}
                  className="rounded-xl h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 pr-24 font-bold text-slate-800"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8E8E93]">minutes</span>
              </div>
              <p className="text-[11px] text-[#8E8E93]">How long the 6-digit email verification OTP remains valid.</p>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button 
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="bg-slate-900 hover:bg-[#007AFF] text-white rounded-xl h-11 px-6 font-bold"
            >
              {savingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Tour Settings
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <Card key={tier.id} className={`rounded-2xl border ${tier.isActive ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-60'} shadow-sm`}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900">{tier.name}</CardTitle>
                  <p className="text-sm text-[#6E6E73] mt-1">{tier.description}</p>
                </div>
                {!tier.isActive && (
                  <span className="bg-slate-100 text-[#6E6E73] text-xs font-bold px-2 py-1 rounded">Inactive</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-3xl font-black text-slate-900">{tier.isCustom ? 'Custom' : `$${tier.price}`}</span>
                {!tier.isCustom && <span className="text-[#6E6E73] font-medium"> / mo</span>}
              </div>
              <div className="space-y-2 mb-6 text-sm text-slate-700">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="font-semibold">Unit Range</span>
                  <span>{tier.minUnits} to {tier.maxUnits > 9000 ? 'Unlimited' : tier.maxUnits}</span>
                </div>
                <div className="pt-2">
                  <span className="font-semibold block mb-2">Features ({tier.features.length})</span>
                  <ul className="list-disc pl-4 space-y-1 text-[#6E6E73]">
                    {tier.features.slice(0, 3).map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                    {tier.features.length > 3 && <li>+{tier.features.length - 3} more...</li>}
                  </ul>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEditingTier(tier)}>
                  <Edit2 className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl px-3" onClick={() => handleDelete(tier.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Fixed Header */}
            <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100 shrink-0 bg-white z-10">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{editingTier.id ? 'Edit Pricing Tier' : 'New Pricing Tier'}</h2>
            </div>
            
            {/* Scrollable Form Body */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white">
              <form id="tier-form" onSubmit={handleSaveTier} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plan Name</Label>
                    <Input required value={editingTier.name} onChange={e => setEditingTier({...editingTier, name: e.target.value})} placeholder="e.g. Starter" className="h-11 rounded-xl bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Price ($)</Label>
                    <Input type="number" required={!editingTier.isCustom} value={editingTier.price} onChange={e => setEditingTier({...editingTier, price: Number(e.target.value)})} disabled={editingTier.isCustom} className="h-11 rounded-xl bg-slate-50" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input required value={editingTier.description} onChange={e => setEditingTier({...editingTier, description: e.target.value})} placeholder="e.g. Perfect for small landlords" className="h-11 rounded-xl bg-slate-50" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Units</Label>
                    <Input type="number" required value={editingTier.minUnits} onChange={e => setEditingTier({...editingTier, minUnits: Number(e.target.value)})} className="h-11 rounded-xl bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Units</Label>
                    <Input type="number" required value={editingTier.maxUnits} onChange={e => setEditingTier({...editingTier, maxUnits: Number(e.target.value)})} className="h-11 rounded-xl bg-slate-50" />
                  </div>
                </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-slate-800">Tier Features</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddFeature} className="h-8 text-xs font-bold bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-700">
                    <Plus className="h-3 w-3 mr-1" /> Add Feature
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 rounded-xl bg-slate-50 p-3 border border-slate-100">
                  {editingTier.features.length === 0 && (
                    <p className="text-sm text-[#6E6E73] text-center py-4">No features added yet.</p>
                  )}
                  {editingTier.features.map((feature: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                      <Input 
                        value={feature} 
                        onChange={(e) => handleUpdateFeature(index, e.target.value)} 
                        placeholder="e.g. Dedicated Account Manager" 
                        className="h-10 rounded-lg bg-white shadow-sm flex-1"
                        required
                      />
                      <Button type="button" variant="ghost" onClick={() => handleRemoveFeature(index)} className="h-10 w-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-[#6E6E73]" /> Advanced Settings
                </h4>
                <div className="flex flex-col gap-4">
                  <label className="flex items-center justify-between cursor-pointer p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">Custom / Enterprise Tier</span>
                      <span className="text-xs text-[#6E6E73]">Requires manual billing, disables fixed monthly price.</span>
                    </div>
                    <Switch checked={editingTier.isCustom} onCheckedChange={(checked) => setEditingTier({...editingTier, isCustom: checked, price: checked ? 0 : editingTier.price})} />
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">Visibility Status</span>
                      <span className="text-xs text-[#6E6E73]">Enable this to allow new owners to select this tier.</span>
                    </div>
                    <Switch checked={editingTier.isActive} onCheckedChange={(checked) => setEditingTier({...editingTier, isActive: checked})} />
                  </label>
                </div>
              </div>
            </form>
          </div>

            {/* Fixed Footer */}
            <div className="px-6 py-4 sm:px-8 sm:py-5 border-t border-slate-100 shrink-0 bg-slate-50/80 backdrop-blur-md flex gap-4">
              <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl font-bold bg-white" onClick={() => setEditingTier(null)}>Cancel</Button>
              <Button type="submit" form="tier-form" className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all">
                <Save className="h-4 w-4 mr-2" /> Save Tier
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
