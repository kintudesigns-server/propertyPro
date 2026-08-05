"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Users,
  Loader2,
  DollarSign,
  UserPlus,
  Shield,
  RefreshCw,
  Activity,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Banknote,
  LayoutGrid,
  CreditCard,
  Tag,
  FileText,
  Settings,
  ShieldAlert,
  Zap,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { PlatformHealthPanel } from "@/components/admin/PlatformHealthPanel";
import { AdminHero } from "@/components/admin/AdminHero";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [pricingTiers, setPricingTiers] = useState<any[]>([]);
  const [profitData, setProfitData] = useState({ totalProfit: 0, totalVolumeProcessed: 0 });
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>("");
  const [showCronJobs, setShowCronJobs] = useState(true);

  const triggerCron = async (endpoint: string) => {
    const loadingToast = toast.loading(`Running cron: ${endpoint}...`);
    try {
      const res = await fetch("/api/admin/trigger-cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      const data = await res.json();
      toast.dismiss(loadingToast);
      if (res.ok) {
        toast.success(data.message || "Cron job run successfully!");
      } else {
        toast.error(data.error || "Failed to execute cron job.");
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Network error.");
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [payoutRes, propRes, profitRes, usersRes, tiersRes] = await Promise.all([
        fetch("/api/payouts"),
        fetch("/api/properties"),
        fetch("/api/admin/profit"),
        fetch("/api/admin/users"),
        fetch("/api/pricing-tiers"),
      ]);
      setPayouts(await payoutRes.json());
      setProperties(await propRes.json());
      if (profitRes.ok) setProfitData(await profitRes.json());
      if (usersRes.ok) {
        const uData = await usersRes.json();
        const uArr = Array.isArray(uData) ? uData : (uData.users || []);
        setAllUsers(uArr);
        setOwners(uArr.filter((u: any) => u.role === "OWNER"));
      }
      if (tiersRes.ok) setPricingTiers(await tiersRes.json());
      setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load platform data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchAdminData();
  }, [status]);

  if (loading || status === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#007AFF]" />
        <p className="text-[#6E6E73] font-bold text-sm uppercase tracking-wider">Loading admin control center...</p>
      </div>
    );
  }

  const pendingPayouts = Array.isArray(payouts) ? payouts.filter((p) => p.status === "PENDING") : [];
  const pendingProperties = Array.isArray(properties) ? properties.filter((p) => p.approvalStatus === "PENDING") : [];
  const approvedProperties = Array.isArray(properties) ? properties.filter((p) => p.approvalStatus === "APPROVED") : [];

  const userList = Array.isArray(allUsers) && allUsers.length > 0 ? allUsers : [];
  const totalUsers = userList.length > 0 ? userList.length : Array.isArray(owners) ? owners.length : 0;
  const tenantCount = userList.filter((u) => u.role === "TENANT").length;
  const ownerCount = userList.filter((u) => u.role === "OWNER").length;

  const recentUsers = [...(userList.length > 0 ? userList : owners)]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const alertCount = pendingPayouts.length + pendingProperties.length;
  const activeSubscribersCount = userList.filter((u) => u.role === "OWNER" && (u.subscriptionStatus === "Active" || u.subscriptionStatus === "Trialing" || u.subscriptionStatus === "Active (Canceling)")).length;
  
  let mrr = 0;
  let atRiskMrr = 0;
  owners.forEach(owner => {
    const price = owner.pricingTier?.price ? Number(owner.pricingTier.price) : 0;
    if (owner.subscriptionStatus === "Active" || owner.subscriptionStatus === "Active (Canceling)") {
      mrr += price;
    } else if (owner.subscriptionStatus === "Paused" || owner.subscriptionStatus === "Past_Due") {
      atRiskMrr += price;
    }
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-4 pb-24 px-2 sm:px-6">
      <AdminHero
        session={session}
        totalUsers={totalUsers}
        propertiesCount={properties.length}
        activeSubscribersCount={activeSubscribersCount}
        totalVolumeProcessed={profitData?.totalVolumeProcessed || 0}
        alertCount={alertCount}
        pendingPropertiesCount={pendingProperties.length}
        lastSync={lastSync}
        onRefresh={fetchAdminData}
      />

      {/* ── TOP CRITICAL ALERT BANNER (If Action Required) ── */}
      {alertCount > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 relative z-10">
            <div className="h-10 w-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="h-5 w-5 text-rose-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h3 className="font-extrabold text-white text-base tracking-tight">Critical Actions Required ({alertCount})</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase tracking-wider">
                  Immediate Review
                </span>
              </div>
              <p className="text-slate-300 text-xs max-w-2xl leading-relaxed font-medium">
                {pendingPayouts.length > 0 && `• ${pendingPayouts.length} payout request(s) awaiting admin approval. `}
                {pendingProperties.length > 0 && `• ${pendingProperties.length} property listing(s) pending manual onboarding approval.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto relative z-10">
            {pendingPayouts.length > 0 && (
              <Link href="/dashboard/admin/payouts" className="w-full md:w-auto">
                <Button className="bg-rose-600 hover:bg-rose-500 text-white font-medium h-9 px-4 rounded-xl text-xs w-full md:w-auto shadow-xs">
                  Process Payouts ({pendingPayouts.length})
                </Button>
              </Link>
            )}
            {pendingProperties.length > 0 && (
              <Link href="/dashboard/admin/properties" className="w-full md:w-auto">
                <Button className="bg-white hover:bg-slate-100 text-slate-900 font-medium h-9 px-4 rounded-xl text-xs w-full md:w-auto shadow-xs">
                  Review Listings ({pendingProperties.length})
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── KPI METRICS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          href="/dashboard/admin/users"
          title="Total Users"
          value={totalUsers}
          subtext={`${ownerCount} owners · ${tenantCount} tenants`}
          badgeText="Users"
          icon={Users}
          variant="blue"
        />

        <KpiCard
          href="/dashboard/admin/properties"
          title="Properties"
          value={Array.isArray(properties) ? properties.length : 0}
          subtext={`${approvedProperties.length} approved · ${pendingProperties.length} pending`}
          badgeText="Units"
          icon={Building}
          variant="green"
        />

        <KpiCard
          href="/dashboard/admin/profit"
          title="Platform Profit"
          value={`$${(profitData?.totalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtext="Net commissions"
          badgeText="+12.4% MoM"
          icon={TrendingUp}
          variant="emerald"
        />

        <KpiCard
          href="/dashboard/admin/payouts"
          title="Pending Payouts"
          value={pendingPayouts.length}
          subtext={pendingPayouts.length > 0 ? "Require admin action" : "All payouts settled"}
          badgeText={pendingPayouts.length > 0 ? "Action Req." : "Settle"}
          icon={Banknote}
          variant={pendingPayouts.length > 0 ? "orange" : "slate"}
        />

        <KpiCard
          href="/dashboard/admin/subscriptions"
          title="Billing (SaaS)"
          value={`$${mrr.toLocaleString()}/mo`}
          subtext={`$${atRiskMrr.toLocaleString()} at risk`}
          badgeText="MRR"
          icon={CreditCard}
          variant="blue"
        />
      </div>

      {/* ── 8-TILE QUICK NAVIGATION SHORTCUT GRID ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pl-1">
          <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-[#007AFF]" />
            <span>Admin Console Shortcuts</span>
          </h2>
          <span className="text-xs font-normal text-[#8E8E93] uppercase tracking-wider">
            8 Modules Configured
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
          
          {/* Tile 1: Users */}
          <Link href="/dashboard/admin/users">
            <div className="bg-white hover:bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between h-28 group">
              <div className="flex justify-between items-start">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:scale-105 transition-transform">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <Badge variant="outline" className="bg-blue-50/80 text-blue-700 border-blue-100 font-extrabold text-[10px]">
                  {totalUsers} Users
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm tracking-tight group-hover:text-[#007AFF] transition-colors">Users</h4>
                  <p className="text-[10px] text-[#8E8E93] font-semibold">Owners & Tenants</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#007AFF] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </Link>

          {/* Tile 2: Properties */}
          <Link href="/dashboard/admin/properties">
            <div className="bg-white hover:bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between h-28 group">
              <div className="flex justify-between items-start">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:scale-105 transition-transform">
                  <Building className="h-4.5 w-4.5" />
                </div>
                <Badge variant="outline" className={`font-extrabold text-[10px] ${pendingProperties.length > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                  {pendingProperties.length > 0 ? `${pendingProperties.length} Pending` : `${properties.length} Active`}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm tracking-tight group-hover:text-[#007AFF] transition-colors">Properties</h4>
                  <p className="text-[10px] text-[#8E8E93] font-semibold">Listing Approvals</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#007AFF] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </Link>

          {/* Tile 3: Payouts */}
          <Link href="/dashboard/admin/payouts">
            <div className="bg-white hover:bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between h-28 group">
              <div className="flex justify-between items-start">
                <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 group-hover:scale-105 transition-transform">
                  <Banknote className="h-4.5 w-4.5" />
                </div>
                <Badge variant="outline" className={`font-extrabold text-[10px] ${pendingPayouts.length > 0 ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                  {pendingPayouts.length > 0 ? `${pendingPayouts.length} Action Req.` : "Settled"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm tracking-tight group-hover:text-[#007AFF] transition-colors">Payout Requests</h4>
                  <p className="text-[10px] text-[#8E8E93] font-semibold">Owner Transfers</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#007AFF] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </Link>

          {/* Tile 4: Platform Profit */}
          <Link href="/dashboard/admin/profit">
            <div className="bg-white hover:bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between h-28 group">
              <div className="flex justify-between items-start">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 group-hover:scale-105 transition-transform">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-extrabold text-[10px]">
                  Net Comm.
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm tracking-tight group-hover:text-[#007AFF] transition-colors">Platform Profit</h4>
                  <p className="text-[10px] text-[#8E8E93] font-semibold">Fee Commissions</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#007AFF] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </Link>

          {/* Tile 5: Subscriptions */}
          <Link href="/dashboard/admin/subscriptions">
            <div className="bg-white hover:bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between h-28 group">
              <div className="flex justify-between items-start">
                <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 group-hover:scale-105 transition-transform">
                  <CreditCard className="h-4.5 w-4.5" />
                </div>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100 font-extrabold text-[10px]">
                  {activeSubscribersCount} Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm tracking-tight group-hover:text-[#007AFF] transition-colors">Subscriptions</h4>
                  <p className="text-[10px] text-[#8E8E93] font-semibold">SaaS Tiers & MRR</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#007AFF] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </Link>

          {/* Tile 6: Pricing Tiers */}
          <Link href="/dashboard/admin/pricing">
            <div className="bg-white hover:bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between h-28 group">
              <div className="flex justify-between items-start">
                <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100 group-hover:scale-105 transition-transform">
                  <Tag className="h-4.5 w-4.5" />
                </div>
                <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-100 font-extrabold text-[10px]">
                  {pricingTiers.length} Configured
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm tracking-tight group-hover:text-[#007AFF] transition-colors">Pricing Tiers</h4>
                  <p className="text-[10px] text-[#8E8E93] font-semibold">Plans & Limits</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#007AFF] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </Link>

          {/* Tile 7: Audit Logs */}
          <Link href="/dashboard/admin/audit-logs">
            <div className="bg-white hover:bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between h-28 group">
              <div className="flex justify-between items-start">
                <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 group-hover:scale-105 transition-transform">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 font-extrabold text-[10px]">
                  Security Logs
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm tracking-tight group-hover:text-[#007AFF] transition-colors">Audit Logs</h4>
                  <p className="text-[10px] text-[#8E8E93] font-semibold">Activity Stream</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#007AFF] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </Link>

          {/* Tile 8: Admin Settings */}
          <Link href="/dashboard/admin/settings">
            <div className="bg-white hover:bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between h-28 group">
              <div className="flex justify-between items-start">
                <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200 group-hover:scale-105 transition-transform">
                  <Settings className="h-4.5 w-4.5" />
                </div>
                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 font-extrabold text-[10px]">
                  Config
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm tracking-tight group-hover:text-[#007AFF] transition-colors">Console Settings</h4>
                  <p className="text-[10px] text-[#8E8E93] font-semibold">Global Prefs</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#007AFF] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </Link>

        </div>
      </div>

      {/* ── OVERVIEW PANELS (Recent Registrations & Action Center) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Registrations */}
        <Card className="bg-white border-[#E5E5EA] shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-[#E5E5EA] pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-semibold text-[#1D1D1F]">Recent Registrations</CardTitle>
                <CardDescription className="text-[#6E6E73] text-xs mt-0.5">Latest users who created accounts on the platform.</CardDescription>
              </div>
              <Link href="/dashboard/admin/users">
                <Button variant="ghost" size="sm" className="text-[#007AFF] hover:text-[#0062CC] hover:bg-blue-50 font-medium text-xs gap-1 rounded-xl">
                  View All Users <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {recentUsers.map((u, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4 p-3 rounded-2xl hover:bg-slate-50/80 transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-10 w-10 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center font-black text-sm shrink-0 border border-[#007AFF]/10">
                      {u.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 truncate text-sm">{u.name || "Unknown User"}</p>
                        <Badge
                          variant="outline"
                          className={`text-[9px] shrink-0 font-semibold uppercase tracking-wider ${
                            u.role === "OWNER"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : u.role === "TENANT"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {u.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#6E6E73] truncate font-medium">{u.email}</p>
                    </div>
                  </div>

                  <Link href={`/dashboard/admin/users`}>
                    <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-slate-600 hover:text-[#007AFF] font-medium rounded-lg border border-slate-200/60 shrink-0">
                      <span>View</span>
                      <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </Button>
                  </Link>
                </div>
              ))}
              {recentUsers.length === 0 && (
                <p className="text-sm text-[#6E6E73] italic text-center py-4">No users registered yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Required Box */}
        <Card className="bg-white border-[#E5E5EA] shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-[#E5E5EA] pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <span>Action Items & Compliance</span>
                  {alertCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-black rounded-full px-2 py-0.5 leading-none animate-pulse">
                      {alertCount} Pending
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-[#6E6E73] text-xs mt-0.5">Critical compliance actions requiring administrator authorization.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3.5">
              {pendingPayouts.length > 0 && (
                <Link href="/dashboard/admin/payouts">
                  <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-rose-50/60 border border-rose-100 hover:bg-rose-100/50 transition-all cursor-pointer group shadow-2xs">
                    <div className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Banknote className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-rose-950">{pendingPayouts.length} payout request{pendingPayouts.length > 1 ? "s" : ""} pending authorization</p>
                      <p className="text-xs text-rose-700 mt-0.5 font-semibold">Requires immediate payout release · Financial Compliance</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-rose-400 group-hover:text-rose-700 shrink-0 transition-colors" />
                  </div>
                </Link>
              )}
              {pendingProperties.length > 0 && (
                <Link href="/dashboard/admin/properties">
                  <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-amber-50/60 border border-amber-100 hover:bg-amber-100/50 transition-all cursor-pointer group shadow-2xs">
                    <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Building className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-amber-950">{pendingProperties.length} propert{pendingProperties.length > 1 ? "ies" : "y"} pending approval</p>
                      <p className="text-xs text-amber-800 mt-0.5 font-semibold">Requires manual listing verification · Onboarding</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-amber-400 group-hover:text-amber-700 shrink-0 transition-colors" />
                  </div>
                </Link>
              )}
              {alertCount === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">All clear!</p>
                  <p className="text-xs text-[#6E6E73] font-medium">No pending approval actions required right now.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── PLATFORM HEALTH PANEL ── */}
      <PlatformHealthPanel owners={owners} />

      {/* ── SYSTEM OPERATIONS & CRON JOBS ── */}
      <Card className="bg-white border-[#E5E5EA] shadow-xs rounded-2xl">
        <CardHeader className="border-b border-[#E5E5EA] pb-4 flex flex-row justify-between items-center gap-4">
          <div>
            <CardTitle className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
              <Zap className="h-4.5 w-4.5 text-amber-500" />
              <span>System Operations & Cron Utilities</span>
            </CardTitle>
            <CardDescription className="text-[#6E6E73] text-xs mt-0.5">
              Trigger background system tasks and cron utilities on-demand for testing or missed schedules.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCronJobs(!showCronJobs)}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs h-9 px-3 rounded-xl shrink-0"
          >
            {showCronJobs ? "Hide Controls" : "Show Controls"}
          </Button>
        </CardHeader>
        
        {showCronJobs && (
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* Cron 1: Monthly Invoices */}
              <div className="space-y-3 p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Monthly Invoice Generation
                    </h4>
                    <span className="text-[9px] font-semibold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Monthly</span>
                  </div>
                  <p className="text-xs text-[#6E6E73] leading-relaxed font-medium">
                    Creates rent invoices for all ACTIVE leases for the upcoming billing period.
                  </p>
                </div>
                <Button
                  onClick={() => triggerCron("/api/cron/generate-invoices")}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs"
                >
                  Run Invoice Generation
                </Button>
              </div>

              {/* Cron 2: Late Fees */}
              <div className="space-y-3 p-4 rounded-2xl border border-red-100 bg-red-50/40 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Late Fee Automation
                    </h4>
                    <span className="text-[9px] font-semibold uppercase bg-red-100 text-red-800 px-2 py-0.5 rounded">Daily</span>
                  </div>
                  <p className="text-xs text-[#6E6E73] leading-relaxed font-medium">
                    Marks overdue invoices past grace period and auto-creates late fee invoices.
                  </p>
                </div>
                <Button
                  onClick={() => triggerCron("/api/cron/late-fees")}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs"
                >
                  Run Late Fee Check
                </Button>
              </div>

              {/* Cron 3: Expiry Engine */}
              <div className="space-y-3 p-4 rounded-2xl border border-amber-100 bg-amber-50/40 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Lease Expiry Engine
                    </h4>
                    <span className="text-[9px] font-semibold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Daily</span>
                  </div>
                  <p className="text-xs text-[#6E6E73] leading-relaxed font-medium">
                    Auto-expires ACTIVE leases past end date, marks units VACANT, and notifies parties.
                  </p>
                </div>
                <Button
                  onClick={() => triggerCron("/api/cron/expire-leases")}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs"
                >
                  Run Expiry Engine
                </Button>
              </div>

              {/* Cron 4: Lease Activation */}
              <div className="space-y-3 p-4 rounded-2xl border border-blue-100 bg-blue-50/40 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Lease Activation Cron
                    </h4>
                    <span className="text-[9px] font-semibold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Daily</span>
                  </div>
                  <p className="text-xs text-[#6E6E73] leading-relaxed font-medium">
                    Scans SIGNED leases with current/past move-in dates and activates them.
                  </p>
                </div>
                <Button
                  onClick={() => triggerCron("/api/cron/lease-activate")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs"
                >
                  Run Lease Activation
                </Button>
              </div>

              {/* Cron 5: Renewals Engine */}
              <div className="space-y-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-500" />
                      Renewals Engine
                    </h4>
                    <span className="text-[9px] font-semibold uppercase bg-slate-200 text-slate-800 px-2 py-0.5 rounded">Weekly</span>
                  </div>
                  <p className="text-xs text-[#6E6E73] leading-relaxed font-medium">
                    Analyzes expiring ACTIVE leases and sends renewal notice emails to tenants.
                  </p>
                </div>
                <Button
                  onClick={() => triggerCron("/api/cron/renewals")}
                  className="w-full bg-[#1E293B] hover:bg-[#0F172A] text-white font-bold text-xs h-9 rounded-xl shadow-xs"
                >
                  Run Renewals Engine
                </Button>
              </div>

              {/* Cron 6: Maintenance Link Expiry */}
              <div className="space-y-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-500" />
                      Maintenance Audit
                    </h4>
                    <span className="text-[9px] font-semibold uppercase bg-slate-200 text-slate-800 px-2 py-0.5 rounded">Daily</span>
                  </div>
                  <p className="text-xs text-[#6E6E73] leading-relaxed font-medium">
                    Auto-closes maintenance requests in PENDING_TENANT_CONFIRMATION with no response.
                  </p>
                </div>
                <Button
                  onClick={() => triggerCron("/api/cron/maintenance")}
                  className="w-full bg-[#1E293B] hover:bg-[#0F172A] text-white font-bold text-xs h-9 rounded-xl shadow-xs"
                >
                  Run Maintenance Audit
                </Button>
              </div>

            </div>
          </CardContent>
        )}
      </Card>

    </div>
  );
}


