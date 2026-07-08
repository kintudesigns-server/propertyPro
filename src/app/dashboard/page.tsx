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
    const onboardingLease = leases.find(l => {
      if (l.status === "PENDING_SIGNATURE") return true;
      if (l.status === "ACTIVE") {
        const unpaidDeposit = invoices.find(i => i.leaseId === l.id && Number(i.amount) === Number(l.securityDeposit) && (i.status === "UNPAID" || i.status === "OVERDUE"));
        return !!unpaidDeposit;
      }
      return false;
    });
    const activeLease = leases.find((l) => l.status === "ACTIVE" && (!onboardingLease || onboardingLease.id !== l.id));

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
      const lease = leases.find((l: any) => l.id === inv.leaseId);
      const isDeposit = lease && Number(inv.amount) === Number(lease.securityDeposit);
      activities.push({
        id: `invoice-${inv.id}`,
        title: isDeposit ? "Deposit Reminder" : "Rent Reminder",
        date: new Date(inv.dueDate),
        description: isDeposit
          ? `Your security deposit of $${Number(inv.amount).toLocaleString()} is outstanding.`
          : `Your rent payment of $${Number(inv.amount).toLocaleString()} is outstanding.`,
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
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-[32px] bg-[#0F172A] p-8 md:p-10 shadow-2xl border border-slate-800">
          {/* Abstract Background Shapes */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-gradient-to-tr from-blue-500/20 to-emerald-500/20 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-white tracking-wide uppercase">Tenant Portal Active</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{session?.user?.name?.split(' ')[0] || "Tenant"}</span>!
              </h1>
              <p className="text-slate-300 text-base md:text-lg max-w-xl font-medium">
                Manage your lease, track maintenance, and review documents all in one unified experience.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
              {leases.length > 0 && (
                <div className="relative w-full sm:w-auto min-w-[260px]">
                  <select
                    value={selectedLeaseId || ""}
                    onChange={(e) => setSelectedLeaseId(e.target.value)}
                    className="appearance-none bg-white/10 hover:bg-white/15 transition-colors border border-white/20 text-white font-bold px-5 py-3.5 pr-12 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-md cursor-pointer text-sm w-full"
                  >
                    {leases.map((l) => (
                      <option key={l.id} value={l.id} className="text-slate-900 font-medium">
                        {l.unit?.property?.name ? `${l.unit.property.name} - ${l.unit.name}` : `Lease ${l.id.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70 pointer-events-none" />
                </div>
              )}
              <Button
                onClick={fetchTenantData}
                variant="outline"
                className="bg-white hover:bg-slate-100 text-[#0F172A] border-0 rounded-2xl font-bold flex items-center gap-2 h-[50px] px-6 shadow-xl w-full sm:w-auto transition-transform hover:scale-[1.02] active:scale-95"
              >
                <RefreshCw className="h-4 w-4" /> Refresh Data
              </Button>
            </div>
          </div>
        </div>

        {/* Move-In Progress Tracker for Pending Lease */}
        {onboardingLease && (() => {
          const step = onboardingLease.status === "PENDING_SIGNATURE" ? 1 : 2;

          return (
            <Card className="bg-white border-0 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden mb-6 ring-1 ring-slate-100">
              <div className="bg-gradient-to-r from-indigo-50 to-white p-8 border-b border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-indigo-950 flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 rounded-xl shadow-sm">
                      <Key className="h-5 w-5 text-white" />
                    </div>
                    Move-In Checklist
                  </h2>
                  <p className="text-base font-medium text-indigo-700/80 mt-2">Complete these final steps to secure <strong className="text-indigo-900">Unit {onboardingLease.unit?.name}</strong>.</p>
                </div>
                <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-indigo-100 shadow-sm">
                  <div className="w-12 h-12 rounded-full border-4 border-indigo-100 flex items-center justify-center relative overflow-hidden">
                    <svg className="absolute inset-0 w-full h-full text-indigo-600" viewBox="0 0 36 36">
                      <path
                        className="stroke-current"
                        strokeWidth="4"
                        strokeDasharray={`${(step - 1) * 50}, 100`}
                        strokeLinecap="round"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="text-xs font-black text-indigo-950 relative z-10">{Math.round(((step - 1) / 2) * 100)}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Progress</span>
                    <span className="text-sm font-black text-indigo-950">Step {step} of 3</span>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="space-y-0 relative before:absolute before:inset-0 before:ml-[23px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-100 before:via-indigo-100 before:to-transparent">
                  
                  {/* Step 1: Signature */}
                  <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group transition-opacity duration-300 ${step === 1 ? 'opacity-100' : 'opacity-70'}`}>
                    
                    <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors">
                      {step > 1 ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <PenTool className="h-5 w-5" />}
                    </div>

                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-3xl bg-white border border-slate-100 shadow-sm mb-6 group-hover:shadow-md transition-all group-hover:border-indigo-100">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`text-lg font-black ${step === 1 ? 'text-indigo-950' : 'text-slate-900'}`}>1. Lease Agreement</h3>
                        {step > 1 && <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] uppercase tracking-widest font-bold rounded-full border border-emerald-100">Signed</span>}
                      </div>
                      <p className="text-sm font-medium text-slate-500 mb-4 leading-relaxed">
                        Review the financial terms, early termination policy, and digitally sign the legally binding contract.
                      </p>
                      {step === 1 && (
                        <Button
                          onClick={() => router.push(`/dashboard/leases/${onboardingLease.id}`)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 w-full sm:w-auto px-6 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 animate-pulse"
                        >
                          <PenTool className="h-5 w-5 mr-2" /> Review & Sign Lease
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Deposit */}
                  <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group transition-opacity duration-300 ${step === 2 ? 'opacity-100' : 'opacity-50'}`}>
                    
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors ${step === 2 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                      {step === 2 ? <Banknote className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                    </div>

                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-3xl bg-white border border-slate-100 shadow-sm mb-6 group-hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`text-lg font-black ${step === 2 ? 'text-amber-950' : 'text-slate-500'}`}>2. Security Deposit</h3>
                        {step < 2 && <span className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-bold rounded-full border border-slate-200">Locked</span>}
                      </div>
                      <p className="text-sm font-medium text-slate-500 mb-4 leading-relaxed">
                        Secure the unit by paying your refundable security deposit of <strong className="text-slate-700">${Number(onboardingLease.securityDeposit).toLocaleString()}</strong>.
                      </p>
                      {step === 2 ? (
                        <Button
                          onClick={() => router.push('/dashboard/payments/pay-rent')}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-12 w-full sm:w-auto px-6 rounded-xl shadow-lg shadow-amber-200 transition-all hover:-translate-y-0.5"
                        >
                          <Banknote className="h-5 w-5 mr-2" /> Pay Deposit Now
                        </Button>
                      ) : (
                        <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <Lock className="h-4 w-4" /> Locked until lease is signed
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Activation */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group opacity-40">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-slate-100 text-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <Lock className="h-4 w-4" />
                    </div>

                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-3xl bg-slate-50/50 border border-slate-100 shadow-sm mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-black text-slate-500">3. Final Activation</h3>
                      </div>
                      <p className="text-sm font-medium text-slate-500 leading-relaxed">
                        Once signed, your lease will become active. You will gain access to your official signed PDF and receive move-in instructions.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </Card>
          )
        })()}

        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border-0 ring-1 ring-slate-100 rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between h-[150px] transition-transform hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Leases</span>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm">
                <Home className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h3 className="text-4xl font-black text-slate-900 tracking-tight">{activeLeasesCount}</h3>
              <p className="text-sm text-slate-500 font-semibold mt-1">
                {leases.length === 1 ? "1 total lease" : `${leases.length} total leases`}
              </p>
            </div>
          </Card>

          <Card className="bg-white border-0 ring-1 ring-slate-100 rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between h-[150px] transition-transform hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Unpaid Balance</span>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shadow-sm">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h3 className="text-4xl font-black text-slate-900 tracking-tight">
                ${unpaidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0).toLocaleString()}
              </h3>
              <p className="text-sm text-slate-500 font-semibold mt-1">{unpaidInvoices.length} due invoices</p>
            </div>
          </Card>

          <Card className="bg-white border-0 ring-1 ring-slate-100 rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between h-[150px] transition-transform hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Open Requests</span>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm">
                <Wrench className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h3 className="text-4xl font-black text-slate-900 tracking-tight">{openRequestsCount}</h3>
              <p className="text-sm text-slate-500 font-semibold mt-1">Active maintenance</p>
            </div>
          </Card>

          <Card className="bg-white border-0 ring-1 ring-slate-100 rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between h-[150px] transition-transform hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">New Messages</span>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shadow-sm">
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
          <Card className="bg-white border-0 ring-1 ring-slate-100 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 flex flex-col justify-between">
            <div>
              <div className="pb-6 border-b border-slate-100 mb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-indigo-500" />
                    Lease Snapshot
                  </h2>
                  <span className="text-sm font-medium text-slate-500 mt-1 block">Essential details about your current lease</span>
                </div>
              </div>
              
              <div className="space-y-6">
                {selectedLease ? (
                  <>
                    <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">
                        Property
                      </span>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <strong className="text-xl font-black text-slate-900">
                          {selectedLease.unit?.property?.name || "Unknown Property"}
                        </strong>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${
                          selectedLease.status === "ACTIVE" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}>
                          {selectedLease.status}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 mt-2 text-slate-500">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-indigo-400" />
                        <span className="text-sm font-medium leading-relaxed">
                          {selectedLease.unit?.property?.address ? (
                            `${selectedLease.unit.property.address}, ${selectedLease.unit.property.city}, ${selectedLease.unit.property.state || ""} ${selectedLease.unit.property.zip || ""}`
                          ) : (
                            "No address provided"
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">
                          Lease Period
                        </span>
                        <strong className="text-sm font-bold text-slate-900 block mt-0.5">
                          {new Date(selectedLease.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – {new Date(selectedLease.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </strong>
                      </div>
                      <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">
                          Monthly Rent
                        </span>
                        <strong className="text-lg font-black text-indigo-600 block mt-0.5">
                          ${Number(selectedLease.monthlyRent).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-500 font-medium">No active lease details available.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Repair Panel */}
            <div className="mt-8 pt-8 border-t border-slate-100">
              <Card className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-0 rounded-3xl p-6 relative overflow-hidden shadow-xl shadow-indigo-200/50">
                <div className="absolute -right-8 -top-8 h-32 w-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -left-8 -bottom-8 h-24 w-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
                
                <h3 className="text-lg font-black mb-2 text-white relative z-10">Need Help or Repairs?</h3>
                <p className="text-sm text-indigo-100 leading-relaxed mb-6 font-medium relative z-10">
                  Submit a request with description and pictures, and our maintenance team will address it immediately.
                </p>
                <Button
                  onClick={() => router.push("/dashboard/maintenance/new")}
                  className="w-full bg-white text-indigo-700 hover:bg-slate-50 font-black rounded-xl text-sm h-12 transition-all shadow-sm relative z-10 hover:scale-[1.02] active:scale-[0.98]"
                >
                  File Maintenance Ticket
                </Button>
              </Card>
            </div>
          </Card>

          {/* Latest Activity Card */}
          <Card className="bg-white border-0 ring-1 ring-slate-100 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 flex flex-col justify-between">
            <div className="w-full h-full flex flex-col">
              <div className="pb-6 border-b border-slate-100 mb-6">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Bell className="h-4 w-4 text-amber-600" />
                  </div>
                  Latest Activity
                </h2>
                <span className="text-sm font-medium text-slate-500 mt-2 block">Recent notifications and updates on your account</span>
              </div>

              <div className="space-y-4 overflow-y-auto pr-2 flex-grow custom-scrollbar">
                {latestActivities.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex-grow flex items-center justify-center">
                    <p className="text-slate-500 font-medium">No recent activity to show.</p>
                  </div>
                ) : (
                  latestActivities.map((act) => (
                    <div key={act.id} className="p-5 border border-slate-100 rounded-2xl bg-white hover:border-indigo-100 hover:shadow-md transition-all group flex flex-col gap-3">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${act.iconBg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                            {act.icon}
                          </div>
                          <span className="font-bold text-slate-900">{act.title}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-bold bg-slate-50 px-2.5 py-1 rounded-lg">
                          {act.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-500 leading-relaxed ml-11">
                        {act.description}
                      </p>
                      <div className="flex items-center mt-1 ml-11">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-md ${act.badgeColor} uppercase tracking-widest border-none ring-1 ring-black/5`}>
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
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-8 pb-20">
      {/* Premium Header Banner */}
      <div className="relative overflow-hidden rounded-[32px] bg-[#0F172A] p-8 md:p-10 shadow-2xl border border-slate-800">
        {/* Glowing Gradient Background Blobs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black text-white tracking-wide uppercase">
                {stats?.subscriptionTier || "Hobbyist"} Plan • {stats?.subscriptionStatus === "active" ? "Active" : "Trial"}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{session?.user?.name ? session.user.name.split(' ')[0] : "Admin"}</span>!
            </h1>
            <p className="text-slate-300 text-base md:text-lg max-w-xl font-medium">
              Here's what's happening with your property portfolio today.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
            <Button
              variant="outline"
              onClick={fetchLandlordStats}
              disabled={statsLoading}
              className="bg-white/10 hover:bg-white/15 transition-colors border border-white/20 text-white font-bold rounded-2xl shadow-sm backdrop-blur-md cursor-pointer text-sm w-full sm:w-auto h-[50px] px-6"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button 
              onClick={() => router.push("/dashboard/accounting/invoices")}
              className="bg-white hover:bg-slate-100 text-[#0F172A] border-0 rounded-2xl font-bold flex items-center gap-2 h-[50px] px-6 shadow-xl w-full sm:w-auto transition-transform hover:scale-[1.02] active:scale-95"
            >
              <BarChart3 className="h-4 w-4" /> Financials
            </Button>
          </div>
        </div>
      </div>

      {/* Setup Checklist if no properties */}
      {stats?.totalProperties === 0 && (
        <Card className="relative bg-[#0F172A] border border-slate-800 rounded-[32px] shadow-2xl overflow-hidden mb-6">
          <div className="relative z-10 p-8 md:p-10 border-b border-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span className="text-xs font-bold text-white tracking-wide uppercase">Onboarding Active</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3 tracking-tight">
                Welcome to PropertyPro!
              </h2>
              <p className="text-slate-400 mt-3 font-medium max-w-2xl text-lg leading-relaxed">
                Let's get your portfolio set up so you can start managing properties and collecting rent online. Complete these steps to unlock your dashboard.
              </p>
            </div>
            
            <div className="flex flex-col items-start md:items-end w-full md:w-auto bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
              <span className="text-xs font-extrabold text-slate-400 mb-2 uppercase tracking-widest">Setup Progress</span>
              <div className="flex items-center gap-4">
                <div className="w-32 h-3 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${(( (stats?.profileComplete ? 1 : 0) + (stats?.totalProperties > 0 ? 1 : 0) + (stats?.bankConnected ? 1 : 0) ) / 3) * 100}%` }}></div>
                </div>
                <span className="font-black text-white text-xl">{(stats?.profileComplete ? 1 : 0) + (stats?.totalProperties > 0 ? 1 : 0) + (stats?.bankConnected ? 1 : 0)}<span className="text-slate-500">/3</span></span>
              </div>
            </div>
          </div>
          
          <div className="p-8 md:p-10 space-y-4 bg-slate-900/30">
            <div 
              className={`flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 cursor-pointer group ${stats?.profileComplete ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-slate-800 bg-slate-800/40 hover:border-blue-500/50 hover:bg-blue-500/10'}`}
              onClick={() => router.push('/dashboard/owner#settings')}
            >
              <div className="flex items-center gap-5">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors shadow-sm ${stats?.profileComplete ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400 group-hover:bg-blue-500/20 group-hover:text-blue-400'}`}>
                  {stats?.profileComplete ? <CheckCircle2 className="h-7 w-7" /> : <Users className="h-7 w-7" />}
                </div>
                <div>
                  <h4 className={`font-black text-xl ${stats?.profileComplete ? 'text-emerald-400 line-through opacity-70' : 'text-white group-hover:text-blue-400 transition-colors'}`}>Complete Landlord Profile</h4>
                  <p className={`text-sm mt-1 font-medium ${stats?.profileComplete ? 'text-emerald-500/60' : 'text-slate-400'}`}>Set your entity type (Individual or Business) and support contact info.</p>
                </div>
              </div>
              <ChevronRight className={`h-6 w-6 transition-transform group-hover:translate-x-1 ${stats?.profileComplete ? 'text-emerald-500/50' : 'text-slate-600 group-hover:text-blue-500'}`} />
            </div>

            <div 
              className={`flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 cursor-pointer group ${stats?.totalProperties > 0 ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-slate-800 bg-slate-800/40 hover:border-emerald-500/50 hover:bg-emerald-500/10'}`}
              onClick={() => router.push('/dashboard/properties/new')}
            >
              <div className="flex items-center gap-5">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors shadow-sm ${stats?.totalProperties > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-400'}`}>
                  {stats?.totalProperties > 0 ? <CheckCircle2 className="h-7 w-7" /> : <Home className="h-7 w-7" />}
                </div>
                <div>
                  <h4 className={`font-black text-xl ${stats?.totalProperties > 0 ? 'text-emerald-400 line-through opacity-70' : 'text-white group-hover:text-emerald-400 transition-colors'}`}>Add Your First Property</h4>
                  <p className={`text-sm mt-1 font-medium ${stats?.totalProperties > 0 ? 'text-emerald-500/60' : 'text-slate-400'}`}>Create a property, set up rentable units, and track occupancy.</p>
                </div>
              </div>
              <ChevronRight className={`h-6 w-6 transition-transform group-hover:translate-x-1 ${stats?.totalProperties > 0 ? 'text-emerald-500/50' : 'text-slate-600 group-hover:text-emerald-500'}`} />
            </div>

            <div 
              className={`flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 cursor-pointer group ${stats?.bankConnected ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-slate-800 bg-slate-800/40 hover:border-purple-500/50 hover:bg-purple-500/10'}`}
              onClick={() => router.push('/dashboard/accounting/wallet')}
            >
              <div className="flex items-center gap-5">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors shadow-sm ${stats?.bankConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400 group-hover:bg-purple-500/20 group-hover:text-purple-400'}`}>
                  {stats?.bankConnected ? <CheckCircle2 className="h-7 w-7" /> : <Wallet className="h-7 w-7" />}
                </div>
                <div>
                  <h4 className={`font-black text-xl ${stats?.bankConnected ? 'text-emerald-400 line-through opacity-70' : 'text-white group-hover:text-purple-400 transition-colors'}`}>Connect Bank Account</h4>
                  <p className={`text-sm mt-1 font-medium ${stats?.bankConnected ? 'text-emerald-500/60' : 'text-slate-400'}`}>Link your account to securely receive online rent payments via Stripe.</p>
                </div>
              </div>
              <ChevronRight className={`h-6 w-6 transition-transform group-hover:translate-x-1 ${stats?.bankConnected ? 'text-emerald-500/50' : 'text-slate-600 group-hover:text-purple-500'}`} />
            </div>
          </div>
        </Card>
      )}

      {/* Critical Status Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => router.push('/dashboard/accounting/invoices')}
          className="bg-gradient-to-r from-amber-50 to-amber-100/50 hover:from-amber-100 hover:to-amber-200/50 transition-all border border-amber-200/60 rounded-3xl p-6 flex items-center justify-between shadow-sm cursor-pointer hover:scale-[1.01] active:scale-95 group"
        >
          <div className="flex items-center gap-4 text-amber-800">
            <div className="p-3 bg-amber-500/10 rounded-2xl">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="font-black text-lg">Overdue Invoices</p>
              <p className="text-sm mt-0.5 text-amber-700/80 font-medium">{stats?.overduePayments || 0} tenants are behind schedule</p>
            </div>
          </div>
          <span className="text-3xl font-black text-amber-700 group-hover:translate-x-1 transition-transform">{stats?.overduePayments || 0}</span>
        </div>

        <div 
          onClick={() => router.push('/dashboard/maintenance')}
          className="bg-gradient-to-r from-red-50 to-red-100/50 hover:from-red-100 hover:to-red-200/50 transition-all border border-red-200/60 rounded-3xl p-6 flex items-center justify-between shadow-sm cursor-pointer hover:scale-[1.01] active:scale-95 group"
        >
          <div className="flex items-center gap-4 text-red-800">
            <div className="p-3 bg-red-500/10 rounded-2xl">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="font-black text-lg">Urgent Repairs</p>
              <p className="text-sm mt-0.5 text-red-700/80 font-medium">
                {stats?.urgentMaintenance ? `${stats.urgentMaintenance} emergency issues open` : "All systems working normally"}
              </p>
            </div>
          </div>
          <span className="text-3xl font-black text-red-700 group-hover:translate-x-1 transition-transform">{stats?.urgentMaintenance || 0}</span>
        </div>

        <div 
          onClick={() => router.push('/dashboard/leases')}
          className="bg-gradient-to-r from-sky-50 to-sky-100/50 hover:from-sky-100 hover:to-sky-200/50 transition-all border border-sky-200/60 rounded-3xl p-6 flex items-center justify-between shadow-sm cursor-pointer hover:scale-[1.01] active:scale-95 group"
        >
          <div className="flex items-center gap-4 text-sky-800">
            <div className="p-3 bg-sky-500/10 rounded-2xl">
              <FileText className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <p className="font-black text-lg">Expiring Leases</p>
              <p className="text-sm mt-0.5 text-sky-700/80 font-medium">Renewals needed within 30 days</p>
            </div>
          </div>
          <span className="text-3xl font-black text-sky-700 group-hover:translate-x-1 transition-transform">{stats?.leaseRenewals || 0}</span>
        </div>
      </div>

      {/* Top 5 Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <MetricCard title="Properties Managed" value={stats?.totalProperties ?? "-"} subtext="Active properties in portfolio" Icon={Building} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <MetricCard title="Occupancy Rate" value={stats ? `${stats.occupancyRate}%` : "-"} subtext={`${stats?.occupiedUnits ?? 0} of ${stats?.totalUnits ?? 0} units occupied`} Icon={Home} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <MetricCard title="Monthly Revenue" value={stats ? `$${stats.monthlyRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"} subtext="Current month collected" Icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <MetricCard title="Collection Rate" value={stats ? `${stats.collectionRate}%` : "-"} subtext="Payment collection efficiency" Icon={Wallet} iconBg="bg-sky-50" iconColor="text-sky-600" />
        <MetricCard title="Active Tenants" value={stats?.activeTenantsCount ?? "-"} subtext="Occupants under contract" Icon={Users} iconBg="bg-violet-50" iconColor="text-violet-600" />
      </div>

      {/* Split Analytics and Operations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Revenue trend chart & secondary metrics (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Revenue Chart Card */}
          <Card className="bg-white border border-[#E2E8F0] shadow-sm rounded-[32px] p-8 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    Revenue Trend
                  </h2>
                  <span className="text-sm font-medium text-slate-500 mt-1 block">Monthly collected rent payments</span>
                </div>
                <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-black rounded-xl border border-emerald-100">
                  Last 6 Months
                </span>
              </div>

              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0F172A", borderRadius: "16px", border: "none" }}
                      labelStyle={{ color: "#94A3B8", fontWeight: 800, fontSize: "12px" }}
                      itemStyle={{ color: "#FFFFFF", fontWeight: 700, fontSize: "14px" }}
                      formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Secondary Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard title="Vacant Units" value={stats?.vacantUnits ?? "-"} subtext={stats ? `${stats.vacancyRate}% vacancy` : "-"} Icon={Home} iconBg="bg-red-50" iconColor="text-red-600" />
            <MetricCard title="Average Rent" value={stats ? `$${stats.averageRent?.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"} subtext="Per unit average" Icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            <MetricCard title="Total Maintenance" value={stats?.totalMaintenance ?? "-"} subtext={`${stats?.urgentMaintenance ?? 0} urgent requests`} Icon={Wrench} iconBg="bg-amber-50" iconColor="text-amber-600" />
            <MetricCard title="Events & Logs" value={stats?.recentEvents ?? "-"} subtext="Recent activities logged" Icon={Calendar} iconBg="bg-sky-50" iconColor="text-sky-600" />
          </div>

        </div>

        {/* Right Column: Quick Operations & Recent Tickets (4 cols) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Quick Actions Panel */}
          <Card className="bg-white border border-[#E2E8F0] shadow-sm rounded-[32px] p-8">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-6 pb-6 border-b border-slate-100">
              <Activity className="h-5 w-5 text-indigo-500" />
              Quick Actions
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => router.push("/dashboard/properties/new")}
                className="h-24 bg-blue-50/50 hover:bg-blue-50 border border-blue-100/50 text-blue-900 font-extrabold flex flex-col items-center justify-center gap-2 rounded-2xl shadow-sm hover:scale-[1.03] transition-all"
              >
                <Plus className="h-5 w-5 text-blue-600" />
                <span className="text-xs">Add Property</span>
              </Button>
              <Button
                onClick={() => router.push("/dashboard/owner#settings")}
                className="h-24 bg-violet-50/50 hover:bg-violet-50 border border-violet-100/50 text-violet-900 font-extrabold flex flex-col items-center justify-center gap-2 rounded-2xl shadow-sm hover:scale-[1.03] transition-all"
              >
                <Users className="h-5 w-5 text-violet-600" />
                <span className="text-xs">Invite Tenant</span>
              </Button>
              <Button
                onClick={() => router.push("/dashboard/accounting/wallet")}
                className="h-24 bg-amber-50/50 hover:bg-amber-50 border border-amber-100/50 text-amber-900 font-extrabold flex flex-col items-center justify-center gap-2 rounded-2xl shadow-sm hover:scale-[1.03] transition-all"
              >
                <Wallet className="h-5 w-5 text-amber-600" />
                <span className="text-xs">Payout Wallet</span>
              </Button>
              <Button
                onClick={() => router.push("/dashboard/owner#settings-subscription")}
                className="h-24 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/50 text-emerald-900 font-extrabold flex flex-col items-center justify-center gap-2 rounded-2xl shadow-sm hover:scale-[1.03] transition-all"
              >
                <Settings className="h-5 w-5 text-emerald-600" />
                <span className="text-xs">Stripe Billing</span>
              </Button>
            </div>
          </Card>

          {/* Recent Maintenance Tickets Feed */}
          <Card className="bg-white border border-[#E2E8F0] shadow-sm rounded-[32px] p-8 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Wrench className="h-4 w-4 text-amber-600" />
                </div>
                Recent Tickets
              </h2>

              <div className="space-y-4">
                {!stats?.recentMaintenanceRequests?.length ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-500 font-semibold text-sm">No maintenance requests open.</p>
                  </div>
                ) : (
                  stats.recentMaintenanceRequests.map((req: any) => (
                    <div 
                      key={req.id} 
                      onClick={() => router.push("/dashboard/maintenance")}
                      className="p-4 border border-slate-100 rounded-2xl bg-slate-50/30 hover:border-indigo-100 hover:shadow-md transition-all group flex flex-col gap-2 cursor-pointer animate-fade-in"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-extrabold text-sm text-slate-900 truncate max-w-[150px]">{req.title}</span>
                        <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest border ${
                          req.priority === "HIGH" || req.priority === "EMERGENCY"
                            ? "bg-red-50 text-red-700 border-red-100"
                            : req.priority === "MEDIUM"
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}>
                          {req.priority}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-slate-400 font-semibold mt-1">
                        <span>Unit {req.unit?.name || "N/A"}</span>
                        <span>{new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

        </div>

      </div>
    </div>
  );
}

function MetricCard({ title, value, subtext, Icon, iconBg, iconColor }: any) {
  return (
    <Card className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
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

