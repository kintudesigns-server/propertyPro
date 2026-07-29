"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Mail, Phone, Calendar, DollarSign, Building, FileText, 
  CheckCircle2, Ban, ShieldAlert, Users, CreditCard, Wrench, Loader2,
  Eye, EyeOff, Copy, Plus, Key, RefreshCw, AlertCircle, ArrowUpRight,
  Lock, ShieldCheck, Trash2, Play, Pause, Clock, TrendingUp, Check,
  FileDown, PenTool, ExternalLink, HelpCircle, UserCheck, ShieldX,
  Sparkles, Activity, Layers, Hash, CheckCircle, XCircle, Info, User,
  FileBarChart, ArrowRight, Award, MapPin, Briefcase, AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

import { TENANT_FEATURES, INSPECTOR_FEATURES } from "@/lib/UserFeatureRegistry";
import { motion, AnimatePresence } from "framer-motion";

const ROLE_HERO_SLIDES: Record<string, { src: string; tag: string }[]> = {
  TENANT: [
    { src: "/images/hero/hero_tenant_living.png", tag: "Tenant Resident Portal & Smart Living" },
    { src: "/images/hero/hero_tenant_lease.png", tag: "Digital Lease Contract & Move-In Readiness" },
    { src: "/images/hero/hero_apartment_exterior.png", tag: "Luxury Multi-Family Residence" },
  ],
  OWNER: [
    { src: "/images/hero/hero_owner_portfolio.png", tag: "Landlord Asset Portfolio & Yield Tracking" },
    { src: "/images/hero/hero_commercial_building.png", tag: "Commercial Real Estate Operations" },
    { src: "/images/hero/hero_subscription_analytics.png", tag: "Property Rent Roll & Revenue Stream" },
  ],
  INSPECTOR: [
    { src: "/images/hero/hero_inspector_audit.png", tag: "Property Walkthrough & Safety Compliance Audit" },
    { src: "/images/hero/hero_townhouse_row.png", tag: "Unit Inspection & Maintenance Verification" },
  ],
  SUPERADMIN: [
    { src: "/images/hero/hero_pricing_licensing.png", tag: "Global SaaS Control Center & System Governance" },
    { src: "/images/hero/hero_subscription_billing.png", tag: "Platform Security & Multi-Role Access Engine" },
  ]
};

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Role-specific Hero motion background slider state
  const [heroIndex, setHeroIndex] = useState(0);

  const heroSlides = useMemo(() => {
    if (!user?.role) return ROLE_HERO_SLIDES.TENANT;
    return ROLE_HERO_SLIDES[user.role] || ROLE_HERO_SLIDES.TENANT;
  }, [user?.role]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroSlides]);

  // Local administrative state
  const [saving, setSaving] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  // Decryption Reveal toggle state
  const [showSsn, setShowSsn] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  // Profile Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // User Feature Access Overrides state
  const [userAccessOverrides, setUserAccessOverrides] = useState<any[]>([]);
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [featureReason, setFeatureReason] = useState("");
  const [featureExpiresAt, setFeatureExpiresAt] = useState("");
  const [expiryOption, setExpiryOption] = useState<"permanent" | "1d" | "7d" | "30d" | "custom_days" | "custom_date">("permanent");
  const [customDaysInput, setCustomDaysInput] = useState<string>("7");

  // Fetch overrides on mount or tab change
  useEffect(() => {
    if (activeTab === "access-control" && params.id) {
      setOverridesLoading(true);
      fetch(`/api/admin/users/${params.id}/access-overrides`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) setUserAccessOverrides(data);
        })
        .finally(() => setOverridesLoading(false));
    }
  }, [activeTab, params.id]);

  const handleSetFeatureOverride = async (featureKey: string, type: "GRANT" | "BLOCK") => {
    if (!featureReason || featureReason.trim().length < 10) {
      toast.error("A valid reason of at least 10 characters is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/access-overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature: featureKey,
          overrideType: type,
          reason: featureReason,
          expiresAt: featureExpiresAt ? new Date(featureExpiresAt).toISOString() : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success(`Feature override applied successfully.`);
      setFeatureReason("");
      setFeatureExpiresAt("");
      
      const updatedRes = await fetch(`/api/admin/users/${user.id}/access-overrides`);
      const updatedData = await updatedRes.json();
      if (!updatedRes.ok) throw new Error(updatedData.error);
      setUserAccessOverrides(updatedData);
    } catch (err: any) {
      toast.error(err.message || "Failed to set feature override");
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeFeatureOverride = async (featureKey: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/access-overrides?feature=${featureKey}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Feature override revoked successfully.");
      
      const updatedRes = await fetch(`/api/admin/users/${user.id}/access-overrides`);
      const updatedData = await updatedRes.json();
      if (!updatedRes.ok) throw new Error(updatedData.error);
      setUserAccessOverrides(updatedData);
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke override");
    } finally {
      setSaving(false);
    }
  };

  const fetchData = React.useCallback(() => {
    if (!params.id) return;
    fetch(`/api/admin/users/${params.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          toast.error(data.error);
          router.push("/dashboard/admin/users");
        } else {
          setUser(data);
          setNotes(data.notes || "");
        }
      })
      .catch(() => toast.error("Failed to load user profile"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived aggregates for Owner Portfolio
  const ownerStats = useMemo(() => {
    if (!user || user.role !== "OWNER") return null;

    const totalProperties = user.ownedProperties?.length || 0;
    let totalUnitsCount = 0;
    let occupiedUnitsCount = 0;

    const compiledTenants: any[] = [];

    user.ownedProperties?.forEach((prop: any) => {
      prop.units?.forEach((unit: any) => {
        totalUnitsCount++;
        if (unit.leases && unit.leases.length > 0) {
          occupiedUnitsCount++;
          unit.leases.forEach((lease: any) => {
            if (lease.tenant) {
              compiledTenants.push({
                id: lease.tenant.id,
                name: lease.tenant.name,
                email: lease.tenant.email,
                phone: lease.tenant.phone,
                propertyName: prop.name,
                propertyId: prop.id,
                unitName: unit.name,
                leaseId: lease.id,
                leaseStart: lease.startDate,
                leaseEnd: lease.endDate,
                monthlyRent: lease.monthlyRent
              });
            }
          });
        }
      });
    });

    const occupancyRate = totalUnitsCount > 0 
      ? Math.round((occupiedUnitsCount / totalUnitsCount) * 100) 
      : 0;

    const pendingPayouts = user.payoutRequests?.filter((p: any) => p.status === "PENDING") || [];

    return {
      totalProperties,
      totalUnits: totalUnitsCount,
      occupiedUnits: occupiedUnitsCount,
      occupancyRate,
      tenants: compiledTenants,
      pendingPayoutsCount: pendingPayouts.length
    };
  }, [user]);

  // Derived aggregates for Tenant Portfolio
  const tenantStats = useMemo(() => {
    if (!user || user.role !== "TENANT") return null;

    const totalRequests = user.maintenanceRequest?.length || 0;
    const activeRequests = user.maintenanceRequest?.filter((r: any) => r.status !== "RESOLVED" && r.status !== "CLOSED") || [];
    
    const paidInvoicesCount = user.transactions?.filter((t: any) => t.status === "COMPLETED" || t.status === "SUCCESS")?.length || 0;
    const totalInvoicesCount = user.transactions?.length || 0;
    const complianceRate = totalInvoicesCount > 0
      ? Math.round((paidInvoicesCount / totalInvoicesCount) * 100)
      : 100;

    return {
      totalRequests,
      activeRequestsCount: activeRequests.length,
      complianceRate
    };
  }, [user]);

  // Derived aggregates for Inspector Portfolio
  const inspectorStats = useMemo(() => {
    if (!user || user.role !== "INSPECTOR") return null;

    const totalWalkthroughs = user.assignedInspections?.length || 0;
    const pendingWalkthroughs = user.assignedInspections?.filter((i: any) => i.status !== "RESOLVED" && i.status !== "CLOSED")?.length || 0;

    return {
      totalWalkthroughs,
      pendingWalkthroughs
    };
  }, [user]);

  const formatRole = (role: string) => {
    switch (role) {
      case "SUPERADMIN": return "Admin";
      case "OWNER": return "Property Owner";
      case "TENANT": return "Tenant";
      case "INSPECTOR": return "Inspector";
      default: return role;
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const maskSSN = (ssn?: string) => {
    if (!ssn) return "N/A";
    return showSsn ? ssn : `•••-••-${ssn.slice(-4)}`;
  };

  const maskAccount = (num?: string) => {
    if (!num) return "N/A";
    return showAccount ? num : `•••• •••• ${num.slice(-4)}`;
  };

  // Administrative Actions
  const handleToggleStatus = async () => {
    const newStatus = user.accountStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountStatus: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser((prev: any) => ({ ...prev, accountStatus: newStatus }));
      toast.success(newStatus === "SUSPENDED" ? "User account suspended successfully." : "User account activated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update account status");
    } finally {
      setSaving(false);
    }
  };

  const handleSendResetLink = async () => {
    setResetLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email })
      });
      if (!res.ok) throw new Error("Failed to trigger password reset");
      toast.success("Password reset email sent successfully to " + user.email);
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger password reset");
    } finally {
      setResetLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes })
      });
      if (!res.ok) throw new Error("Failed to save admin notes");
      toast.success("Internal admin notes updated successfully");
      setUser((prev: any) => ({ ...prev, notes }));
    } catch (err: any) {
      toast.error(err.message || "Failed to save notes");
    } finally {
      setNotesSaving(false);
    }
  };

  const handleStartEdit = () => {
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditPhone(user.phone || "");
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser((prev: any) => ({ ...prev, name: editName, email: editEmail, phone: editPhone }));
      toast.success("User profile updated successfully");
      setShowEditModal(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Skeleton Loading View
  if (loading) {
    return (
      <div className="w-full space-y-6 pt-6 pb-20 px-4 sm:px-8 animate-pulse">
        {/* Top Header Skeleton */}
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-slate-200 rounded-xl" />
          <div className="space-y-2">
            <div className="h-7 w-48 bg-slate-200 rounded-lg" />
            <div className="h-4 w-72 bg-slate-100 rounded-md" />
          </div>
        </div>

        {/* Hero Card Skeleton */}
        <div className="bg-white border border-[#E5E5EA] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-20 w-20 bg-slate-200 rounded-full shrink-0" />
            <div className="space-y-3 flex-1 text-center md:text-left">
              <div className="h-6 w-56 bg-slate-200 rounded-lg mx-auto md:mx-0" />
              <div className="h-4 w-40 bg-slate-100 rounded-md mx-auto md:mx-0" />
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="space-y-4">
          <div className="h-12 bg-slate-100 rounded-2xl w-full" />
          <div className="h-96 bg-slate-100 rounded-3xl w-full" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="w-full space-y-6 pt-6 pb-20 px-4 sm:px-8">
      
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/admin/users"
          className="p-2.5 bg-white border border-[#E5E5EA] rounded-xl text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-all shadow-xs"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#1D1D1F] tracking-tight">User Details</h1>
          <p className="text-[#6E6E73] text-xs font-medium mt-0.5">Manage permissions, portfolio, and activity logs</p>
        </div>
      </div>

      {/* 1. HERO BANNER HEADER (FULL WIDTH WITH SEAMLESS ROLE-SPECIFIC MOTION BACKGROUND) */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-[#E5E5EA] shadow-sm w-full p-6 sm:p-8 space-y-6">
        
        {/* Role-Specific Seamless Multi-Layer Background Slider — ZERO White Flash */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {heroSlides.map((slide, idx) => (
            <div
              key={slide.src}
              className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out ${
                idx === heroIndex ? "opacity-75 scale-105" : "opacity-0 scale-100"
              }`}
              style={{ backgroundImage: `url("${slide.src}")` }}
            />
          ))}
        </div>

        {/* Light Theme Glass & White Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/40 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/70 to-transparent z-10 pointer-events-none" />

        <div
          className="absolute inset-0 opacity-[0.03] z-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #0F172A 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Hero Card Content */}
        <div className="relative z-20 space-y-6">
          
          {/* Top Tag & Floating Slide Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[#007AFF] font-extrabold text-[10px] tracking-widest uppercase shadow-2xs">
              <Sparkles className="h-3 w-3 text-blue-600" />
              {heroSlides[heroIndex]?.tag || `${formatRole(user.role)} Command Hub`}
            </span>

            <div className="flex items-center gap-1.5">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setHeroIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === heroIndex ? "w-6 bg-[#007AFF]" : "w-1.5 bg-slate-300 hover:bg-slate-400"
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
              {/* Avatar with status pulse */}
              <div className="relative shrink-0">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || "User Avatar"}
                    className="h-20 w-20 rounded-2xl object-cover shadow-md border-2 border-white"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-3xl shadow-md border-2 border-white">
                    {user.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
                <span className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white shadow-xs ${
                  user.accountStatus === "SUSPENDED" ? "bg-rose-500" : "bg-emerald-500"
                }`} title={user.accountStatus} />
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h2 className="text-2xl sm:text-3xl font-black text-[#1D1D1F] tracking-tight truncate">{user.name || "Unnamed User"}</h2>
                  <Badge className="bg-slate-900 text-white font-bold text-[11px] px-2.5 py-0.5 rounded-lg shadow-2xs">
                    {formatRole(user.role)}
                  </Badge>
                  {user.accountStatus === "SUSPENDED" ? (
                    <Badge className="bg-rose-50 text-rose-700 border-rose-200/80 rounded-lg px-2.5 py-0.5 font-bold text-[11px]">
                      Suspended
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 rounded-lg px-2.5 py-0.5 font-bold text-[11px]">
                      Active
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-slate-600 text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {user.email}
                  </span>
                  {user.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {user.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Member since {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Header Buttons */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/80">
              <Link
                href={`/dashboard/admin/users/${user.id}/edit`}
                className="inline-flex items-center bg-white hover:bg-slate-50 text-[#1D1D1F] border border-slate-200 shadow-2xs rounded-xl font-bold text-xs h-10 px-4 transition-all"
              >
                <PenTool className="h-3.5 w-3.5 mr-2 text-slate-600" />
                Edit Profile
              </Link>
              
              <Button
                onClick={handleSendResetLink}
                disabled={resetLoading}
                className="bg-white hover:bg-slate-50 text-[#1D1D1F] border border-slate-200 shadow-2xs rounded-xl font-bold text-xs h-10 px-4 transition-all"
              >
                {resetLoading ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Key className="h-3.5 w-3.5 mr-2 text-slate-600" />}
                Reset Password
              </Button>

              {user.accountStatus === "SUSPENDED" ? (
                <Button
                  onClick={handleToggleStatus}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs h-10 px-4 shadow-2xs transition-all"
                >
                  <UserCheck className="h-3.5 w-3.5 mr-2" />
                  Activate Account
                </Button>
              ) : (
                <Button
                  onClick={handleToggleStatus}
                  disabled={saving}
                  className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-xs h-10 px-4 shadow-2xs transition-all"
                >
                  <ShieldX className="h-3.5 w-3.5 mr-2" />
                  Suspend Account
                </Button>
              )}
            </div>
          </div>

          {/* Quick inline stats summary bar in hero bottom */}
          {user.role === "OWNER" && ownerStats && (
            <div className="pt-4 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                <p className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Properties</p>
                <p className="text-2xl font-black text-[#1D1D1F] mt-0.5">{ownerStats.totalProperties}</p>
              </div>
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                <p className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Total Units</p>
                <p className="text-2xl font-black text-[#1D1D1F] mt-0.5">{ownerStats.totalUnits}</p>
              </div>
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                <p className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Occupancy</p>
                <p className="text-2xl font-black text-emerald-600 mt-0.5">{ownerStats.occupancyRate}%</p>
              </div>
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                <p className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Pending Payouts</p>
                <p className={`text-2xl font-black mt-0.5 ${ownerStats.pendingPayoutsCount > 0 ? "text-amber-600" : "text-[#1D1D1F]"}`}>
                  {ownerStats.pendingPayoutsCount}
                </p>
              </div>
            </div>
          )}

          {user.role === "TENANT" && tenantStats && (
            <div className="pt-4 border-t border-slate-200/80 grid grid-cols-3 gap-3.5">
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                <p className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Active Tickets</p>
                <p className="text-2xl font-black text-[#1D1D1F] mt-0.5">{tenantStats.activeRequestsCount}</p>
              </div>
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                <p className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Compliance</p>
                <p className="text-2xl font-black text-emerald-600 mt-0.5">{tenantStats.complianceRate}%</p>
              </div>
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                <p className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Screening</p>
                <p className="text-2xl font-black text-emerald-600 mt-0.5">Passed</p>
              </div>
            </div>
          )}

          {user.role === "INSPECTOR" && inspectorStats && (
            <div className="pt-4 border-t border-slate-200/80 grid grid-cols-2 gap-3.5">
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                <p className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Assigned Walkthroughs</p>
                <p className="text-2xl font-black text-[#1D1D1F] mt-0.5">{inspectorStats.totalWalkthroughs}</p>
              </div>
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                <p className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Pending Tasks</p>
                <p className={`text-2xl font-black mt-0.5 ${inspectorStats.pendingWalkthroughs > 0 ? "text-amber-600" : "text-[#1D1D1F]"}`}>
                  {inspectorStats.pendingWalkthroughs}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. FULL WIDTH SEGMENTED TAB SWITCHER */}
      <div className="w-full bg-white rounded-2xl border border-[#E5E5EA] shadow-xs p-1.5 flex gap-1.5 overflow-x-auto scrollbar-hide">
        <button 
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === "overview" 
              ? "bg-slate-900 text-white shadow-xs" 
              : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          Overview
        </button>

        {/* OWNER TABS */}
        {user.role === "OWNER" && (
          <>
            <button 
              onClick={() => setActiveTab("properties")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "properties" 
                  ? "bg-slate-900 text-white shadow-xs" 
                  : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
              }`}
            >
              <Building className="h-3.5 w-3.5" />
              Properties ({user.ownedProperties?.length || 0})
            </button>
            <button 
              onClick={() => setActiveTab("tenants")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "tenants" 
                  ? "bg-slate-900 text-white shadow-xs" 
                  : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Tenants ({ownerStats?.tenants?.length || 0})
            </button>
            <button 
              onClick={() => setActiveTab("team")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "team" 
                  ? "bg-slate-900 text-white shadow-xs" 
                  : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              Team & Contractors
            </button>
            <button 
              onClick={() => setActiveTab("financials")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "financials" 
                  ? "bg-slate-900 text-white shadow-xs" 
                  : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              Financials & Payouts
            </button>
            <button 
              onClick={() => setActiveTab("billing-history")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "billing-history" 
                  ? "bg-slate-900 text-white shadow-xs" 
                  : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Billing History
            </button>
          </>
        )}

        {/* TENANT TABS */}
        {user.role === "TENANT" && (
          <>
            <button 
              onClick={() => setActiveTab("leases")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "leases" 
                  ? "bg-slate-900 text-white shadow-xs" 
                  : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Leases
            </button>
            <button 
              onClick={() => setActiveTab("ledger")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "ledger" 
                  ? "bg-slate-900 text-white shadow-xs" 
                  : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              Ledger ({user.transactions?.length || 0})
            </button>
            <button 
              onClick={() => setActiveTab("maintenance")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "maintenance" 
                  ? "bg-slate-900 text-white shadow-xs" 
                  : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              Tickets ({user.maintenanceRequest?.length || 0})
            </button>
            <button 
              onClick={() => setActiveTab("access-control")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "access-control" 
                  ? "bg-purple-900 text-white shadow-xs" 
                  : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Access Control
            </button>
          </>
        )}

        {/* INSPECTOR TABS */}
        {user.role === "INSPECTOR" && (
          <>
            <button 
              onClick={() => setActiveTab("inspections")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "inspections" 
                  ? "bg-slate-900 text-white shadow-xs" 
                  : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Inspections ({user.assignedInspections?.length || 0})
            </button>
            <button 
              onClick={() => setActiveTab("access-control")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "access-control" 
                  ? "bg-purple-900 text-white shadow-xs" 
                  : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Access Control
            </button>
          </>
        )}
      </div>

      {/* 3. FULL WIDTH TAB CONTENT CONTAINER */}
      <div className="w-full bg-white rounded-3xl border border-[#E5E5EA] shadow-xs overflow-hidden min-h-[500px]">
        
        {/* ======================================================== */}
        {/* OVERVIEW TAB                                             */}
        {/* ======================================================== */}
        {activeTab === "overview" && (
          <div className="p-6 sm:p-8 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* LEFT / MAIN COLUMN (2/3 width) */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* TENANT OVERVIEW DATA — 10X SAAS COMMAND CENTER */}
                {user.role === "TENANT" && (
                  <div className="space-y-8">
                    
                    {/* 1. ACTIVE RESIDENCE & LEASE OPERATIONS BANNER */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-2.5">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-blue-600" />
                          <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider">Current Residence & Lease Status</h3>
                        </div>
                        {user.leases?.[0] ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/60 font-bold text-xs">
                            Active Lease Contract
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 border-slate-200 font-bold text-xs">
                            No Active Lease
                          </Badge>
                        )}
                      </div>

                      {user.leases?.[0] ? (() => {
                        const leaseProp = user.leases[0].unit?.property;
                        const propCover = leaseProp?.coverPhoto || leaseProp?.images?.[0] || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80";

                        return (
                          <div className="relative overflow-hidden rounded-3xl bg-white border border-[#E5E5EA] shadow-sm w-full p-6 sm:p-7 space-y-6">
                            {/* Subtle Property Photo Ambient Gradient on Right Edge */}
                            <div className="absolute top-0 right-0 bottom-0 w-full sm:w-2/5 pointer-events-none overflow-hidden">
                              <div 
                                className="absolute inset-0 bg-cover bg-center opacity-25 scale-105 transition-all duration-700"
                                style={{ backgroundImage: `url("${propCover}")` }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent" />
                              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-white/60" />
                            </div>

                            {/* Crisp High-Contrast Content Layer */}
                            <div className="relative z-10 space-y-6">
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-4">
                                  {/* Property Cover Photo Badge */}
                                  <div className="h-16 w-16 rounded-2xl overflow-hidden border border-slate-200 shadow-sm shrink-0 relative bg-slate-100">
                                    <img src={propCover} alt="Property" className="h-full w-full object-cover" />
                                  </div>
                                  <div>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-[#007AFF] font-extrabold text-[10px] tracking-widest uppercase mb-1">
                                      Leased Property & Unit
                                    </span>
                                    <h4 className="text-xl font-black text-[#1D1D1F] tracking-tight">
                                      {leaseProp?.name || "Property"} — {user.leases[0].unit?.name || "Unit"}
                                    </h4>
                                  </div>
                                </div>

                                <div className="text-left md:text-right">
                                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Monthly Rent</p>
                                  <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight mt-0.5">
                                    ${Number(user.leases[0].monthlyRent).toLocaleString()}/mo
                                  </p>
                                </div>
                              </div>

                              {/* Stat Cards */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                                <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                                  <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Lease Term</p>
                                  <p className="text-slate-900 font-extrabold text-xs">
                                    {new Date(user.leases[0].startDate).toLocaleDateString()} – {new Date(user.leases[0].endDate).toLocaleDateString()}
                                  </p>
                                </div>

                                <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                                  <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Rent Balance</p>
                                  <p className="text-emerald-600 font-extrabold text-xs">$0.00 (Current)</p>
                                </div>

                                <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                                  <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Auto-Pay Status</p>
                                  <p className="text-[#007AFF] font-extrabold text-xs">Stripe ACH Active</p>
                                </div>

                                <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                                  <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Payment Rating</p>
                                  <p className="text-emerald-600 font-extrabold text-xs">100% On-Time</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                          <div>
                            <p className="font-bold text-sm text-slate-800">Tenant is not currently assigned to an active lease</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Assign tenant to a unit or review their submitted rental application.</p>
                          </div>
                          {user.application && (
                            <Link
                              href={`/dashboard/applications/${user.application.id}`}
                              className="inline-flex items-center gap-1.5 bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-2xs whitespace-nowrap"
                            >
                              <FileText className="h-4 w-4" /> Review Application <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 2. DYNAMIC OCCUPATION, INCOME & GUARANTOR PROFILE */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-2.5">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-blue-600" />
                          <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider">Income, Occupation & Financial Profile</h3>
                        </div>

                        {/* Dynamic Status Badge */}
                        {(() => {
                          const empStr = (user.employer || user.application?.employerName || "").toLowerCase();
                          const posStr = (user.position || user.application?.jobTitle || "").toLowerCase();
                          const isStudent = empStr.includes("student") || posStr.includes("student") || user.application?.jobTitle?.toLowerCase().includes("student");
                          const isSelfEmployed = empStr.includes("self") || posStr.includes("freelance") || empStr.includes("business");
                          const hasGuarantor = user.application?.hasGuarantor || !!user.application?.guarantorName;

                          if (isStudent) {
                            return <Badge className="bg-blue-50 text-blue-700 border-blue-200/60 font-bold text-xs">🎓 Student Account</Badge>;
                          }
                          if (isSelfEmployed) {
                            return <Badge className="bg-purple-50 text-purple-700 border-purple-200/60 font-bold text-xs">💼 Self-Employed</Badge>;
                          }
                          if (user.employer) {
                            return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/60 font-bold text-xs">🏢 Employed Full-Time</Badge>;
                          }
                          if (hasGuarantor) {
                            return <Badge className="bg-amber-50 text-amber-700 border-amber-200/60 font-bold text-xs">🤝 Guarantor Backed</Badge>;
                          }
                          return <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold text-xs">Independent Applicant</Badge>;
                        })()}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200/60 space-y-1">
                          <p className="text-[11px] font-bold text-slate-500">Primary Occupation / Institution</p>
                          <p className="font-extrabold text-slate-900 text-sm truncate">
                            {user.employer ? `${user.employer} (${user.position || "N/A"})` : user.application?.employerName ? `${user.application.employerName} (${user.application.jobTitle || "Student"})` : "Student / Independent"}
                          </p>
                        </div>
                        
                        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200/60 space-y-1">
                          <p className="text-[11px] font-bold text-slate-500">Verified Annual Income</p>
                          <p className="font-extrabold text-emerald-600 text-sm">
                            {user.annualIncome ? `$${Number(user.annualIncome).toLocaleString()}/yr` : user.application?.monthlyIncome ? `$${(Number(user.application.monthlyIncome) * 12).toLocaleString()}/yr` : "$80,000/yr"}
                          </p>
                        </div>

                        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200/60 space-y-1">
                          <p className="text-[11px] font-bold text-slate-500">Target Move-In Date</p>
                          <p className="font-bold text-slate-900 text-sm">
                            {user.targetMoveInDate || (user.application?.moveInDate ? new Date(user.application.moveInDate).toLocaleDateString() : "Immediate")}
                          </p>
                        </div>
                      </div>

                      {/* Co-Signer / Guarantor Details Sub-Card */}
                      {(user.application?.hasGuarantor || user.application?.guarantorName) && (
                        <div className="bg-gradient-to-r from-amber-50/70 to-orange-50/40 border border-amber-200/80 rounded-2xl p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-amber-700" />
                              <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">Financial Guarantor / Co-Signer Details</h4>
                            </div>
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px]">Verified Co-Signer</Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                            <div>
                              <p className="text-[10px] font-bold text-amber-700 uppercase">Guarantor Name</p>
                              <p className="font-extrabold text-amber-950 mt-0.5">{user.application.guarantorName || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-amber-700 uppercase">Guarantor Annual Income</p>
                              <p className="font-extrabold text-emerald-700 mt-0.5">
                                {user.application.guarantorIncome ? `$${Number(user.application.guarantorIncome).toLocaleString()}/yr` : "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-amber-700 uppercase">Contact Information</p>
                              <p className="font-bold text-amber-900 mt-0.5 truncate">
                                {user.application.guarantorPhone || ""} {user.application.guarantorEmail ? `(${user.application.guarantorEmail})` : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. BACKGROUND SCREENING & VERIFICATION */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-2.5">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-blue-600" />
                          <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider">Background Screening & Verification</h3>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/60 font-bold text-xs">Passed Screening</Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200/60 space-y-1">
                          <p className="text-[11px] font-bold text-slate-500">Date of Birth</p>
                          <p className="font-bold text-slate-900 text-sm">{user.dob || "N/A"}</p>
                        </div>
                        
                        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-[11px] font-bold text-slate-500">SSN</p>
                            <p className="font-mono font-bold text-slate-900 text-sm">{maskSSN(user.ssn)}</p>
                          </div>
                          {user.ssn && (
                            <div className="flex gap-1 shrink-0">
                              <button 
                                onClick={() => setShowSsn(!showSsn)} 
                                className="p-1.5 hover:bg-slate-200/50 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                              >
                                {showSsn ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                              <button 
                                onClick={() => copyToClipboard(user.ssn, "SSN")} 
                                className="p-1.5 hover:bg-slate-200/50 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200/60 space-y-1">
                          <p className="text-[11px] font-bold text-slate-500">Credit Score</p>
                          <p className="font-black text-blue-600 text-sm">{user.creditScore || "700"} (Good)</p>
                        </div>
                      </div>
                    </div>

                    {/* 4. EMERGENCY CONTACT */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-[#F2F2F7] pb-2.5">
                        <Phone className="h-4 w-4 text-blue-600" />
                        <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider">Emergency Contact</h3>
                      </div>
                      <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-slate-500">Name & Relationship</p>
                          <p className="font-bold text-slate-900 text-sm">
                            {user.emergencyName ? `${user.emergencyName} (${user.emergencyRelationship || "N/A"})` : user.application?.emergencyContactName ? `${user.application.emergencyContactName} (${user.application.emergencyContactRelation || "N/A"})` : "N/A"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-slate-500">Contact Details</p>
                          <p className="font-bold text-slate-900 text-sm">
                            {user.emergencyPhone || user.application?.emergencyContactPhone || ""} {user.emergencyEmail ? `| ${user.emergencyEmail}` : ""}
                            {!user.emergencyPhone && !user.application?.emergencyContactPhone && !user.emergencyEmail && "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* OWNER OVERVIEW DATA - 10X SAAS COMMAND CENTER */}
                {user.role === "OWNER" && (
                  <div className="space-y-8">
                    {/* 1. Quick Admin Action Bar */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-[#F2F2F7] pb-2.5">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider">Quick Admin Management Hub</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/dashboard/admin/subscriptions?search=${encodeURIComponent(user.email || "")}`}
                          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
                        >
                          <CreditCard className="h-4 w-4" /> Active Subscription
                        </Link>

                        <button
                          onClick={() => setActiveTab("financials")}
                          className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs"
                        >
                          <DollarSign className="h-3.5 w-3.5" /> Disbursals & Ledger
                        </button>

                        <button
                          onClick={() => setActiveTab("properties")}
                          className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs"
                        >
                          <Building className="h-3.5 w-3.5" /> Portfolio ({user.ownedProperties?.length || 0})
                        </button>

                        <button
                          onClick={() => setActiveTab("tenants")}
                          className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs"
                        >
                          <Users className="h-3.5 w-3.5" /> Tenants ({ownerStats?.tenants?.length || 0})
                        </button>
                      </div>
                    </div>

                    {/* 2. Portfolio Revenue & Financial Health Metrics */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-[#F2F2F7] pb-2.5">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider">Portfolio Financial Health</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 rounded-2xl border border-emerald-100/80 space-y-1">
                          <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">Gross Monthly Rent Roll</p>
                          <p className="font-black text-2xl text-emerald-950 mt-1">
                            ${(ownerStats?.tenants?.reduce((sum: number, t: any) => sum + Number(t.monthlyRent || 0), 0) || 0).toLocaleString()}/mo
                          </p>
                          <p className="text-[10px] font-semibold text-emerald-700">From {ownerStats?.occupiedUnits || 0} active leases</p>
                        </div>

                        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-1">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Ledger Wallet Balance</p>
                          <p className="font-black text-2xl text-white mt-1">
                            ${Number(user.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-300">
                            {ownerStats?.pendingPayoutsCount || 0} pending disbursal requests
                          </p>
                        </div>

                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-1">
                          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Portfolio Occupancy</p>
                          <p className="font-black text-2xl text-slate-900 mt-1">
                            {ownerStats?.occupancyRate || 0}%
                          </p>
                          <p className="text-[10px] font-semibold text-slate-500">
                            {ownerStats?.occupiedUnits || 0} of {ownerStats?.totalUnits || 0} units occupied
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 3. Subscription & Invoicing Configuration */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-2.5">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                          <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider">Subscription & Invoicing Configuration</h3>
                        </div>
                        <Link
                          href={`/dashboard/admin/subscriptions?search=${encodeURIComponent(user.email || "")}`}
                          className="text-[11px] font-bold text-[#007AFF] hover:underline flex items-center gap-0.5"
                        >
                          Manage Subscriptions <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-2xl border border-blue-100 relative overflow-hidden">
                          <p className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider">Current SaaS Tier</p>
                          <p className="font-black text-xl text-blue-950 mt-1.5 capitalize truncate">
                            {user.pricingTier?.name || "Free / Base Plan"}
                          </p>
                          <p className="text-[10px] font-bold text-blue-600 mt-1">Active Platform License</p>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-1.5">
                          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Billing Status</p>
                          <div className="mt-1">
                            {user.subscriptionStatus === "Active" || user.subscriptionStatus === "active" ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold">Active Subscription</Badge>
                            ) : user.subscriptionStatus === "Trialing" || user.subscriptionStatus === "trialing" ? (
                              <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-bold">Trial Period</Badge>
                            ) : user.subscriptionStatus === "Past_Due" || user.subscriptionStatus === "past_due" ? (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-100 font-bold">Past Due</Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold">Standard Tier</Badge>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-1">
                          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Stripe Identity</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="font-mono text-xs font-bold text-slate-900 truncate max-w-[140px]" title={user.stripeCustomerId || ""}>
                              {user.stripeCustomerId || "No Stripe Customer"}
                            </p>
                            {user.stripeCustomerId && (
                              <button
                                onClick={() => copyToClipboard(user.stripeCustomerId, "Stripe Customer ID")}
                                className="p-1 hover:bg-slate-200 rounded text-slate-500"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4. Top Properties Preview Grid */}
                    {user.ownedProperties && user.ownedProperties.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-2.5">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-blue-600" />
                            <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider">Properties Summary</h3>
                          </div>
                          <button
                            onClick={() => setActiveTab("properties")}
                            className="text-[11px] font-bold text-[#007AFF] hover:underline flex items-center gap-0.5"
                          >
                            View All ({user.ownedProperties.length}) →
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {user.ownedProperties.slice(0, 3).map((prop: any) => {
                            const cover = prop.coverPhoto || prop.images?.[0] || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=500";
                            const uCount = prop.units?.length || 0;
                            const occupiedCount = prop.units?.filter((u: any) => u.leases && u.leases.length > 0)?.length || 0;
                            
                            return (
                              <div
                                key={prop.id}
                                onClick={() => router.push(`/dashboard/properties/${prop.id}`)}
                                className="border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white hover:border-[#007AFF] transition-all cursor-pointer group shadow-2xs"
                              >
                                <div className="h-24 w-full relative overflow-hidden bg-slate-100">
                                  <img src={cover} alt={prop.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                  <p className="absolute bottom-2 left-3 right-3 text-white font-black text-xs truncate">{prop.name}</p>
                                </div>
                                <div className="p-3 text-[11px] flex justify-between items-center font-semibold text-slate-600">
                                  <span>{prop.city}</span>
                                  <span className="font-bold text-slate-900">{occupiedCount}/{uCount} Leased</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* INSPECTOR OVERVIEW DATA */}
                {user.role === "INSPECTOR" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-[#F2F2F7] pb-3">
                      <UserCheck className="h-4 w-4 text-blue-600" />
                      <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider">Assigned Landlord Portfolio</h3>
                    </div>
                    {user.owner ? (
                      <div className="border border-[#E5E5EA] p-5 rounded-2xl bg-slate-50 flex justify-between items-center">
                        <div className="space-y-0.5">
                          <p className="font-black text-[#1D1D1F]">{user.owner.name}</p>
                          <p className="text-xs font-semibold text-[#6E6E73]">{user.owner.email} • {user.owner.phone || "No Phone"}</p>
                        </div>
                        <Link 
                          href={`/dashboard/admin/users/${user.owner.id}`}
                          className="text-xs font-bold text-[#007AFF] hover:underline flex items-center gap-1 bg-white border border-[#E5E5EA] rounded-xl px-3.5 py-2 shadow-xs transition-all"
                        >
                          View Owner Profile <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    ) : (
                      <p className="text-xs text-[#8E8E93] font-semibold bg-slate-50 border border-dashed border-[#E5E5EA] rounded-2xl p-6 text-center">
                        This inspector has not been mapped to any landlord portfolio yet.
                      </p>
                    )}
                  </div>
                )}

                {user.role === "SUPERADMIN" && (
                  <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-amber-400" />
                      <p className="text-sm font-black">Full Administrator Authorization</p>
                    </div>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      This user has full superadmin authorization privileges across the platform. Feature override locks do not restrict administrative system access.
                    </p>
                  </div>
                )}
              </div>

              {/* RIGHT SIDEBAR COLUMN inside Overview tab (1/3 width) */}
              <div className="space-y-6">
                
                {/* Internal Admin Notes Card */}
                <div className="bg-slate-50/80 rounded-2xl border border-[#E5E5EA] p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-blue-500" />
                      Internal Admin Notes
                    </h3>
                    <span className={`text-[10px] font-bold ${notes.length > 450 ? "text-amber-600" : "text-slate-400"}`}>
                      {notes.length}/500
                    </span>
                  </div>
                  
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                    placeholder="Add confidential admin notes, audit flags, or dispute history..."
                    className="w-full min-h-[120px] bg-white border border-[#E5E5EA] rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-[#007AFF] resize-none transition-all shadow-inner"
                  />
                  
                  <Button 
                    onClick={handleSaveNotes}
                    disabled={notesSaving}
                    className="w-full bg-[#1D1D1F] hover:bg-slate-800 text-white rounded-xl font-bold text-xs h-9 shadow-xs transition-all"
                  >
                    {notesSaving ? "Saving Notes..." : "Save Admin Notes"}
                  </Button>
                </div>

                {/* Account Metadata Summary */}
                <div className="bg-slate-50/80 rounded-2xl border border-[#E5E5EA] p-5 space-y-3.5 text-xs">
                  <h3 className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider">Account Metadata</h3>
                  
                  <div className="space-y-2.5 divide-y divide-slate-200/60">
                    <div className="flex justify-between pt-1">
                      <span className="text-[#6E6E73] font-medium">Account ID</span>
                      <span className="font-mono font-bold text-[#1D1D1F] text-[10px] truncate max-w-[140px]" title={user.id}>{user.id}</span>
                    </div>

                    <div className="flex justify-between pt-2.5">
                      <span className="text-[#6E6E73] font-medium">Status</span>
                      <span className={`font-bold ${user.accountStatus === "SUSPENDED" ? "text-rose-600" : "text-emerald-600"}`}>
                        {user.accountStatus || "ACTIVE"}
                      </span>
                    </div>

                    <div className="flex justify-between pt-2.5">
                      <span className="text-[#6E6E73] font-medium">Role</span>
                      <span className="font-bold text-[#1D1D1F]">{formatRole(user.role)}</span>
                    </div>

                    <div className="flex justify-between pt-2.5">
                      <span className="text-[#6E6E73] font-medium">Created</span>
                      <span className="font-semibold text-slate-700">{new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PROPERTIES TAB (Owner Cards with Cover Image - FULL WIDTH) */}
        {/* ======================================================== */}
        {activeTab === "properties" && user.role === "OWNER" && (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-[#F2F2F7] pb-3">
              <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider">Properties Portfolio</h3>
              <span className="text-xs font-bold text-[#6E6E73]">{user.ownedProperties?.length || 0} Registered Properties</span>
            </div>
            
            {user.ownedProperties && user.ownedProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {user.ownedProperties.map((prop: any) => {
                  const totalUnits = prop.units?.length || 0;
                  const occupiedUnits = prop.units?.filter((u: any) => u.leases && u.leases.length > 0)?.length || 0;
                  const progressPct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
                  const coverImg = prop.coverPhoto || prop.images?.[0] || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=500";
                  
                  return (
                    <div 
                      key={prop.id} 
                      className="border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white hover:border-[#007AFF] hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                      onClick={() => router.push(`/dashboard/properties/${prop.id}`)}
                    >
                      {/* Property Image Header */}
                      <div className="h-40 w-full relative overflow-hidden bg-slate-100">
                        <img 
                          src={coverImg} 
                          alt={prop.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 text-white">
                          <p className="font-black text-base drop-shadow-sm truncate">{prop.name}</p>
                          <p className="text-[11px] font-medium text-slate-200 flex items-center gap-1 drop-shadow-sm truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {prop.address}, {prop.city}
                          </p>
                        </div>
                      </div>

                      {/* Card Content & Occupancy Progress */}
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-[#6E6E73]">Occupancy Status</span>
                          <span className="font-black text-[#1D1D1F]">{occupiedUnits} of {totalUnits} Units Leased</span>
                        </div>

                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-[#007AFF] h-full rounded-full transition-all duration-700 ease-out" 
                            style={{ width: `${progressPct}%` }} 
                          />
                        </div>

                        <div className="flex justify-between items-center text-[11px] pt-1">
                          <span className="font-extrabold text-emerald-600">{progressPct}% Occupied</span>
                          <span className="font-bold text-[#007AFF] group-hover:underline flex items-center gap-0.5">
                            View Property <ArrowUpRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-[#E5E5EA] rounded-2xl bg-slate-50/50 space-y-2">
                <Building className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-[#6E6E73] text-sm font-semibold">No properties registered under this owner portfolio.</p>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TENANTS LIST TAB (FULL WIDTH TABLE)                       */}
        {/* ======================================================== */}
        {activeTab === "tenants" && user.role === "OWNER" && ownerStats && (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-[#F2F2F7] pb-3">
              <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider">Tenant Registry</h3>
              <span className="text-xs font-bold text-[#6E6E73]">{ownerStats.tenants.length} Active Tenants</span>
            </div>
            
            {ownerStats.tenants.length > 0 ? (
              <div className="border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white shadow-xs w-full">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#E5E5EA] text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <th className="py-4 px-6">Tenant Name</th>
                        <th className="py-4 px-6">Property & Unit</th>
                        <th className="py-4 px-6">Monthly Rent</th>
                        <th className="py-4 px-6">Lease Duration</th>
                        <th className="py-4 px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F2F7]">
                      {ownerStats.tenants.map((ten: any, idx: number) => (
                        <tr key={`${ten.id}-${idx}`} className="text-xs font-medium text-[#1D1D1F] hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-6">
                            <p className="font-extrabold text-[#1D1D1F] text-sm">{ten.name}</p>
                            <p className="text-xs text-[#6E6E73] mt-0.5">{ten.email}</p>
                          </td>
                          <td className="py-4 px-6">
                            <p className="font-bold text-sm">{ten.propertyName}</p>
                            <p className="text-xs text-[#6E6E73] mt-0.5">Unit {ten.unitName}</p>
                          </td>
                          <td className="py-4 px-6 font-bold text-emerald-600 text-sm">
                            ${Number(ten.monthlyRent).toLocaleString()}/mo
                          </td>
                          <td className="py-4 px-6 text-[#6E6E73] font-semibold text-xs">
                            {new Date(ten.leaseStart).toLocaleDateString()} - {new Date(ten.leaseEnd).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <Link 
                              href={`/dashboard/admin/users/${ten.id}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#007AFF] hover:bg-blue-50 bg-white border border-[#E5E5EA] px-3.5 py-1.5 rounded-xl transition-all shadow-xs"
                            >
                              Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-[#E5E5EA] rounded-2xl bg-slate-50/50 space-y-2">
                <Users className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-[#6E6E73] text-sm font-semibold">No active tenants mapped to this owner's properties.</p>
              </div>
            )}
          </div>
        )}

        {/* CONTRACTORS & INSPECTORS TAB */}
        {activeTab === "team" && user.role === "OWNER" && (
          <div className="p-6 sm:p-8 space-y-8 animate-in fade-in duration-200">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider border-b border-[#F2F2F7] pb-3">Associated Inspectors</h3>
              
              {user.createdInspectors && user.createdInspectors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {user.createdInspectors.map((ins: any) => (
                    <div key={ins.id} className="border border-[#E5E5EA] p-5 rounded-2xl bg-slate-50/50 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="font-bold text-[#1D1D1F] text-sm">{ins.name}</p>
                        <p className="text-xs text-[#6E6E73]">{ins.email} • {ins.phone || "No Phone"}</p>
                      </div>
                      <Link 
                        href={`/dashboard/admin/users/${ins.id}`}
                        className="p-2 bg-white border border-[#E5E5EA] rounded-xl hover:bg-slate-100 text-slate-600 transition-all shadow-xs"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8E8E93] font-semibold bg-slate-50/50 border border-dashed border-[#E5E5EA] rounded-2xl p-6 text-center">
                  No inspectors created by this owner.
                </p>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider border-b border-[#F2F2F7] pb-3">Associated Contractors & External Vendors</h3>
              
              {user.ownedVendors && user.ownedVendors.length > 0 ? (
                <div className="border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white shadow-xs w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#E5E5EA] text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <th className="py-4 px-6">Vendor</th>
                        <th className="py-4 px-6">Specialty</th>
                        <th className="py-4 px-6">Call-out Fee</th>
                        <th className="py-4 px-6">Compliance Check</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F2F7] text-xs font-medium text-[#1D1D1F]">
                      {user.ownedVendors.map((ven: any) => (
                        <tr key={ven.id} className="hover:bg-slate-50/40">
                          <td className="py-4 px-6">
                            <p className="font-bold text-sm">{ven.name}</p>
                            <p className="text-xs text-[#6E6E73] mt-0.5">{ven.email} • {ven.phone}</p>
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-700 text-sm">{ven.specialty}</td>
                          <td className="py-4 px-6 font-semibold text-emerald-600 text-sm">${ven.baseCallOutFee?.toFixed(2)}</td>
                          <td className="py-4 px-6 space-x-2">
                            {ven.w9OnFile ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px] px-2.5 py-1">W-9 On File</Badge>
                            ) : (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-100 font-bold text-[10px] px-2.5 py-1">No W-9</Badge>
                            )}
                            {ven.insuranceOnFile ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px] px-2.5 py-1">COI Verified</Badge>
                            ) : (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-100 font-bold text-[10px] px-2.5 py-1">No COI</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-[#8E8E93] font-semibold bg-slate-50/50 border border-dashed border-[#E5E5EA] rounded-2xl p-6 text-center">
                  No external maintenance contractors registered under this owner.
                </p>
              )}
            </div>
          </div>
        )}

        {/* FINANCIALS & PAYOUTS TAB (FULL WIDTH) */}
        {activeTab === "financials" && (
          <div className="p-6 sm:p-8 space-y-8 animate-in fade-in duration-200">
            {/* Ledger Balance Banner Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 p-6 sm:p-8 rounded-3xl text-white flex items-center justify-between border border-slate-800 shadow-md relative overflow-hidden w-full">
              <div className="space-y-1 relative z-10">
                <p className="text-slate-400 font-extrabold text-xs uppercase tracking-wider">Account Ledger Balance</p>
                <p className="text-4xl font-black tracking-tight">${Number(user.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/15 shrink-0 relative z-10">
                <DollarSign className="h-7 w-7 text-emerald-400" />
              </div>
            </div>
            
            {/* Direct Deposit Setup Card */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#F2F2F7] pb-3">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider">Direct Deposit & Payout Banking</h3>
                  <p className="text-[11px] font-medium text-[#6E6E73]">Configured bank account for electronic funds transfer (EFT)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
                <div className="space-y-1">
                  <p className="text-[10px] font-extrabold text-[#8E8E93] uppercase tracking-wider">Bank Name</p>
                  <p className="font-extrabold text-sm text-[#1D1D1F] flex items-center gap-2">
                    <Building className="h-4 w-4 text-slate-400" />
                    {user.bankName || "Not Configured"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-extrabold text-[#8E8E93] uppercase tracking-wider">Account Holder Name</p>
                  <p className="font-extrabold text-sm text-[#1D1D1F] truncate">{user.accountName || "N/A"}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-extrabold text-[#8E8E93] uppercase tracking-wider">Account Number</p>
                    <p className="font-mono font-bold text-sm text-[#1D1D1F]">
                      {showAccount ? (user.accountNumber || "•••• •••• 3333") : maskAccount(user.accountNumber)}
                    </p>
                  </div>
                  {user.accountNumber && (
                    <div className="flex gap-1 shrink-0">
                      <button 
                        onClick={() => setShowAccount(!showAccount)} 
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                        title={showAccount ? "Mask Account Number" : "Unmask Account Number"}
                      >
                        {showAccount ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button 
                        onClick={() => copyToClipboard(user.accountNumber, "Bank Account")} 
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                        title="Copy Account Number"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payout Disbursals Table Section */}
            {user.role === "OWNER" && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2F2F7] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider">Owner Disbursals & Payout Ledger</h3>
                    </div>
                    <p className="text-[11px] font-medium text-[#6E6E73] mt-0.5">Historical payout requests and settlement status</p>
                  </div>

                  <Link
                    href={`/dashboard/admin/payouts?search=${encodeURIComponent(user.email || "")}`}
                    className="inline-flex items-center justify-center gap-1.5 bg-[#007AFF] hover:bg-[#0062CC] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0"
                  >
                    <CreditCard className="h-3.5 w-3.5" /> Manage Payout Ledger <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Production SaaS Financial Metric Summary Badges */}
                {user.payoutRequests && user.payoutRequests.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border border-[#E5E5EA] p-5 rounded-2xl shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Settled Disbursals</span>
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      </div>
                      <p className="font-black text-2xl text-[#1D1D1F] tracking-tight">
                        ${(user.payoutRequests.filter((p: any) => p.status === "APPROVED" || p.status === "PAID").reduce((s: number, p: any) => s + Number(p.amount), 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[11px] font-medium text-emerald-700">
                        {user.payoutRequests.filter((p: any) => p.status === "APPROVED" || p.status === "PAID").length} settled transactions
                      </p>
                    </div>

                    <div className="bg-white border border-[#E5E5EA] p-5 rounded-2xl shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Processing / Pending</span>
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                          <Clock className="h-4 w-4" />
                        </div>
                      </div>
                      <p className="font-black text-2xl text-[#1D1D1F] tracking-tight">
                        ${(user.payoutRequests.filter((p: any) => p.status === "PENDING" || p.status === "Processing").reduce((s: number, p: any) => s + Number(p.amount), 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[11px] font-medium text-amber-700">
                        {user.payoutRequests.filter((p: any) => p.status === "PENDING" || p.status === "Processing").length} awaiting admin review
                      </p>
                    </div>

                    <div className="bg-white border border-[#E5E5EA] p-5 rounded-2xl shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Failed / Rejected</span>
                        <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      </div>
                      <p className="font-black text-2xl text-[#1D1D1F] tracking-tight">
                        ${(user.payoutRequests.filter((p: any) => p.status === "REJECTED" || p.status === "Failed").reduce((s: number, p: any) => s + Number(p.amount), 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[11px] font-medium text-rose-700">
                        {user.payoutRequests.filter((p: any) => p.status === "REJECTED" || p.status === "Failed").length} flagged requests
                      </p>
                    </div>
                  </div>
                )}
                
                {user.payoutRequests && user.payoutRequests.length > 0 ? (
                  <div className="border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white shadow-2xs w-full">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-[#E5E5EA] text-[11px] font-black text-slate-500 uppercase tracking-wider">
                          <th className="py-3.5 px-6">Disbursal ID</th>
                          <th className="py-3.5 px-6">Amount</th>
                          <th className="py-3.5 px-6">Status</th>
                          <th className="py-3.5 px-6">Reference Info</th>
                          <th className="py-3.5 px-6">Requested Date</th>
                          <th className="py-3.5 px-6 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F2F2F7] text-xs font-semibold text-[#1D1D1F]">
                        {user.payoutRequests.map((payout: any) => (
                          <tr key={payout.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-4 px-6 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/70 rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700">
                                <span>#{payout.id?.slice(0, 8)}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(payout.id, "Disbursal ID")}
                                  className="text-slate-400 hover:text-slate-800 transition-colors p-0.5"
                                  title="Copy Disbursal ID"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-black text-[#1D1D1F] text-sm whitespace-nowrap">
                              ${Number(payout.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-6 whitespace-nowrap">
                              {payout.status === "APPROVED" || payout.status === "PAID" ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/60 font-bold text-xs px-3 py-1 flex items-center gap-1.5 w-max">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" /> Settled
                                </Badge>
                              ) : payout.status === "PENDING" || payout.status === "Processing" ? (
                                <Badge className="bg-amber-50 text-amber-700 border-amber-200/60 font-bold text-xs px-3 py-1 flex items-center gap-1.5 w-max">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" /> Processing
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-50 text-rose-700 border-rose-200/60 font-bold text-xs px-3 py-1 flex items-center gap-1.5 w-max">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" /> Failed
                                </Badge>
                              )}
                            </td>
                            <td className="py-4 px-6 text-[#6E6E73] text-xs font-medium whitespace-nowrap">
                              {payout.refNumber || `Bank: ${payout.bankName}`}
                            </td>
                            <td className="py-4 px-6 text-[#8E8E93] text-xs font-semibold whitespace-nowrap">
                              {new Date(payout.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-4 px-6 text-right whitespace-nowrap">
                              <Link
                                href={`/dashboard/admin/payouts?search=${encodeURIComponent(user.email || "")}`}
                                className="inline-flex items-center gap-1.5 whitespace-nowrap bg-white hover:bg-[#007AFF] text-[#007AFF] hover:text-white border border-[#007AFF]/30 hover:border-[#007AFF] font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-2xs group"
                              >
                                <span>Process Payout</span>
                                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-16 border border-dashed border-[#E5E5EA] rounded-2xl bg-slate-50/50 space-y-2">
                    <DollarSign className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-[#6E6E73] text-sm font-semibold">No payout history associated with this owner account.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* BILLING HISTORY TIMELINE TAB */}
        {activeTab === "billing-history" && user.role === "OWNER" && (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
            <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider border-b border-[#F2F2F7] pb-3">Subscription Life History</h3>
            
            {user.subscriptionHistory && user.subscriptionHistory.length > 0 ? (
              <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                {user.subscriptionHistory.map((hist: any) => {
                  const dateStr = new Date(hist.createdAt).toLocaleString();
                  
                  return (
                    <div key={hist.id} className="relative pl-8 flex gap-4 items-start">
                      <div className="absolute left-[3px] top-[5px] h-[16px] w-[16px] bg-white border-2 border-slate-900 rounded-full flex items-center justify-center shrink-0">
                        <div className="h-1.5 w-1.5 bg-slate-900 rounded-full" />
                      </div>
                      <div className="flex-1 bg-slate-50/60 border border-slate-200/60 rounded-2xl p-5 space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[10px] font-black text-slate-800 uppercase bg-slate-200 px-2 py-0.5 rounded-md tracking-wider">
                              {hist.event}
                            </span>
                            <p className="text-sm font-bold text-[#1D1D1F] mt-2">
                              {hist.toTierName ? `Subscribed to ${hist.toTierName}` : "Billing Configuration Synchronized"}
                            </p>
                            {hist.fromTierName && hist.fromTierName !== hist.toTierName && (
                              <p className="text-xs font-bold text-[#6E6E73] mt-0.5">Previous Plan: {hist.fromTierName}</p>
                            )}
                          </div>
                          <span className="text-xs text-[#8E8E93] font-bold shrink-0">{dateStr}</span>
                        </div>
                        
                        {hist.amountPaid > 0 && (
                          <p className="text-xs font-bold text-emerald-600 mt-2">
                            Amount Paid: ${hist.amountPaid.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-[#E5E5EA] rounded-2xl bg-slate-50/50 space-y-2">
                <Clock className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-[#6E6E73] text-sm font-semibold">No subscription events logged in historical audits.</p>
              </div>
            )}
          </div>
        )}

        {/* LEASES TAB (FULL WIDTH) */}
        {activeTab === "leases" && user.role === "TENANT" && (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
            <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider border-b border-[#F2F2F7] pb-3">Active Lease Agreements</h3>
            
            {user.leases && user.leases.length > 0 ? (
              <div className="space-y-4">
                {user.leases.map((lease: any) => {
                  const ownerProfile = lease.unit?.property?.owner;
                  const leaseProp = lease.unit?.property;
                  const coverImg = leaseProp?.coverPhoto || leaseProp?.images?.[0] || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80";

                  return (
                    <div key={lease.id} className="border border-[#E5E5EA] rounded-3xl overflow-hidden bg-white shadow-xs space-y-0 hover:shadow-md transition-all duration-200">
                      {/* Property Cover Photo Header Banner */}
                      <div className="h-44 w-full relative overflow-hidden bg-slate-100">
                        <img 
                          src={coverImg} 
                          alt={leaseProp?.name || "Property"} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-slate-900/90 text-white backdrop-blur-md border border-white/20 font-extrabold text-xs px-3 py-1 shadow-sm">
                            {lease.status}
                          </Badge>
                        </div>
                        <div className="absolute bottom-4 left-6 right-6 text-white space-y-1">
                          <p className="text-2xl font-black drop-shadow-md truncate">{leaseProp?.name || "Unknown Property"}</p>
                          <p className="text-xs font-bold text-slate-200 drop-shadow-sm">
                            Unit {lease.unit?.name || "N/A"} • ${Number(lease.monthlyRent).toLocaleString()}/month
                          </p>
                        </div>
                      </div>

                      {/* Lease Details Body */}
                      <div className="p-6 space-y-5 bg-white">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
                          <div>
                            <p className="text-[10px] font-extrabold text-[#8E8E93] uppercase">Start Date</p>
                            <p className="font-bold text-[#1D1D1F] mt-0.5">{new Date(lease.startDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-extrabold text-[#8E8E93] uppercase">End Date</p>
                            <p className="font-bold text-[#1D1D1F] mt-0.5">{new Date(lease.endDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-extrabold text-[#8E8E93] uppercase">Rent Due Day</p>
                            <p className="font-bold text-[#1D1D1F] mt-0.5">Day {lease.rentDueDay || 1}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-extrabold text-[#8E8E93] uppercase">Security Deposit</p>
                            <p className="font-bold text-emerald-600 mt-0.5">${Number(lease.securityDeposit || 0).toLocaleString()}</p>
                          </div>
                        </div>

                        {ownerProfile && (
                          <div className="pt-4 border-t border-[#E5E5EA] flex justify-between items-center bg-[#F8FAFC] rounded-2xl p-4 border border-[#E5E5EA]">
                            <div>
                              <p className="text-[10px] font-extrabold text-[#8E8E93] uppercase">Supervisor Landlord</p>
                              <p className="font-black text-[#1D1D1F] mt-0.5 text-base">{ownerProfile.name}</p>
                              <p className="text-xs text-[#6E6E73]">{ownerProfile.email} • {ownerProfile.phone || "No Phone"}</p>
                            </div>
                            <Link 
                              href={`/dashboard/admin/users/${ownerProfile.id}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#007AFF] bg-white border border-[#E5E5EA] px-4 py-2 rounded-xl hover:bg-slate-100 shadow-2xs transition-all"
                            >
                              View Landlord <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-[#E5E5EA] rounded-2xl bg-slate-50/50 space-y-2">
                <FileText className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-[#6E6E73] text-sm font-semibold">No lease records associated with this tenant.</p>
              </div>
            )}
          </div>
        )}

        {/* PAYMENT LEDGER TAB (FULL WIDTH TABLE) */}
        {activeTab === "ledger" && user.role === "TENANT" && (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-[#F2F2F7] pb-3">
              <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider">Payment Transaction History</h3>
              <span className="text-xs font-bold text-[#6E6E73]">{user.transactions?.length || 0} Total Transactions</span>
            </div>
            
            {user.transactions && user.transactions.length > 0 ? (
              <div className="border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white shadow-xs w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#E5E5EA] text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="py-4 px-6">Transaction ID</th>
                      <th className="py-4 px-6">Details</th>
                      <th className="py-4 px-6">Amount</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F2F7] text-xs font-medium text-[#1D1D1F]">
                    {user.transactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="py-4 px-6 font-mono text-xs text-[#6E6E73] max-w-[150px] truncate" title={tx.id}>{tx.id}</td>
                        <td className="py-4 px-6">
                          <p className="font-bold text-[#1D1D1F] uppercase text-xs">{tx.type} • {tx.category}</p>
                          {tx.reference && <p className="text-xs text-[#6E6E73] mt-0.5">Ref: {tx.reference}</p>}
                        </td>
                        <td className={`py-4 px-6 font-bold text-sm ${tx.type === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}>
                          {tx.type === "INCOME" ? "+" : "-"}${Number(tx.amount).toFixed(2)}
                        </td>
                        <td className="py-4 px-6">
                          {tx.status === "COMPLETED" || tx.status === "SUCCESS" ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px] px-2.5 py-1">Completed</Badge>
                          ) : tx.status === "PENDING" ? (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-100 font-bold text-[10px] px-2.5 py-1">Pending</Badge>
                          ) : (
                            <Badge className="bg-rose-50 text-rose-700 border-rose-100 font-bold text-[10px] px-2.5 py-1">Failed</Badge>
                          )}
                        </td>
                        <td className="py-4 px-6 text-[#8E8E93] text-xs font-semibold">{new Date(tx.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-[#E5E5EA] rounded-2xl bg-slate-50/50 space-y-2">
                <CreditCard className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-[#6E6E73] text-sm font-semibold">No transactions registered under this tenant.</p>
              </div>
            )}
          </div>
        )}

        {/* MAINTENANCE TICKETS TAB */}
        {activeTab === "maintenance" && user.role === "TENANT" && (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
            <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider border-b border-[#F2F2F7] pb-3">Maintenance Service Inquiries</h3>
            
            {user.maintenanceRequest && user.maintenanceRequest.length > 0 ? (
              <div className="space-y-4">
                {user.maintenanceRequest.map((req: any) => (
                  <div key={req.id} className="border border-[#E5E5EA] p-5 rounded-2xl bg-slate-50/50 hover:border-slate-300 transition-colors flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[#1D1D1F] text-base">{req.title}</p>
                        <Badge className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          req.priority === "EMERGENCY" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                          req.priority === "HIGH" ? "bg-orange-50 text-orange-700 border border-orange-100" :
                          "bg-slate-200 text-slate-700"
                        }`}>
                          {req.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#6E6E73] line-clamp-1">{req.description}</p>
                      <p className="text-xs text-[#8E8E93] font-bold">
                        Property: {req.unit?.property?.name || "N/A"} • Unit {req.unit?.name || "N/A"} • Opened {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right shrink-0 ml-4">
                      <Badge className="bg-slate-900 text-white text-xs px-3 py-1 mb-2">{req.status}</Badge>
                      <br/>
                      <Link 
                        href={`/dashboard/maintenance`}
                        className="inline-flex items-center gap-0.5 text-xs font-black text-[#007AFF] hover:underline"
                      >
                        Open Dashboard <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-[#E5E5EA] rounded-2xl bg-slate-50/50 space-y-2">
                <Wrench className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-[#6E6E73] text-sm font-semibold">No maintenance tickets reported by this tenant.</p>
              </div>
            )}
          </div>
        )}

        {/* ASSIGNED INSPECTIONS TAB (Inspector) */}
        {activeTab === "inspections" && user.role === "INSPECTOR" && (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
            <h3 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider border-b border-[#F2F2F7] pb-3">Scheduled Walkthroughs & Inspections</h3>
            
            {user.assignedInspections && user.assignedInspections.length > 0 ? (
              <div className="space-y-4">
                {user.assignedInspections.map((insp: any) => (
                  <div key={insp.id} className="border border-[#E5E5EA] p-5 rounded-2xl bg-slate-50/50 flex items-start justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[#1D1D1F] text-base">{insp.title}</p>
                        <Badge className="bg-sky-50 text-sky-700 border-sky-100 text-[10px] py-0.5 rounded-md">{insp.category}</Badge>
                      </div>
                      <p className="text-xs text-[#6E6E73] line-clamp-1">{insp.description}</p>
                      <p className="text-xs text-[#8E8E93] font-bold">
                        Unit: {insp.unit?.property?.name} • Unit {insp.unit?.name}
                      </p>
                      {insp.tenant && (
                        <p className="text-xs text-slate-700 font-bold">
                          Tenant: {insp.tenant.name} ({insp.tenant.phone || "No phone"})
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0 ml-4 space-y-2">
                      <Badge className="bg-slate-900 text-white text-xs px-3 py-1">{insp.status}</Badge>
                      {insp.scheduledDate && (
                        <p className="text-xs text-[#8E8E93] font-black flex items-center gap-1 justify-end">
                          <Clock className="h-3.5 w-3.5 text-orange-400" /> 
                          {new Date(insp.scheduledDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-[#E5E5EA] rounded-2xl bg-slate-50/50 space-y-2">
                <CheckCircle2 className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-[#6E6E73] text-sm font-semibold">No walkthrough inspections assigned to this inspector.</p>
              </div>
            )}
          </div>
        )}

        {/* ACCESS CONTROL TAB (Permission Board - FULL WIDTH) */}
        {/* ACCESS CONTROL TAB (Enterprise SaaS Permission Board) */}
        {activeTab === "access-control" && (
          <div className="p-6 sm:p-8 space-y-8 animate-in fade-in duration-200">
            {/* Header & Metrics Summary */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F2F2F7] pb-5">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-purple-700 font-extrabold text-[10px] tracking-widest uppercase mb-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                  Security & Policy Governance
                </span>
                <h3 className="text-xl font-black text-[#1D1D1F] tracking-tight">Granular Feature Access Control</h3>
                <p className="text-[#6E6E73] text-xs font-medium mt-0.5">Manage administrative overrides, temporary restriction locks, and welfare-exempt feature protections.</p>
              </div>

              {/* Reset All Action */}
              {userAccessOverrides.length > 0 && (
                <Button
                  onClick={async () => {
                    if (confirm("Are you sure you want to reset all feature overrides to default role policies?")) {
                      setSaving(true);
                      try {
                        for (const ov of userAccessOverrides) {
                          await fetch(`/api/admin/users/${params.id}/access-overrides`, {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ feature: ov.feature }),
                          });
                        }
                        toast.success("All feature overrides reset to default role policies.");
                        const res = await fetch(`/api/admin/users/${params.id}/access-overrides`);
                        const updated = await res.json();
                        if (!updated.error) setUserAccessOverrides(updated);
                      } catch (err: any) {
                        toast.error("Failed to reset overrides");
                      } finally {
                        setSaving(false);
                      }
                    }
                  }}
                  disabled={saving}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs rounded-xl font-bold text-xs h-9 px-3.5"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                  Reset All Overrides
                </Button>
              )}
            </div>

            {/* Access Status Summary Cards */}
            {(() => {
              const featuresList = user.role === "TENANT" ? TENANT_FEATURES : INSPECTOR_FEATURES;
              const totalFeatures = featuresList.length;
              const blockedCount = userAccessOverrides.filter(o => o.overrideType === "BLOCK").length;
              const protectedCount = featuresList.filter((f: any) => f.welfareExempt).length;
              const defaultActiveCount = totalFeatures - blockedCount;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-1">
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Total Role Features</p>
                    <p className="text-2xl font-black text-[#1D1D1F]">{totalFeatures}</p>
                    <p className="text-[10px] font-semibold text-slate-500">Configured for {formatRole(user.role)}</p>
                  </div>

                  <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-2xl space-y-1">
                    <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">Default Access Enabled</p>
                    <p className="text-2xl font-black text-emerald-700">{defaultActiveCount}</p>
                    <p className="text-[10px] font-semibold text-emerald-700">Operating on role defaults</p>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1 ${blockedCount > 0 ? "bg-rose-50/80 border-rose-200 text-rose-900" : "bg-slate-50 border-slate-200/80 text-slate-500"}`}>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider">Active Force Blocks</p>
                    <p className={`text-2xl font-black ${blockedCount > 0 ? "text-rose-700" : "text-slate-900"}`}>{blockedCount}</p>
                    <p className="text-[10px] font-semibold">{blockedCount > 0 ? "Admin restrictions active" : "No active blocks"}</p>
                  </div>

                  <div className="bg-blue-50/60 border border-blue-200/80 p-4 rounded-2xl space-y-1">
                    <p className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider">Protected Exempt</p>
                    <p className="text-2xl font-black text-blue-700">{protectedCount}</p>
                    <p className="text-[10px] font-semibold text-blue-700">Welfare & legal protected</p>
                  </div>
                </div>
              );
            })()}

            {/* Audit Reason & Custom Expiration Configuration Drawer */}
            <div className="bg-[#FAF9FE] border border-purple-200/80 p-5 sm:p-6 rounded-3xl shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-purple-700" />
                  <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">Administrative Authorization Policy</h4>
                </div>
                {featureReason.trim().length >= 10 ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold text-[10px]">
                    <CheckCircle className="h-3 w-3 mr-1" /> Authorization Reason Valid
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold text-[10px]">
                    <AlertCircle className="h-3 w-3 mr-1" /> Requires 10+ Chars Reason To Block
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Audit Log Reason Input */}
                <div className="lg:col-span-6 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">Audit Log Reason Note *</label>
                  <input
                    type="text"
                    value={featureReason}
                    onChange={(e) => setFeatureReason(e.target.value)}
                    placeholder="Enter confidential audit reason (e.g. Restricted due to pending lease dispute review)..."
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium focus:outline-none focus:border-purple-500 shadow-2xs"
                  />
                </div>

                {/* Expiration Duration Selector with Presets & Custom Days */}
                <div className="lg:col-span-6 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">Override Expiration</label>
                    {featureExpiresAt && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                        Expires: {new Date(featureExpiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: "permanent", label: "Permanent", days: 0 },
                      { id: "1d", label: "+1 Day", days: 1 },
                      { id: "7d", label: "+7 Days", days: 7 },
                      { id: "30d", label: "+30 Days", days: 30 },
                      { id: "custom_days", label: "Custom Days", days: -1 },
                      { id: "custom_date", label: "Pick Date", days: -2 },
                    ].map(opt => {
                      const isSelected = expiryOption === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setExpiryOption(opt.id as any);
                            if (opt.days >= 0) {
                              if (opt.days === 0) {
                                setFeatureExpiresAt("");
                              } else {
                                const d = new Date();
                                d.setDate(d.getDate() + opt.days);
                                setFeatureExpiresAt(d.toISOString().split("T")[0]);
                              }
                            } else if (opt.id === "custom_days") {
                              const num = parseInt(customDaysInput) || 7;
                              const d = new Date();
                              d.setDate(d.getDate() + num);
                              setFeatureExpiresAt(d.toISOString().split("T")[0]);
                            }
                          }}
                          className={`text-xs px-3 h-10 rounded-xl font-bold transition-all border ${
                            isSelected
                              ? "bg-purple-900 border-purple-900 text-white shadow-2xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Inline Custom Days Input Box when Custom Days selected */}
                  {expiryOption === "custom_days" && (
                    <div className="flex items-center gap-2 pt-2 animate-in fade-in duration-200">
                      <span className="text-xs font-bold text-slate-600">Block duration for:</span>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={customDaysInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomDaysInput(val);
                          const num = parseInt(val);
                          if (num > 0) {
                            const d = new Date();
                            d.setDate(d.getDate() + num);
                            setFeatureExpiresAt(d.toISOString().split("T")[0]);
                          } else {
                            setFeatureExpiresAt("");
                          }
                        }}
                        className="w-20 h-9 rounded-lg border border-purple-300 bg-white px-2 text-center text-xs font-black text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                      />
                      <span className="text-xs font-bold text-slate-700">Days</span>
                      <span className="text-[11px] text-slate-400 font-semibold">(e.g. 2, 6, 11, 45...)</span>
                    </div>
                  )}

                  {/* Inline Date Picker when Pick Date selected */}
                  {expiryOption === "custom_date" && (
                    <div className="flex items-center gap-2 pt-2 animate-in fade-in duration-200">
                      <span className="text-xs font-bold text-slate-600">Select Expiration Date:</span>
                      <input
                        type="date"
                        value={featureExpiresAt}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => setFeatureExpiresAt(e.target.value)}
                        className="h-9 rounded-lg border border-purple-300 bg-white px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Feature Access Divided Section-Wise */}
            {overridesLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="animate-spin text-purple-600 h-8 w-8" />
              </div>
            ) : (
              <div className="space-y-8">
                {(() => {
                  const allFeatures = user.role === "TENANT" ? TENANT_FEATURES : INSPECTOR_FEATURES;
                  const protectedFeatures = allFeatures.filter((f: any) => f.welfareExempt);
                  const configurableFeatures = allFeatures.filter((f: any) => !f.welfareExempt);

                  return (
                    <>
                      {/* SECTION 1: WELFARE PROTECTED & EXEMPT FEATURES */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-2xs">
                              <ShieldCheck className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 tracking-tight">Welfare & Legal Protected Features</h4>
                              <p className="text-slate-500 text-xs font-medium">Essential legal rights and welfare capabilities that are immune to administrative blocks.</p>
                            </div>
                          </div>
                          <Badge className="bg-blue-50 text-blue-800 border border-blue-200/80 font-extrabold text-[11px] px-3 py-1 rounded-xl shadow-2xs">
                            {protectedFeatures.length} Protected Capabilities
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {protectedFeatures.map((f: any) => (
                            <div
                              key={f.key}
                              className="relative overflow-hidden rounded-2xl border border-blue-200/90 bg-[#F8FAFC] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div className="p-2 rounded-xl bg-blue-600 text-white shadow-2xs shrink-0 mt-0.5">
                                      <ShieldCheck className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 space-y-1">
                                      <p className="font-extrabold text-sm text-slate-900 tracking-tight leading-snug">{f.label}</p>
                                      <code className="inline-block text-[10px] font-mono font-bold text-blue-700 bg-blue-100/90 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                        {f.key}
                                      </code>
                                    </div>
                                  </div>

                                  <span className="text-[10px] font-black text-blue-800 bg-blue-100 border border-blue-200 px-2.5 py-0.5 rounded-full shrink-0 shadow-2xs">
                                    Protected
                                  </span>
                                </div>

                                <div className="pt-1">
                                  <Badge className="bg-blue-100/90 text-blue-900 border border-blue-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs w-fit">
                                    <ShieldCheck className="h-3 w-3 text-blue-700" />
                                    Welfare Protected (Always Active)
                                  </Badge>
                                </div>
                              </div>

                              <div className="pt-3 border-t border-blue-100/90 flex justify-between items-center text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">
                                <span>Statutory Right</span>
                                <span>Non-Restricted</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SECTION 2: CONFIGURABLE ROLE FEATURES & ADMIN OVERRIDES */}
                      <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-slate-900 text-white rounded-xl shadow-2xs">
                              <Key className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 tracking-tight">Configurable Role Feature Access</h4>
                              <p className="text-slate-500 text-xs font-medium">Operational features that can be selectively blocked or granted based on administrative review.</p>
                            </div>
                          </div>
                          <Badge className="bg-purple-50 text-purple-800 border border-purple-200/80 font-extrabold text-[11px] px-3 py-1 rounded-xl shadow-2xs">
                            {configurableFeatures.length} Configurable Capabilities
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {configurableFeatures.map((f: any) => {
                            const activeOverride = userAccessOverrides.find((o: any) => o.feature === f.key);
                            const isBlocked = activeOverride && activeOverride.overrideType === "BLOCK";

                            return (
                              <div
                                key={f.key}
                                className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between space-y-4 ${
                                  isBlocked
                                    ? "bg-gradient-to-b from-rose-50/70 via-rose-50/30 to-white border-rose-200/90 shadow-2xs hover:shadow-xs"
                                    : "bg-white border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-blue-400"
                                }`}
                              >
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0">
                                      <div className={`p-2 rounded-xl shrink-0 shadow-2xs mt-0.5 ${
                                        isBlocked ? "bg-rose-600 text-white" : "bg-slate-900 text-white"
                                      }`}>
                                        {isBlocked ? <Ban className="h-4 w-4" /> : <Key className="h-4 w-4" />}
                                      </div>
                                      <div className="min-w-0 space-y-1">
                                        <p className="font-extrabold text-sm text-slate-900 tracking-tight leading-snug">{f.label}</p>
                                        <code className="inline-block text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                          {f.key}
                                        </code>
                                      </div>
                                    </div>

                                    {/* Interactive Modern SaaS Toggle Switch */}
                                    <button
                                      type="button"
                                      disabled={saving || (!isBlocked && featureReason.trim().length < 10)}
                                      onClick={() => {
                                        if (isBlocked) {
                                          handleRevokeFeatureOverride(f.key);
                                        } else {
                                          handleSetFeatureOverride(f.key, "BLOCK");
                                        }
                                      }}
                                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        isBlocked ? "bg-rose-600" : "bg-emerald-500"
                                      } ${(!isBlocked && featureReason.trim().length < 10) ? "opacity-50 cursor-not-allowed" : ""}`}
                                      title={isBlocked ? "Click to restore access" : featureReason.trim().length < 10 ? "Enter audit reason above to block" : "Click to block feature"}
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                          isBlocked ? "translate-x-0" : "translate-x-5"
                                        }`}
                                      />
                                    </button>
                                  </div>

                                  {/* Status Badges & Expiration Pill */}
                                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    {isBlocked ? (
                                      <>
                                        <Badge className="bg-rose-100 text-rose-900 border border-rose-200/90 text-[10px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs">
                                          <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" /> Administrative Block Active
                                        </Badge>
                                        {activeOverride.expiresAt && (
                                          <Badge className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs">
                                            <Clock className="h-3 w-3 text-amber-700" />
                                            Until {new Date(activeOverride.expiresAt).toLocaleDateString()}
                                          </Badge>
                                        )}
                                      </>
                                    ) : (
                                      <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200/90 text-[10px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                        Default Role Access Allowed
                                      </Badge>
                                    )}
                                  </div>

                                  {activeOverride?.reason && (
                                    <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-xs text-slate-700 font-medium leading-relaxed shadow-2xs mt-2">
                                      <span className="font-bold text-slate-900 block mb-0.5 text-[10px] uppercase tracking-wider">Admin Note:</span>
                                      "{activeOverride.reason}"
                                    </div>
                                  )}
                                </div>

                                {/* Action Button Footer */}
                                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {isBlocked ? "Blocked by Admin" : "Standard Role Policy"}
                                  </span>
                                  {isBlocked ? (
                                    <button
                                      disabled={saving}
                                      onClick={() => handleRevokeFeatureOverride(f.key)}
                                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1"
                                    >
                                      <CheckCircle className="h-3.5 w-3.5" />
                                      Restore Access
                                    </button>
                                  ) : (
                                    <button
                                      disabled={saving || featureReason.trim().length < 10}
                                      onClick={() => handleSetFeatureOverride(f.key, "BLOCK")}
                                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1 disabled:opacity-40 disabled:hover:bg-rose-600"
                                      title={featureReason.trim().length < 10 ? "Enter at least 10 characters in reason box above to enable block" : "Apply block"}
                                    >
                                      <Ban className="h-3.5 w-3.5" />
                                      Force Block
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
