"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Settings, 
  Loader2, 
  Trash2, 
  Edit2, 
  Copy, 
  Layers, 
  Check, 
  Users, 
  DollarSign, 
  AlertTriangle,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { GATABLE_MODULES } from "@/lib/modules-registry";

export default function PricingSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated" || (session?.user as any)?.role !== "SUPERADMIN") {
      router.push("/dashboard");
    }
  }, [status, router, session]);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pricing-tiers");
      if (res.ok) {
        const data = await res.json();
        setTiers(data);
      } else {
        toast.error("Failed to load pricing tiers.");
      }
    } catch (err) {
      toast.error("Failed to load pricing tiers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchTiers();
  }, [status]);

  const handleDuplicate = async (tier: any) => {
    try {
      setDuplicatingId(tier.id);
      const payload = {
        name: `${tier.name} (Copy)`,
        description: tier.description,
        price: tier.price,
        minUnits: tier.minUnits,
        maxUnits: tier.maxUnits,
        maxInspectors: tier.maxInspectors,
        maxProperties: tier.maxProperties ?? 0,
        maxVendors: tier.maxVendors ?? 0,
        maxDocumentStorageMB: tier.maxDocumentStorageMB ?? 0,
        sortOrder: (tier.sortOrder ?? 0) + 1,
        highlightBadge: null, // Reset badge on duplicate
        annualPrice: tier.annualPrice ?? null,
        allowsTrial: tier.allowsTrial ?? true,
        gracePeriodDays: tier.gracePeriodDays ?? null,
        trialDays: tier.trialDays,
        isCustom: tier.isCustom,
        isActive: false, // inactive by default to let admin edit first
        modules: tier.modules || [],
        features: tier.features || []
      };

      const res = await fetch("/api/pricing-tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to duplicate tier");
      
      toast.success(`Duplicated plan as "${tier.name} (Copy)"`);
      fetchTiers();
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate tier");
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pricing tier? This will archive Stripe products and may affect current subscriptions.")) return;
    
    try {
      setDeletingId(id);
      const res = await fetch(`/api/pricing-tiers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Tier deleted successfully");
      fetchTiers();
    } catch (err) {
      toast.error("Failed to delete tier.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-[#6E6E73] font-bold text-sm uppercase tracking-wider">Loading settings...</p>
      </div>
    );
  }

  // Calculate platform billing stats
  const activeTiers = tiers.filter(t => t.isActive).length;
  const totalSubscribers = tiers.reduce((acc, t) => acc + (t._count?.users || 0), 0);
  const estimatedMrr = tiers.reduce((acc, t) => {
    const subs = t._count?.users || 0;
    const price = t.price || 0;
    return acc + (subs * price);
  }, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-6 pb-20 px-4 sm:px-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
            <Settings className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#1D1D1F] tracking-tight">Pricing Plans & Tiers</h1>
            <p className="text-[#6E6E73] text-sm mt-0.5">Manage subscription products, module gating lists, and landlord unit limits.</p>
          </div>
        </div>
        <Button 
          onClick={() => router.push("/dashboard/admin/settings/pricing/new")} 
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 shadow-sm font-bold text-sm"
        >
          <Plus className="h-4 w-4 mr-2" /> Add New Tier
        </Button>
      </div>

      {/* Pricing Stats Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Total Tiers</p>
              <p className="text-3xl font-black text-[#1D1D1F] mt-1">{tiers.length} plans</p>
              <p className="text-[10px] font-semibold text-[#8E8E93] mt-1">{activeTiers} active in marketplace</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Layers size={22} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Plan Subscribers</p>
              <p className="text-3xl font-black text-[#1D1D1F] mt-1">{totalSubscribers} owners</p>
              <p className="text-[10px] font-semibold text-[#8E8E93] mt-1">Paying landlord contracts</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Users size={22} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Est. Monthly Revenue</p>
              <p className="text-3xl font-black text-[#1D1D1F] mt-1">${estimatedMrr.toLocaleString()}/mo</p>
              <p className="text-[10px] font-semibold text-[#8E8E93] mt-1">Stripe pricing recurring forecast</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <DollarSign size={22} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Tiers Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const subCount = tier._count?.users || 0;
          const isUnlimited = tier.maxUnits > 9000;
          const isTrialActive = tier.trialDays > 0;
          
          return (
            <Card 
              key={tier.id} 
              className={`rounded-3xl border flex flex-col justify-between bg-white transition-all hover:shadow-lg ${
                tier.isActive 
                  ? 'border-[#E5E5EA] shadow-xs' 
                  : 'border-dashed border-slate-300 opacity-70 bg-slate-50/30'
              }`}
            >
              <div>
                {/* Header Banner */}
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-extrabold text-slate-900 tracking-tight">{tier.name}</CardTitle>
                      <p className="text-xs text-[#6E6E73] font-medium leading-normal line-clamp-2">{tier.description}</p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {tier.isActive ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-[9px] shadow-none">Active</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-[#6E6E73] border border-slate-200 font-bold text-[9px] shadow-none">Draft / Hidden</Badge>
                      )}
                      
                      {tier.isCustom && (
                        <Badge className="bg-purple-50 text-purple-700 border border-purple-100 font-bold text-[9px] shadow-none">Enterprise</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Price info block */}
                  <div className="bg-[#F9F9FB] border border-[#E5E5EA] rounded-2xl p-4 flex justify-between items-baseline">
                    <div>
                      <span className="text-3xl font-black text-slate-900">{tier.isCustom ? 'Custom' : `$${tier.price}`}</span>
                      {!tier.isCustom && <span className="text-[#6E6E73] font-bold text-xs"> / month</span>}
                    </div>
                    
                    {subCount > 0 && (
                      <span className="text-xs font-bold text-[#6E6E73] flex items-center gap-1">
                        <Users size={12} className="text-blue-500" />
                        {subCount} subscriber{subCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>

                  {/* Core usage boundaries */}
                  <div className="space-y-3.5 text-xs text-slate-700 font-semibold border-b border-[#F2F2F7] pb-4">
                    <div className="flex justify-between">
                      <span className="text-[#6E6E73]">Portfolio Unit Cap</span>
                      <span className="text-[#1D1D1F] font-bold">
                        Up to {isUnlimited ? 'Unlimited' : `${tier.maxUnits} units`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6E6E73]">Max Inspectors</span>
                      <span className="text-[#1D1D1F] font-bold">{tier.maxInspectors ?? 1} inspector accounts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6E6E73]">Evaluation Period</span>
                      <span className="text-[#1D1D1F] font-bold">
                        {isTrialActive ? `${tier.trialDays} days free` : 'No free trial'}
                      </span>
                    </div>
                  </div>

                  {/* Feature & module tags snapshot */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-[#8E8E93] uppercase tracking-wider block">Enabled Modules</span>
                    <div className="flex flex-wrap gap-1.5">
                      {GATABLE_MODULES.filter(m => (tier.modules || []).includes(m.key)).slice(0, 6).map((mod) => (
                        <Badge key={mod.key} className="bg-slate-50 text-slate-700 border border-slate-200/60 rounded-lg text-[9px] font-bold shadow-none px-2 py-0.5">
                          {mod.label}
                        </Badge>
                      ))}
                      {(tier.modules || []).length > 6 && (
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[9px] font-bold shadow-none px-2 py-0.5">
                          +{(tier.modules || []).length - 6} more
                        </Badge>
                      )}
                      {(tier.modules || []).length === 0 && (
                        <span className="text-xs text-slate-400 font-medium italic">No modules enabled</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </div>
              
              {/* Card Footer Actions */}
              <div className="p-6 pt-0 mt-4 border-t border-[#F2F2F7]">
                <div className="flex gap-2.5 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => router.push(`/dashboard/admin/settings/pricing/${tier.id}`)}
                    className="flex-1 rounded-xl h-10 border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F2F2F7] font-bold text-xs"
                  >
                    <Edit2 size={13} className="mr-1.5 text-blue-600" /> Edit Tier
                  </Button>
                  
                  <Button 
                    variant="outline"
                    disabled={duplicatingId === tier.id}
                    onClick={() => handleDuplicate(tier)}
                    className="rounded-xl h-10 w-10 p-0 border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F2F2F7] shrink-0"
                    title="Duplicate pricing plan"
                  >
                    {duplicatingId === tier.id ? (
                      <Loader2 size={14} className="animate-spin text-blue-600" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    disabled={deletingId === tier.id || subCount > 0}
                    onClick={() => handleDelete(tier.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl h-10 w-10 p-0 shrink-0"
                    title={subCount > 0 ? "Cannot delete tier with active subscribers" : "Delete plan"}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

    </div>
  );
}
