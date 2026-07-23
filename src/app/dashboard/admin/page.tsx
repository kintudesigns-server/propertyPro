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
        <p className="text-[#6E6E73] font-bold text-sm uppercase tracking-wider">Loading admin portal...</p>
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1D1D1F]">
            Admin Control Center
          </h1>
          <p className="text-sm text-[#6E6E73] mt-1">
            Real-time platform operations, owner onboarding, and financial management
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchAdminData()}
            className="text-[#6E6E73] hover:bg-[#F0F0F0]"
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/dashboard/admin/owner-applications">
            <Button variant="outline" className="border-[#FF9500]/30 text-[#C45E00] bg-[#FFF8EE] hover:bg-[#FFF2DF] font-semibold text-xs rounded-lg flex items-center gap-1.5 h-9">
              <UserPlus className="h-3.5 w-3.5" /> Applications
              {pendingProperties.length > 0 && (
                <Badge className="bg-[#FF9500] text-white text-[10px] ml-1 px-1.5 py-0">
                  {pendingProperties.length}
                </Badge>
              )}
            </Button>
          </Link>
          <Link href="/dashboard/admin/users/new">
            <Button className="bg-[#007AFF] hover:bg-[#0066D9] text-white font-semibold rounded-lg flex items-center gap-1.5 h-9 px-4 shadow-xs">
              <UserPlus className="h-3.5 w-3.5" /> Add User
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      {(() => {
        const activeSubscribersCount = userList.filter((u) => u.role === "OWNER" && (u.subscriptionStatus === "Active" || u.subscriptionStatus === "Trialing" || u.subscriptionStatus === "Active (Canceling)")).length;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard
              href="/dashboard/admin/users"
              title="Total Users"
              value={totalUsers}
              subtext={`${ownerCount} owners · ${tenantCount} tenants`}
              icon={Users}
              variant="blue"
            />

            <KpiCard
              href="/dashboard/admin/properties"
              title="Properties"
              value={Array.isArray(properties) ? properties.length : 0}
              subtext={`${approvedProperties.length} approved · ${pendingProperties.length} pending`}
              icon={Building}
              variant="green"
            />

            <KpiCard
              href="/dashboard/admin/profit"
              title="Platform Profit"
              value={`$${(profitData?.totalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              subtext="Net commissions"
              icon={TrendingUp}
              variant="emerald"
            />

            <KpiCard
              href="/dashboard/admin/payouts"
              title="Pending Payouts"
              value={pendingPayouts.length}
              subtext={pendingPayouts.length > 0 ? "Require admin action" : "All payouts settled"}
              icon={Banknote}
              variant={pendingPayouts.length > 0 ? "orange" : "slate"}
            />

            <KpiCard
              href="/dashboard/admin/billing"
              title="Billing (SaaS)"
              value={activeSubscribersCount > 0 ? `${activeSubscribersCount} active` : "0 active"}
              subtext="SaaS MRR Intelligence"
              icon={CreditCard}
              variant="blue"
            />
          </div>
        );
      })()}

      {/* Overview Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations */}
        <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl">
          <CardHeader className="border-b border-[#E5E5EA] pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-bold text-[#1D1D1F]">Recent Registrations</CardTitle>
                <CardDescription className="text-[#6E6E73] text-sm mt-0.5">Latest users who joined the platform.</CardDescription>
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
                  <div className="h-9 w-9 rounded-full bg-[#DBEAFE] text-[#0062CC] flex items-center justify-center font-bold text-sm shrink-0">
                    {o.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="truncate">
                        <p className="font-bold text-[#1D1D1F] truncate text-sm">{o.name || "Unknown User"}</p>
                        <p className="text-xs text-[#6E6E73] truncate">{o.email}</p>
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
                <p className="text-sm text-[#6E6E73] italic">No users registered yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Required */}
        <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl">
          <CardHeader className="border-b border-[#E5E5EA] pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-bold text-[#1D1D1F] flex items-center gap-2">
                  Action Required
                  {alertCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-extrabold rounded-full px-1.5 py-0.5 leading-none">
                      {alertCount}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-[#6E6E73] text-sm mt-0.5">Items that need your attention.</CardDescription>
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
                      <p className="text-sm font-semibold text-[#1D1D1F]">{pendingPayouts.length} payout request{pendingPayouts.length > 1 ? "s" : ""} pending approval</p>
                      <p className="text-xs text-[#6E6E73] mt-0.5">Requires admin action · Finance</p>
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
                      <p className="text-sm font-semibold text-[#1D1D1F]">{pendingProperties.length} propert{pendingProperties.length > 1 ? "ies" : "y"} pending approval</p>
                      <p className="text-xs text-[#6E6E73] mt-0.5">Requires admin action · Listings</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-amber-400 group-hover:text-amber-600 shrink-0 mt-0.5 transition-colors" />
                  </div>
                </Link>
              )}
              {alertCount === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  <p className="text-sm font-semibold text-[#1D1D1F]">All clear!</p>
                  <p className="text-xs text-[#6E6E73]">No pending actions required right now.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl">
        <CardHeader className="border-b border-[#E5E5EA] pb-4">
          <CardTitle className="text-lg font-bold text-[#1D1D1F]">Quick Navigation</CardTitle>
          <CardDescription className="text-[#6E6E73]">Jump to any admin section quickly.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {([
              { label: "Users", href: "/dashboard/admin/users", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Properties", href: "/dashboard/admin/properties", icon: Building, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Payouts", href: "/dashboard/admin/payouts", icon: Banknote, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Subscriptions", href: "/dashboard/admin/subscriptions", icon: LayoutGrid, color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Owner Applications", href: "/dashboard/admin/owner-applications", icon: UserPlus, color: "text-orange-600", bg: "bg-orange-50" },
              { label: "Audit Logs", href: "/dashboard/admin/audit-logs", icon: Clock, color: "text-[#6E6E73]", bg: "bg-[#F5F5F7]" },
              { label: "Pricing Tiers", href: "/dashboard/admin/settings/pricing", icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
              { label: "Platform Profit", href: "/dashboard/admin/profit", icon: TrendingUp, color: "text-rose-600", bg: "bg-rose-50" },
            ] as const).map(({ label, href, icon: Icon, color, bg }) => (
              <Link key={href} href={href}>
                <div className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-[#E5E5EA] hover:border-[#CBD5E1] hover:shadow-sm bg-white hover:bg-[#F2F2F7] transition-all cursor-pointer text-center group">
                  <div className={`p-2.5 rounded-xl ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <span className="text-xs font-semibold text-[#1D1D1F] group-hover:text-[#334155] leading-tight">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Operations (Manual Cron Trigger Buttons) */}
      <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl">
        <CardHeader className="border-b border-[#E5E5EA] pb-4">
          <CardTitle className="text-lg font-bold text-[#1D1D1F]">System Operations &amp; Cron Jobs</CardTitle>
          <CardDescription className="text-[#6E6E73]">
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
              <p className="text-xs text-[#6E6E73] leading-normal">
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
              <p className="text-xs text-[#6E6E73] leading-normal">
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
              <p className="text-xs text-[#6E6E73] leading-normal">
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
              <p className="text-xs text-[#6E6E73] leading-normal">
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
              <p className="text-xs text-[#6E6E73] leading-normal">
                Analyzes expiring ACTIVE leases, marks them PENDING_DECISION, and sends renewal notice emails to tenants.
              </p>
              <Button
                onClick={() => triggerCron("/api/cron/renewals")}
                className="w-full bg-[#1E293B] hover:bg-[#1D1D1F] text-white font-bold text-xs h-9 rounded-xl"
              >
                Run Renewals Engine
              </Button>
            </div>

            <div className="space-y-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-slate-400" />
                <h4 className="font-bold text-sm text-slate-800">Maintenance Link Expiry</h4>
              </div>
              <p className="text-xs text-[#6E6E73] leading-normal">
                Auto-closes maintenance requests in PENDING_TENANT_CONFIRMATION with no response within 72 hours.
              </p>
              <Button
                onClick={() => triggerCron("/api/cron/maintenance")}
                className="w-full bg-[#1E293B] hover:bg-[#1D1D1F] text-white font-bold text-xs h-9 rounded-xl"
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

