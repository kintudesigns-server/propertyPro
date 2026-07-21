"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [profitData, setProfitData] = useState({ totalProfit: 0, totalVolumeProcessed: 0 });
  const [loading, setLoading] = useState(true);

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
      const [payoutRes, propRes, ownerRes, profitRes, usersRes] = await Promise.all([
        fetch("/api/payouts"),
        fetch("/api/properties"),
        fetch("/api/admin/owners/list"),
        fetch("/api/admin/profit"),
        fetch("/api/admin/users"),
      ]);
      setPayouts(await payoutRes.json());
      setProperties(await propRes.json());
      if (ownerRes.ok) setOwners(await ownerRes.json());
      if (profitRes.ok) setProfitData(await profitRes.json());
      if (usersRes.ok) setAllUsers(await usersRes.json());
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
        <Loader2 className="h-10 w-10 animate-spin text-[#EF4444]" />
        <p className="text-[#64748B] font-bold text-sm uppercase tracking-wider">Loading admin portal...</p>
      </div>
    );
  }

  const pendingPayouts = Array.isArray(payouts) ? payouts.filter((p) => p.status === "PENDING") : [];
  const pendingProperties = Array.isArray(properties) ? properties.filter((p) => p.approvalStatus === "PENDING") : [];
  const approvedProperties = Array.isArray(properties) ? properties.filter((p) => p.approvalStatus === "APPROVED") : [];

  // Derive user counts from allUsers if available, else fall back to owners list
  const userList = Array.isArray(allUsers) && allUsers.length > 0 ? allUsers : [];
  const totalUsers = userList.length > 0 ? userList.length : Array.isArray(owners) ? owners.length : 0;
  const tenantCount = userList.filter((u) => u.role === "TENANT").length;
  const ownerCount = userList.filter((u) => u.role === "OWNER").length;

  // Recent registrations: last 5 users sorted by newest
  const recentUsers = [...(userList.length > 0 ? userList : owners)]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const alertCount = pendingPayouts.length + pendingProperties.length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-6 pb-20 px-2 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-50 text-red-500 rounded-xl">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">Admin Overview</h1>
            <p className="text-[#64748B] text-base mt-0.5">
              Welcome back, {session?.user?.name?.split(" ")[0] || "Admin"} — here&apos;s your platform at a glance.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchAdminData()}
            className="text-[#64748B] hover:bg-[#F8FAFC]"
            title="Refresh data"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
          <Link href="/dashboard/admin/owner-applications">
            <Button variant="outline" className="border-amber-200 text-amber-700 font-semibold h-11 px-5 rounded-xl flex items-center gap-2 hover:bg-amber-50 bg-amber-50">
              <UserPlus className="h-4 w-4" /> Owner Applications
              {pendingProperties.length > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {pendingProperties.length}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/dashboard/admin/users/new">
            <Button className="bg-[#1E293B] hover:bg-[#0F172A] text-white font-semibold rounded-xl flex items-center gap-2 h-11 px-6 shadow-sm">
              <UserPlus className="h-4 w-4" /> Add User
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Users */}
        <Link href="/dashboard/admin/users" className="group">
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-semibold text-[#0F172A]">Total Users</p>
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#0F172A] mb-1">{totalUsers}</p>
              <div className="flex items-center gap-2 text-xs text-[#64748B] flex-wrap">
                {ownerCount > 0 && <span>{ownerCount} owners</span>}
                {tenantCount > 0 && <span>· {tenantCount} tenants</span>}
                {ownerCount === 0 && tenantCount === 0 && <span>Across all roles</span>}
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Properties */}
        <Link href="/dashboard/admin/properties" className="group">
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-semibold text-[#0F172A]">Properties</p>
                <div className="p-1.5 bg-emerald-50 rounded-lg">
                  <Building className="h-4 w-4 text-emerald-500" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#0F172A] mb-1">{Array.isArray(properties) ? properties.length : 0}</p>
              <div className="flex items-center gap-2 text-xs text-[#64748B]">
                <span className="text-emerald-600 font-semibold">{approvedProperties.length} approved</span>
                {pendingProperties.length > 0 && (
                  <span className="text-amber-600 font-semibold">· {pendingProperties.length} pending</span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Platform Profit */}
        <Link href="/dashboard/admin/profit" className="group">
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl hover:shadow-md hover:border-green-200 transition-all cursor-pointer">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-semibold text-[#0F172A]">Platform Profit</p>
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-green-600 mb-1">
                ${(profitData?.totalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-[#64748B] flex items-center gap-1">
                <Activity className="h-3 w-3 text-[#94A3B8]" /> Net commissions collected
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Pending Payouts */}
        <Link href="/dashboard/admin/payouts" className="group">
          <Card className={`bg-white border-[#E2E8F0] shadow-sm rounded-2xl hover:shadow-md transition-all cursor-pointer ${pendingPayouts.length > 0 ? "hover:border-amber-200" : "hover:border-slate-200"}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-semibold text-[#0F172A]">Pending Payouts</p>
                <div className={`p-1.5 rounded-lg ${pendingPayouts.length > 0 ? "bg-amber-50" : "bg-slate-50"}`}>
                  <Banknote className={`h-4 w-4 ${pendingPayouts.length > 0 ? "text-amber-500" : "text-slate-400"}`} />
                </div>
              </div>
              <p className={`text-3xl font-bold mb-1 ${pendingPayouts.length > 0 ? "text-amber-600" : "text-[#0F172A]"}`}>
                {pendingPayouts.length}
              </p>
              <p className="text-xs text-[#64748B]">
                {pendingPayouts.length > 0 ? "Require admin action" : "All payouts settled"}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Overview Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardHeader className="border-b border-[#E2E8F0] pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-bold text-[#0F172A]">Recent Registrations</CardTitle>
                <CardDescription className="text-[#64748B] text-sm mt-0.5">Latest users who joined the platform.</CardDescription>
              </div>
              <Link href="/dashboard/admin/users">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold text-xs gap-1 rounded-xl">
                  View All <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {recentUsers.map((o, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="h-9 w-9 rounded-full bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center font-bold text-sm shrink-0">
                    {o.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="truncate">
                        <p className="font-bold text-[#0F172A] truncate text-sm">{o.name || "Unknown User"}</p>
                        <p className="text-xs text-[#64748B] truncate">{o.email}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 font-bold uppercase tracking-wider ${
                          o.role === "OWNER"
                            ? "bg-blue-50 text-blue-600 border-blue-200"
                            : o.role === "TENANT"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : "bg-red-50 text-red-600 border-red-200"
                        }`}
                      >
                        {o.role}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      Joined {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
              {recentUsers.length === 0 && (
                <p className="text-sm text-[#64748B] italic">No users registered yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Required */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardHeader className="border-b border-[#E2E8F0] pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  Action Required
                  {alertCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-extrabold rounded-full px-1.5 py-0.5 leading-none">
                      {alertCount}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-[#64748B] text-sm mt-0.5">Items that need your attention.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {pendingPayouts.length > 0 && (
                <Link href="/dashboard/admin/payouts">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors cursor-pointer group">
                    <Banknote className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A]">{pendingPayouts.length} payout request{pendingPayouts.length > 1 ? "s" : ""} pending approval</p>
                      <p className="text-xs text-[#64748B] mt-0.5">Requires admin action · Finance</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-amber-400 group-hover:text-amber-600 shrink-0 mt-0.5 transition-colors" />
                  </div>
                </Link>
              )}
              {pendingProperties.length > 0 && (
                <Link href="/dashboard/admin/properties">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors cursor-pointer group">
                    <Building className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A]">{pendingProperties.length} propert{pendingProperties.length > 1 ? "ies" : "y"} pending approval</p>
                      <p className="text-xs text-[#64748B] mt-0.5">Requires admin action · Listings</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-amber-400 group-hover:text-amber-600 shrink-0 mt-0.5 transition-colors" />
                  </div>
                </Link>
              )}
              {alertCount === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  <p className="text-sm font-semibold text-[#0F172A]">All clear!</p>
                  <p className="text-xs text-[#64748B]">No pending actions required right now.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
        <CardHeader className="border-b border-[#E2E8F0] pb-4">
          <CardTitle className="text-lg font-bold text-[#0F172A]">Quick Navigation</CardTitle>
          <CardDescription className="text-[#64748B]">Jump to any admin section quickly.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {([
              { label: "Users", href: "/dashboard/admin/users", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Properties", href: "/dashboard/admin/properties", icon: Building, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Payouts", href: "/dashboard/admin/payouts", icon: Banknote, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Subscriptions", href: "/dashboard/admin/subscriptions", icon: LayoutGrid, color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Owner Applications", href: "/dashboard/admin/owner-applications", icon: UserPlus, color: "text-orange-600", bg: "bg-orange-50" },
              { label: "Audit Logs", href: "/dashboard/admin/audit-logs", icon: Clock, color: "text-slate-600", bg: "bg-slate-50" },
              { label: "Pricing Tiers", href: "/dashboard/admin/settings/pricing", icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
              { label: "Platform Profit", href: "/dashboard/admin/profit", icon: TrendingUp, color: "text-rose-600", bg: "bg-rose-50" },
            ] as const).map(({ label, href, icon: Icon, color, bg }) => (
              <Link key={href} href={href}>
                <div className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] hover:shadow-sm bg-white hover:bg-[#F8FAFC] transition-all cursor-pointer text-center group">
                  <div className={`p-2.5 rounded-xl ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <span className="text-xs font-semibold text-[#0F172A] group-hover:text-[#334155] leading-tight">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Operations (Manual Cron Trigger Buttons) */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
        <CardHeader className="border-b border-[#E2E8F0] pb-4">
          <CardTitle className="text-lg font-bold text-[#0F172A]">System Operations &amp; Cron Jobs</CardTitle>
          <CardDescription className="text-[#64748B]">
            Trigger background system tasks and cron utilities on-demand. Run these manually during testing or to recover from missed schedules.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* 🟢 Critical Revenue */}
            <div className="space-y-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <h4 className="font-bold text-sm text-slate-800">Monthly Invoice Generation</h4>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                Creates rent invoices for all ACTIVE leases for the upcoming billing period. Run on the 1st of every month.
              </p>
              <Button
                onClick={() => triggerCron("/api/cron/generate-invoices")}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl"
              >
                Run Invoice Generation
              </Button>
            </div>

            <div className="space-y-3 p-4 rounded-xl border border-red-100 bg-red-50/50">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <h4 className="font-bold text-sm text-slate-800">Late Fee Automation</h4>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                Marks overdue invoices past their grace period and auto-creates late fee invoices per lease configuration.
              </p>
              <Button
                onClick={() => triggerCron("/api/cron/late-fees")}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9 rounded-xl"
              >
                Run Late Fee Check
              </Button>
            </div>

            <div className="space-y-3 p-4 rounded-xl border border-amber-100 bg-amber-50/50">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <h4 className="font-bold text-sm text-slate-800">Lease Expiry Engine</h4>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                Auto-expires ACTIVE leases past their end date, frees units to VACANT, and notifies all parties.
              </p>
              <Button
                onClick={() => triggerCron("/api/cron/expire-leases")}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 rounded-xl"
              >
                Run Expiry Engine
              </Button>
            </div>

            <div className="space-y-3 p-4 rounded-xl border border-blue-100 bg-blue-50/50">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <h4 className="font-bold text-sm text-slate-800">Lease Activation Cron</h4>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                Scans SIGNED leases with current or past move-in dates, auto-activates them with prorated invoice logic.
              </p>
              <Button
                onClick={() => triggerCron("/api/cron/lease-activate")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl"
              >
                Run Lease Activation
              </Button>
            </div>

            <div className="space-y-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-slate-400" />
                <h4 className="font-bold text-sm text-slate-800">Renewals Engine</h4>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                Analyzes expiring ACTIVE leases, marks them PENDING_DECISION, and sends renewal notice emails to tenants.
              </p>
              <Button
                onClick={() => triggerCron("/api/cron/renewals")}
                className="w-full bg-[#1E293B] hover:bg-[#0F172A] text-white font-bold text-xs h-9 rounded-xl"
              >
                Run Renewals Engine
              </Button>
            </div>

            <div className="space-y-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-slate-400" />
                <h4 className="font-bold text-sm text-slate-800">Maintenance Link Expiry</h4>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                Auto-closes maintenance requests in PENDING_TENANT_CONFIRMATION with no response within 72 hours.
              </p>
              <Button
                onClick={() => triggerCron("/api/cron/maintenance")}
                className="w-full bg-[#1E293B] hover:bg-[#0F172A] text-white font-bold text-xs h-9 rounded-xl"
              >
                Run Maintenance Audit
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}

