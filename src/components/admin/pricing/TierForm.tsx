"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  Copy, 
  Check, 
  HelpCircle,
  Building2, 
  FileText, 
  Users, 
  ClipboardList, 
  Wrench, 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  Receipt, 
  DollarSign, 
  BarChart2, 
  MessageSquare, 
  CalendarCheck, 
  FolderOpen, 
  Calendar,
  AlertTriangle,
  Info,
  Sparkles
} from "lucide-react";
import { 
  GATABLE_MODULES, 
  MODULES_BY_CATEGORY, 
  ALWAYS_AVAILABLE,
  ModuleKey 
} from "@/lib/modules-registry";
import { toast } from "sonner";

// Module dependency mapping
const MODULE_DEPENDENCIES: Record<string, { required: string[]; label: string }> = {
  inspections: { required: ["team_management"], label: "Inspector & Team Management" },
  invoices: { required: ["payments"], label: "Rent Payments" },
  accounting: { required: ["transactions"], label: "Transaction History" },
  wallet: { required: ["payments", "payouts"], label: "Rent Payments & Payouts" },
};

// Icon mapping helper
function getModuleIcon(iconName: string, size = 16, className = "") {
  const props = { size, className };
  switch (iconName) {
    case "Building2": return <Building2 {...props} />;
    case "FileText": return <FileText {...props} />;
    case "Users": return <Users {...props} />;
    case "ClipboardList": return <ClipboardList {...props} />;
    case "Wrench": return <Wrench {...props} />;
    case "ShieldCheck": return <ShieldCheck {...props} />;
    case "Truck": return <Truck {...props} />;
    case "CreditCard": return <CreditCard {...props} />;
    case "Receipt": return <Receipt {...props} />;
    case "DollarSign": return <DollarSign {...props} />;
    case "BarChart2": return <BarChart2 {...props} />;
    case "MessageSquare": return <MessageSquare {...props} />;
    case "CalendarCheck": return <CalendarCheck {...props} />;
    case "FolderOpen": return <FolderOpen {...props} />;
    case "Calendar": return <Calendar {...props} />;
    default: return <HelpCircle {...props} />;
  }
}

