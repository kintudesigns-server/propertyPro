"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Loader2, 
  DollarSign, 
  Activity, 
  ChevronLeft, 
  ShieldCheck, 
  PieChart, 
  TrendingUp, 
  Download, 
  Receipt, 
  Users, 
  CreditCard, 
  Copy, 
  AlertTriangle,
  ArrowUpRight,
  History
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { PaginationBar } from "@/components/ui/PaginationBar";

export default function AdminProfitDashboard() {
  const { status } = useSession();
  const router = useRouter();
  const [profitData, setProfitData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"commissions" | "subscriptions">("commissions");
  const [subTab, setSubTab] = useState<"payments" | "events" | "roster">("payments");

  // Pagination states
  const [commissionsPage, setCommissionsPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [eventsPage, setEventsPage] = useState(1);
  const [subscriptionsPage, setSubscriptionsPage] = useState(1);

  // Filters
  const [paymentEventFilter, setPaymentEventFilter] = useState("ALL");
  const [accountEventFilter, setAccountEventFilter] = useState("ALL");
  const [rosterStatusFilter, setRosterStatusFilter] = useState("ALL");

  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const fetchProfitData = async () => {
    try {
      const res = await fetch("/api/admin/profit");
      if (res.ok) {
        setProfitData(await res.json());
      } else {
        toast.error("Failed to load profit data.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred fetching profit data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchProfitData();
  }, [status]);

  if (loading || status === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#16A34A]" />
        <p className="text-[#6E6E73] font-bold text-sm uppercase tracking-wider">Compiling Profit Reports...</p>
      </div>
    );
  }

  const detailedProfits = profitData?.detailedProfits || [];
  const detailedSubscriptions = profitData?.detailedSubscriptions || [];
  const subscriptionLedger = profitData?.subscriptionLedger || [];

  // Categorize subscription ledger
  const rawPaymentHistory = subscriptionLedger.filter(
    (item: any) => item.amountPaid != null && Number(item.amountPaid) > 0
  );
  const rawAccountEvents = subscriptionLedger.filter(
    (item: any) => item.amountPaid == null || Number(item.amountPaid) === 0
  );

  // Apply filters
  const filteredPayments = rawPaymentHistory.filter((item: any) => {
    if (paymentEventFilter === "ALL") return true;
    return item.event === paymentEventFilter;
  });

  const filteredEvents = rawAccountEvents.filter((item: any) => {
    if (accountEventFilter === "ALL") return true;
    return item.event === accountEventFilter;
  });

  const filteredSubscriptions = detailedSubscriptions.filter((item: any) => {
    if (rosterStatusFilter === "ALL") return true;
    return (item.status || "").toLowerCase() === rosterStatusFilter.toLowerCase();
  });

  // Paginated Slices
  const totalCommissionsPages = Math.ceil(detailedProfits.length / ITEMS_PER_PAGE) || 1;
  const paginatedProfits = detailedProfits.slice(
    (commissionsPage - 1) * ITEMS_PER_PAGE,
    commissionsPage * ITEMS_PER_PAGE
  );

  const totalPaymentsPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE) || 1;
  const paginatedPayments = filteredPayments.slice(
    (paymentsPage - 1) * ITEMS_PER_PAGE,
    paymentsPage * ITEMS_PER_PAGE
  );

  const totalEventsPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE) || 1;
  const paginatedEvents = filteredEvents.slice(
    (eventsPage - 1) * ITEMS_PER_PAGE,
    eventsPage * ITEMS_PER_PAGE
  );

  const totalSubscriptionsPages = Math.ceil(filteredSubscriptions.length / ITEMS_PER_PAGE) || 1;
  const paginatedSubscriptions = filteredSubscriptions.slice(
    (subscriptionsPage - 1) * ITEMS_PER_PAGE,
    subscriptionsPage * ITEMS_PER_PAGE
  );

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getEventBadge = (event: string) => {
    switch (event) {
      case "RENEWAL":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-bold">RENEWAL</Badge>;
      case "SUBSCRIBED":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold">SUBSCRIBED</Badge>;
      case "UPGRADED":
        return <Badge className="bg-green-100 text-green-800 border-green-200 font-bold">UPGRADED</Badge>;
      case "DOWNGRADED":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold">DOWNGRADED</Badge>;
      case "TRIAL_STARTED":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-bold">TRIAL STARTED</Badge>;
      case "TRIAL_CONVERTED":
        return <Badge className="bg-teal-100 text-teal-800 border-teal-200 font-bold">TRIAL CONVERTED</Badge>;
      case "REACTIVATED":
        return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200 font-bold">REACTIVATED</Badge>;
      case "PAST_DUE":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200 font-bold">PAST DUE</Badge>;
      case "PAUSED":
      case "CANCELED":
        return <Badge className="bg-red-100 text-red-800 border-red-200 font-bold">{event}</Badge>;
      default:
        return <Badge variant="secondary" className="font-bold">{event}</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-6 pb-20 px-2 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin">
            <Button variant="ghost" size="icon" className="text-[#6E6E73] hover:bg-[#E5E5EA]">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
            <TrendingUp className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#1D1D1F] tracking-tight">Platform Profit</h1>
            <p className="text-[#6E6E73] text-base mt-0.5">Detailed breakdown of commission & subscription revenues</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-slate-200 text-[#1D1D1F] font-semibold h-11 px-5 rounded-xl flex items-center gap-2 hover:bg-slate-50 cursor-pointer shadow-2xs">
            <Download className="h-4 w-4 text-slate-500" /> Export CSV
          </Button>
          <Link href="/dashboard/admin/settings/pricing">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl flex items-center gap-2 h-11 px-6 shadow-sm cursor-pointer">
              <PieChart className="h-4 w-4" /> Adjust Commission Rate
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border border-slate-800 shadow-xl rounded-2xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Total Net Profit</p>
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-4xl font-black mb-1 tracking-tight text-white">
              ${(profitData?.totalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <Activity className="h-3 w-3 text-emerald-400" /> Combined MRR &amp; Commission
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-2xs rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-extrabold text-[#6E6E73] uppercase tracking-widest">Subscription MRR</p>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <PieChart className="h-4 w-4" />
              </div>
            </div>
            <p className="text-4xl font-black text-[#1D1D1F] mb-1 tracking-tight">
              ${(profitData?.subscriptionMRR || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-[#6E6E73] font-medium flex items-center gap-1">
              <Activity className="h-3 w-3 text-slate-400" /> Monthly Owner Subscriptions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-2xs rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-extrabold text-[#6E6E73] uppercase tracking-widest">Rent Commissions</p>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="text-4xl font-black text-[#1D1D1F] mb-1 tracking-tight">
              ${(profitData?.totalCommissionProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-[#6E6E73] font-medium flex items-center gap-1">
              <Activity className="h-3 w-3 text-slate-400" /> Percentage cuts on volume
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SaaS KPI Strip — compact secondary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <div className="bg-white border border-slate-200/80 shadow-2xs rounded-2xl px-4 py-3.5 flex items-center justify-between group hover:border-slate-300 transition-all">
          <div>
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">MRR</p>
            <p className="text-xl font-black text-[#1D1D1F] mt-0.5 tracking-tight">
              ${(profitData?.subscriptionMRR || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Monthly Recurring</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 shadow-2xs rounded-2xl px-4 py-3.5 flex items-center justify-between group hover:border-slate-300 transition-all">
          <div>
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">ARR</p>
            <p className="text-xl font-black text-[#1D1D1F] mt-0.5 tracking-tight">
              ${(profitData?.arr || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Annual Run Rate</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
            <PieChart className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 shadow-2xs rounded-2xl px-4 py-3.5 flex items-center justify-between group hover:border-slate-300 transition-all">
          <div>
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">ARPU</p>
            <p className="text-xl font-black text-[#1D1D1F] mt-0.5 tracking-tight">
              ${(profitData?.arpu || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Avg Revenue / Owner</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
            <Users className="h-4 w-4" />
          </div>
        </div>

        <div className={`bg-white border shadow-2xs rounded-2xl px-4 py-3.5 flex items-center justify-between group transition-all ${
          profitData?.atRiskMRR > 0 ? "border-amber-200 bg-amber-50/20" : "border-slate-200/80 hover:border-slate-300"
        }`}>
          <div>
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">At-Risk MRR</p>
            <p className={`text-xl font-black mt-0.5 tracking-tight ${profitData?.atRiskMRR > 0 ? "text-amber-600" : "text-[#1D1D1F]"}`}>
              ${(profitData?.atRiskMRR || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
              {profitData?.atRiskMRR > 0 ? "Past Due / Grace Period" : "All healthy"}
            </p>
          </div>
          {profitData?.atRiskMRR > 0 ? (
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
          )}
        </div>

      </div>


      {/* Ledger Tabs & Tables */}
      <div className="space-y-4">
        {/* Main Tabs */}
        <div className="flex gap-2 p-1 bg-[#F1F5F9] rounded-xl w-fit">
          <button
            onClick={() => {
              setActiveTab("commissions");
              setCommissionsPage(1);
            }}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === "commissions"
                ? "bg-white text-[#1D1D1F] shadow-sm"
                : "text-[#6E6E73] hover:text-[#1D1D1F]"
            }`}
          >
            Rent Commissions
          </button>
          <button
            onClick={() => {
              setActiveTab("subscriptions");
              setPaymentsPage(1);
              setEventsPage(1);
              setSubscriptionsPage(1);
            }}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === "subscriptions"
                ? "bg-white text-[#1D1D1F] shadow-sm"
                : "text-[#6E6E73] hover:text-[#1D1D1F]"
            }`}
          >
            Subscription Billing
          </button>
        </div>

        {/* Tables */}
        {activeTab === "commissions" ? (
          <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="bg-[#F2F2F7] border-b border-[#E5E5EA] px-6 py-5">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-[#1D1D1F]">Detailed Commission Ledger</CardTitle>
                  <CardDescription className="text-[#6E6E73] text-sm mt-1">Line-by-line breakdown of where your percentage profit comes from.</CardDescription>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1 font-bold text-xs uppercase tracking-wider">
                  {detailedProfits.length} Transactions
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#F1F5F9]">
                    <TableRow className="hover:bg-transparent border-b border-[#E5E5EA]">
                      <TableHead className="font-bold text-[#475569] h-12">Date</TableHead>
                      <TableHead className="font-bold text-[#475569] h-12">Property & Unit</TableHead>
                      <TableHead className="font-bold text-[#475569] h-12">Landlord</TableHead>
                      <TableHead className="font-bold text-[#475569] h-12">Gross Rent Billed</TableHead>
                      <TableHead className="font-bold text-[#475569] h-12 text-right">Commission (%)</TableHead>
                      <TableHead className="font-extrabold text-green-700 h-12 text-right">Platform Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProfits.map((item: any) => (
                      <TableRow key={item.id} className="hover:bg-[#F2F2F7] border-b border-[#E5E5EA] transition-colors">
                        <TableCell className="font-medium text-[#6E6E73] py-4">
                          {new Date(item.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="py-4">
                          <p className="font-bold text-[#1D1D1F]">{item.property}</p>
                          <p className="text-xs font-semibold text-[#6E6E73] mt-0.5">Unit {item.unit}</p>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            {item.ownerAvatar ? (
                              <img
                                src={item.ownerAvatar}
                                alt={item.owner}
                                className="h-8 w-8 rounded-full object-cover shrink-0 border border-slate-200 shadow-xs"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-[#E5E5EA] flex items-center justify-center text-[#475569] font-bold text-xs shrink-0">
                                {item.owner.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="font-semibold text-[#334155]">{item.owner}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 font-black text-[#1D1D1F]">
                          ${item.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <Badge variant="outline" className="bg-slate-100 text-[#6E6E73] border-slate-200 font-bold">
                            {item.percentageCut}%
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <p className="font-black text-green-600 text-lg">
                            +${item.platformFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] font-bold text-[#94A3B8] uppercase mt-0.5 tracking-wider">
                            Retained Cut
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {detailedProfits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <div className="flex flex-col items-center justify-center text-[#6E6E73]">
                            <ShieldCheck className="h-8 w-8 mb-2 opacity-50" />
                            <p className="font-semibold">No profit recorded yet.</p>
                            <p className="text-sm">When tenants pay rent, your commission cut will appear here.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <PaginationBar
              currentPage={commissionsPage}
              totalPages={totalCommissionsPages}
              totalItems={detailedProfits.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={(page) => setCommissionsPage(page)}
              itemLabel="transactions"
            />
          </Card>
        ) : (
          <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="bg-[#F2F2F7] border-b border-[#E5E5EA] px-6 py-5">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl font-bold text-[#1D1D1F]">Subscription Financial Intelligence</CardTitle>
                  </div>
                  <CardDescription className="text-[#6E6E73] text-sm">
                    Track owner payment transactions, operational lifecycle events, and active subscriptions.
                  </CardDescription>
                </div>

                {/* Sub-tab Toggle & Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex gap-1 p-1 bg-white border border-[#E5E5EA] rounded-lg">
                    <button
                      onClick={() => { setSubTab("payments"); setPaymentsPage(1); }}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        subTab === "payments" ? "bg-[#16A34A] text-white shadow-xs" : "text-[#6E6E73] hover:text-[#1D1D1F]"
                      }`}
                    >
                      <Receipt className="h-3.5 w-3.5" /> Payment History ({rawPaymentHistory.length})
                    </button>
                    <button
                      onClick={() => { setSubTab("events"); setEventsPage(1); }}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        subTab === "events" ? "bg-[#16A34A] text-white shadow-xs" : "text-[#6E6E73] hover:text-[#1D1D1F]"
                      }`}
                    >
                      <History className="h-3.5 w-3.5" /> Account Events ({rawAccountEvents.length})
                    </button>
                    <button
                      onClick={() => { setSubTab("roster"); setSubscriptionsPage(1); }}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        subTab === "roster" ? "bg-[#16A34A] text-white shadow-xs" : "text-[#6E6E73] hover:text-[#1D1D1F]"
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" /> Active Roster ({detailedSubscriptions.length})
                    </button>
                  </div>

                  {subTab === "payments" ? (
                    <select
                      value={paymentEventFilter}
                      onChange={(e) => { setPaymentEventFilter(e.target.value); setPaymentsPage(1); }}
                      className="h-9 px-3 text-xs font-semibold bg-white border border-[#E5E5EA] rounded-lg text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    >
                      <option value="ALL">All Payment Events</option>
                      <option value="RENEWAL">Renewals</option>
                      <option value="SUBSCRIBED">Initial Subscriptions</option>
                      <option value="REACTIVATED">Reactivations</option>
                      <option value="TRIAL_CONVERTED">Trial Conversions</option>
                    </select>
                  ) : subTab === "events" ? (
                    <select
                      value={accountEventFilter}
                      onChange={(e) => { setAccountEventFilter(e.target.value); setEventsPage(1); }}
                      className="h-9 px-3 text-xs font-semibold bg-white border border-[#E5E5EA] rounded-lg text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    >
                      <option value="ALL">All Lifecycle Events</option>
                      <option value="PAUSED">Paused</option>
                      <option value="PAST_DUE">Past Due</option>
                      <option value="UPGRADED">Upgraded</option>
                      <option value="DOWNGRADED">Downgraded</option>
                      <option value="TRIAL_STARTED">Trial Started</option>
                      <option value="CANCELED">Canceled</option>
                    </select>
                  ) : (
                    <select
                      value={rosterStatusFilter}
                      onChange={(e) => { setRosterStatusFilter(e.target.value); setSubscriptionsPage(1); }}
                      className="h-9 px-3 text-xs font-semibold bg-white border border-[#E5E5EA] rounded-lg text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Trialing">Trialing</option>
                      <option value="Past_Due">Past Due</option>
                      <option value="Paused">Paused</option>
                    </select>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {subTab === "payments" ? (
                  <Table>
                    <TableHeader className="bg-[#F1F5F9]">
                      <TableRow className="hover:bg-transparent border-b border-[#E5E5EA]">
                        <TableHead className="font-bold text-[#475569] h-12">Timestamp</TableHead>
                        <TableHead className="font-bold text-[#475569] h-12">Landlord</TableHead>
                        <TableHead className="font-bold text-[#475569] h-12">Payment Type</TableHead>
                        <TableHead className="font-bold text-[#475569] h-12">Pricing Tier</TableHead>
                        <TableHead className="font-bold text-[#475569] h-12">Stripe Invoice Ref</TableHead>
                        <TableHead className="font-extrabold text-blue-700 h-12 text-right">Amount Collected</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPayments.map((item: any) => (
                        <TableRow key={item.id} className="hover:bg-[#F2F2F7] border-b border-[#E5E5EA] transition-colors">
                          <TableCell className="font-medium text-[#6E6E73] py-4 text-xs">
                            {new Date(item.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              {item.avatar ? (
                                <img
                                  src={item.avatar}
                                  alt={item.owner}
                                  className="h-8 w-8 rounded-full object-cover shrink-0 border border-slate-200 shadow-xs"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                  {item.owner.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-[#334155] text-sm">{item.owner}</p>
                                <p className="text-xs text-[#6E6E73]">{item.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            {getEventBadge(item.event)}
                          </TableCell>
                          <TableCell className="py-4 font-semibold text-slate-700 text-sm">
                            {item.toTierName}
                          </TableCell>
                          <TableCell className="py-4 font-mono text-xs text-[#6E6E73]">
                            {item.stripeInvoiceId ? (
                              <div className="flex items-center gap-1.5">
                                <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                  {item.stripeInvoiceId.length > 14 ? item.stripeInvoiceId.slice(0, 14) + "..." : item.stripeInvoiceId}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(item.stripeInvoiceId, "Stripe Invoice ID")}
                                  className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                                  title="Copy Invoice ID"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-sans">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-4 text-right">
                            <div>
                              <p className="font-black text-blue-600 text-base">
                                +${Number(item.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">
                                PAID
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}

                      {filteredPayments.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-32 text-center">
                            <div className="flex flex-col items-center justify-center text-[#6E6E73]">
                              <Receipt className="h-8 w-8 mb-2 opacity-50" />
                              <p className="font-semibold">No paid transaction records found.</p>
                              <p className="text-sm">When subscription charges process successfully, paid invoices will appear here.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                ) : subTab === "events" ? (
                  <Table>
                    <TableHeader className="bg-[#F1F5F9]">
                      <TableRow className="hover:bg-transparent border-b border-[#E5E5EA]">
                        <TableHead className="font-bold text-[#475569] h-12">Timestamp</TableHead>
                        <TableHead className="font-bold text-[#475569] h-12">Landlord</TableHead>
                        <TableHead className="font-bold text-[#475569] h-12">Lifecycle Event</TableHead>
                        <TableHead className="font-bold text-[#475569] h-12">Plan Transition</TableHead>
                        <TableHead className="font-bold text-[#475569] h-12 text-right">Audit Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedEvents.map((item: any) => (
                        <TableRow key={item.id} className="hover:bg-[#F2F2F7] border-b border-[#E5E5EA] transition-colors">
                          <TableCell className="font-medium text-[#6E6E73] py-4 text-xs">
                            {new Date(item.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              {item.avatar ? (
                                <img
                                  src={item.avatar}
                                  alt={item.owner}
                                  className="h-8 w-8 rounded-full object-cover shrink-0 border border-slate-200 shadow-xs"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                  {item.owner.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-[#334155] text-sm">{item.owner}</p>
                                <p className="text-xs text-[#6E6E73]">{item.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            {getEventBadge(item.event)}
                          </TableCell>
                          <TableCell className="py-4 text-xs font-medium text-slate-700">
                            {item.fromTierName ? (
                              <span>{item.fromTierName} → <strong>{item.toTierName}</strong></span>
                            ) : (
                              <strong>{item.toTierName}</strong>
                            )}
                          </TableCell>
                          <TableCell className="py-4 text-right text-xs font-semibold text-slate-500">
                            Logged
                          </TableCell>
                        </TableRow>
                      ))}

                      {filteredEvents.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center">
                            <div className="flex flex-col items-center justify-center text-[#6E6E73]">
                              <History className="h-8 w-8 mb-2 opacity-50" />
                              <p className="font-semibold">No operational account events recorded.</p>
                              <p className="text-sm">Lifecycle changes (pauses, past due warnings, tier switches) log here.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <Table>
                    <TableHeader className="bg-[#F1F5F9]">
                      <TableRow className="hover:bg-transparent border-b border-[#E5E5EA]">
                        <TableHead className="font-bold text-[#475569] h-12">Landlord</TableHead>
                        <TableHead className="font-bold text-[#475569] h-12">Joined</TableHead>
                        <TableHead className="font-bold text-[#475569] h-12">Pricing Tier</TableHead>
                        <TableHead className="font-bold text-[#475569] h-12">Status</TableHead>
                        <TableHead className="font-bold text-[#475569] h-12">Payment Method</TableHead>
                        <TableHead className="font-extrabold text-blue-700 h-12 text-right">Monthly Revenue</TableHead>
                        <TableHead className="font-bold text-[#475569] h-12 text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSubscriptions.map((item: any) => (
                        <TableRow key={item.id} className="hover:bg-[#F2F2F7] border-b border-[#E5E5EA] transition-colors">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              {item.avatar ? (
                                <img
                                  src={item.avatar}
                                  alt={item.owner}
                                  className="h-8 w-8 rounded-full object-cover shrink-0 border border-slate-200 shadow-xs"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-[#E5E5EA] flex items-center justify-center text-[#475569] font-bold text-xs shrink-0">
                                  {item.owner.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-semibold text-[#334155] block">{item.owner}</span>
                                <span className="text-xs text-[#6E6E73]">{item.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-[#6E6E73] py-4">
                            {new Date(item.joinedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="secondary" className="font-bold text-slate-700 bg-slate-100">
                              {item.tier}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="space-y-1">
                              <Badge className={`font-bold ${
                                (item.status || "").toLowerCase() === "active"
                                  ? "bg-green-100 text-green-700 border-green-200"
                                  : (item.status || "").toLowerCase() === "trialing"
                                  ? "bg-purple-100 text-purple-700 border-purple-200"
                                  : "bg-amber-100 text-amber-800 border-amber-200"
                              }`}>
                                {(item.status || "UNKNOWN").toUpperCase()}
                              </Badge>
                              {item.gracePeriodEnd && (
                                <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> Grace ends {new Date(item.gracePeriodEnd).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-xs font-medium text-slate-600">
                            {item.cardBrand && item.cardLast4 ? (
                              <div className="flex items-center gap-1.5">
                                <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                                <span>{item.cardBrand.toUpperCase()} •••• {item.cardLast4}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-4 text-right">
                            <p className="font-black text-blue-600 text-lg">
                              +${item.monthlyPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] font-bold text-[#94A3B8] uppercase mt-0.5 tracking-wider">
                              Per Month
                            </p>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <Link href={`/dashboard/admin/subscriptions/${item.id}`}>
                              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-bold text-xs flex items-center gap-1 mx-auto">
                                Manage <ArrowUpRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {filteredSubscriptions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center">
                            <div className="flex flex-col items-center justify-center text-[#6E6E73]">
                              <PieChart className="h-8 w-8 mb-2 opacity-50" />
                              <p className="font-semibold">No active subscriptions found.</p>
                              <p className="text-sm">Landlords on paid tiers will appear here.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>

            {subTab === "payments" ? (
              <PaginationBar
                currentPage={paymentsPage}
                totalPages={totalPaymentsPages}
                totalItems={filteredPayments.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={(page) => setPaymentsPage(page)}
                itemLabel="paid transactions"
              />
            ) : subTab === "events" ? (
              <PaginationBar
                currentPage={eventsPage}
                totalPages={totalEventsPages}
                totalItems={filteredEvents.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={(page) => setEventsPage(page)}
                itemLabel="lifecycle events"
              />
            ) : (
              <PaginationBar
                currentPage={subscriptionsPage}
                totalPages={totalSubscriptionsPages}
                totalItems={filteredSubscriptions.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={(page) => setSubscriptionsPage(page)}
                itemLabel="subscribers"
              />
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
