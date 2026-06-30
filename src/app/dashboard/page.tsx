"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building,
  Home,
  DollarSign,
  Users,
  Wrench,
  FileText,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Calendar,
  Wallet,
  Loader2,
  Shield,
  Bell,
  ChevronDown,
  MapPin
} from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const isTenant = role === "TENANT";

  // Landlord Stats State
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Tenant State
  const [leases, setLeases] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null);

  const fetchLandlordStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to refresh dashboard stats");
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchTenantData = async () => {
    setTenantLoading(true);
    try {
      const [leasesRes, invoicesRes, maintRes, docsRes, msgsRes] = await Promise.all([
        fetch("/api/leases"),
        fetch("/api/invoices"),
        fetch("/api/maintenance"),
        fetch("/api/documents"),
        fetch("/api/messages"),
      ]);

      const [leasesData, invoicesData, maintData, docsData, msgsData] = await Promise.all([
        leasesRes.json(),
        invoicesRes.json(),
        maintRes.json(),
        docsRes.json(),
        msgsRes.json(),
      ]);

      setLeases(leasesData);
      setInvoices(invoicesData);
      setMaintenance(maintData);
      setDocuments(docsData);
      setMessages(msgsData);

      if (leasesData.length > 0) {
        const active = leasesData.find((l: any) => l.status === "ACTIVE");
        setSelectedLeaseId(active ? active.id : leasesData[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tenant dashboard data");
    } finally {
      setTenantLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (isTenant) {
      fetchTenantData();
    } else {
      fetchLandlordStats();
    }
  }, [status, isTenant, router]);

  const handleSignLease = async (leaseId: string) => {
    try {
      const res = await fetch(`/api/leases/${leaseId}/sign`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Lease signed successfully! Welcome to your new home.");
        fetchTenantData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to sign lease.");
      }
    } catch (err) {
      toast.error("Error signing lease.");
    }
  };

  if (status === "loading" || (isTenant ? tenantLoading : statsLoading)) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#3B82F6]" />
        <p className="text-slate-400 font-extrabold text-sm uppercase tracking-wider">Loading Dashboard...</p>
      </div>
    );
  }

  if (isTenant) {
    const selectedLease = leases.find((l) => l.id === selectedLeaseId) || leases.find((l) => l.status === "ACTIVE") || leases[0];
    const pendingLease = leases.find((l) => l.status === "PENDING_SIGNATURE");
    const activeLease = leases.find((l) => l.status === "ACTIVE");

    const activeLeasesCount = leases.filter((l) => l.status === "ACTIVE").length;
    const unpaidInvoices = invoices.filter((i) => i.status === "UNPAID" || i.status === "OVERDUE");
    const openRequestsCount = maintenance.filter((m) => m.status !== "RESOLVED" && m.status !== "CLOSED").length;
    const totalMessagesCount = messages.filter((m) => m.receiverId === (session?.user as any).id).length;

    const getGreeting = () => {
      const hr = new Date().getHours();
      if (hr < 12) return "Good morning";
      if (hr < 18) return "Good afternoon";
      return "Good evening";
    };

    const activities: {
      id: string;
      title: string;
      date: Date;
      description: string;
      badgeText: string;
      badgeColor: string;
      icon: React.ReactNode;
      iconBg: string;
    }[] = [];

    unpaidInvoices.forEach((inv) => {
      activities.push({
        id: `invoice-${inv.id}`,
        title: "Rent Reminder",
        date: new Date(inv.dueDate),
        description: `Your rent payment of $${Number(inv.amount).toLocaleString()} is outstanding.`,
        badgeText: "Notification",
        badgeColor: "bg-slate-100 text-[#475569] border border-[#E2E8F0]",
        icon: <DollarSign className="h-4 w-4 text-slate-600" />,
        iconBg: "bg-slate-50 border border-slate-100",
      });
    });

    maintenance.forEach((m) => {
      let badgeCol = "bg-amber-100 text-amber-800";
      if (m.priority === "EMERGENCY" || m.priority === "HIGH") {
        badgeCol = "bg-red-100 text-red-800";
      }
      activities.push({
        id: `maintenance-${m.id}`,
        title: "Maintenance Update",
        date: new Date(m.createdAt),
        description: `${m.title} - Status changed to ${m.status} (Priority: ${m.priority}).`,
        badgeText: "Maintenance",
        badgeColor: `${badgeCol} border border-amber-200/55`,
        icon: <Wrench className="h-4 w-4 text-amber-600" />,
        iconBg: "bg-amber-50 border border-amber-100",
      });
    });

    documents.forEach((d) => {
      activities.push({
        id: `document-${d.id}`,
        title: "Document Uploaded",
        date: new Date(d.uploadedAt),
        description: `New lease document '${d.name}' (${d.category}) has been uploaded successfully.`,
        badgeText: "Document",
        badgeColor: "bg-blue-100 text-blue-800 border border-blue-200/55",
        icon: <FileText className="h-4 w-4 text-blue-600" />,
        iconBg: "bg-blue-50 border border-blue-100",
      });
    });

    activities.sort((a, b) => b.date.getTime() - a.date.getTime());
    const latestActivities = activities.slice(0, 5);

    return (
      <div className="w-full max-w-7xl mx-auto pt-6 space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div>
            <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">
              {getGreeting()}, {session?.user?.name || "Tenant"}!
            </h1>
            <p className="text-[#64748B] text-sm mt-1">Welcome to your tenant overview</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {leases.length > 0 && (
              <div className="relative w-full md:w-auto min-w-[220px]">
                <select
                  value={selectedLeaseId || ""}
                  onChange={(e) => setSelectedLeaseId(e.target.value)}
                  className="appearance-none bg-white border border-[#E2E8F0] text-[#0F172A] font-bold px-4 py-2.5 pr-10 rounded-xl shadow-sm focus:outline-none focus:border-[#3B82F6] cursor-pointer text-sm w-full"
                >
                  {leases.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.unit?.property?.name ? `${l.unit.property.name} - ${l.unit.name}` : `Lease ${l.id.slice(0, 8)}`} ({l.status})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] pointer-events-none" />
              </div>
            )}
            <Button
              onClick={fetchTenantData}
              variant="outline"
              className="bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] rounded-xl font-bold flex items-center gap-2 h-[42px] px-4 shadow-sm w-full md:w-auto"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>

        {/* Action Pending alert if pending lease */}
        {pendingLease && (
          <Card className="bg-amber-50 border border-amber-200 rounded-[24px] shadow-sm overflow-hidden p-6">
            <CardHeader className="pb-4 p-0">
              <CardTitle className="text-lg font-extrabold flex items-center gap-2 text-amber-900">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Action Required: Lease Pending Signature
              </CardTitle>
              <CardDescription className="text-amber-700 text-xs font-semibold">
                You have a pending lease contract for {pendingLease.unit?.name} at {pendingLease.unit?.property?.name}.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 p-0 space-y-4 text-sm">
              <div className="flex justify-between pb-3 border-b border-amber-200/50">
                <span className="text-amber-700">Monthly Rent</span>
                <strong className="text-amber-900 font-extrabold">${Number(pendingLease.monthlyRent).toLocaleString()}</strong>
              </div>
              <Button
                onClick={() => handleSignLease(pendingLease.id)}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-11 rounded-xl shadow-sm transition-colors mt-2"
              >
                Accept & Sign Lease Contract
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm flex flex-col justify-between h-[130px]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">Active Leases</span>
              <div className="p-2.5 bg-[#EFF6FF] text-[#3B82F6] rounded-xl">
                <Home className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-[#0F172A] tracking-tight">{activeLeasesCount}</h3>
              <p className="text-xs text-[#64748B] font-medium mt-1">
                {leases.length === 1 ? "1 total lease" : `${leases.length} total leases`}
              </p>
            </div>
          </Card>

          <Card className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm flex flex-col justify-between h-[130px]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">Outstanding Payments</span>
              <div className="p-2.5 bg-[#FFFBEB] text-[#D97706] rounded-xl">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-[#0F172A] tracking-tight">{unpaidInvoices.length}</h3>
              <p className="text-xs text-[#64748B] font-medium mt-1">{invoices.length} total payments</p>
            </div>
          </Card>

          <Card className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm flex flex-col justify-between h-[130px]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">Maintenance Requests</span>
              <div className="p-2.5 bg-[#ECFEFF] text-[#0891B2] rounded-xl">
                <Wrench className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-[#0F172A] tracking-tight">{openRequestsCount}</h3>
              <p className="text-xs text-[#64748B] font-medium mt-1">{openRequestsCount} open requests</p>
            </div>
          </Card>

          <Card className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm flex flex-col justify-between h-[130px]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">Notifications</span>
              <div className="p-2.5 bg-[#FEF2F2] text-[#DC2626] rounded-xl">
                <Bell className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-[#0F172A] tracking-tight">{unpaidInvoices.length}</h3>
              <p className="text-xs text-[#64748B] font-medium mt-1">
                {unpaidInvoices.length === 1 ? "1 unread message" : `${unpaidInvoices.length} unread messages`}
              </p>
            </div>
          </Card>
        </div>

        {/* Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Lease Snapshot Card */}
          <Card className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="pb-4 border-b border-[#F1F5F9] mb-5">
                <h2 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                  <Shield className="h-4.5 w-4.5 text-[#3B82F6]" />
                  Lease Snapshot
                </h2>
                <span className="text-xs text-[#64748B]">Essential details about your lease</span>
              </div>
              
              <div className="space-y-5">
                {selectedLease ? (
                  <>
                    <div>
                      <span className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest block mb-1">
                        Property
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-xl font-black text-[#0F172A]">
                          {selectedLease.unit?.property?.name || "Unknown Property"}
                        </strong>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          selectedLease.status === "ACTIVE" 
                            ? "bg-[#DCFCE7] text-[#15803D]" 
                            : "bg-[#FEF9C3] text-[#A16207]"
                        }`}>
                          {selectedLease.status}
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5 mt-2 text-[#64748B]">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                        <span className="text-xs leading-relaxed">
                          {selectedLease.unit?.property?.address ? (
                            `${selectedLease.unit.property.address}, ${selectedLease.unit.property.city}, ${selectedLease.unit.property.state || ""} ${selectedLease.unit.property.zip || ""}`
                          ) : (
                            "No address provided"
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="h-px bg-[#F1F5F9]" />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest block mb-1">
                          Lease Period
                        </span>
                        <strong className="text-xs font-bold text-[#0F172A] block mt-0.5">
                          {new Date(selectedLease.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – {new Date(selectedLease.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest block mb-1">
                          Monthly Rent
                        </span>
                        <strong className="text-sm font-black text-[#3B82F6] block mt-0.5">
                          ${Number(selectedLease.monthlyRent).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-[#64748B] italic">No active lease details available.</div>
                )}
              </div>
            </div>

            {/* Repair Panel */}
            <div className="mt-8 pt-6 border-t border-[#F1F5F9]">
              <Card className="bg-[#3B82F6] text-white border-0 rounded-[20px] p-5 relative overflow-hidden shadow-sm">
                <div className="absolute -right-8 -top-8 h-28 w-28 bg-white/10 rounded-full blur-xl animate-pulse" />
                <h3 className="text-sm font-extrabold mb-1.5 text-white">Need Help or Repairs?</h3>
                <p className="text-[11px] text-blue-100 leading-relaxed mb-4">
                  Submit a request with description and pictures, and we will check the problem immediately.
                </p>
                <Button
                  onClick={() => router.push("/dashboard/maintenance/new")}
                  className="w-full bg-white text-[#3B82F6] hover:bg-slate-100 font-extrabold rounded-xl text-xs h-10 transition-colors shadow-sm"
                >
                  File Maintenance Ticket
                </Button>
              </Card>
            </div>
          </Card>

          {/* Latest Activity Card */}
          <Card className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm p-6 flex flex-col justify-between">
            <div className="w-full">
              <div className="pb-4 border-b border-[#F1F5F9] mb-5">
                <h2 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                  <Bell className="h-4.5 w-4.5 text-amber-500 bg-amber-50 p-0.5 rounded" />
                  Latest Activity
                </h2>
                <span className="text-xs text-[#64748B]">Recent notifications and maintenance updates</span>
              </div>

              <div className="space-y-4 overflow-y-auto max-h-[380px] pr-1">
                {latestActivities.length === 0 ? (
                  <div className="text-center py-12 text-[#64748B] italic font-semibold">No recent activity.</div>
                ) : (
                  latestActivities.map((act) => (
                    <div key={act.id} className="p-4 border border-[#E2E8F0] rounded-2xl bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.01)] transition-all flex flex-col gap-2">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${act.iconBg} flex items-center justify-center`}>
                            {act.icon}
                          </div>
                          <span className="font-extrabold text-sm text-[#0F172A]">{act.title}</span>
                        </div>
                        <span className="text-[10px] text-[#94A3B8] font-bold">
                          {act.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] leading-relaxed">
                        {act.description}
                      </p>
                      <div className="flex items-center mt-1">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${act.badgeColor} uppercase tracking-wider`}>
                          {act.badgeText}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Owner/Admin view
  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">
            Good afternoon, {session?.user?.name || "Admin"}!
          </h1>
          <p className="text-[#64748B] mt-1 text-sm">Here's what's happening with your property portfolio</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchLandlordStats}
            disabled={statsLoading}
            className="bg-white border border-[#E2E8F0] shadow-sm text-[#0F172A] hover:bg-[#F8FAFC] rounded-xl flex items-center gap-2 font-semibold h-11 px-5"
          >
            <RefreshCw className={`h-4 w-4 ${statsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm rounded-xl flex items-center gap-2 font-semibold h-11 px-5">
            <BarChart3 className="h-4 w-4" />
            Reports
          </Button>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#FEF9C3] border border-[#FEF08A] rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 text-[#CA8A04]">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-bold">Overdue Payments</p>
              <p className="text-xs mt-0.5 opacity-90">{stats?.overduePayments || 0} payments are overdue</p>
            </div>
          </div>
          <span className="text-xl font-black text-[#CA8A04]">{stats?.overduePayments || 0}</span>
        </div>
        <div className="bg-[#FEE2E2] border border-[#FECACA] rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 text-[#DC2626]">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-bold">Urgent Maintenance</p>
              <p className="text-xs mt-0.5 opacity-90">
                {stats?.urgentMaintenance ? `${stats.urgentMaintenance} urgent maintenance requests` : "No urgent maintenance requests"}
              </p>
            </div>
          </div>
          <span className="text-xl font-black text-[#DC2626]">{stats?.urgentMaintenance || 0}</span>
        </div>
        <div className="bg-[#E0F2FE] border border-[#BAE6FD] rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 text-[#0284C7]">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-bold">Expiring Leases</p>
              <p className="text-xs mt-0.5 opacity-90">{stats?.leaseRenewals || 0} leases expiring within the next 30 days</p>
            </div>
          </div>
          <span className="text-xl font-black text-[#0284C7]">{stats?.leaseRenewals || 0}</span>
        </div>
      </div>

      {/* 10 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 pt-2">
        <MetricCard title="Total Properties" value={stats?.totalProperties ?? "-"} subtext="Active properties in portfolio" Icon={Building} iconBg="bg-[#EFF6FF]" iconColor="text-[#3B82F6]" />
        <MetricCard title="Occupancy Rate" value={stats ? `${stats.occupancyRate}%` : "-"} subtext={`${stats?.occupiedUnits ?? 0} of ${stats?.totalUnits ?? 0} units occupied`} Icon={Home} iconBg="bg-[#DCFCE7]" iconColor="text-[#22C55E]" />
        <MetricCard title="Monthly Revenue" value={stats ? `$${stats.monthlyRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"} subtext="Current month collected" Icon={DollarSign} iconBg="bg-[#DCFCE7]" iconColor="text-[#22C55E]" />
        <MetricCard title="Collection Rate" value={stats ? `${stats.collectionRate}%` : "-"} subtext="Payment collection efficiency" Icon={Wallet} iconBg="bg-[#E0F2FE]" iconColor="text-[#0EA5E9]" />
        <MetricCard title="Active Tenants" value={stats?.activeTenantsCount ?? "-"} subtext="0 pending applications" Icon={Users} iconBg="bg-[#EFF6FF]" iconColor="text-[#3B82F6]" />

        <MetricCard title="Maintenance Requests" value={stats?.totalMaintenance ?? "-"} subtext={`${stats?.urgentMaintenance ?? 0} urgent`} Icon={Wrench} iconBg="bg-[#FEF9C3]" iconColor="text-[#EAB308]" />
        <MetricCard title="Vacant Units" value={stats?.vacantUnits ?? "-"} subtext={stats ? `${stats.vacancyRate}% vacancy rate` : "-"} Icon={Home} iconBg="bg-[#FEE2E2]" iconColor="text-[#EF4444]" />
        <MetricCard title="Average Rent" value={stats ? `$${stats.averageRent?.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"} subtext="Per unit monthly average" Icon={DollarSign} iconBg="bg-[#DCFCE7]" iconColor="text-[#22C55E]" />
        <MetricCard title="Lease Renewals" value={stats?.leaseRenewals ?? "-"} subtext="Due in next 30 days" Icon={FileText} iconBg="bg-[#FEF9C3]" iconColor="text-[#EAB308]" />
        <MetricCard title="Recent Events" value={stats?.recentEvents ?? "-"} subtext="0 urgent activities" Icon={Calendar} iconBg="bg-[#E0F2FE]" iconColor="text-[#0EA5E9]" />
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtext, Icon, iconBg, iconColor }: any) {
  return (
    <Card className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm font-extrabold text-[#0F172A] leading-tight pr-4">{title}</p>
          <div className={`p-2 rounded-xl ${iconBg} ${iconColor} shrink-0`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-black text-[#0F172A] tracking-tight">{value}</h3>
          <p className="text-[11px] text-[#64748B] mt-1 font-semibold">{subtext}</p>
        </div>
      </CardContent>
    </Card>
  );
}

