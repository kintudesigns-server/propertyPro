"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
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
  FileText,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Building,
  Wrench,
  Clock,
  CheckCircle2,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import { GATABLE_MODULES } from "@/lib/modules-registry";

const HERO_SLIDES = [
  {
    src: "/images/hero/hero_pricing_tiers.png",
    tag: "SaaS Plan Matrix & Pricing Tiers",
  },
  {
    src: "/images/hero/hero_pricing_licensing.png",
    tag: "Feature Access Gating & Licensing",
  },
  {
    src: "/images/hero/hero_subscription_analytics.png",
    tag: "Recurring MRR & Quota Forecast",
  },
];

export default function PricingSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  // Background slide rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && (session?.user as any)?.role !== "SUPERADMIN")) {
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
        highlightBadge: null,
        annualPrice: tier.annualPrice ?? null,
        allowsTrial: tier.allowsTrial ?? true,
        gracePeriodDays: tier.gracePeriodDays ?? null,
        trialDays: tier.trialDays,
        isCustom: tier.isCustom,
        isActive: false,
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
        <Loader2 className="h-10 w-10 animate-spin text-[#007AFF]" />
        <p className="text-[#6E6E73] font-bold text-sm uppercase tracking-wider">Loading pricing plans...</p>
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
    <div className="max-w-7xl mx-auto space-y-6 pt-6 pb-20 px-4 sm:px-6 font-sans">
      
      {/* 1. MATCHING DASHBOARD HERO BANNER WITH MOTION BACKGROUND */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-xs min-h-[220px] w-full font-sans">
        {/* Background Image Crossfade Stack */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-slate-100">
          {HERO_SLIDES.map((slide, idx) => {
            const isActive = idx === slideIndex;
            return (
              <motion.img
                key={slide.src}
                src={slide.src}
                alt={slide.tag}
                initial={false}
                animate={{
                  opacity: isActive ? 0.78 : 0,
                  scale: isActive ? 1.07 : 1.0,
                }}
                transition={{
                  opacity: { duration: 1.6, ease: "easeInOut" },
                  scale: { duration: 6, ease: "linear" },
                }}
                className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
              />
            );
          })}

          {/* Light theme gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-white/40 z-10" />
          
          <div
            className="absolute inset-0 opacity-[0.03] z-10 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #0F172A 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        {/* Hero Foreground Content */}
        <div className="relative z-20 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-2.5 max-w-2xl"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-900 shadow-2xs font-black text-[10px] tracking-wider uppercase">
                <Sparkles className="h-3.5 w-3.5 text-slate-700" />
                SaaS Subscription Products
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-extrabold text-[10px]">
                {HERO_SLIDES[slideIndex].tag}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
              Pricing Plans & Tier Licensing
            </h1>
            <p className="text-slate-500 text-xs md:text-sm font-semibold leading-relaxed">
              Configure landlord subscription products, Stripe price IDs, module access gating lists, and property unit quotas.
            </p>
          </motion.div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/dashboard/admin/subscriptions"
              className="inline-flex items-center bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-xl font-black text-xs h-9 px-4 transition-all shadow-2xs cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5 mr-2 text-slate-500" />
              Active Subscriptions <ArrowUpRight className="h-3.5 w-3.5 ml-1 text-slate-400" />
            </Link>

            <Button 
              onClick={() => router.push("/dashboard/admin/settings/pricing/new")} 
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-9 px-4 shadow-xs font-black text-xs cursor-pointer border-none"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add New Tier
            </Button>
          </div>
        </div>
      </div>

      {/* 2. PRICING STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 font-sans">
        <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl p-5 transition-all hover:shadow-md">
          <CardContent className="p-0 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total SaaS Plans</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{tiers.length} plans</p>
              <p className="text-[11px] font-bold text-emerald-700">{activeTiers} active in marketplace</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-200/80 shadow-2xs">
              <Layers className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl p-5 transition-all hover:shadow-md">
          <CardContent className="p-0 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Plan Subscribers</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{totalSubscribers} owners</p>
              <p className="text-[11px] font-semibold text-slate-500">Paying landlord contracts</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200/80 shadow-2xs">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl p-5 transition-all hover:shadow-md">
          <CardContent className="p-0 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Est. Monthly MRR Forecast</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">${estimatedMrr.toLocaleString()}/mo</p>
              <p className="text-[11px] font-semibold text-slate-500">Stripe recurring forecast</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-200/80 shadow-2xs">
              <DollarSign className="h-5 w-5 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. PRICING TIERS GRID CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
        {tiers.map((tier) => {
          const subCount = tier._count?.users || 0;
          const isUnlimited = tier.maxUnits > 9000;
          const isTrialActive = tier.trialDays > 0;
          
          return (
            <Card 
              key={tier.id} 
              className={`rounded-3xl border flex flex-col justify-between bg-white transition-all duration-300 ${
                tier.isActive 
                  ? 'border-slate-200 shadow-xs hover:shadow-[0_12px_30px_-5px_rgba(52,211,153,0.35)] hover:-translate-y-1' 
                  : 'border-dashed border-slate-300 opacity-75 bg-slate-50/50 hover:shadow-[0_12px_30px_-5px_rgba(52,211,153,0.25)] hover:-translate-y-1'
              }`}
            >
              <div className="p-6 space-y-6">
                
                {/* Header Title & Badges */}
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight truncate">{tier.name}</h3>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed line-clamp-2">{tier.description}</p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {tier.isActive ? (
                      <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-2xs">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-700 border border-slate-200 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-2xs">
                        Draft
                      </Badge>
                    )}
                    
                    {tier.isCustom && (
                      <Badge className="bg-purple-50 text-purple-800 border border-purple-200 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-2xs">
                        Enterprise
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Price Display Box */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex justify-between items-baseline shadow-2xs">
                  <div>
                    <span className="text-3xl font-black text-slate-900 tracking-tight">
                      {tier.isCustom ? 'Custom' : `$${tier.price}`}
                    </span>
                    {!tier.isCustom && <span className="text-slate-500 font-extrabold text-xs"> / month</span>}
                  </div>
                  
                  <span className="text-xs font-black text-slate-600 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    {subCount} subscriber{subCount === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Core Quotas & Boundaries */}
                <div className="space-y-3 text-xs text-slate-700 font-semibold border-b border-slate-100 pb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-extrabold flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-slate-400" />
                      Portfolio Unit Cap
                    </span>
                    <span className="text-slate-900 font-black">
                      Up to {isUnlimited ? 'Unlimited' : `${tier.maxUnits} units`}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-extrabold flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-slate-400" />
                      Max Inspectors
                    </span>
                    <span className="text-slate-900 font-black">
                      {tier.maxInspectors ?? 1} inspector accounts
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-extrabold flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Evaluation Period
                    </span>
                    <span className="text-slate-900 font-black">
                      {isTrialActive ? `${tier.trialDays} days free` : 'No free trial'}
                    </span>
                  </div>
                </div>

                {/* Enabled Modules Tags */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Enabled Modules</span>
                  <div className="flex flex-wrap gap-1.5">
                    {GATABLE_MODULES.filter(m => (tier.modules || []).includes(m.key)).slice(0, 6).map((mod) => (
                      <Badge key={mod.key} className="bg-slate-100 text-slate-800 border border-slate-200/80 rounded-md text-[9px] font-black shadow-2xs px-2 py-0.5">
                        {mod.label}
                      </Badge>
                    ))}
                    {(tier.modules || []).length > 6 && (
                      <Badge className="bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-[9px] font-black shadow-2xs px-2 py-0.5">
                        +{(tier.modules || []).length - 6} more
                      </Badge>
                    )}
                    {(tier.modules || []).length === 0 && (
                      <span className="text-xs text-slate-400 font-medium italic">No modules enabled</span>
                    )}
                  </div>
                </div>

              </div>

              {/* Card Footer Actions */}
              <div className="p-6 pt-0 border-t border-slate-100 mt-2">
                <div className="flex items-center gap-2 pt-4">
                  <Button 
                    onClick={() => router.push(`/dashboard/admin/settings/pricing/${tier.id}`)}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-9 font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit Plan & Gating
                  </Button>

                  <Button 
                    variant="outline"
                    disabled={duplicatingId === tier.id}
                    onClick={() => handleDuplicate(tier)}
                    className="rounded-xl h-9 w-9 p-0 border-slate-200 text-slate-900 bg-white hover:bg-slate-50 shrink-0 cursor-pointer shadow-2xs"
                    title="Duplicate pricing plan"
                  >
                    {duplicatingId === tier.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>

                  <Button 
                    variant="ghost" 
                    disabled={deletingId === tier.id || subCount > 0}
                    onClick={() => handleDelete(tier.id)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl h-9 w-9 p-0 shrink-0 cursor-pointer"
                    title={subCount > 0 ? "Cannot delete tier with active subscribers" : "Delete plan"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