export default function TierForm({ 
  initialTier, 
  subscriberCount = 0 
}: { 
  initialTier?: any; 
  subscriberCount?: number; 
}) {
  const router = useRouter();
  const isEditing = !!initialTier?.id;

  // Initialize form state
  const [name, setName] = useState(initialTier?.name || "");
  const [description, setDescription] = useState(initialTier?.description || "");
  const [price, setPrice] = useState(initialTier?.price !== undefined ? initialTier.price : 0);
  const [minUnits, setMinUnits] = useState(initialTier?.minUnits !== undefined ? initialTier.minUnits : 0);
  const [maxUnits, setMaxUnits] = useState(initialTier?.maxUnits !== undefined ? initialTier.maxUnits : 0);
  const [maxInspectors, setMaxInspectors] = useState(initialTier?.maxInspectors !== undefined ? initialTier.maxInspectors : 1);
  const [trialDays, setTrialDays] = useState(initialTier?.trialDays !== undefined ? initialTier.trialDays : 0);

  // New Capacity & Billing fields
  const [maxProperties, setMaxProperties] = useState(initialTier?.maxProperties ?? 0);
  const [maxVendors, setMaxVendors] = useState(initialTier?.maxVendors ?? 0);
  const [maxDocStorageMB, setMaxDocStorageMB] = useState(initialTier?.maxDocumentStorageMB ?? 0);
  const [sortOrder, setSortOrder] = useState(initialTier?.sortOrder ?? 0);
  const [highlightBadge, setHighlightBadge] = useState(initialTier?.highlightBadge || "");
  const [annualPrice, setAnnualPrice] = useState(initialTier?.annualPrice !== null && initialTier?.annualPrice !== undefined ? initialTier.annualPrice : "");
  const [customQuotePrice, setCustomQuotePrice] = useState(initialTier?.customQuotePrice !== null && initialTier?.customQuotePrice !== undefined ? initialTier.customQuotePrice : "");
  const [allowsTrial, setAllowsTrial] = useState(initialTier?.allowsTrial !== undefined ? initialTier.allowsTrial : true);
  const [tierGracePeriodDays, setTierGracePeriodDays] = useState(initialTier?.gracePeriodDays !== null && initialTier?.gracePeriodDays !== undefined ? initialTier.gracePeriodDays : "");
  const [stripeProductId] = useState(initialTier?.stripeProductId || "");
  const [stripePriceId] = useState(initialTier?.stripePriceId || "");

  // Custom isUnlimited units state
  const [isUnlimitedUnits, setIsUnlimitedUnits] = useState(initialTier?.maxUnits > 9000);
  
  // Custom switches
  const [isCustom, setIsCustom] = useState(initialTier?.isCustom || false);
  const [isActive, setIsActive] = useState(initialTier?.isActive !== undefined ? initialTier.isActive : true);

  // Gatable modules selection
  const [selectedModules, setSelectedModules] = useState<string[]>(
    initialTier?.modules || [...ALWAYS_AVAILABLE]
  );

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Derived features list (auto-derived from selected module labels)
  const derivedFeatures = GATABLE_MODULES.filter(m => selectedModules.includes(m.key)).map(m => m.label);

  // Sync unlimited units field
  useEffect(() => {
    if (isUnlimitedUnits) {
      setMaxUnits(99999);
    } else if (maxUnits > 9000) {
      setMaxUnits(10); // sensible default fallback when toggling off unlimited
    }
  }, [isUnlimitedUnits]);

  // Sync maxInspectors with team_management module state: when team_management is unticked, auto-zero maxInspectors
  useEffect(() => {
    if (!selectedModules.includes("team_management") && maxInspectors > 0) {
      setMaxInspectors(0);
    }
  }, [selectedModules]);

  // Handle module toggle checkbox
  const handleToggleModule = (key: string) => {
    // Core always included
    if (ALWAYS_AVAILABLE.includes(key as any)) return;

    if (selectedModules.includes(key)) {
      setSelectedModules(selectedModules.filter(m => m !== key));
    } else {
      setSelectedModules([...selectedModules, key]);
    }
  };

  // Create or Update tier handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a tier name.");
      return;
    }
    if (!isUnlimitedUnits && maxUnits < minUnits) {
      toast.error("Maximum units cannot be less than minimum units.");
      return;
    }

    try {
      setSaving(true);
      const url = isEditing ? `/api/pricing-tiers/${initialTier.id}` : "/api/pricing-tiers";
      const method = isEditing ? "PUT" : "POST";

      const payload = {
        name,
        description,
        price: isCustom ? 0 : Number(price),
        minUnits: Number(minUnits),
        maxUnits: isUnlimitedUnits ? 99999 : Number(maxUnits),
        maxInspectors: Number(maxInspectors),
        maxProperties: Number(maxProperties),
        maxVendors: Number(maxVendors),
        maxDocumentStorageMB: Number(maxDocStorageMB),
        sortOrder: Number(sortOrder),
        highlightBadge: highlightBadge.trim() || null,
        annualPrice: annualPrice !== "" ? Number(annualPrice) : null,
        customQuotePrice: isCustom && customQuotePrice !== "" ? Number(customQuotePrice) : null,
        allowsTrial,
        gracePeriodDays: tierGracePeriodDays !== "" ? Number(tierGracePeriodDays) : null,
        trialDays: Number(trialDays),
        isCustom,
        isActive,
        modules: selectedModules,
        features: derivedFeatures
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save pricing tier");

      toast.success(isEditing ? "Pricing tier updated successfully" : "Pricing tier created successfully");
      router.push("/dashboard/admin/settings/pricing");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "An error occurred while saving the tier.");
    } finally {
      setSaving(false);
    }
  };

  // Delete tier handler
  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/pricing-tiers/${initialTier.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete tier");
      }

      toast.success("Pricing tier deleted successfully");
      router.push("/dashboard/admin/settings/pricing");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "An error occurred while deleting the tier.");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top action link */}
      <div>
        <button 
          onClick={() => router.push("/dashboard/admin/settings/pricing")}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition-colors cursor-pointer mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Tiers
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">
                {isEditing ? `Edit Pricing Plan: ${initialTier.name}` : "Create New Pricing Plan"}
              </h1>
              <p className="text-[#6E6E73] text-sm font-normal mt-0.5">
                Configure subscribed modules, feature benefits, unit capacity tiers, and direct payment mapping.
              </p>
            </div>
          </div>
          {isEditing && (
            <Badge className="bg-slate-100 text-slate-800 border border-slate-200 font-medium text-xs px-3 py-1 rounded-xl shadow-2xs">
              {subscriberCount} Active Subscriber{subscriberCount === 1 ? "" : "s"} on this Plan
            </Badge>
          )}
        </div>
      </div>

      {isEditing && subscriberCount > 0 && (
        <Card className="border border-amber-200/80 bg-amber-50/80 rounded-3xl shadow-2xs font-sans">
          <CardContent className="p-4 flex gap-3 items-center text-xs text-amber-950 font-semibold leading-normal">
            <AlertTriangle className="text-amber-700 shrink-0 h-4 w-4" />
            <p>
              <strong className="font-black text-amber-950">Careful:</strong> Changing modules or unit boundaries of this tier will immediately alter access controls and feature gates for the <strong className="font-black">{subscriberCount} landlord accounts</strong> currently subscribed to it.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main 2-Column workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Editor Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Core details */}
          <Card className="border-[#E5E5EA] shadow-xs rounded-2xl bg-white">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-sm font-bold text-[#1D1D1F] border-b border-[#F2F2F7] pb-3">Plan Definition</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-bold text-[#1D1D1F] text-xs uppercase tracking-wider block">Plan Name</Label>
                  <Input 
                    required 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="e.g. Starter Plan, Scale Plan" 
                    className="h-11 rounded-xl bg-slate-50 border-[#E5E5EA]" 
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="font-bold text-[#1D1D1F] text-xs uppercase tracking-wider block">Monthly Price ($)</Label>
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="customToggle" className="text-xs font-semibold text-[#6E6E73] cursor-pointer">Custom / Enterprise</Label>
                      <Switch 
                        id="customToggle"
                        checked={isCustom} 
                        onCheckedChange={(checked) => {
                          setIsCustom(checked);
                          if (checked) setPrice(0);
                        }} 
                      />
                    </div>
                  </div>
                  <Input 
                    type="number" 
                    required={!isCustom} 
                    value={isCustom ? "" : price} 
                    onChange={e => setPrice(Number(e.target.value))} 
                    disabled={isCustom}
                    placeholder={isCustom ? "Custom Billing Quote" : "99"}
                    className="h-11 rounded-xl bg-slate-50 border-[#E5E5EA]" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-[#1D1D1F] text-xs uppercase tracking-wider block">Marketplace Tagline / Description</Label>
                <Input 
                  required 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="e.g. Perfect for landlords managing up to 10 units with basic operations." 
                  className="h-11 rounded-xl bg-slate-50 border-[#E5E5EA]" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Scaling boundaries */}
          <Card className="border-[#E5E5EA] shadow-xs rounded-2xl bg-white">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-sm font-bold text-[#1D1D1F] border-b border-[#F2F2F7] pb-3">Portfolio Limits & Trial Parameters</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-bold text-[#1D1D1F] text-xs uppercase tracking-wider block">Recommended Minimum Units (Display Only)</Label>
                  <Input 
                    type="number" 
                    required 
                    min={0}
                    value={minUnits} 
                    onChange={e => setMinUnits(Number(e.target.value))} 
                    className="h-11 rounded-xl bg-slate-50 border-[#E5E5EA]" 
                  />
                  <p className="text-[10px] text-[#8E8E93] font-medium">Shown on pricing card as "Ideal for X+ unit portfolios." Not enforced as a hard gate.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="font-bold text-[#1D1D1F] text-xs uppercase tracking-wider block">Maximum Portfolio Units</Label>
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="unlimitedToggle" className="text-xs font-semibold text-[#6E6E73] cursor-pointer">Unlimited</Label>
                      <Switch 
                        id="unlimitedToggle"
                        checked={isUnlimitedUnits} 
                        onCheckedChange={setIsUnlimitedUnits} 
                      />
                    </div>
                  </div>
                  <Input 
                    type="number" 
                    required={!isUnlimitedUnits} 
                    value={isUnlimitedUnits ? "" : maxUnits} 
                    onChange={e => setMaxUnits(Number(e.target.value))} 
                    disabled={isUnlimitedUnits}
                    placeholder={isUnlimitedUnits ? "Unlimited Units Cap" : "10"}
                    className="h-11 rounded-xl bg-slate-50 border-[#E5E5EA]" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="font-bold text-[#1D1D1F] text-xs uppercase tracking-wider block">Maximum Inspector Accounts</Label>
                    {!selectedModules.includes("team_management") && (
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Module Disabled
                      </span>
                    )}
                  </div>
                  <Input 
                    type="number" 
                    required 
                    min={0}
                    disabled={!selectedModules.includes("team_management")}
                    value={!selectedModules.includes("team_management") ? 0 : maxInspectors} 
                    onChange={e => {
                      const val = Number(e.target.value);
                      setMaxInspectors(val);
                    }} 
                    placeholder={!selectedModules.includes("team_management") ? "0 (Enable Team Management to set)" : "1"}
                    className={`h-11 rounded-xl bg-slate-50 border-[#E5E5EA] ${
                      !selectedModules.includes("team_management") ? "opacity-60 cursor-not-allowed bg-slate-100" : ""
                    }`}
                  />
                  <p className="text-[10px] text-[#8E8E93] font-medium">
                    {!selectedModules.includes("team_management") 
                      ? "Requires 'Inspector & Team Management' module entitlement to be enabled."
                      : "Maximum inspector team accounts permitted for subscribers on this tier."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-[#1D1D1F] text-xs uppercase tracking-wider block">Free Trial Duration (Days)</Label>
                  <Input 
                    type="number" 
                    required 
                    min={0}
                    value={trialDays} 
                    onChange={e => setTrialDays(Number(e.target.value))} 
                    className="h-11 rounded-xl bg-slate-50 border-[#E5E5EA]" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2.5: Advanced Capacity & Billing */}
          <Card className="border-[#E5E5EA] shadow-xs rounded-2xl bg-white">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-sm font-bold text-[#1D1D1F] border-b border-[#F2F2F7] pb-3">Advanced Capacity & Pricing Options</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="font-bold text-[#1D1D1F] text-xs uppercase tracking-wider block">Max Properties (0 = Unlimited)</Label>
                  <Input 
                    type="number" 
                    min={0}
                    value={maxProperties} 
                    onChange={e => setMaxProperties(Number(e.target.value))} 
                    className="h-11 rounded-xl bg-slate-50 border-[#E5E5EA]" 
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="font-bold text-[#1D1D1F] text-xs uppercase tracking-wider block">Max Vendors</Label>
                    {!selectedModules.includes("vendors") && (
                      <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Disabled
                      </span>
                    )}
                  </div>
                  <Input 
                    type="number" 
                    min={0}
                    disabled={!selectedModules.includes("vendors")}
                    value={!selectedModules.includes("vendors") ? 0 : maxVendors} 
                    onChange={e => setMaxVendors(Number(e.target.value))} 
                    className={`h-11 rounded-xl bg-slate-50 border-[#E5E5EA] ${
                      !selectedModules.includes("vendors") ? "opacity-60 cursor-not-allowed bg-slate-100" : ""
                    }`}
                  />
                  <p className="text-[9px] text-[#8E8E93] font-medium">0 = Unlimited</p>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-[#1D1D1F] text-xs uppercase tracking-wider block">Doc Storage MB (0 = Unlimited)</Label>
                  <Input 
                    type="number" 
                    min={0}
                    value={maxDocStorageMB} 
                    onChange={e => setMaxDocStorageMB(Number(e.target.value))} 
                    className="h-11 rounded-xl bg-slate-50 border-[#E5E5EA]" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-bold text-[#1D1D1F] text-xs uppercase tracking-wider block">Annual Price ($ / year)</Label>
                  <Input 
                    type="number" 
                    min={0}
                    value={annualPrice} 
                    onChange={e => setAnnualPrice(e.target.value)} 
                    placeholder="e.g. 470 (leave blank for monthly only)"
                    className="h-11 rounded-xl bg-slate-50 border-[#E5E5EA]" 
                  />
                </div>

                {isCustom && (
                  <div className="space-y-2">
                    <Label className="font-bold text-[#1D1D1F] text-xs uppercase tracking-wider block">Custom Quote Price ($ / mo, Analytics Only)</Label>
                    <Input 
                      type="number" 
                      min={0}
                      value={customQuotePrice} 
                      onChange={e => setCustomQuotePrice(e.target.value)} 
                      placeholder="e.g. 299 (used for internal MRR analytics)"
                      className="h-11 rounded-xl bg-slate-50 border-[#E5E5EA]" 
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-bold text-[#1D1D1F] text-xs uppercase tracking-wider block">Display Sort Order</Label>
                  <Input 
                    type="number" 
                    min={0}
                    value={sortOrder} 
                    onChange={e => setSortOrder(Number(e.target.value))} 
                    placeholder="0"
                    className="h-11 rounded-xl bg-slate-50 border-[#E5E5EA]" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-[#1D1D1F] text-xs uppercase tracking-wider block">Highlight Badge (Optional)</Label>
                  <Input 
                    value={highlightBadge} 
                    onChange={e => setHighlightBadge(e.target.value)} 
                    placeholder="e.g. Most Popular, Best Value"
                    className="h-11 rounded-xl bg-slate-50 border-[#E5E5EA]" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Module Registry Matrix */}
          <Card className="border-[#E5E5EA] shadow-xs rounded-2xl bg-white">
            <CardContent className="p-6 space-y-6">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F2F2F7] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#1D1D1F]">Plan Module Entitlements</h3>
                    <p className="text-xs text-[#6E6E73] mt-0.5">Toggle administrative access to the platform's module registry. Core modules are locked as always included.</p>
                  </div>
                  
                  {/* Fix 4: Module Count Summary Strip */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700">
                    <span className="text-blue-600 font-extrabold">{selectedModules.length}</span> / {GATABLE_MODULES.length} Enabled
                    <span className="text-slate-400">·</span>
                    <span className="text-emerald-600">{ALWAYS_AVAILABLE.length} Always-On</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-amber-600">{selectedModules.length - ALWAYS_AVAILABLE.length} Add-on</span>
                  </div>
                </div>

                {/* Fix 3: Two-Layer Access System Callout */}
                <div className="mt-3 bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 flex gap-2.5 items-start text-xs text-blue-900 leading-relaxed">
                  <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
                  <p>
                    <strong>Two-Layer Access System:</strong> Entitlements configured here define what subscribers on this tier receive by default. Separately, individual owner accounts can be granted or blocked specific modules on the <strong>Module Access</strong> management page.
                  </p>
                </div>

                {/* Fix 2: Module Dependency Warnings */}
                {Object.entries(MODULE_DEPENDENCIES).map(([modKey, dep]) => {
                  const isModEnabled = selectedModules.includes(modKey);
                  const missingDeps = dep.required.filter(r => !selectedModules.includes(r));
                  if (!isModEnabled || missingDeps.length === 0) return null;

                  return (
                    <div key={modKey} className="mt-3 bg-amber-50 border border-amber-200/90 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-amber-900">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                        <p>
                          <strong>"{GATABLE_MODULES.find(m => m.key === modKey)?.label}"</strong> requires <strong>"{dep.label}"</strong> to function properly.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const toAdd = missingDeps.filter(d => !selectedModules.includes(d));
                          setSelectedModules([...selectedModules, ...toAdd]);
                          toast.success(`Added ${dep.label} entitlement`);
                        }}
                        className="h-7 px-2.5 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shrink-0"
                      >
                        Add Dependency
                      </Button>
                    </div>
                  );
                })}
              </div>

                <div className="space-y-6">
                  {Object.entries(MODULES_BY_CATEGORY).map(([category, modules]) => (
                    <div key={category} className="space-y-2.5">
                      <h5 className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider border-b border-[#F2F2F7] pb-1">{category}</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {modules.map((mod: any) => {
                          const isAlways = mod.alwaysIncluded;
                          const isChecked = isAlways || selectedModules.includes(mod.key);
                          return (
                            <div 
                              key={mod.key} 
                              onClick={() => !isAlways && handleToggleModule(mod.key)}
                              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all select-none ${
                                isAlways 
                                  ? 'bg-slate-50 border-slate-200 opacity-80 cursor-not-allowed' 
                                  : isChecked 
                                    ? 'border-blue-500 bg-blue-50/20 cursor-pointer ring-2 ring-blue-500/10' 
                                    : 'border-[#E5E5EA] hover:border-slate-300 bg-white cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg shrink-0 ${isChecked ? "text-blue-600 bg-blue-50" : "text-[#6E6E73] bg-[#F2F2F7]"}`}>
                                  {getModuleIcon(mod.icon, 16)}
                                </div>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-[#1D1D1F]">{mod.label}</span>
                                    
                                    {/* Fix 5: Module Description Tooltip */}
                                    {mod.description && (
                                      <span title={mod.description} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                        <Info size={12} className="text-slate-400 hover:text-blue-600 cursor-help" />
                                      </span>
                                    )}
                                  </div>
                                  {isAlways && <span className="text-[8px] text-[#8E8E93] font-bold uppercase tracking-wider mt-0.5">Always On</span>}
                                </div>
                              </div>
                              
                              {!isAlways && (
                                <Switch 
                                  checked={isChecked} 
                                  onCheckedChange={() => handleToggleModule(mod.key)}
                                  className="pointer-events-none"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
            </CardContent>
          </Card>

          {/* Card 5: Platform Visibility & Advanced toggles */}
          <Card className="border-[#E5E5EA] shadow-xs rounded-2xl bg-white">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#1D1D1F] border-b border-[#F2F2F7] pb-3">Publication & Behavioral Controls</h3>
              
              <div className="flex flex-col gap-4">
                <label className="flex items-center justify-between cursor-pointer p-4 bg-slate-50 border border-[#E5E5EA] rounded-2xl hover:border-slate-300 transition-colors">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#1D1D1F] block uppercase tracking-wider">Visibility Status</span>
                    <span className="text-xs text-[#6E6E73]">Enable this to allow new owners to select and subscribe to this tier.</span>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-4 bg-slate-50 border border-[#E5E5EA] rounded-2xl hover:border-slate-300 transition-colors">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#1D1D1F] block uppercase tracking-wider">Allow Self-Serve Free Trial</span>
                    <span className="text-xs text-[#6E6E73]">Uncheck for Enterprise or custom tiers that bypass self-serve trial periods.</span>
                  </div>
                  <Switch checked={allowsTrial} onCheckedChange={setAllowsTrial} />
                </label>

                <div className="p-4 bg-slate-50 border border-[#E5E5EA] rounded-2xl space-y-2">
                  <Label className="font-bold text-[#1D1D1F] text-xs uppercase tracking-wider block">Tier Grace Period Override (Days)</Label>
                  <Input 
                    type="number" 
                    min={0}
                    value={tierGracePeriodDays} 
                    onChange={e => setTierGracePeriodDays(e.target.value)} 
                    placeholder="Leave blank to use platform default (7 days)"
                    className="h-11 rounded-xl bg-white border-[#E5E5EA]" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 6: Stripe Integration Details */}
          {isEditing && (
            <Card className="border-[#E5E5EA] shadow-xs rounded-2xl bg-white">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-bold text-[#1D1D1F] border-b border-[#F2F2F7] pb-3">Stripe Integration Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Stripe Product ID</Label>
                    <div className="p-3 bg-slate-50 rounded-xl border border-[#E5E5EA] font-mono text-xs text-[#1D1D1F]">
                      {stripeProductId || <span className="text-amber-600 font-sans font-semibold">Not connected to Stripe</span>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Stripe Price ID</Label>
                    <div className="p-3 bg-slate-50 rounded-xl border border-[#E5E5EA] font-mono text-xs text-[#1D1D1F]">
                      {stripePriceId || <span className="text-amber-600 font-sans font-semibold">Not connected to Stripe</span>}
                    </div>
                  </div>
                </div>
                {stripeProductId && (
                  <a 
                    href={`https://dashboard.stripe.com/products/${stripeProductId}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    View in Stripe Dashboard →
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Destructive zone */}
          {isEditing && (
            <Card className="border-rose-100 bg-rose-50/20 rounded-2xl">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h4 className="text-sm font-extrabold text-rose-950">Danger Zone</h4>
                  <p className="text-xs text-rose-800 font-semibold mt-0.5">Deleting this plan will break billing pipelines for existing landlord accounts mapped to it.</p>
                </div>
                
                {showDeleteConfirm ? (
                  <div className="p-4 bg-white border border-rose-200 rounded-xl space-y-3 animate-in fade-in duration-200">
                    <p className="text-xs text-[#1D1D1F] font-bold">
                      Are you absolutely sure? This will deactivate product links in Stripe and database keys. This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 rounded-xl text-xs font-bold h-9 border-[#E5E5EA]"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 rounded-xl text-xs font-medium h-9 bg-red-600 hover:bg-red-700 text-white"
                      >
                        {deleting ? "Deleting..." : "Yes, Delete Tier"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full border-rose-200 text-red-600 bg-white hover:bg-rose-50 hover:border-rose-300 font-bold text-xs h-10 rounded-xl transition-all shadow-none"
                  >
                    Delete Pricing Tier
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Form action bar */}
          <div className="pt-2 flex gap-3 font-sans">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push("/dashboard/admin/settings/pricing")}
              className="flex-1 h-9 border-slate-200 text-slate-900 rounded-xl font-black text-xs bg-white hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving}
              className="flex-1 h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-xs cursor-pointer shadow-xs border-none"
            >
              {saving ? "Saving Tier..." : isEditing ? "Save Pricing Plan" : "Create Pricing Plan"}
            </Button>
          </div>

        </form>

        {/* Right Column: Live upgrade selection Preview card */}
        <div className="space-y-4 font-sans">
          <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Live Billing Preview</span>
          
          <div className="sticky top-6">
            <Card className="rounded-3xl border border-slate-200 shadow-md bg-white overflow-hidden font-sans">
              {/* Card Banner */}
              <div className="bg-slate-900 px-6 py-5 text-white relative overflow-hidden shadow-xs">
                <div className="relative z-10">
                  <span className="text-[10px] font-medium uppercase tracking-wider bg-white/10 text-slate-300 border border-white/20 px-2.5 py-0.5 rounded-md block w-fit mb-2">
                    Previewing Selection
                  </span>
                  <h4 className="text-xl font-semibold tracking-tight text-white">{name || "Tier Name"}</h4>
                  <p className="text-xs text-slate-300 font-normal line-clamp-1 mt-0.5">{description || "Marketplace Tagline"}</p>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Pricing section */}
                <div>
                  <span className="text-3xl font-semibold text-slate-900 tracking-tight">{isCustom ? 'Custom Quote' : `$${price}`}</span>
                  {!isCustom && <span className="text-slate-500 text-xs font-normal"> / month</span>}
                </div>

                {/* Scope details */}
                <div className="space-y-2.5 border-b border-slate-100 pb-4 text-xs font-normal text-slate-500">
                  <div className="flex justify-between">
                    <span>Portfolio Unit Scope</span>
                    <span className="text-[#1D1D1F] font-semibold">
                      {minUnits} to {isUnlimitedUnits ? "Unlimited" : maxUnits} units
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inspector Accounts</span>
                    <span className="text-[#1D1D1F] font-semibold">{maxInspectors} max</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Evaluation Period</span>
                    <span className="text-[#1D1D1F] font-semibold">
                      {trialDays > 0 ? `${trialDays}-day free trial` : "No Free Trial"}
                    </span>
                  </div>
                </div>

                {/* Features listing derived */}
                <div className="space-y-3">
                  <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Entitled Operations &amp; Features</span>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {derivedFeatures.map((feat, idx) => (
                      <div key={idx} className="flex gap-2 items-start text-xs">
                        <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <span className="text-[#1D1D1F] font-normal leading-normal">{feat}</span>
                      </div>
                    ))}
                    {derivedFeatures.length === 0 && (
                      <p className="text-xs text-slate-400 font-normal italic">Select modules or add features above to generate the preview list.</p>
                    )}
                  </div>
                </div>

                {/* Call to action button */}
                <Button 
                  disabled 
                  className="w-full bg-slate-100 text-slate-400 rounded-xl h-9 text-xs font-medium cursor-not-allowed shadow-none border-none"
                >
                  Select Plan
                </Button>
              </CardContent>
            </Card>

            <div className="mt-4 bg-slate-50 rounded-2xl border border-slate-200/80 p-4 text-xs font-normal text-slate-500 flex gap-2.5 items-start leading-normal shadow-2xs">
              <Info className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <p>
                The live preview shows the exact plan specifications card presented to landlord owners during checkout and checkout change events.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

