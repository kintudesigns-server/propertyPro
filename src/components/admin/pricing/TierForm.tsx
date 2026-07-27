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
  Info
} from "lucide-react";
import { GATABLE_MODULES, MODULES_BY_CATEGORY } from "@/lib/modules-registry";
import { toast } from "sonner";

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
    initialTier?.modules || ["properties", "leases", "tenants", "applications", "payments"]
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

  // Handle module toggle checkbox
  const handleToggleModule = (key: string) => {
    // Core always included
    const coreKeys = ["properties", "leases", "tenants", "applications", "payments"];
    if (coreKeys.includes(key)) return;

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
    <div className="space-y-6">
      {/* Top action links */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.push("/dashboard/admin/settings/pricing")}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
        >
          <ArrowLeft size={16} /> Back to Tiers
        </button>

        {isEditing && (
          <Badge className="bg-blue-50 text-blue-700 border border-blue-100 font-bold px-3 py-1 rounded-xl shadow-none">
            {subscriberCount} Active Subscriber{subscriberCount === 1 ? "" : "s"} on this Plan
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-[#1D1D1F]">
          {isEditing ? `Edit Pricing Plan: ${initialTier.name}` : "Create New Pricing Plan"}
        </h1>
        <p className="text-sm text-[#6E6E73]">
          Configure subscribed modules, feature benefits, unit capacity tiers, and direct payment mapping.
        </p>
      </div>

      {isEditing && subscriberCount > 0 && (
        <Card className="border-amber-200 bg-amber-50/30 rounded-2xl shadow-none">
          <CardContent className="p-4 flex gap-3 items-center text-xs text-amber-800 font-semibold leading-normal">
            <AlertTriangle className="text-amber-600 shrink-0" size={18} />
            <p>
              <strong>Careful:</strong> Changing modules or unit boundaries of this tier will immediately alter access controls and feature gates for the <strong>{subscriberCount} landlord accounts</strong> currently subscribed to it.
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
                  <Label className="font-bold text-[#1D1D1F] text-xs uppercase tracking-wider block">Maximum Inspector Accounts</Label>
                  <Input 
                    type="number" 
                    required 
                    min={0}
                    value={maxInspectors} 
                    onChange={e => setMaxInspectors(Number(e.target.value))} 
                    className="h-11 rounded-xl bg-slate-50 border-[#E5E5EA]" 
                  />
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
                  <Label className="font-bold text-[#1D1D1F] text-xs uppercase tracking-wider block">Max Vendors (0 = Unlimited)</Label>
                  <Input 
                    type="number" 
                    min={0}
                    value={maxVendors} 
                    onChange={e => setMaxVendors(Number(e.target.value))} 
                    className="h-11 rounded-xl bg-slate-50 border-[#E5E5EA]" 
                  />
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
                <h3 className="text-sm font-bold text-[#1D1D1F]">Plan Module Entitlements</h3>
                <p className="text-xs text-[#6E6E73] mt-0.5">Toggle administrative access to the platform's module registry. Core modules are locked as always included.</p>
              </div>

              <div className="space-y-6">
                {Object.entries(MODULES_BY_CATEGORY).map(([category, modules]) => (
                  <div key={category} className="space-y-2.5">
                    <h5 className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider border-b border-[#F2F2F7] pb-1">{category}</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {modules.map((mod) => {
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
                                <span className="text-xs font-bold text-[#1D1D1F]">{mod.label}</span>
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
                        className="flex-1 rounded-xl text-xs font-bold h-9 bg-red-600 hover:bg-red-700 text-white"
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
          <div className="pt-4 flex gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push("/dashboard/admin/settings/pricing")}
              className="flex-1 h-12 border-[#E5E5EA] text-[#1D1D1F] rounded-xl font-bold bg-white"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
            >
              {saving ? "Saving Tier..." : isEditing ? "Save Pricing Plan" : "Create Pricing Plan"}
            </Button>
          </div>

        </form>

        {/* Right Column: Live upgrade selection Preview card */}
        <div className="space-y-4">
          <span className="text-xs font-black text-[#8E8E93] uppercase tracking-wider block">Live Billing Preview</span>
          
          <div className="sticky top-6">
            <Card className="rounded-3xl border border-blue-500 shadow-xl bg-white overflow-hidden ring-4 ring-blue-500/10">
              {/* Card Banner */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
                <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full block w-fit mb-1">Previewing Selection</span>
                <h4 className="text-lg font-black tracking-tight">{name || "Tier Name"}</h4>
                <p className="text-xs text-white/80 font-medium line-clamp-1 mt-0.5">{description || "Marketplace Tagline"}</p>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Pricing section */}
                <div>
                  <span className="text-4xl font-black text-slate-900">{isCustom ? 'Custom Quote' : `$${price}`}</span>
                  {!isCustom && <span className="text-[#6E6E73] text-sm font-semibold"> / month</span>}
                </div>

                {/* Scope details */}
                <div className="space-y-2 border-b border-[#F2F2F7] pb-4 text-xs font-semibold text-[#6E6E73]">
                  <div className="flex justify-between">
                    <span>Portfolio Unit Scope</span>
                    <span className="text-[#1D1D1F] font-bold">
                      {minUnits} to {isUnlimitedUnits ? "Unlimited" : maxUnits} units
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inspector Accounts</span>
                    <span className="text-[#1D1D1F] font-bold">{maxInspectors} max</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Evaluation Period</span>
                    <span className="text-[#1D1D1F] font-bold">
                      {trialDays > 0 ? `${trialDays}-day free trial` : "No Free Trial"}
                    </span>
                  </div>
                </div>

                {/* Features listing derived */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-[#8E8E93] uppercase tracking-wider block">Entitled Operations & Features</span>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {derivedFeatures.map((feat, idx) => (
                      <div key={idx} className="flex gap-2 items-start text-xs">
                        <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-slate-800 font-bold leading-normal">{feat}</span>
                      </div>
                    ))}
                    {derivedFeatures.length === 0 && (
                      <p className="text-xs text-slate-400 font-medium italic">Select modules or add features above to generate the preview list.</p>
                    )}
                  </div>
                </div>

                {/* Call to action button */}
                <Button 
                  disabled 
                  className="w-full bg-[#1D1D1F] text-white rounded-xl h-11 text-xs font-bold cursor-not-allowed shadow-none"
                >
                  Select Plan
                </Button>
              </CardContent>
            </Card>

            <div className="mt-4 bg-slate-50 rounded-2xl border border-slate-200/60 p-4 text-xs font-semibold text-[#6E6E73] flex gap-2 items-start leading-normal">
              <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
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
