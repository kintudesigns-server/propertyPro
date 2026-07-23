"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  MapPin,
  CheckCircle2,
  Lock,
  Unlock,
  PenTool,
  Key,
  Banknote,
  Plus,
  Activity,
  TrendingUp,
  ChevronRight,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const isTenant = role === "TENANT";

  // Landlord Stats State
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<string | null>(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  // Tenant State
  const [leases, setLeases] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null);

  const getLeaseProgress = (lease: any) => {
    if (!lease?.startDate || !lease?.endDate) return 0;
    const start = new Date(lease.startDate).getTime();
    const end = new Date(lease.endDate).getTime();
    const now = Date.now();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  };

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
      fetch("/api/subscription/rules")
        .then(res => (res.ok ? res.json() : null))
        .then(rules => {
          if (rules) {
            setIsPaused(!!rules.isPaused);
            setPausedAt(rules.pausedAt || null);
            
            // Check recently reactivated
            const userId = (session?.user as any)?.id;
            if (!rules.isPaused && rules.pausedAt && userId) {
              const dismissedKey = `dismissed_welcome_${userId}`;
              if (!localStorage.getItem(dismissedKey)) {
                setShowWelcomeBack(true);
              }
            }
          }
        })
        .catch(() => {});
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
    const onboardingLease = leases.find(l => {
      if (l.status === "PENDING_SIGNATURE") return true;
      if (l.status === "ACTIVE") {
        const unpaidDeposit = invoices.find(i => i.leaseId === l.id && Number(i.amount) === Number(l.securityDeposit) && (i.status === "UNPAID" || i.status === "OVERDUE"));
        return !!unpaidDeposit;
      }
      return false;
    });

    const activeLeasesCount = leases.filter((l) => l.status === "ACTIVE").length;
    const unpaidInvoices = invoices.filter((i) => i.status === "UNPAID" || i.status === "OVERDUE");
    const openRequestsCount = maintenance.filter((m) => m.status !== "RESOLVED" && m.status !== "CLOSED").length;
    const totalMessagesCount = messages.filter((m) => m.receiverId === (session?.user as any).id).length;
    const pendingConfirmations = maintenance.filter((m) => m.status === "PENDING_TENANT_CONFIRMATION");

    const getGreeting = () => {
      const hr = new Date().getHours();
      if (hr < 12) return "Good morning";
      if (hr < 18) return "Good afternoon";
      return "Good evening";
    };

    // Rent due countdown
    const nextRentInvoice = unpaidInvoices
      .filter(i => {
        const lease = leases.find((l: any) => l.id === i.leaseId);
        return !(lease && Number(i.amount) === Number(lease.securityDeposit));
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    const daysUntilRent = nextRentInvoice
      ? Math.ceil((new Date(nextRentInvoice.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    const leaseProgress = getLeaseProgress(selectedLease);
    const daysUntilLeaseEnd = selectedLease?.endDate
      ? Math.ceil((new Date(selectedLease.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    // Human readable maintenance status map
    const statusLabel: Record<string, { text: string; color: string; dot: string }> = {
      SUBMITTED:                { text: "Submitted — under review",     color: "text-slate-600",   dot: "bg-slate-400"   },
      UNASSIGNED:               { text: "Awaiting assignment",          color: "text-orange-600",  dot: "bg-orange-400"  },
      ASSIGNED:                 { text: "Inspector assigned",           color: "text-blue-600",    dot: "bg-blue-400"    },
      DIAGNOSIS_SCHEDULED:      { text: "Visit scheduled",              color: "text-indigo-600",  dot: "bg-indigo-400"  },
      DIAGNOSIS_COMPLETE:       { text: "Diagnosed — vendor coming",    color: "text-teal-600",    dot: "bg-teal-400"    },
      AWAITING_APPROVAL:        { text: "Quote pending approval",       color: "text-amber-600",   dot: "bg-amber-400"   },
      APPROVED:                 { text: "Work approved",                color: "text-emerald-600", dot: "bg-emerald-400" },
      REPAIR_SCHEDULED:         { text: "Repair scheduled",             color: "text-purple-600",  dot: "bg-purple-400"  },
      IN_PROGRESS:              { text: "Repair in progress",           color: "text-blue-600",    dot: "bg-blue-400"    },
      PENDING_TENANT_CONFIRMATION: { text: "⚡ Needs your confirmation", color: "text-rose-600",  dot: "bg-rose-500"    },
      RESOLVED:                 { text: "Resolved",                     color: "text-emerald-600", dot: "bg-emerald-400" },
      CLOSED:                   { text: "Closed",                       color: "text-slate-400",   dot: "bg-slate-300"   },
    };

    // Build prioritized activity feed
    const activities: {
      id: string; title: string; date: Date; description: string;
      badgeText: string; badgeColor: string; icon: React.ReactNode;
      iconBg: string; urgent?: boolean; action?: () => void; actionLabel?: string;
    }[] = [];

    unpaidInvoices.forEach((inv) => {
      const lease = leases.find((l: any) => l.id === inv.leaseId);
      const isDeposit = lease && Number(inv.amount) === Number(lease.securityDeposit);
      const daysLeft = Math.ceil((new Date(inv.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysLeft < 0;
      activities.push({
        id: `invoice-${inv.id}`,
        title: isDeposit ? "Security Deposit Due" : "Rent Payment Due",
        date: new Date(inv.dueDate),
        description: isDeposit
          ? `Your $${Number(inv.amount).toLocaleString()} security deposit is outstanding.`
          : isOverdue
            ? `Your $${Number(inv.amount).toLocaleString()} rent is ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? "s" : ""} overdue.`
            : `Your $${Number(inv.amount).toLocaleString()} rent is due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.`,
        badgeText: isOverdue ? "Overdue" : "Payment Due",
        badgeColor: isOverdue ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200",
        icon: <DollarSign className="h-4 w-4 text-red-600" />,
        iconBg: "bg-red-50 border border-red-100",
        urgent: true,
        action: () => router.push("/dashboard/payments/pay-rent"),
        actionLabel: "Pay Now →",
      });
    });

    maintenance.forEach((m) => {
      const isPendingConfirm = m.status === "PENDING_TENANT_CONFIRMATION";
      const isEmergency = m.priority === "EMERGENCY";
      activities.push({
        id: `maintenance-${m.id}`,
        title: m.title,
        date: new Date(m.updatedAt || m.createdAt),
        description: statusLabel[m.status]?.text || m.status.replace(/_/g, " "),
        badgeText: isPendingConfirm ? "Action Required" : isEmergency ? "Emergency" : m.priority.charAt(0) + m.priority.slice(1).toLowerCase(),
        badgeColor: isPendingConfirm
          ? "bg-rose-100 text-rose-700 border-rose-200"
          : isEmergency
            ? "bg-red-100 text-red-700 border-red-200"
            : "bg-amber-50 text-amber-700 border-amber-200",
        icon: <Wrench className={`h-4 w-4 ${isPendingConfirm ? "text-rose-600" : "text-amber-600"}`} />,
        iconBg: isPendingConfirm ? "bg-rose-50 border border-rose-100" : "bg-amber-50 border border-amber-100",
        urgent: isPendingConfirm,
        action: isPendingConfirm ? () => router.push(`/dashboard/maintenance/${m.id}`) : undefined,
        actionLabel: isPendingConfirm ? "Confirm Repair →" : undefined,
      });
    });

    documents.forEach((d) => {
      activities.push({
        id: `document-${d.id}`,
        title: d.name,
        date: new Date(d.uploadedAt),
        description: `New document added to your lease • ${d.category}`,
        badgeText: "Document",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        icon: <FileText className="h-4 w-4 text-blue-600" />,
        iconBg: "bg-blue-50 border border-blue-100",
      });
    });

    activities.sort((a, b) => {
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      return b.date.getTime() - a.date.getTime();
    });
    const latestActivities = activities.slice(0, 6);

    return (
      <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20 px-4 sm:px-0">

        {/* ── HERO HEADER ── */}
        <div className="relative overflow-hidden rounded-3xl bg-[#0F172A] shadow-2xl border border-slate-800/80">
          <div className="absolute top-0 right-0 -mr-24 -mt-24 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-600/20 to-indigo-600/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-violet-600/15 to-emerald-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 p-7 md:p-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              {/* Greeting */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 mb-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-[11px] font-bold text-emerald-400 tracking-widest uppercase">Tenant Portal Active</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                  {getGreeting()},{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
                    {session?.user?.name?.split(" ")[0] || "Tenant"}
                  </span>
                  !
                </h1>
                {selectedLease && (
                  <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    {selectedLease.unit?.property?.name} • Unit {selectedLease.unit?.name}
                  </p>
                )}
              </div>

              {/* Right — Rent Countdown + Refresh */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                {daysUntilRent !== null && (
                  <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border font-bold text-sm min-w-[200px] ${
                    daysUntilRent <= 0
                      ? "bg-red-500/20 border-red-500/40 text-red-300"
                      : daysUntilRent <= 5
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                        : "bg-white/8 border-white/15 text-white"
                  }`}>
                    <Calendar className="h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-70">Next Rent Due</p>
                      <p className="font-black text-base">
                        {daysUntilRent <= 0 ? `${Math.abs(daysUntilRent)}d overdue` : `${daysUntilRent} days`}
                      </p>
                    </div>
                  </div>
                )}
                {leases.length > 1 && (
                  <Select value={selectedLeaseId || ""} onValueChange={(v) => setSelectedLeaseId(v)}>
                    <SelectTrigger className="h-[50px] rounded-2xl bg-white/10 border-white/20 text-white font-bold px-4 backdrop-blur-md text-sm min-w-[200px]">
                      <SelectValue placeholder="Select Lease" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl bg-white">
                      {leases.map((l) => (
                        <SelectItem key={l.id} value={l.id} className="rounded-lg font-medium text-slate-700">
                          {l.unit?.property?.name ? `${l.unit.property.name} — ${l.unit.name}` : `Lease ${l.id.slice(0, 8)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  onClick={fetchTenantData}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/15 border-white/20 text-white font-bold rounded-2xl h-[50px] px-5 gap-2 backdrop-blur-md transition-all"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── MOVE-IN CHECKLIST ── */}
        {onboardingLease && (() => {
          const step = onboardingLease.status === "PENDING_SIGNATURE" ? 1 : 2;
          return (
            <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 via-white to-purple-50/30 p-6 border-b border-indigo-100/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
                    <Key className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-indigo-950">Move-In Checklist</h2>
                    <p className="text-sm font-medium text-indigo-600/80">
                      Complete these final steps to secure <strong>Unit {onboardingLease.unit?.name}</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-indigo-100 shadow-sm shrink-0">
                  <div className="relative h-10 w-10">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E0E7FF" strokeWidth="4" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#4F46E5" strokeWidth="4"
                        strokeDasharray={`${((step - 1) / 2) * 100} 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-indigo-900">
                      {Math.round(((step - 1) / 2) * 100)}%
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progress</p>
                    <p className="text-sm font-black text-indigo-950">Step {step} of 3</p>
                  </div>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    n: 1, label: "Sign Lease", desc: "Review terms and digitally sign your contract.",
                    done: step > 1,
                    active: step === 1,
                    action: () => router.push(`/dashboard/leases/${onboardingLease.id}`),
                    actionLabel: "Review & Sign",
                    icon: <PenTool className="h-4 w-4" />,
                  },
                  {
                    n: 2, label: "Pay Deposit", desc: `Pay your $${Number(onboardingLease.securityDeposit).toLocaleString()} security deposit.`,
                    done: false,
                    active: step === 2,
                    action: () => router.push("/dashboard/payments/pay-rent"),
                    actionLabel: "Pay Now",
                    icon: <Banknote className="h-4 w-4" />,
                  },
                  {
                    n: 3, label: "Lease Activated", desc: "You're all set — enjoy your new home!",
                    done: false, active: false, locked: true,
                    icon: <CheckCircle2 className="h-4 w-4" />,
                  },
                ].map((s) => (
                  <div key={s.n} className={`p-5 rounded-2xl border transition-all ${
                    s.done ? "bg-emerald-50 border-emerald-200" :
                    s.active ? "bg-indigo-50 border-indigo-200 shadow-sm" :
                    "bg-slate-50 border-slate-200 opacity-50"
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black ${
                        s.done ? "bg-emerald-500 text-white" :
                        s.active ? "bg-indigo-600 text-white" :
                        "bg-slate-300 text-slate-500"
                      }`}>
                        {s.done ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                      </div>
                      <p className={`font-black text-sm ${s.done ? "text-emerald-800" : s.active ? "text-indigo-900" : "text-slate-500"}`}>
                        {s.label}
                      </p>
                      {s.done && <span className="ml-auto text-[9px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-wider">Done</span>}
                    </div>
                    <p className="text-xs font-medium text-slate-500 mb-3 leading-relaxed">{s.desc}</p>
                    {s.active && s.action && (
                      <Button onClick={s.action} className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm">
                        {s.icon} {s.actionLabel}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── ATTENTION REQUIRED BANNER ── */}
        {pendingConfirmations.length > 0 && (
          <div className="flex items-center gap-4 p-5 bg-rose-50 border border-rose-200 rounded-2xl shadow-sm">
            <div className="h-11 w-11 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-rose-900 text-sm">
                {pendingConfirmations.length} repair{pendingConfirmations.length > 1 ? "s" : ""} waiting for your confirmation!
              </p>
              <p className="text-rose-600 text-xs font-medium mt-0.5">
                A technician has completed work on your unit. Please confirm the repairs were done to your satisfaction.
              </p>
            </div>
            <Button
              onClick={() => router.push(`/dashboard/maintenance/${pendingConfirmations[0].id}`)}
              className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl h-9 px-4 text-xs shadow-sm"
            >
              Review Now →
            </Button>
          </div>
        )}

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "My Lease",
              value: activeLeasesCount > 0 ? "Active" : "No Lease",
              sub: activeLeasesCount > 0 ? `${leases.length} total lease${leases.length !== 1 ? "s" : ""}` : "Browse listings",
              icon: <Home className="h-5 w-5" />,
              iconClass: "bg-blue-50 text-blue-600",
              accent: "border-l-blue-500",
              urgent: false,
              onClick: () => router.push("/dashboard/leases/my-leases"),
            },
            {
              label: "Balance Due",
              value: unpaidInvoices.length > 0
                ? `$${unpaidInvoices.reduce((s, i) => s + Number(i.amount), 0).toLocaleString()}`
                : "Paid",
              sub: unpaidInvoices.length > 0 ? `${unpaidInvoices.length} unpaid invoice${unpaidInvoices.length !== 1 ? "s" : ""}` : "All invoices paid ✓",
              icon: <Wallet className="h-5 w-5" />,
              iconClass: unpaidInvoices.length > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600",
              accent: unpaidInvoices.length > 0 ? "border-l-red-500" : "border-l-emerald-400",
              urgent: unpaidInvoices.length > 0,
              onClick: () => router.push("/dashboard/payments/pay-rent"),
            },
            {
              label: "Maintenance",
              value: openRequestsCount,
              sub: openRequestsCount > 0 ? `${openRequestsCount} open request${openRequestsCount !== 1 ? "s" : ""}` : "No open requests",
              icon: <Wrench className="h-5 w-5" />,
              iconClass: "bg-amber-50 text-amber-600",
              accent: "border-l-amber-400",
              urgent: false,
              onClick: () => router.push("/dashboard/maintenance/my-requests"),
            },
            {
              label: "Messages",
              value: totalMessagesCount,
              sub: totalMessagesCount > 0 ? `${totalMessagesCount} message${totalMessagesCount !== 1 ? "s" : ""}` : "No messages",
              icon: <Bell className="h-5 w-5" />,
              iconClass: "bg-violet-50 text-violet-600",
              accent: "border-l-violet-400",
              urgent: false,
              onClick: () => router.push("/dashboard/messages"),
            },
          ].map((card) => (
            <div
              key={card.label}
              onClick={card.onClick}
              className={`bg-white rounded-2xl p-5 border border-slate-200/80 border-l-4 ${card.accent} shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 group ${card.urgent ? "ring-1 ring-red-200" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{card.label}</span>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${card.iconClass} group-hover:scale-110 transition-transform`}>
                  {card.icon}
                </div>
              </div>
              <p className={`text-2xl font-black tracking-tight mb-0.5 ${card.urgent ? "text-red-600" : "text-slate-900"}`}>
                {card.value}
              </p>
              <p className="text-xs font-semibold text-slate-500">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* ── MAIN CONTENT GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* LEFT — My Home Card (3 cols) */}
          <div className="lg:col-span-3 space-y-5">

            {/* Lease Details */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Your Home</p>
                    <h2 className="text-xl font-black text-white">{selectedLease?.unit?.property?.name || "No Active Lease"}</h2>
                    {selectedLease && (
                      <p className="text-slate-400 text-xs font-medium mt-1 flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        {selectedLease.unit?.property?.address}, {selectedLease.unit?.property?.city}, {selectedLease.unit?.property?.state}
                      </p>
                    )}
                  </div>
                  {selectedLease && (
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${
                      selectedLease.status === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}>
                      {selectedLease.status === "ACTIVE" ? "Active" : selectedLease.status.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              </div>

              {selectedLease ? (
                <div className="p-6 space-y-5">
                  {/* Key lease data */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Monthly Rent</p>
                      <p className="text-xl font-black text-indigo-600">
                        ${Number(selectedLease.monthlyRent).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Unit</p>
                      <p className="text-xl font-black text-slate-900">{selectedLease.unit?.name || "—"}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 col-span-2 sm:col-span-1">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                        {daysUntilLeaseEnd !== null && daysUntilLeaseEnd > 0 ? `Expires in ${daysUntilLeaseEnd}d` : "Lease Period"}
                      </p>
                      <p className="text-sm font-black text-slate-900 leading-tight">
                        {new Date(selectedLease.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} —{" "}
                        {new Date(selectedLease.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {/* Lease progress bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-slate-500">Lease Progress</p>
                      <p className="text-xs font-black text-slate-700">{leaseProgress}% complete</p>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                        style={{ width: `${leaseProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Pay rent CTA if due */}
                  {unpaidInvoices.length > 0 && (
                    <Button
                      onClick={() => router.push("/dashboard/payments/pay-rent")}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl h-12 text-sm shadow-md shadow-red-200/50 transition-all hover:scale-[1.01]"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Pay Rent — ${unpaidInvoices.reduce((s, i) => s + Number(i.amount), 0).toLocaleString()} Due
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-slate-500 font-medium text-sm">No active lease found.</p>
                  <Button onClick={() => router.push("/listings")} className="mt-4 bg-indigo-600 text-white font-bold rounded-xl h-10 px-6 text-sm">
                    Browse Listings
                  </Button>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "File a Repair Request",
                    desc: "Report any maintenance issue",
                    icon: <Wrench className="h-5 w-5" />,
                    bg: "bg-indigo-50 hover:bg-indigo-100",
                    text: "text-indigo-700",
                    action: () => router.push("/dashboard/maintenance/new"),
                    primary: true,
                  },
                  {
                    label: "Pay Rent",
                    desc: "View & pay invoices",
                    icon: <DollarSign className="h-5 w-5" />,
                    bg: unpaidInvoices.length > 0 ? "bg-red-50 hover:bg-red-100" : "bg-emerald-50 hover:bg-emerald-100",
                    text: unpaidInvoices.length > 0 ? "text-red-700" : "text-emerald-700",
                    action: () => router.push("/dashboard/payments/pay-rent"),
                  },
                  {
                    label: "View Lease Docs",
                    desc: "Access signed documents",
                    icon: <FileText className="h-5 w-5" />,
                    bg: "bg-blue-50 hover:bg-blue-100",
                    text: "text-blue-700",
                    action: () => router.push("/dashboard/leases/my-leases"),
                  },
                  {
                    label: "Track Maintenance",
                    desc: "Check request status",
                    icon: <Settings className="h-5 w-5" />,
                    bg: "bg-amber-50 hover:bg-amber-100",
                    text: "text-amber-700",
                    action: () => router.push("/dashboard/maintenance/my-requests"),
                  },
                ].map((qa) => (
                  <button
                    key={qa.label}
                    onClick={qa.action}
                    className={`${qa.bg} rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm group`}
                  >
                    <div className={`${qa.text} mb-2 group-hover:scale-110 transition-transform inline-block`}>{qa.icon}</div>
                    <p className={`text-sm font-black ${qa.text} leading-tight`}>{qa.label}</p>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">{qa.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — Activity Feed (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-500" />
                  Recent Activity
                </h2>
                <p className="text-xs font-medium text-slate-400 mt-0.5">Updates on your account</p>
              </div>
              {activities.filter(a => a.urgent).length > 0 && (
                <span className="h-5 w-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                  {activities.filter(a => a.urgent).length}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-50 px-2 py-1">
              {latestActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                    <Bell className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">All caught up!</p>
                  <p className="text-xs text-slate-400 mt-1">No recent activity to show.</p>
                </div>
              ) : (
                latestActivities.map((act) => (
                  <div key={act.id} className={`px-4 py-4 transition-all hover:bg-slate-50/80 group ${act.urgent ? "bg-rose-50/30 hover:bg-rose-50/50" : ""}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl ${act.iconBg} flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform`}>
                        {act.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-sm font-bold text-slate-800 truncate">{act.title}</p>
                          <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                            {act.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 leading-relaxed">{act.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${act.badgeColor} uppercase tracking-wider`}>
                            {act.badgeText}
                          </span>
                          {act.action && act.actionLabel && (
                            <button
                              onClick={act.action}
                              className="text-[11px] font-black text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                              {act.actionLabel}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {activities.length > 6 && (
              <div className="p-4 border-t border-slate-100">
                <button
                  onClick={() => router.push("/dashboard/activity-logs")}
                  className="w-full text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors text-center py-1"
                >
                  View all activity →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Owner/Admin view
  const defaultChartData = [
    { name: "Jan", revenue: 0 },
    { name: "Feb", revenue: 0 },
    { name: "Mar", revenue: 0 },
    { name: "Apr", revenue: 0 },
    { name: "May", revenue: 0 },
    { name: "Jun", revenue: 0 },
  ];
  const chartData = stats?.revenueHistory?.length ? stats.revenueHistory : defaultChartData;

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20">
      {isPaused && (
        <div className="bg-[#FFF9E6] border border-[#FFE0A3] rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[#B25E00] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-[#5C3300] text-sm">Account Suspension Warning</h3>
              <p className="text-xs text-[#804400] font-semibold mt-0.5">
                Your portfolio is currently restricted because your subscription is paused due to a billing issue.
              </p>
              {(() => {
                if (!pausedAt) return null;
                const pausedDate = new Date(pausedAt);
                const archivalDate = new Date(pausedDate.getTime() + 60 * 24 * 60 * 60 * 1000);
                const now = new Date();
                const diffTime = archivalDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 0) {
                  return <p className="text-xs font-semibold text-red-600 mt-1">Flagged for manual database archival review due to prolonged inactivity.</p>;
                } else {
                  return <p className="text-xs font-semibold text-amber-700 mt-1">{diffDays} days remaining before database archival review.</p>;
                }
              })()}
            </div>
          </div>
          <Link href="/dashboard/owner/billing">
            <Button className="bg-[#B25E00] hover:bg-[#804400] text-white font-bold rounded-xl text-xs px-4 h-9 shadow-xs whitespace-nowrap">
              Reactivate Subscription
            </Button>
          </Link>
        </div>
      )}

      {showWelcomeBack && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-950 text-sm">🎉 Welcome Back!</h3>
              <p className="text-xs text-emerald-800 mt-1 font-semibold leading-relaxed">
                Your subscription has been successfully reactivated. Here is what accumulated while you were paused:
              </p>
              <ul className="text-xs text-emerald-800 font-semibold mt-2 list-disc list-inside space-y-1">
                <li>{stats?.pendingToursCount || 0} pending tour requests</li>
                <li>{stats?.pendingApplicationsCount || 0} tenant applications awaiting review</li>
                <li>{stats?.openMaintenanceCount || 0} active maintenance tickets</li>
              </ul>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              const userId = (session?.user as any)?.id;
              if (userId) {
                localStorage.setItem(`dismissed_welcome_${userId}`, "true");
              }
              setShowWelcomeBack(false);
            }} 
            className="text-emerald-700 hover:bg-emerald-100 rounded-xl font-extrabold text-xs"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Premium Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0F172A] p-6 md:p-8 shadow-xl border border-slate-800">
        {/* Glowing Gradient Background Blobs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-semibold text-white tracking-wide uppercase">
                {stats?.subscriptionTier || "Hobbyist"} Plan • {stats?.subscriptionStatus === "active" ? "Active" : "Trial"}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 font-bold">{session?.user?.name ? session.user.name.split(' ')[0] : "Admin"}</span>!
            </h1>
            {stats && (
              <p className="text-slate-300 text-sm font-medium">
                Portfolio Revenue: <span className="text-emerald-400 font-semibold">${stats.monthlyRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> this month
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={fetchLandlordStats}
              disabled={statsLoading}
              className="bg-white/10 hover:bg-white/15 transition-colors border border-white/20 text-white font-semibold rounded-xl shadow-sm backdrop-blur-md cursor-pointer text-xs w-full sm:w-auto h-[42px] px-4"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${statsLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button 
              onClick={() => router.push("/dashboard/accounting/invoices")}
              className="bg-white hover:bg-slate-100 text-[#0F172A] border-0 rounded-xl font-semibold flex items-center gap-1.5 h-[42px] px-4 shadow-md w-full sm:w-auto transition-transform hover:scale-[1.02] active:scale-95 text-xs"
            >
              <BarChart3 className="h-3.5 w-3.5" /> Financials
            </Button>
          </div>
        </div>
      </div>

      {/* Setup Checklist if no properties */}
      {stats?.totalProperties === 0 && (
        <Card className="relative bg-[#0F172A] border border-slate-800 rounded-3xl shadow-xl overflow-hidden mb-6">
          <div className="relative z-10 p-6 md:p-8 border-b border-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-md mb-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                </span>
                <span className="text-[10px] font-semibold text-white tracking-wide uppercase">Onboarding Active</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold text-white flex items-center gap-3 tracking-tight">
                Welcome to PropertyPro!
              </h2>
              <p className="text-slate-400 mt-2 font-medium max-w-2xl text-base leading-relaxed">
                Let's get your portfolio set up so you can start managing properties and collecting rent online. Complete these steps to unlock your dashboard.
              </p>
            </div>
            
            <div className="flex flex-col items-start md:items-end w-full md:w-auto bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 backdrop-blur-sm">
              <span className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Setup Progress</span>
              <div className="flex items-center gap-3">
                <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${(( (stats?.profileComplete ? 1 : 0) + (stats?.totalProperties > 0 ? 1 : 0) + (stats?.bankConnected ? 1 : 0) ) / 3) * 100}%` }}></div>
                </div>
                <span className="font-semibold text-white text-lg">{(stats?.profileComplete ? 1 : 0) + (stats?.totalProperties > 0 ? 1 : 0) + (stats?.bankConnected ? 1 : 0)}<span className="text-slate-500">/3</span></span>
              </div>
            </div>
          </div>
          
          <div className="p-6 md:p-8 space-y-3.5 bg-slate-900/30">
            <div 
              className={`flex items-center justify-between p-4.5 rounded-xl border transition-all duration-300 cursor-pointer group ${stats?.profileComplete ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-slate-800 bg-slate-800/40 hover:border-blue-500/50 hover:bg-blue-500/10'}`}
              onClick={() => router.push('/dashboard/owner#settings')}
            >
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors shadow-sm ${stats?.profileComplete ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400 group-hover:bg-blue-500/20 group-hover:text-blue-400'}`}>
                  {stats?.profileComplete ? <CheckCircle2 className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                </div>
                <div>
                  <h4 className={`font-semibold text-lg ${stats?.profileComplete ? 'text-emerald-400 line-through opacity-70' : 'text-white group-hover:text-blue-400 transition-colors'}`}>Complete Landlord Profile</h4>
                  <p className={`text-xs mt-0.5 font-medium ${stats?.profileComplete ? 'text-emerald-500/60' : 'text-slate-400'}`}>Set your entity type (Individual or Business) and support contact info.</p>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 transition-transform group-hover:translate-x-1 ${stats?.profileComplete ? 'text-emerald-500/50' : 'text-slate-600 group-hover:text-blue-500'}`} />
            </div>

            <div 
              className={`flex items-center justify-between p-4.5 rounded-xl border transition-all duration-300 cursor-pointer group ${stats?.totalProperties > 0 ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-slate-800 bg-slate-800/40 hover:border-emerald-500/50 hover:bg-emerald-500/10'}`}
              onClick={() => router.push('/dashboard/properties/new')}
            >
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors shadow-sm ${stats?.totalProperties > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-400'}`}>
                  {stats?.totalProperties > 0 ? <CheckCircle2 className="h-6 w-6" /> : <Home className="h-6 w-6" />}
                </div>
                <div>
                  <h4 className={`font-semibold text-lg ${stats?.totalProperties > 0 ? 'text-emerald-400 line-through opacity-70' : 'text-white group-hover:text-emerald-400 transition-colors'}`}>Add Your First Property</h4>
                  <p className={`text-xs mt-0.5 font-medium ${stats?.totalProperties > 0 ? 'text-emerald-500/60' : 'text-slate-400'}`}>Create a property, set up rentable units, and track occupancy.</p>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 transition-transform group-hover:translate-x-1 ${stats?.totalProperties > 0 ? 'text-emerald-500/50' : 'text-slate-600 group-hover:text-emerald-500'}`} />
            </div>

            <div 
              className={`flex items-center justify-between p-4.5 rounded-xl border transition-all duration-300 cursor-pointer group ${stats?.bankConnected ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-slate-800 bg-slate-800/40 hover:border-purple-500/50 hover:bg-purple-500/10'}`}
              onClick={() => router.push('/dashboard/accounting/wallet')}
            >
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors shadow-sm ${stats?.bankConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400 group-hover:bg-purple-500/20 group-hover:text-purple-400'}`}>
                  {stats?.bankConnected ? <CheckCircle2 className="h-6 w-6" /> : <Wallet className="h-6 w-6" />}
                </div>
                <div>
                  <h4 className={`font-semibold text-lg ${stats?.bankConnected ? 'text-emerald-400 line-through opacity-70' : 'text-white group-hover:text-purple-400 transition-colors'}`}>Connect Bank Account</h4>
                  <p className={`text-xs mt-0.5 font-medium ${stats?.bankConnected ? 'text-emerald-500/60' : 'text-slate-400'}`}>Link your account to securely receive online rent payments via Stripe.</p>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 transition-transform group-hover:translate-x-1 ${stats?.bankConnected ? 'text-emerald-500/50' : 'text-slate-600 group-hover:text-purple-500'}`} />
            </div>
          </div>
        </Card>
      )}

      {/* Critical Status Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overdue Invoices Alert */}
        <div 
          onClick={() => router.push('/dashboard/accounting/invoices')}
          className="bg-amber-50/40 border border-amber-200/50 rounded-2xl p-4 flex items-center justify-between shadow-xs cursor-pointer hover:bg-amber-50/70 hover:-translate-y-0.5 hover:border-amber-300 transition-all duration-200 group"
        >
          <div className="flex items-center gap-3 text-slate-800">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm leading-snug">Overdue Invoices</p>
              <p className="text-xs mt-0.5 text-slate-500 font-medium">{stats?.overduePayments || 0} behind schedule</p>
            </div>
          </div>
          <div className="flex items-center justify-center h-7 px-2.5 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold">
            {stats?.overduePayments || 0}
          </div>
        </div>

        {/* Urgent Repairs Alert */}
        <div 
          onClick={() => router.push('/dashboard/maintenance')}
          className="bg-rose-50/40 border border-rose-200/50 rounded-2xl p-4 flex items-center justify-between shadow-xs cursor-pointer hover:bg-rose-50/70 hover:-translate-y-0.5 hover:border-rose-300 transition-all duration-200 group"
        >
          <div className="flex items-center gap-3 text-slate-800">
            <div className="p-2.5 bg-rose-500/10 text-rose-600 rounded-xl">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm leading-snug">Urgent Repairs</p>
              <p className="text-xs mt-0.5 text-slate-500 font-medium">
                {stats?.urgentMaintenance ? `${stats.urgentMaintenance} emergency open` : "All systems normal"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center h-7 px-2.5 rounded-full bg-rose-500/10 text-rose-700 text-xs font-bold">
            {stats?.urgentMaintenance || 0}
          </div>
        </div>

        {/* Expiring Leases Alert */}
        <div 
          onClick={() => router.push('/dashboard/leases')}
          className="bg-blue-50/40 border border-blue-200/50 rounded-2xl p-4 flex items-center justify-between shadow-xs cursor-pointer hover:bg-blue-50/70 hover:-translate-y-0.5 hover:border-blue-300 transition-all duration-200 group"
        >
          <div className="flex items-center gap-3 text-slate-800">
            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm leading-snug">Expiring Leases</p>
              <p className="text-xs mt-0.5 text-slate-500 font-medium">Renewals needed within 30 days</p>
            </div>
          </div>
          <div className="flex items-center justify-center h-7 px-2.5 rounded-full bg-blue-500/10 text-blue-700 text-xs font-bold">
            {stats?.leaseRenewals || 0}
          </div>
        </div>
      </div>

      {/* Top 5 Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <KpiCard title="Properties Managed" value={stats?.totalProperties ?? "-"} subtext="Active properties in portfolio" icon={Building} variant="blue" />
        <KpiCard title="Occupancy Rate" value={stats ? `${stats.occupancyRate}%` : "-"} subtext={`${stats?.occupiedUnits ?? 0} of ${stats?.totalUnits ?? 0} units occupied`} icon={Home} variant="green" />
        <KpiCard title="Monthly Revenue" value={stats ? `$${Math.round(stats.monthlyRevenue || 0).toLocaleString()}` : "-"} subtext="Current month collected" icon={DollarSign} variant="emerald" />
        <KpiCard title="Collection Rate" value={stats ? `${stats.collectionRate}%` : "-"} subtext="Payment collection efficiency" icon={Wallet} variant="indigo" />
        <KpiCard title="Active Tenants" value={stats?.activeTenantsCount ?? "-"} subtext="Occupants under contract" icon={Users} variant="purple" />
      </div>

      {/* Split Analytics and Operations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Revenue trend chart & secondary metrics (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Revenue Chart Card */}
          <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4 pb-4 border-b border-[#F2F2F7]">
                <div>
                  <h2 className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
                    <TrendingUp className="h-4.5 w-4.5 text-[#34C759]" />
                    Revenue Trend
                  </h2>
                  <span className="text-xs font-medium text-[#8E8E93] mt-0.5 block">Monthly collected rent payments • Last 6 Months</span>
                </div>
              </div>

              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34C759" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#34C759" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5EA" opacity={0.6} />
                    <XAxis dataKey="name" stroke="#8E8E93" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                    <YAxis stroke="#8E8E93" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1D1D1F", borderRadius: "12px", border: "none" }}
                      labelStyle={{ color: "#8E8E93", fontWeight: 700, fontSize: "12px" }}
                      itemStyle={{ color: "#FFFFFF", fontWeight: 600, fontSize: "13px" }}
                      formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#34C759" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Secondary Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard title="Vacant Units" value={stats?.vacantUnits ?? "-"} subtext={stats ? `${stats.vacancyRate}% vacancy` : "-"} icon={Home} variant="red" />
            <KpiCard title="Average Rent" value={stats ? `$${Math.round(stats.averageRent || 0).toLocaleString()}` : "-"} subtext="Per unit average" icon={DollarSign} variant="emerald" />
            <KpiCard title="Total Maintenance" value={stats?.totalMaintenance ?? "-"} subtext={`${stats?.urgentMaintenance ?? 0} urgent requests`} icon={Wrench} variant="amber" />
            <KpiCard title="Events & Logs" value={stats?.recentEvents ?? "-"} subtext="Recent activities logged" icon={Calendar} variant="slate" />
          </div>

        </div>

        {/* Right Column: Quick Operations & Recent Tickets (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Quick Actions Panel */}
          <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl p-6">
            <h2 className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2 mb-4 pb-4 border-b border-[#F2F2F7]">
              <Activity className="h-4.5 w-4.5 text-[#007AFF]" />
              Quick Actions
            </h2>
            
            <div className="grid grid-cols-2 gap-3.5">
              <button
                onClick={() => router.push("/dashboard/properties/new")}
                className="h-[90px] bg-[#F2F2F7] hover:bg-[#E5E5EA]/80 text-[#1D1D1F] font-semibold flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer border border-transparent hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0"
              >
                <div className="p-2 bg-[#007AFF] text-white rounded-lg shadow-sm">
                  <Building className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold text-[#1D1D1F] mt-2">Add Property</span>
              </button>
              <button
                onClick={() => router.push("/dashboard/owner?tab=settings")}
                className="h-[90px] bg-[#F2F2F7] hover:bg-[#E5E5EA]/80 text-[#1D1D1F] font-semibold flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer border border-transparent hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0"
              >
                <div className="p-2 bg-[#AF52DE] text-white rounded-lg shadow-sm">
                  <Users className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold text-[#1D1D1F] mt-2">Invite Tenant</span>
              </button>
              <button
                onClick={() => router.push("/dashboard/accounting/wallet")}
                className="h-[90px] bg-[#F2F2F7] hover:bg-[#E5E5EA]/80 text-[#1D1D1F] font-semibold flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer border border-transparent hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0"
              >
                <div className="p-2 bg-[#FF9500] text-white rounded-lg shadow-sm">
                  <Wallet className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold text-[#1D1D1F] mt-2">Payout Wallet</span>
              </button>
              <button
                onClick={() => router.push("/dashboard/owner/billing")}
                className="h-[90px] bg-[#F2F2F7] hover:bg-[#E5E5EA]/80 text-[#1D1D1F] font-semibold flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer border border-transparent hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0"
              >
                <div className="p-2 bg-[#34C759] text-white rounded-lg shadow-sm">
                  <Settings className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold text-[#1D1D1F] mt-2">Stripe Billing</span>
              </button>
            </div>
          </Card>

          {/* Recent Maintenance Tickets Feed */}
          <Card className="bg-white border border-[#E5E5EA] shadow-xs rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2 mb-4 pb-4 border-b border-[#F2F2F7]">
                <div className="p-1.5 bg-[#FF9500]/10 rounded-lg text-[#FF9500]">
                  <Wrench className="h-4 w-4" />
                </div>
                Recent Tickets
              </h2>

              <div className="divide-y divide-[#F2F2F7]">
                {!stats?.recentMaintenanceRequests?.length ? (
                  <div className="text-center py-8 bg-[#F2F2F7]/50 rounded-xl border border-dashed border-[#E5E5EA]">
                    <p className="text-[#8E8E93] font-medium text-xs">No maintenance requests open.</p>
                  </div>
                ) : (
                  stats.recentMaintenanceRequests.map((req: any) => {
                    const isHigh = req.priority === "HIGH" || req.priority === "EMERGENCY";
                    const isMedium = req.priority === "MEDIUM";
                    const tint = isHigh ? { bg: "bg-[#FF3B30]/10", text: "text-[#FF3B30]" } : isMedium ? { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]" } : { bg: "bg-[#007AFF]/10", text: "text-[#007AFF]" };
                    return (
                      <div 
                        key={req.id} 
                        onClick={() => router.push("/dashboard/maintenance")}
                        className="py-3 flex items-center justify-between hover:bg-[#F2F2F7]/30 transition-all cursor-pointer group px-1 rounded-lg"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${isHigh ? 'bg-[#FF3B30]' : isMedium ? 'bg-[#FF9500]' : 'bg-[#007AFF]'}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1D1D1F] truncate group-hover:text-[#007AFF] transition-colors">{req.title}</p>
                            <p className="text-xs text-[#8E8E93] font-medium mt-0.5">Unit {req.unit?.name || "N/A"} • {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${tint.bg} ${tint.text}`}>
                          {req.priority}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Card>

        </div>

      </div>
    </div>
  );
}

