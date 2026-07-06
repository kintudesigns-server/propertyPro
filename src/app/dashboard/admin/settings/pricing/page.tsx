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
  const [loading, setLoading] = useState(true);
  
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
      const res = await fetch("/api/pricing-tiers");
      if (res.ok) setTiers(await res.json());
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
      const url = editingTier.id ? `/api/pricing-tiers/${editingTier.id}` : "/api/pricing-tiers";
      const method = editingTier.id ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTier),
      });

      if (!res.ok) throw new Error("Failed to save");
      
      toast.success(editingTier.id ? "Tier updated successfully" : "Tier created successfully");
      setEditingTier(null);
      fetchTiers();
    } catch (err) {
      toast.error("An error occurred while saving the tier.");
    }
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

  if (loading || status === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#EF4444]" />
        <p className="text-[#64748B] font-bold text-sm uppercase tracking-wider">Loading settings...</p>
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
            <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">Pricing Tiers</h1>
            <p className="text-[#64748B] text-base mt-0.5">Manage subscription plans and features</p>
          </div>
        </div>
        <Button onClick={() => setEditingTier({ name: "", description: "", price: 0, minUnits: 0, maxUnits: 0, features: [], isCustom: false, isActive: true })} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Add New Tier
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <Card key={tier.id} className={`rounded-2xl border ${tier.isActive ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-60'} shadow-sm`}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900">{tier.name}</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">{tier.description}</p>
                </div>
                {!tier.isActive && (
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded">Inactive</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-3xl font-black text-slate-900">{tier.isCustom ? 'Custom' : `$${tier.price}`}</span>
                {!tier.isCustom && <span className="text-slate-500 font-medium"> / mo</span>}
              </div>
              <div className="space-y-2 mb-6 text-sm text-slate-700">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="font-semibold">Unit Range</span>
                  <span>{tier.minUnits} to {tier.maxUnits > 9000 ? 'Unlimited' : tier.maxUnits}</span>
                </div>
                <div className="pt-2">
                  <span className="font-semibold block mb-2">Features ({tier.features.length})</span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">{editingTier.id ? 'Edit Pricing Tier' : 'New Pricing Tier'}</h2>
            </div>
            
            <form onSubmit={handleSaveTier} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum Units</Label>
                  <Input type="number" required value={editingTier.minUnits} onChange={e => setEditingTier({...editingTier, minUnits: Number(e.target.value)})} className="h-11 rounded-xl bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Units</Label>
                  <Input type="number" required value={editingTier.maxUnits} onChange={e => setEditingTier({...editingTier, maxUnits: Number(e.target.value)})} className="h-11 rounded-xl bg-slate-50" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Features (Comma separated)</Label>
                <Input required value={editingTier.features.join(", ")} onChange={e => setEditingTier({...editingTier, features: e.target.value.split(",").map(s => s.trim()).filter(Boolean)})} placeholder="e.g. Basic Portal, Manual Invoicing, Email Support" className="h-11 rounded-xl bg-slate-50" />
              </div>

              <div className="flex items-center gap-6 pt-2 pb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingTier.isCustom} onChange={e => setEditingTier({...editingTier, isCustom: e.target.checked, price: e.target.checked ? 0 : editingTier.price})} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
                  <span className="text-sm font-medium text-slate-700">Custom/Enterprise Tier (No fixed price)</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingTier.isActive} onChange={e => setEditingTier({...editingTier, isActive: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
                  <span className="text-sm font-medium text-slate-700">Tier is Active</span>
                </label>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setEditingTier(null)}>Cancel</Button>
                <Button type="submit" className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">
                  <Save className="h-4 w-4 mr-2" /> Save Tier
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
