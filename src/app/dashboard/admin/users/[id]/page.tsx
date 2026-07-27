"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Mail, Phone, Calendar, DollarSign, Building, FileText, 
  CheckCircle2, Ban, ShieldAlert, Users, CreditCard, Wrench, Loader2,
  Eye, EyeOff, Copy, Plus, Key, RefreshCw, AlertCircle, ArrowUpRight,
  Lock, ShieldCheck, Trash2, Play, Pause, Clock, TrendingUp, Check,
  FileDown, PenTool, ExternalLink, HelpCircle, UserCheck, ShieldX
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#007AFF]" />
        <p className="text-[#6E6E73] font-bold text-sm uppercase tracking-wider">Loading user profile...</p>
      </div>
    );
  }

  if (!user) return null;

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

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-6 pb-20 px-4 sm:px-6">
      
      {/* Edit Basic Info Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E5E5EA] w-full max-w-md rounded-[28px] shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-[#1D1D1F] mb-4">Edit Profile Info</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Full Name</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#007AFF]"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Email Address</label>
                <input 
                  type="email" 
                  value={editEmail} 
                  onChange={(e) => setEditEmail(e.target.value)} 
                  className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#007AFF]"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider block">Phone Number</label>
                <input 
                  type="text" 
                  value={editPhone} 
                  onChange={(e) => setEditPhone(e.target.value)} 
                  className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#007AFF]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-[#F2F2F7] mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-xl font-bold text-xs px-5 shadow-xs"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Banner and Navigation Back */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/admin/users"
          className="p-2.5 bg-white border border-[#E5E5EA] rounded-xl text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors shadow-xs"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-[#1D1D1F] tracking-tight">User Details</h1>
          <p className="text-[#6E6E73] text-base mt-0.5">Manage details, permissions, and history for {formatRole(user.role)}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* LEFT COLUMN: Sidebar Profile & Administrative Controls */}
        <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
          
          {/* Quick Profile Summary Card */}
          <div className="bg-white rounded-3xl border border-[#E5E5EA] shadow-xs p-6 text-center">
            <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-3xl shadow-md mb-4">
              {user.name?.charAt(0) || "U"}
            </div>
            <h2 className="text-lg font-bold text-[#1D1D1F]">{user.name || "Unnamed User"}</h2>
            <p className="text-xs font-semibold text-[#6E6E73] mb-4">{user.email}</p>
            
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <Badge className="bg-blue-50 text-blue-700 border-blue-100 rounded-lg px-2.5 py-1 font-bold text-[11px]">
                {formatRole(user.role)}
              </Badge>
              {user.accountStatus === "SUSPENDED" ? (
                <Badge className="bg-rose-50 text-rose-700 border-rose-100 rounded-lg px-2.5 py-1 font-bold text-[11px]">
                  Suspended
                </Badge>
              ) : (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 rounded-lg px-2.5 py-1 font-bold text-[11px]">
                  Active
                </Badge>
              )}
            </div>

            <div className="space-y-3.5 text-left border-t border-[#F2F2F7] pt-5">
              <div className="flex items-center gap-3 text-xs">
                <Phone className="h-4 w-4 text-[#8E8E93]" />
                <span className="font-semibold text-[#1D1D1F]">{user.phone || "No phone"}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Calendar className="h-4 w-4 text-[#8E8E93]" />
                <span className="font-semibold text-[#1D1D1F]">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white rounded-3xl border border-[#E5E5EA] shadow-xs p-6 space-y-4">
            <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Administrative Actions</h3>
            
            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleStartEdit}
                variant="outline"
                className="w-full justify-start rounded-xl font-bold text-xs h-10 border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F2F2F7]"
              >
                <PenTool className="h-4 w-4 mr-2 text-[#8E8E93]" />
                Edit Profile Info
              </Button>

              <Button 
                onClick={handleSendResetLink}
                disabled={resetLoading}
                variant="outline"
                className="w-full justify-start rounded-xl font-bold text-xs h-10 border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F2F2F7]"
              >
                {resetLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin text-[#8E8E93]" />
                ) : (
                  <Key className="h-4 w-4 mr-2 text-[#8E8E93]" />
                )}
                Send Password Reset
              </Button>

              {user.accountStatus === "SUSPENDED" ? (
                <Button 
                  onClick={handleToggleStatus}
                  disabled={saving}
                  className="w-full justify-start bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs h-10 border border-emerald-100 shadow-none"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Activate Account
                </Button>
              ) : (
                <Button 
                  onClick={handleToggleStatus}
                  disabled={saving}
                  className="w-full justify-start bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs h-10 border border-rose-100 shadow-none"
                >
                  <ShieldX className="h-4 w-4 mr-2" />
                  Suspend Account
                </Button>
              )}
            </div>
          </div>

          {/* Internal Notes Panel */}
          <div className="bg-white rounded-3xl border border-[#E5E5EA] shadow-xs p-6 space-y-3">
            <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Internal Admin Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add confidential admin logs..."
              className="w-full min-h-[100px] bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-[#007AFF] resize-none"
            />
            <Button 
              onClick={handleSaveNotes}
              disabled={notesSaving}
              className="w-full bg-[#1D1D1F] hover:bg-slate-800 text-white rounded-xl font-bold text-xs h-9"
            >
              {notesSaving ? "Saving..." : "Save Notes"}
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: Dynamic Tabs & Role-specific data display */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          
          {/* Tab Switcher Selector */}
          <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-xs p-2 flex gap-2 overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => setActiveTab("overview")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${activeTab === "overview" ? "bg-slate-900 text-white shadow-xs" : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"}`}
            >
              Overview
            </button>

            {/* OWNER TABS */}
            {user.role === "OWNER" && (
              <>
                <button 
                  onClick={() => setActiveTab("properties")}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${activeTab === "properties" ? "bg-slate-900 text-white shadow-xs" : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"}`}
                >
                  Properties Portfolio ({user.ownedProperties?.length || 0})
                </button>
                <button 
                  onClick={() => setActiveTab("tenants")}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${activeTab === "tenants" ? "bg-slate-900 text-white shadow-xs" : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"}`}
                >
                  Tenants List ({ownerStats?.tenants?.length || 0})
                </button>
                <button 
                  onClick={() => setActiveTab("team")}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${activeTab === "team" ? "bg-slate-900 text-white shadow-xs" : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"}`}
                >
                  Contractors & Inspectors
                </button>
                <button 
                  onClick={() => setActiveTab("financials")}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${activeTab === "financials" ? "bg-slate-900 text-white shadow-xs" : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"}`}
                >
                  Financials & Payouts
                </button>
                <button 
                  onClick={() => setActiveTab("billing-history")}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${activeTab === "billing-history" ? "bg-slate-900 text-white shadow-xs" : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"}`}
                >
                  Billing History
                </button>
              </>
            )}

            {/* TENANT TABS */}
            {user.role === "TENANT" && (
              <>
                <button 
                  onClick={() => setActiveTab("leases")}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${activeTab === "leases" ? "bg-slate-900 text-white shadow-xs" : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"}`}
                >
                  Lease & Landlord
                </button>
                <button 
                  onClick={() => setActiveTab("ledger")}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${activeTab === "ledger" ? "bg-slate-900 text-white shadow-xs" : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"}`}
                >
                  Payment Ledger ({user.transactions?.length || 0})
                </button>
                <button 
                  onClick={() => setActiveTab("maintenance")}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${activeTab === "maintenance" ? "bg-slate-900 text-white shadow-xs" : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"}`}
                >
                  Maintenance Tickets ({user.maintenanceRequest?.length || 0})
                </button>
              </>
            )}

            {/* INSPECTOR TABS */}
            {user.role === "INSPECTOR" && (
              <>
                <button 
                  onClick={() => setActiveTab("inspections")}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${activeTab === "inspections" ? "bg-slate-900 text-white shadow-xs" : "text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"}`}
                >
                  Assigned Inspections ({user.assignedInspections?.length || 0})
                </button>
              </>
            )}
          </div>

          {/* Panel Display */}
          <div className="bg-white rounded-3xl border border-[#E5E5EA] shadow-xs overflow-hidden min-h-[480px]">
            
            {/* ======================================================== */}
            {/* OVERVIEW TAB                                             */}
            {/* ======================================================== */}
            {activeTab === "overview" && (
              <div className="p-8 space-y-8">
                
                {/* 1. Dynamic Stats Summary Row */}
                {user.role === "OWNER" && ownerStats && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                      <p className="text-[10px] font-black text-[#8E8E93] uppercase tracking-wider">Properties Owned</p>
                      <p className="text-3xl font-black text-[#1D1D1F] mt-1.5">{ownerStats.totalProperties}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                      <p className="text-[10px] font-black text-[#8E8E93] uppercase tracking-wider">Total Units</p>
                      <p className="text-3xl font-black text-[#1D1D1F] mt-1.5">{ownerStats.totalUnits}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                      <p className="text-[10px] font-black text-[#8E8E93] uppercase tracking-wider">Occupancy Rate</p>
                      <div className="flex items-baseline gap-2 mt-1.5">
                        <p className="text-3xl font-black text-[#1D1D1F]">{ownerStats.occupancyRate}%</p>
                        <span className="text-xs font-semibold text-emerald-600">({ownerStats.occupiedUnits} leased)</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                      <p className="text-[10px] font-black text-[#8E8E93] uppercase tracking-wider">Pending Payouts</p>
                      <p className={`text-3xl font-black mt-1.5 ${ownerStats.pendingPayoutsCount > 0 ? "text-amber-600" : "text-[#1D1D1F]"}`}>
                        {ownerStats.pendingPayoutsCount}
                      </p>
                    </div>
                  </div>
                )}

                {user.role === "TENANT" && tenantStats && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                      <p className="text-[10px] font-black text-[#8E8E93] uppercase tracking-wider">Active Tickets</p>
                      <p className="text-3xl font-black text-[#1D1D1F] mt-1.5">{tenantStats.activeRequestsCount}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                      <p className="text-[10px] font-black text-[#8E8E93] uppercase tracking-wider">Payment Compliance</p>
                      <p className="text-3xl font-black text-emerald-600 mt-1.5">{tenantStats.complianceRate}%</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                      <p className="text-[10px] font-black text-[#8E8E93] uppercase tracking-wider">Tenant Screening</p>
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-100 font-black text-[10px] mt-3">
                        Passed
                      </span>
                    </div>
                  </div>
                )}

                {user.role === "INSPECTOR" && inspectorStats && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                      <p className="text-[10px] font-black text-[#8E8E93] uppercase tracking-wider">Assigned Inspections</p>
                      <p className="text-3xl font-black text-[#1D1D1F] mt-1.5">{inspectorStats.totalWalkthroughs}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                      <p className="text-[10px] font-black text-[#8E8E93] uppercase tracking-wider">Pending Tasks</p>
                      <p className={`text-3xl font-black mt-1.5 ${inspectorStats.pendingWalkthroughs > 0 ? "text-amber-500" : "text-[#1D1D1F]"}`}>
                        {inspectorStats.pendingWalkthroughs}
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Detailed Profile Fields */}
                {user.role === "TENANT" && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Background Screening</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-[#F2F2F7]/50 p-4 rounded-xl border border-[#E5E5EA]">
                          <p className="text-xs font-bold text-[#6E6E73]">Date of Birth</p>
                          <p className="font-semibold text-[#1D1D1F] mt-1">{user.dob || "N/A"}</p>
                        </div>
                        <div className="bg-[#F2F2F7]/50 p-4 rounded-xl border border-[#E5E5EA] flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-[#6E6E73]">SSN</p>
                            <p className="font-semibold text-[#1D1D1F] mt-1">{maskSSN(user.ssn)}</p>
                          </div>
                          {user.ssn && (
                            <div className="flex gap-1 shrink-0">
                              <button 
                                onClick={() => setShowSsn(!showSsn)} 
                                className="p-1.5 hover:bg-slate-200/50 rounded-lg text-slate-500 hover:text-slate-800"
                              >
                                {showSsn ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                              <button 
                                onClick={() => copyToClipboard(user.ssn, "SSN")} 
                                className="p-1.5 hover:bg-slate-200/50 rounded-lg text-slate-500 hover:text-slate-800"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="bg-[#F2F2F7]/50 p-4 rounded-xl border border-[#E5E5EA]">
                          <p className="text-xs font-bold text-[#6E6E73]">Credit Score</p>
                          <p className="font-black text-blue-600 mt-1">{user.creditScore || "N/A"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Employment Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-[#F2F2F7]/50 p-4 rounded-xl border border-[#E5E5EA]">
                          <p className="text-xs font-bold text-[#6E6E73]">Employer & Position</p>
                          <p className="font-semibold text-[#1D1D1F] mt-1">{user.employer ? `${user.employer} (${user.position || "N/A"})` : "N/A"}</p>
                        </div>
                        <div className="bg-[#F2F2F7]/50 p-4 rounded-xl border border-[#E5E5EA]">
                          <p className="text-xs font-bold text-[#6E6E73]">Annual Income</p>
                          <p className="font-semibold text-emerald-600 mt-1">{user.annualIncome ? `$${Number(user.annualIncome).toLocaleString()}` : "N/A"}</p>
                        </div>
                        <div className="bg-[#F2F2F7]/50 p-4 rounded-xl border border-[#E5E5EA]">
                          <p className="text-xs font-bold text-[#6E6E73]">Target Move-In Date</p>
                          <p className="font-semibold text-[#1D1D1F] mt-1">{user.targetMoveInDate || "N/A"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Emergency Contact</h3>
                      <div className="bg-[#F2F2F7]/50 p-5 rounded-xl border border-[#E5E5EA] grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-[#6E6E73] uppercase">Name & Relationship</p>
                          <p className="font-semibold text-[#1D1D1F] mt-1">{user.emergencyName ? `${user.emergencyName} (${user.emergencyRelationship || "N/A"})` : "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-[#6E6E73] uppercase">Contact details</p>
                          <p className="font-semibold text-[#1D1D1F] mt-1">
                            {user.emergencyPhone || ""} {user.emergencyEmail ? `| ${user.emergencyEmail}` : ""}
                            {!user.emergencyPhone && !user.emergencyEmail && "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {user.role === "OWNER" && (
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Subscription & Invoicing Configuration</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 p-5 rounded-2xl border border-blue-100 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 opacity-5">
                          <CreditCard className="w-24 h-24 text-blue-600" />
                        </div>
                        <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Current Plan</p>
                        <p className="font-black text-xl text-blue-900 mt-2 capitalize truncate">
                          {user.pricingTier?.name || "Free/No Plan"}
                        </p>
                        <p className="text-[10px] font-bold text-blue-600 mt-1">Platform Subscription</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl">
                        <p className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Billing Status</p>
                        <div className="mt-3">
                          {user.subscriptionStatus === "Active" || user.subscriptionStatus === "active" ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 px-2.5 py-1 font-bold">Active</Badge>
                          ) : user.subscriptionStatus === "Trialing" || user.subscriptionStatus === "trialing" ? (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50 px-2.5 py-1 font-bold">Trialing</Badge>
                          ) : user.subscriptionStatus === "Past_Due" || user.subscriptionStatus === "past_due" ? (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-50 px-2.5 py-1 font-bold">Past Due</Badge>
                          ) : user.subscriptionStatus === "Paused" || user.subscriptionStatus === "paused" ? (
                            <Badge className="bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50 px-2.5 py-1 font-bold">Paused / Locked</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100 px-2.5 py-1 font-bold">No Active Plan</Badge>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl">
                        <p className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Stripe Identity</p>
                        <p className="font-mono text-xs text-[#1D1D1F] mt-3 font-semibold break-all">
                          {user.stripeCustomerId || "No Stripe Customer"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {user.role === "INSPECTOR" && (
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Employment Supervisors</h3>
                    {user.owner ? (
                      <div className="border border-[#E5E5EA] p-5 rounded-xl bg-slate-50 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-[#1D1D1F]">{user.owner.name}</p>
                          <p className="text-xs font-semibold text-[#6E6E73] mt-0.5">{user.owner.email} • {user.owner.phone || "No Phone"}</p>
                        </div>
                        <Link 
                          href={`/dashboard/admin/users/${user.owner.id}`}
                          className="text-xs font-bold text-[#007AFF] hover:underline flex items-center gap-1 bg-white border border-[#E5E5EA] rounded-lg px-3 py-1.5 shadow-xs"
                        >
                          View Landlord Profile <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : (
                      <p className="text-xs text-[#8E8E93] font-semibold">This inspector has not been mapped to any landlord portfolio.</p>
                    )}
                  </div>
                )}

                {user.role === "SUPERADMIN" && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <p className="text-xs text-[#6E6E73] font-bold">System Administration Access</p>
                    <p className="text-sm text-[#1D1D1F] mt-2 font-medium">This user accounts has full administrative authorization privileges. Overrides and subscription rules do not apply.</p>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* PROPERTIES PORTFOLIO TAB (Owner)                        */}
            {/* ======================================================== */}
            {activeTab === "properties" && user.role === "OWNER" && (
              <div className="p-8 space-y-6">
                <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Portfolio Assets</h3>
                
                {user.ownedProperties && user.ownedProperties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {user.ownedProperties.map((prop: any) => {
                      const totalUnits = prop.units?.length || 0;
                      const occupiedUnits = prop.units?.filter((u: any) => u.leases && u.leases.length > 0)?.length || 0;
                      const progressPct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
                      
                      return (
                        <div 
                          key={prop.id} 
                          className="border border-[#E5E5EA] p-5 rounded-2xl flex flex-col justify-between bg-slate-50 hover:border-[#007AFF]/35 hover:shadow-xs transition-all cursor-pointer"
                          onClick={() => router.push(`/dashboard/properties/${prop.id}`)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                              <Building className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[#1D1D1F] truncate">{prop.name}</p>
                              <p className="text-xs font-medium text-[#6E6E73] mt-0.5 truncate">{prop.address}, {prop.city}</p>
                            </div>
                          </div>

                          <div className="mt-5 pt-3 border-t border-[#F2F2F7]">
                            <div className="flex justify-between items-center text-[10px] font-bold text-[#8E8E93] mb-1">
                              <span>Occupancy Progress</span>
                              <span>{occupiedUnits}/{totalUnits} Units leased</span>
                            </div>
                            <div className="w-full bg-[#E5E5EA] h-1.5 rounded-full overflow-hidden">
                              <div className="bg-[#007AFF] h-full" style={{ width: `${progressPct}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-[#E5E5EA] rounded-2xl bg-slate-50/50">
                    <p className="text-[#6E6E73] text-sm font-semibold">No properties registered under this owner portfolio.</p>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TENANTS LIST TAB (Owner)                                 */}
            {/* ======================================================== */}
            {activeTab === "tenants" && user.role === "OWNER" && ownerStats && (
              <div className="p-8 space-y-6">
                <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Tenant Registry</h3>
                
                {ownerStats.tenants.length > 0 ? (
                  <div className="border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-[#E5E5EA] text-[10px] font-black text-[#8E8E93] uppercase tracking-wider">
                            <th className="py-3.5 px-4">Tenant</th>
                            <th className="py-3.5 px-4">Property & Unit</th>
                            <th className="py-3.5 px-4">Rent Amount</th>
                            <th className="py-3.5 px-4">Lease Term</th>
                            <th className="py-3.5 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F2F2F7]">
                          {ownerStats.tenants.map((ten: any, idx: number) => (
                            <tr key={`${ten.id}-${idx}`} className="text-xs font-medium text-[#1D1D1F] hover:bg-slate-50/40">
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-[#1D1D1F]">{ten.name}</p>
                                <p className="text-[10px] text-[#6E6E73] mt-0.5">{ten.email}</p>
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-bold">{ten.propertyName}</p>
                                <p className="text-[10px] text-[#6E6E73] mt-0.5">Unit {ten.unitName}</p>
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-emerald-600">
                                ${Number(ten.monthlyRent).toLocaleString()}/mo
                              </td>
                              <td className="py-3.5 px-4 text-[#6E6E73] font-semibold">
                                {new Date(ten.leaseStart).toLocaleDateString()} - {new Date(ten.leaseEnd).toLocaleDateString()}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <Link 
                                  href={`/dashboard/admin/users/${ten.id}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#007AFF] hover:underline bg-white border border-[#E5E5EA] px-2.5 py-1 rounded-lg"
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
                  <div className="text-center py-12 border border-dashed border-[#E5E5EA] rounded-2xl bg-slate-50/50">
                    <p className="text-[#6E6E73] text-sm font-semibold">No active tenants mapped to this owner's properties.</p>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* CONTRACTORS & INSPECTORS TAB (Owner)                    */}
            {/* ======================================================== */}
            {activeTab === "team" && user.role === "OWNER" && (
              <div className="p-8 space-y-8">
                
                {/* Inspectors Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Associated Inspectors</h3>
                  
                  {user.createdInspectors && user.createdInspectors.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {user.createdInspectors.map((ins: any) => (
                        <div key={ins.id} className="border border-[#E5E5EA] p-4 rounded-xl bg-slate-50 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-[#1D1D1F] text-sm">{ins.name}</p>
                            <p className="text-xs text-[#6E6E73] mt-0.5">{ins.email} • {ins.phone || "No Phone"}</p>
                          </div>
                          <Link 
                            href={`/dashboard/admin/users/${ins.id}`}
                            className="p-2 bg-white border border-[#E5E5EA] rounded-lg hover:bg-slate-50 text-slate-500"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#8E8E93] font-semibold bg-slate-50/50 border border-dashed border-[#E5E5EA] rounded-xl p-6 text-center">
                      No inspectors created by this owner.
                    </p>
                  )}
                </div>

                {/* Vendors Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Associated Contractors & External Vendors</h3>
                  
                  {user.ownedVendors && user.ownedVendors.length > 0 ? (
                    <div className="border border-[#E5E5EA] rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-[#E5E5EA] text-[10px] font-black text-[#8E8E93] uppercase tracking-wider">
                            <th className="py-3 px-4">Vendor</th>
                            <th className="py-3 px-4">Specialty</th>
                            <th className="py-3 px-4">Call-out Fee</th>
                            <th className="py-3 px-4">Compliance Check</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F2F2F7] text-xs font-medium text-[#1D1D1F]">
                          {user.ownedVendors.map((ven: any) => (
                            <tr key={ven.id} className="hover:bg-slate-50/40">
                              <td className="py-3 px-4">
                                <p className="font-bold">{ven.name}</p>
                                <p className="text-[10px] text-[#6E6E73] mt-0.5">{ven.email} • {ven.phone}</p>
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-700">{ven.specialty}</td>
                              <td className="py-3 px-4 font-semibold text-emerald-600">${ven.baseCallOutFee?.toFixed(2)}</td>
                              <td className="py-3 px-4 space-x-2">
                                {ven.w9OnFile ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 font-bold text-[9px]">W-9</Badge>
                                ) : (
                                  <Badge className="bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50 font-bold text-[9px]">No W-9</Badge>
                                )}
                                {ven.insuranceOnFile ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 font-bold text-[9px]">COI</Badge>
                                ) : (
                                  <Badge className="bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50 font-bold text-[9px]">No COI</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-[#8E8E93] font-semibold bg-slate-50/50 border border-dashed border-[#E5E5EA] rounded-xl p-6 text-center">
                      No external maintenance contractors registered under this owner.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* FINANCIALS & PAYOUTS TAB                                 */}
            {/* ======================================================== */}
            {activeTab === "financials" && (
              <div className="p-8 space-y-8">
                
                {/* Ledger Balance Card */}
                <div>
                  <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider mb-4">Ledger Wallet</h3>
                  <div className="bg-gradient-to-br from-slate-900 to-slate-855 p-6 rounded-2xl text-white flex items-center justify-between border border-slate-800">
                    <div>
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Account Ledger Balance</p>
                      <p className="text-4xl font-black mt-2">${Number(user.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
                      <DollarSign className="h-6 w-6 text-emerald-400" />
                    </div>
                  </div>
                </div>

                {/* Bank Details Card with Show/Hide toggle */}
                <div>
                  <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider mb-4">Direct Deposit Setup</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-2xl border border-[#E5E5EA]">
                    <div>
                      <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider">Bank Entity Name</p>
                      <p className="font-semibold text-sm text-[#1D1D1F] mt-1.5">{user.bankName || "Not setup"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider">Account Holder</p>
                      <p className="font-semibold text-sm text-[#1D1D1F] mt-1.5">{user.accountName || "N/A"}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider">Account number</p>
                        <p className="font-semibold text-sm text-[#1D1D1F] mt-1.5">{maskAccount(user.accountNumber)}</p>
                      </div>
                      {user.accountNumber && (
                        <div className="flex gap-1 shrink-0 mt-3">
                          <button 
                            onClick={() => setShowAccount(!showAccount)} 
                            className="p-1.5 hover:bg-slate-200/50 rounded-lg text-slate-500 hover:text-slate-800"
                          >
                            {showAccount ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button 
                            onClick={() => copyToClipboard(user.accountNumber, "Bank Account")} 
                            className="p-1.5 hover:bg-slate-200/50 rounded-lg text-slate-500 hover:text-slate-800"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payout Logs Table */}
                {user.role === "OWNER" && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Owner Disbursals & Payout Requests</h3>
                    
                    {user.payoutRequests && user.payoutRequests.length > 0 ? (
                      <div className="border border-[#E5E5EA] rounded-xl overflow-hidden bg-white">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-[#E5E5EA] text-[10px] font-black text-[#8E8E93] uppercase tracking-wider">
                              <th className="py-3 px-4">Disbursal ID</th>
                              <th className="py-3 px-4">Amount</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4">Reference Info</th>
                              <th className="py-3 px-4">Requested</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F2F2F7] text-xs font-semibold text-[#1D1D1F]">
                            {user.payoutRequests.map((payout: any) => (
                              <tr key={payout.id} className="hover:bg-slate-50/40">
                                <td className="py-3.5 px-4 font-mono text-[10px] text-[#6E6E73] truncate max-w-[120px]" title={payout.id}>{payout.id}</td>
                                <td className="py-3.5 px-4 text-[#1D1D1F] font-bold">${Number(payout.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="py-3.5 px-4">
                                  {payout.status === "APPROVED" || payout.status === "PAID" ? (
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 px-2 py-0.5 rounded-lg text-[10px]">Settled</Badge>
                                  ) : payout.status === "PENDING" ? (
                                    <Badge className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-50 px-2 py-0.5 rounded-lg text-[10px]">Processing</Badge>
                                  ) : (
                                    <Badge className="bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50 px-2 py-0.5 rounded-lg text-[10px]">Failed</Badge>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-[#6E6E73] text-[11px] truncate max-w-[150px]">
                                  {payout.refNumber || `Bank: ${payout.bankName}`}
                                </td>
                                <td className="py-3.5 px-4 text-[#8E8E93] text-[11px] font-semibold">{new Date(payout.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-[#8E8E93] font-semibold bg-slate-50/50 border border-dashed border-[#E5E5EA] rounded-xl p-6 text-center">
                        No payout history associated with this owner account.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* BILLING HISTORY TIMELINE TAB                             */}
            {/* ======================================================== */}
            {activeTab === "billing-history" && user.role === "OWNER" && (
              <div className="p-8 space-y-6">
                <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Subscription Life History</h3>
                
                {user.subscriptionHistory && user.subscriptionHistory.length > 0 ? (
                  <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                    {user.subscriptionHistory.map((hist: any) => {
                      const dateStr = new Date(hist.createdAt).toLocaleString();
                      
                      return (
                        <div key={hist.id} className="relative pl-8 flex gap-4 items-start">
                          <div className="absolute left-[3px] top-[5px] h-[16px] w-[16px] bg-white border-2 border-slate-900 rounded-full flex items-center justify-center shrink-0">
                            <div className="h-1.5 w-1.5 bg-slate-900 rounded-full" />
                          </div>
                          <div className="flex-1 bg-slate-50 border border-slate-200/50 rounded-2xl p-4">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="text-[10px] font-black text-slate-800 uppercase bg-slate-200 px-2 py-0.5 rounded-md tracking-wider">
                                  {hist.event}
                                </span>
                                <p className="text-xs font-bold text-[#1D1D1F] mt-2">
                                  {hist.toTierName ? `Subscribed to ${hist.toTierName}` : "Billing Configuration Synchronized"}
                                </p>
                                {hist.fromTierName && hist.fromTierName !== hist.toTierName && (
                                  <p className="text-[10px] font-bold text-[#6E6E73] mt-1">Previous Plan: {hist.fromTierName}</p>
                                )}
                              </div>
                              <span className="text-[10px] text-[#8E8E93] font-bold shrink-0">{dateStr}</span>
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
                  <div className="text-center py-12 border border-dashed border-[#E5E5EA] rounded-2xl bg-slate-50/50">
                    <p className="text-[#6E6E73] text-sm font-semibold">No subscription events logged in historical audits.</p>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* LEASES TAB (Tenant)                                      */}
            {/* ======================================================== */}
            {activeTab === "leases" && user.role === "TENANT" && (
              <div className="p-8 space-y-6">
                <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Active Lease Agreements</h3>
                
                {user.leases && user.leases.length > 0 ? (
                  <div className="space-y-4">
                    {user.leases.map((lease: any) => {
                      const ownerProfile = lease.unit?.property?.owner;
                      
                      return (
                        <div key={lease.id} className="border border-[#E5E5EA] p-5 rounded-2xl bg-slate-50 space-y-5">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <p className="font-black text-[#1D1D1F] text-lg">{lease.unit?.property?.name || "Unknown Property"}</p>
                              <p className="text-xs font-semibold text-[#6E6E73] mt-0.5">Unit {lease.unit?.name || "N/A"} • ${Number(lease.monthlyRent).toLocaleString()}/month</p>
                            </div>
                            <Badge className="bg-slate-200 text-slate-800 border-0 font-bold text-[10px]">{lease.status}</Badge>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-4 border-t border-[#E5E5EA]">
                            <div>
                              <p className="text-[10px] font-bold text-[#8E8E93] uppercase">Start Date</p>
                              <p className="font-semibold text-[#1D1D1F] mt-0.5">{new Date(lease.startDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-[#8E8E93] uppercase">End Date</p>
                              <p className="font-semibold text-[#1D1D1F] mt-0.5">{new Date(lease.endDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-[#8E8E93] uppercase">Rent Due Day</p>
                              <p className="font-semibold text-[#1D1D1F] mt-0.5">Day {lease.rentDueDay || 1}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-[#8E8E93] uppercase">Security Deposit</p>
                              <p className="font-semibold text-emerald-600 mt-0.5">${Number(lease.securityDeposit || 0).toLocaleString()}</p>
                            </div>
                          </div>

                          {ownerProfile && (
                            <div className="pt-4 border-t border-[#E5E5EA] flex justify-between items-center bg-[#F2F2F7]/50 rounded-xl p-3.5">
                              <div>
                                <p className="text-[10px] font-bold text-[#8E8E93] uppercase">Supervisor Landlord</p>
                                <p className="font-black text-[#1D1D1F] mt-0.5 text-sm">{ownerProfile.name}</p>
                                <p className="text-xs text-[#6E6E73] mt-0.5">{ownerProfile.email} • {ownerProfile.phone || "No Phone"}</p>
                              </div>
                              <Link 
                                href={`/dashboard/admin/users/${ownerProfile.id}`}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#007AFF] bg-white border border-[#E5E5EA] px-3 py-1.5 rounded-lg hover:underline shadow-xs"
                              >
                                View Landlord <ArrowUpRight className="h-3 w-3" />
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-[#E5E5EA] rounded-2xl bg-slate-50/50">
                    <p className="text-[#6E6E73] text-sm font-semibold">No lease records associated with this tenant.</p>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* PAYMENT LEDGER TAB (Tenant)                              */}
            {/* ======================================================== */}
            {activeTab === "ledger" && user.role === "TENANT" && (
              <div className="p-8 space-y-6">
                <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Payment Transaction History</h3>
                
                {user.transactions && user.transactions.length > 0 ? (
                  <div className="border border-[#E5E5EA] rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-[#E5E5EA] text-[10px] font-black text-[#8E8E93] uppercase tracking-wider">
                          <th className="py-3 px-4">Transaction ID</th>
                          <th className="py-3 px-4">Details</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Created Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F2F2F7] text-xs font-medium text-[#1D1D1F]">
                        {user.transactions.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-slate-50/40">
                            <td className="py-3 px-4 font-mono text-[10px] text-[#6E6E73] max-w-[120px] truncate" title={tx.id}>{tx.id}</td>
                            <td className="py-3 px-4">
                              <p className="font-bold text-[#1D1D1F] uppercase text-[10px]">{tx.type} • {tx.category}</p>
                              {tx.reference && <p className="text-[10px] text-[#6E6E73] mt-0.5">Ref: {tx.reference}</p>}
                            </td>
                            <td className={`py-3 px-4 font-bold ${tx.type === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}>
                              {tx.type === "INCOME" ? "+" : "-"}${Number(tx.amount).toFixed(2)}
                            </td>
                            <td className="py-3 px-4">
                              {tx.status === "COMPLETED" || tx.status === "SUCCESS" ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 font-bold text-[9px] py-0.5">Completed</Badge>
                              ) : tx.status === "PENDING" ? (
                                <Badge className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-50 font-bold text-[9px] py-0.5">Pending</Badge>
                              ) : (
                                <Badge className="bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50 font-bold text-[9px] py-0.5">Failed</Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-[#8E8E93] text-[11px] font-semibold">{new Date(tx.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-[#E5E5EA] rounded-2xl bg-slate-50/50">
                    <p className="text-[#6E6E73] text-sm font-semibold">No transactions registered under this tenant.</p>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* MAINTENANCE TICKETS TAB (Tenant)                         */}
            {/* ======================================================== */}
            {activeTab === "maintenance" && user.role === "TENANT" && (
              <div className="p-8 space-y-6">
                <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Maintenance Service Inquiries</h3>
                
                {user.maintenanceRequest && user.maintenanceRequest.length > 0 ? (
                  <div className="space-y-4">
                    {user.maintenanceRequest.map((req: any) => (
                      <div key={req.id} className="border border-[#E5E5EA] p-4 rounded-xl bg-slate-50 hover:border-slate-350 transition-colors flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-[#1D1D1F] text-sm">{req.title}</p>
                            <Badge className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              req.priority === "EMERGENCY" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                              req.priority === "HIGH" ? "bg-orange-50 text-orange-700 border border-orange-100" :
                              "bg-slate-100 text-slate-700"
                            }`}>
                              {req.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-[#6E6E73] mt-1 line-clamp-1">{req.description}</p>
                          <p className="text-[10px] text-[#8E8E93] font-bold mt-2">
                            Property: {req.unit?.property?.name || "N/A"} • Unit {req.unit?.name || "N/A"} • Opened {new Date(req.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="text-right shrink-0 ml-4">
                          <Badge className="bg-slate-200 text-slate-800 border-0 text-[10px] mb-2">{req.status}</Badge>
                          <br/>
                          <Link 
                            href={`/dashboard/maintenance`}
                            className="inline-flex items-center gap-0.5 text-[10px] font-black text-[#007AFF] hover:underline"
                          >
                            Open Dashboard <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-[#E5E5EA] rounded-2xl bg-slate-50/50">
                    <p className="text-[#6E6E73] text-sm font-semibold">No maintenance tickets reported by this tenant.</p>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* ASSIGNED INSPECTIONS TAB (Inspector)                     */}
            {/* ======================================================== */}
            {activeTab === "inspections" && user.role === "INSPECTOR" && (
              <div className="p-8 space-y-6">
                <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Scheduled Walkthroughs & Inspections</h3>
                
                {user.assignedInspections && user.assignedInspections.length > 0 ? (
                  <div className="space-y-4">
                    {user.assignedInspections.map((insp: any) => (
                      <div key={insp.id} className="border border-[#E5E5EA] p-4 rounded-xl bg-slate-50 flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-[#1D1D1F] text-sm">{insp.title}</p>
                            <Badge className="bg-[#E0F2FE] text-[#0369A1] border-0 text-[9px] py-0.5 rounded-md">{insp.category}</Badge>
                          </div>
                          <p className="text-xs text-[#6E6E73] line-clamp-1">{insp.description}</p>
                          <p className="text-[10px] text-[#8E8E93] font-bold pt-1.5">
                            Unit: {insp.unit?.property?.name} • Unit {insp.unit?.name}
                          </p>
                          {insp.tenant && (
                            <p className="text-[10px] text-slate-700 font-bold">
                              Tenant: {insp.tenant.name} ({insp.tenant.phone || "No phone"})
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0 ml-4 space-y-2">
                          <Badge className="bg-slate-200 text-slate-800 text-[10px]">{insp.status}</Badge>
                          {insp.scheduledDate && (
                            <p className="text-[10px] text-[#8E8E93] font-black flex items-center gap-1 justify-end">
                              <Clock className="h-3 w-3 text-orange-400" /> 
                              {new Date(insp.scheduledDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-[#E5E5EA] rounded-2xl bg-slate-50/50">
                    <p className="text-[#6E6E73] text-sm font-semibold">No walkthrough inspections assigned to this inspector.</p>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
