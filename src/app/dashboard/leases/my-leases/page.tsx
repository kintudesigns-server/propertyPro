"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield,
  ShieldAlert,
  Loader2,
  RefreshCw,
  FileText,
  Home,
  Calendar,
  DollarSign,
  LayoutGrid,
  List,
  Search,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { LeaseActionsMenu } from "@/components/tenant/LeaseActionsMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function MyLeasesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Move-Out Modal State
  const [showMoveOutModal, setShowMoveOutModal] = useState(false);
  const [activeLeaseForMoveOut, setActiveLeaseForMoveOut] = useState<any>(null);
  const [moveOutDate, setMoveOutDate] = useState("");
  const [moveOutReason, setMoveOutReason] = useState("");
  const [otherReasonNote, setOtherReasonNote] = useState("");
  const [declineRenewalLeaseId, setDeclineRenewalLeaseId] = useState<string | null>(null);
  const [forwardingStreet, setForwardingStreet] = useState("");
  const [forwardingCity, setForwardingCity] = useState("");
  const [forwardingState, setForwardingState] = useState("");
  const [forwardingZip, setForwardingZip] = useState("");
  const [utilitiesChecked, setUtilitiesChecked] = useState(false);
  const [cleaningChecked, setCleaningChecked] = useState(false);
  const [moveOutStep, setMoveOutStep] = useState(1);
  const [refundBankName, setRefundBankName] = useState("");
  const [refundAccountName, setRefundAccountName] = useState("");
  const [refundAccountNumber, setRefundAccountNumber] = useState("");
  const [moveOutSubmitting, setMoveOutSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams) {
      const statusParam = searchParams.get("status");
      if (statusParam === "success") {
        toast.success("Security deposit payment received! Your lease is now active.");
        router.replace("/dashboard/leases/my-leases");
      } else if (statusParam === "cancelled") {
        toast.error("Security deposit payment cancelled.");
        router.replace("/dashboard/leases/my-leases");
      }
    }
  }, [searchParams, router]);

  const fetchLeases = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leases");
      if (res.ok) setLeases(await res.json());
    } catch {
      toast.error("Failed to load leases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") { router.push("/auth/login"); return; }
    fetchLeases();
  }, [status, router]);

  const handleSignLease = async (leaseId: string) => {
    try {
      toast.loading("Initiating lease signing & security deposit checkout...", { id: "signing" });
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaseId }),
      });

      if (res.ok) {
        const { url } = await res.json();
        toast.success("Security Deposit checkout created! Redirecting...", { id: "signing" });
        window.location.href = url;
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to initiate lease checkout.", { id: "signing" });
      }
    } catch {
      toast.error("Error signing lease.", { id: "signing" });
    }
  };

  const handleAcceptRenewal = async (leaseId: string) => {
    try {
      const res = await fetch(`/api/leases/${leaseId}/renew`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPT" })
      });
      if (res.ok) {
        toast.success("Renewal accepted! A new lease draft will be generated.");
        fetchLeases();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to accept renewal.");
      }
    } catch {
      toast.error("Error accepting renewal.");
    }
  };

  const handleRejectRenewal = async (leaseId: string) => {
    try {
      const res = await fetch(`/api/leases/${leaseId}/renew`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT" })
      });
      if (res.ok) {
        toast.info("Renewal declined. Move-out process initiated.");
        fetchLeases();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to decline renewal.");
      }
    } catch {
      toast.error("Error declining renewal.");
    }
  };

  const handleRequestMoveOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLeaseForMoveOut) return;

    if (moveOutStep < 2) {
      setMoveOutStep(moveOutStep + 1);
      return;
    }

    setMoveOutSubmitting(true);
    const forwardingAddress = `${forwardingStreet}, ${forwardingCity}, ${forwardingState} ${forwardingZip}`.trim();

    const payload: any = {
      moveOutDate,
      moveOutReason,
      otherReasonNote: moveOutReason === "Other" ? otherReasonNote : undefined,
      forwardingAddress,
      refundMethod: "BANK_TRANSFER",
      refundBankName,
      refundAccountName,
      refundAccountNumber,
      utilitiesAcknowledged: utilitiesChecked,
      cleaningAcknowledged: cleaningChecked,
    };

    try {
      const res = await fetch(`/api/leases/${activeLeaseForMoveOut.id}/move-out-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Move-out notice submitted successfully.");
        setShowMoveOutModal(false);
        fetchLeases();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit request");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setMoveOutSubmitting(false);
    }
  };

  const openMoveOutModal = (leaseId: string) => {
    const l = leases.find(l => l.id === leaseId);
    if (l) {
      setActiveLeaseForMoveOut(l);
      setMoveOutStep(1);
      setMoveOutDate("");
      setMoveOutReason("");
      setOtherReasonNote("");
      setRefundBankName("");
      setRefundAccountName("");
      setRefundAccountNumber("");
      setForwardingStreet("");
      setForwardingCity("");
      setForwardingState("");
      setForwardingZip("");
      setUtilitiesChecked(false);
      setCleaningChecked(false);
      setShowMoveOutModal(true);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#007AFF]" />
        <p className="text-[#8E8E93] font-extrabold text-sm uppercase tracking-wider">
          Syncing lease registry...
        </p>
      </div>
    );
  }

  const pendingLease = leases.find((l) => l.status === "PENDING_SIGNATURE");
  const pendingRenewal = leases.find((l) => l.renewalStatus === "PENDING_DECISION");

  // KPI Calculations
  const activeCount = leases.filter((l) => l.status === "ACTIVE").length;
  const expiringCount = leases.filter((l) => {
    if (l.status !== "ACTIVE") return false;
    const diff = Math.ceil(
      (new Date(l.endDate).getTime() - Date.now()) / 86400000
    );
    return diff <= 60 && diff > 0;
  }).length;
  const totalRent = leases.reduce((a, c) => a + Number(c.monthlyRent), 0);

  // Filter + Sort
  const filtered = leases
    .filter((l) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        (l.unit?.property?.name || "").toLowerCase().includes(q) ||
        (l.unit?.name || "").toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "all" ||
        l.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      if (sortBy === "oldest") return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      if (sortBy === "rent_high") return Number(b.monthlyRent) - Number(a.monthlyRent);
      if (sortBy === "rent_low") return Number(a.monthlyRent) - Number(b.monthlyRent);
      return 0;
    });

  const hasUnpaidDeposit = (l: any) => {
    return l.invoices?.some((inv: any) => 
      l.securityDeposit &&
      Number(inv.amount) === Number(l.securityDeposit) &&
      inv.status === "UNPAID"
    );
  };

  const statusBadge = (l: any) => {
    if (l.status === "SIGNED") return hasUnpaidDeposit(l) ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-indigo-50 text-indigo-700 border border-indigo-200";
    if (l.status === "ACTIVE" && hasUnpaidDeposit(l)) return "bg-blue-50 text-blue-700 border border-blue-200";
    if (l.status === "ACTIVE") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (l.status === "PENDING_SIGNATURE") return "bg-amber-50 text-amber-700 border border-amber-200";
    if (l.status === "EXPIRED" || l.status === "TERMINATED") return "bg-red-50 text-red-700 border border-red-200";
    return "bg-slate-100 text-[#6E6E73] border border-slate-200";
  };

  const statusDot = (l: any) => {
    if (l.status === "SIGNED") return hasUnpaidDeposit(l) ? "bg-amber-500" : "bg-indigo-500";
    if (l.status === "ACTIVE" && hasUnpaidDeposit(l)) return "bg-blue-500";
    if (l.status === "ACTIVE") return "bg-emerald-500";
    if (l.status === "PENDING_SIGNATURE") return "bg-amber-500";
    return "bg-slate-400";
  };

  const formatStatus = (l: any) => {
    if (l.status === "SIGNED") return hasUnpaidDeposit(l) ? "Deposit Pending" : "Awaiting Move-in";
    if (l.status === "ACTIVE" && hasUnpaidDeposit(l)) return "Awaiting Deposit";
    return l.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  };

  const pendingLeaseUnpaidDepositInvoice = pendingLease && pendingLease.invoices?.find(
    (inv: any) =>
      pendingLease.securityDeposit &&
      Number(inv.amount) === Number(pendingLease.securityDeposit) &&
      inv.status === "UNPAID"
  );

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#EFF6FF] text-[#007AFF] p-3 rounded-2xl flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#1D1D1F] tracking-tight">My Leases</h1>
            <p className="text-[#6E6E73] text-sm mt-0.5">View and manage your lease agreements</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Grid / List toggle */}
          <div className="flex items-center bg-white border border-[#E5E5EA] rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-[#007AFF] text-white shadow-sm"
                  : "text-[#6E6E73] hover:bg-[#F2F2F7]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-[#007AFF] text-white shadow-sm"
                  : "text-[#6E6E73] hover:bg-[#F2F2F7]"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button
            onClick={fetchLeases}
            variant="outline"
            className="bg-white border border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-xl font-semibold flex items-center gap-2 h-10 px-4 shadow-sm"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Pending Lease Alert ── */}
      {pendingLease && (
        <Card className={`rounded-3xl shadow-xs border overflow-hidden p-6 md:p-8 relative ${
          pendingLeaseUnpaidDepositInvoice
            ? "bg-red-50/70 border-red-100 text-red-950"
            : "bg-amber-50/70 border-amber-100 text-amber-950"
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full ${
                  pendingLeaseUnpaidDepositInvoice
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  Action Required
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <ShieldAlert className={`h-5 w-5 ${pendingLeaseUnpaidDepositInvoice ? 'text-red-500' : 'text-amber-500'}`} />
                {pendingLeaseUnpaidDepositInvoice
                  ? "Pay Security Deposit to Complete Lease"
                  : "Review & Sign Lease Agreement"
                }
              </h2>
              <p className={`text-sm font-semibold max-w-2xl ${pendingLeaseUnpaidDepositInvoice ? 'text-red-700' : 'text-amber-700'}`}>
                {pendingLeaseUnpaidDepositInvoice
                  ? `Your lease for Unit ${pendingLease.unit?.name} at ${pendingLease.unit?.property?.name} is approved. Please pay the security deposit of $${Number(pendingLease.securityDeposit).toLocaleString()} to finalize your lease agreement.`
                  : `You have a pending lease contract for Unit ${pendingLease.unit?.name} at ${pendingLease.unit?.property?.name} awaiting your signature.`
                }
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
              <Button
                onClick={() => {
                  if (pendingLeaseUnpaidDepositInvoice) {
                    handleSignLease(pendingLease.id);
                  } else {
                    router.push(`/dashboard/leases/${pendingLease.id}`);
                  }
                }}
                className={`w-full sm:w-auto font-bold h-11 px-6 rounded-xl shadow-xs transition-all ${
                  pendingLeaseUnpaidDepositInvoice
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
                }`}
              >
                {pendingLeaseUnpaidDepositInvoice ? `Pay Deposit $${Number(pendingLease.securityDeposit).toLocaleString()}` : "View & Sign Contract"}
              </Button>
              <Button
                onClick={() => router.push(`/dashboard/leases/${pendingLease.id}`)}
                variant="outline"
                className={`w-full sm:w-auto font-bold h-11 px-6 rounded-xl bg-white border shadow-xs transition-all ${
                  pendingLeaseUnpaidDepositInvoice
                    ? "border-red-200 text-red-900 hover:bg-red-50"
                    : "border-amber-200 text-amber-900 hover:bg-amber-50"
                }`}
              >
                Lease Details
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Pending Renewal Alert ── */}
      {pendingRenewal && (
        <Card className="bg-purple-50/70 border border-purple-100 rounded-3xl shadow-xs p-6 md:p-8 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-purple-100 text-purple-700 text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full">
                  Renewal Available
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2 text-purple-950">
                <ShieldAlert className="h-5 w-5 text-purple-500" />
                Lease Renewal Offer
              </h2>
              <p className="text-sm font-semibold text-purple-700 max-w-2xl">
                Your lease for Unit {pendingRenewal.unit?.name} at {pendingRenewal.unit?.property?.name} is expiring soon. The owner has offered a renewal with a proposed rent of <strong className="text-purple-900">${Number(pendingRenewal.monthlyRent).toLocaleString()}/month</strong>.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
              <Button
                onClick={() => handleAcceptRenewal(pendingRenewal.id)}
                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold h-11 px-6 rounded-xl shadow-xs transition-all"
              >
                Accept & Renew
              </Button>
              <Button
                onClick={() => setDeclineRenewalLeaseId(pendingRenewal.id)}
                variant="outline"
                className="w-full sm:w-auto border-purple-200 text-purple-900 hover:bg-purple-50 bg-white font-bold h-11 px-6 rounded-xl shadow-xs transition-all"
              >
                Decline (Move Out)
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Leases */}
        <Card className="bg-white border-0 ring-1 ring-slate-100 rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:-translate-y-1 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider">Total Leases</p>
              <h3 className="text-3xl font-black text-[#1D1D1F] tracking-tight">{leases.length}</h3>
              <p className="text-[11px] font-semibold text-[#8E8E93]">Registry count</p>
            </div>
            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Home className="h-5 w-5" />
            </div>
          </div>
        </Card>

        {/* Active Leases */}
        <Card className="bg-white border-0 ring-1 ring-slate-100 rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:-translate-y-1 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider">Active Leases</p>
              <h3 className="text-3xl font-black text-[#1D1D1F] tracking-tight">{activeCount}</h3>
              <p className="text-[11px] font-semibold text-emerald-500 font-extrabold">Currently active</p>
            </div>
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </Card>

        {/* Expiring Soon */}
        <Card className="bg-white border-0 ring-1 ring-slate-100 rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:-translate-y-1 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider">Expiring Soon</p>
              <h3 className={`text-3xl font-black tracking-tight ${expiringCount > 0 ? "text-rose-600" : "text-[#1D1D1F]"}`}>{expiringCount}</h3>
              <p className="text-[11px] font-semibold text-rose-500">Within 60 days</p>
            </div>
            <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </Card>

        {/* Total Monthly Rent */}
        <Card className="bg-white border-0 ring-1 ring-slate-100 rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:-translate-y-1 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider">Monthly Commitment</p>
              <h3 className="text-2xl font-black text-[#1D1D1F] tracking-tight">
                ${totalRent.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[11px] font-semibold text-[#8E8E93]">Total rent obligation</p>
            </div>
            <div className="p-3.5 bg-slate-100 text-slate-700 rounded-2xl">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Leases Panel (full-width) ── */}
      <Card className="bg-white border border-[#E5E5EA] rounded-2xl shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-3">
            <div className="bg-[#EFF6FF] text-[#007AFF] p-2 rounded-xl">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#1D1D1F]">Leases</h2>
              <p className="text-xs text-[#6E6E73]">Manage your property leases and agreements</p>
            </div>
          </div>
          {/* Duplicate view toggle inside card header — matches reference */}
          <div className="flex items-center bg-slate-100 border border-[#E5E5EA] rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-[#007AFF] text-white shadow-sm"
                  : "text-[#6E6E73] hover:bg-white"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-[#007AFF] text-white shadow-sm"
                  : "text-[#6E6E73] hover:bg-white"
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Filter bar — single row: search stretches left, dropdowns on right */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-6 py-4 border-b border-[#F1F5F9] bg-[#FAFAFA]">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search leases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full bg-white border border-[#E5E5EA] rounded-xl text-sm text-[#1D1D1F] placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF] shadow-sm"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v: string | null) => setStatusFilter(v || "all")}
          >
            <SelectTrigger className="w-full sm:w-[160px] bg-white border border-[#E5E5EA] h-10 px-3.5 rounded-xl shadow-xs font-semibold text-xs text-[#1D1D1F] focus:ring-1 focus:ring-[#007AFF] cursor-pointer">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_signature">Pending Signature</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(v: string | null) => setSortBy(v || "newest")}
          >
            <SelectTrigger className="w-full sm:w-[160px] bg-white border border-[#E5E5EA] h-10 px-3.5 rounded-xl shadow-xs font-semibold text-xs text-[#1D1D1F] focus:ring-1 focus:ring-[#007AFF] cursor-pointer">
              <SelectValue placeholder="Newest First" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="rent_high">Rent: High to Low</SelectItem>
              <SelectItem value="rent_low">Rent: Low to High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sub-heading */}
        <div className="px-6 pt-5 pb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#007AFF]" />
          <h3 className="font-extrabold text-[#1D1D1F] text-sm">
            My Leases ({filtered.length})
          </h3>
          <span className="text-xs text-[#6E6E73] font-normal">
            — Manage all your lease agreements and property details
          </span>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center space-y-3">
              <div className="h-12 w-12 bg-slate-100 text-[#8E8E93] rounded-full flex items-center justify-center">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800">No leases found</h3>
              <p className="text-xs text-[#6E6E73] max-w-sm">
                No leases match your search criteria. Try modifying your search term or clearing the status filters.
              </p>
              <Button 
                onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
                variant="outline"
                className="h-9 px-4 rounded-xl text-xs font-bold border-slate-200 text-slate-700 bg-white"
              >
                Clear Search & Filters
              </Button>
            </div>
          ) : viewMode === "list" ? (
            /* ── LIST VIEW ── */
            <div className="overflow-x-auto rounded-xl border border-[#F1F5F9] bg-white shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-[#F2F2F7]">
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73] py-3 pl-4">Property & Unit</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73] py-3">Lease Period</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73] py-3">Monthly Rent</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73] py-3">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73] py-3">Timeline</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73] py-3 text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => {
                    const daysLeft = Math.ceil((new Date(l.endDate).getTime() - Date.now()) / 86400000);
                    const months = Math.round(Math.abs(daysLeft) / 30);
                    return (
                      <TableRow key={l.id} className="hover:bg-[#F2F2F7]/55 transition-colors border-t border-[#F1F5F9]">
                        <TableCell className="py-4 pl-4">
                          <div className="space-y-0.5">
                            <p className="font-extrabold text-[#1D1D1F] text-sm flex items-center gap-2">
                              {l.unit?.property?.name || "Unknown"}
                              <span className="bg-[#EFF6FF] text-[#007AFF] font-black text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                                Unit {l.unit?.name || "—"}
                              </span>
                            </p>
                            {l.unit?.property?.address && (
                              <p className="text-[11px] text-[#6E6E73] truncate max-w-[220px] font-semibold">
                                {l.unit.property.address}, {l.unit.property.city}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-[#1D1D1F] font-bold">
                            {new Date(l.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} &mdash; {new Date(l.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                          <p className="text-[11px] text-[#6E6E73] font-semibold flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-3 w-3 text-[#8E8E93]" />
                            {months} month{months !== 1 ? "s" : ""} duration
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="font-extrabold text-sm text-[#1D1D1F]">${Number(l.monthlyRent).toLocaleString()}<span className="text-[#6E6E73] text-[10px] font-normal">/mo</span></p>
                          <p className="text-[11px] text-[#6E6E73] font-semibold">Deposit: ${Number(l.securityDeposit || l.monthlyRent).toLocaleString()}</p>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${statusBadge(l)}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDot(l)}`} />
                            {formatStatus(l)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {l.status === "SIGNED" && new Date(l.startDate).getTime() > Date.now() ? (
                            <span className="text-xs text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">Move-in in {Math.ceil((new Date(l.startDate).getTime() - Date.now()) / 86400000)}d</span>
                          ) : daysLeft > 0 ? (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${daysLeft < 30 ? 'text-amber-700 bg-amber-50 border border-amber-100' : 'text-[#6E6E73] bg-slate-50 border border-slate-100'}`}>{daysLeft}d left</span>
                          ) : (
                            <span className="text-xs text-red-600 font-bold bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">Expired</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-2">
                            {l.status === "PENDING_SIGNATURE" && (
                              <Button size="sm" onClick={() => router.push(`/dashboard/leases/${l.id}`)}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl h-8 px-3">
                                View & Sign
                              </Button>
                            )}
                            <LeaseActionsMenu lease={l} onSignLease={handleSignLease} onRequestMoveOut={openMoveOutModal} variant="table" />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* ── GRID VIEW ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((l) => {
                const daysLeft = Math.ceil(
                  (new Date(l.endDate).getTime() - Date.now()) / 86400000
                );
                const expiringSoon = l.status === "ACTIVE" && daysLeft <= 60 && daysLeft > 0;
                return (
                  <Card
                    key={l.id}
                    onClick={() => router.push(`/dashboard/leases/${l.id}`)}
                    className="cursor-pointer bg-white border-0 ring-1 ring-slate-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 relative"
                  >
                    {/* Top-Right Action Menu */}
                    <div className="absolute top-3 right-3 z-30" onClick={(e) => e.stopPropagation()}>
                      <LeaseActionsMenu lease={l} onSignLease={handleSignLease} onRequestMoveOut={openMoveOutModal} variant="card" />
                    </div>

                    {/* Property image / placeholder */}
                    <div className="h-44 w-full bg-gradient-to-br from-[#F2F2F7] to-[#EFF6FF] relative overflow-hidden">
                      {l.unit?.property?.coverPhoto ? (
                        <img
                          src={l.unit.property.coverPhoto}
                          alt={l.unit.property.name}
                          className="h-full w-full object-cover group-hover:scale-103 transition-transform duration-500"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-slate-50 text-[#8E8E93]">
                          <Home className="h-10 w-10 text-slate-300 group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      )}
                      {/* Status badge overlay */}
                      <div className="absolute top-3 left-3">
                        <span className={`inline-flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-xs ${
                          l.status === "ACTIVE" && hasUnpaidDeposit(l)
                            ? "bg-blue-600 text-white"
                            : l.status === "ACTIVE"
                            ? "bg-emerald-600 text-white"
                            : l.status === "PENDING_SIGNATURE"
                            ? "bg-amber-500 text-white"
                            : "bg-slate-600 text-white"
                        }`}>
                          <span className="h-1 w-1 rounded-full bg-white" />
                          {formatStatus(l)}
                        </span>
                      </div>
                      {expiringSoon && (
                        <div className="absolute top-3 right-12">
                          <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full bg-rose-600 text-white shadow-xs">
                            <Clock className="h-2.5 w-2.5" /> {daysLeft}d left
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-6 flex flex-col flex-1 space-y-4">
                      {/* Property name + unit */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-extrabold text-base text-[#1D1D1F] truncate group-hover:text-[#007AFF] transition-colors">
                            {l.unit?.property?.name || "Unknown Property"}
                          </h3>
                        </div>
                        <p className="text-[11px] font-extrabold text-[#007AFF] uppercase tracking-wider bg-blue-50 w-fit px-2 py-0.5 rounded-md">
                          Unit {l.unit?.name || "—"}
                        </p>
                      </div>

                      {/* Address */}
                      {l.unit?.property?.address && (
                        <div className="flex items-start gap-1.5 text-[#6E6E73] min-h-[32px]">
                          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#8E8E93]" />
                          <span className="text-[11px] font-semibold leading-normal line-clamp-2">
                            {l.unit.property.address}, {l.unit.property.city}
                          </span>
                        </div>
                      )}

                      <div className="h-px bg-slate-100" />

                      {/* Rent + Deposit */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] text-[#94A3B8] font-black uppercase tracking-widest">Monthly Rent</p>
                          <p className="text-sm font-extrabold text-[#1D1D1F] mt-1">
                            ${Number(l.monthlyRent).toLocaleString()}<span className="text-[10px] text-[#8E8E93] font-normal">/mo</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[#94A3B8] font-black uppercase tracking-widest">Deposit</p>
                          <p className="text-sm font-extrabold text-[#6E6E73] mt-1">
                            ${Number(l.securityDeposit || l.monthlyRent).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="h-px bg-slate-100" />

                      {/* Lease term */}
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <p className="text-[9px] text-[#94A3B8] font-black uppercase tracking-widest">Lease Term</p>
                          <p className="text-[11px] text-[#1D1D1F] font-semibold mt-1">
                            {new Date(l.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} &mdash; {new Date(l.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        {daysLeft > 0 ? (
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            daysLeft < 30 ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-[#6E6E73]"
                          }`}>
                            {daysLeft}d left
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700">
                            Expired
                          </span>
                        )}
                      </div>

                      {/* Action */}
                      {l.status === "PENDING_SIGNATURE" && (
                        <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            onClick={() => router.push(`/dashboard/leases/${l.id}`)}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-10 rounded-xl shadow-xs text-xs"
                          >
                            View & Sign Contract
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Move-Out Request Modal — 2-Step Clean Form */}
      {showMoveOutModal && activeLeaseForMoveOut && (() => {
        const noticeDays = activeLeaseForMoveOut?.moveOutNoticeDays || 30;
        const isShortNotice = moveOutDate
          ? (new Date(moveOutDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24) < noticeDays
          : false;
        const forwardingFull = [forwardingStreet, forwardingCity, forwardingState, forwardingZip].filter(Boolean).join(", ");

        const step1Valid = moveOutDate && moveOutReason &&
          (moveOutReason !== "Other" || (otherReasonNote && otherReasonNote.trim().length >= 10)) &&
          forwardingStreet && forwardingCity && forwardingState && forwardingZip;
        const step2Valid = utilitiesChecked && cleaningChecked &&
          refundBankName && refundAccountName && refundAccountNumber;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <Card className="w-full max-w-lg bg-white border-0 shadow-2xl rounded-[24px] flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Sticky Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-extrabold text-[#1D1D1F]">Request Move-Out</h2>
                  <p className="text-xs text-[#6E6E73] mt-0.5">{activeLeaseForMoveOut.unit?.property?.name} — {activeLeaseForMoveOut.unit?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Step dots */}
                  <div className="flex gap-1.5">
                    {[1, 2].map((step) => (
                      <div key={step} className={`h-1.5 rounded-full transition-all ${moveOutStep >= step ? 'w-8 bg-[#007AFF]' : 'w-4 bg-[#E5E5EA]'}`} />
                    ))}
                  </div>
                  <button type="button" onClick={() => setShowMoveOutModal(false)} className="p-1.5 rounded-full hover:bg-[#F2F2F7] text-[#8E8E93] hover:text-[#6E6E73] transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleRequestMoveOut} className="flex flex-col flex-1 overflow-hidden">
                {/* Scrollable Form Fields */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* ── STEP 1: Notice Details ── */}
                  {moveOutStep === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <p className="text-sm font-semibold text-[#6E6E73]">Step 1 of 2 — Notice Details</p>

                      {/* Move-Out Date */}
                      <div>
                        <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Planned Move-Out Date *</label>
                        <input
                          type="date"
                          required
                          value={moveOutDate}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) => setMoveOutDate(e.target.value)}
                          className="w-full mt-1.5 p-3 rounded-xl border border-[#E5E5EA] focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] outline-none text-sm"
                        />
                        {moveOutDate && !isShortNotice && (
                          <p className="text-emerald-600 text-xs font-semibold mt-1 flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> Notice period met ({noticeDays} days required).
                          </p>
                        )}
                      </div>

                      {/* Early Termination Warning */}
                      {moveOutDate && isShortNotice && (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                          <p className="text-amber-900 font-extrabold text-sm flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            Early Termination Notice
                          </p>
                          <p className="text-amber-800 text-xs font-semibold leading-relaxed">
                            Your lease requires {noticeDays} days notice. By submitting this date, you are breaking your lease early.
                            {activeLeaseForMoveOut.earlyTerminationFee && Number(activeLeaseForMoveOut.earlyTerminationFee) > 0 && (
                              <> An early termination fee of <strong>${Number(activeLeaseForMoveOut.earlyTerminationFee).toLocaleString()}</strong> will be billed.</>
                            )}
                          </p>
                        </div>
                      )}

                      {/* Reason */}
                      <div>
                        <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Reason for Moving *</label>
                        <select
                          required
                          value={moveOutReason}
                          onChange={(e) => setMoveOutReason(e.target.value)}
                          className="w-full mt-1.5 p-3 rounded-xl border border-[#E5E5EA] focus:border-[#007AFF] outline-none text-sm bg-white"
                        >
                          <option value="" disabled>Select a reason...</option>
                          <option value="End of Lease Term">End of Lease Term</option>
                          <option value="Job Relocation">Job Relocation</option>
                          <option value="Buying a Home">Buying a Home</option>
                          <option value="Need More Space">Need More Space</option>
                          <option value="Downsizing">Downsizing</option>
                          <option value="Personal Reasons">Personal Reasons</option>
                          <option value="Other">Other</option>
                        </select>
                        {moveOutReason === "Other" && (
                          <div className="mt-2">
                            <input
                              type="text"
                              required
                              placeholder="Please describe your reason (min. 10 characters)..."
                              value={otherReasonNote}
                              onChange={(e) => setOtherReasonNote(e.target.value)}
                              className="w-full p-3 rounded-xl border border-[#E5E5EA] focus:border-[#007AFF] outline-none text-sm"
                            />
                            {otherReasonNote.length > 0 && otherReasonNote.length < 10 && (
                              <p className="text-red-500 text-xs mt-1">{10 - otherReasonNote.length} more characters required.</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Forwarding Address — always visible */}
                      <div>
                        <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Forwarding Address *</label>
                        <p className="text-[10px] text-[#94A3B8] mt-0.5 mb-1.5">Your deposit disposition letter will be mailed here — required regardless of refund method.</p>
                        <input
                          required
                          placeholder="Street Address"
                          value={forwardingStreet}
                          onChange={(e) => setForwardingStreet(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-[#E5E5EA] focus:border-[#007AFF] outline-none text-sm"
                        />
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <input
                            required
                            placeholder="City"
                            value={forwardingCity}
                            onChange={(e) => setForwardingCity(e.target.value)}
                            className="col-span-1 p-2.5 rounded-lg border border-[#E5E5EA] focus:border-[#007AFF] outline-none text-sm"
                          />
                          <input
                            required
                            placeholder="State"
                            value={forwardingState}
                            onChange={(e) => setForwardingState(e.target.value)}
                            className="p-2.5 rounded-lg border border-[#E5E5EA] focus:border-[#007AFF] outline-none text-sm"
                          />
                          <input
                            required
                            placeholder="Zip"
                            value={forwardingZip}
                            onChange={(e) => setForwardingZip(e.target.value)}
                            className="p-2.5 rounded-lg border border-[#E5E5EA] focus:border-[#007AFF] outline-none text-sm"
                          />
                        </div>
                      </div>

                      {/* Deposit info */}
                      <div className="bg-[#F2F2F7] border border-[#E5E5EA] p-3 rounded-xl flex justify-between items-center text-xs">
                        <span className="font-bold text-[#6E6E73]">Security Deposit Timeline:</span>
                        <span className="font-black text-[#007AFF]">Within {activeLeaseForMoveOut.depositReturnDays || 21} days of move-out</span>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 2: Confirm & Refund Method ── */}
                  {moveOutStep === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <p className="text-sm font-semibold text-[#6E6E73]">Step 2 of 2 — Confirm & Refund Method</p>

                      {/* Deposit Refund Account */}
                      <div>
                        <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Deposit Refund Account *</label>
                        <p className="text-xs text-[#6E6E73] mt-1 mb-3">Please provide your bank details. Your deposit refund will be securely transferred via encrypted wire. This is the fastest and safest method.</p>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider mb-1 block">Bank Name</label>
                            <input
                              required
                              placeholder="e.g. Chase Bank"
                              value={refundBankName}
                              onChange={(e) => setRefundBankName(e.target.value)}
                              className="w-full p-2.5 rounded-lg border border-[#E5E5EA] focus:border-[#007AFF] outline-none text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider mb-1 block">Account Holder Name</label>
                            <input
                              required
                              placeholder="e.g. John Doe"
                              value={refundAccountName}
                              onChange={(e) => setRefundAccountName(e.target.value)}
                              className="w-full p-2.5 rounded-lg border border-[#E5E5EA] focus:border-[#007AFF] outline-none text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider mb-1 block">Account Number</label>
                            <input
                              required
                              type="text"
                              placeholder="Account Number"
                              value={refundAccountNumber}
                              onChange={(e) => setRefundAccountNumber(e.target.value)}
                              className="w-full p-2.5 rounded-lg border border-[#E5E5EA] focus:border-[#007AFF] outline-none text-sm font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Your Responsibilities */}
                      <div>
                        <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Your Responsibilities</label>
                        <div className="mt-2 space-y-3">
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input type="checkbox" required checked={utilitiesChecked} onChange={(e) => setUtilitiesChecked(e.target.checked)} className="mt-1 shrink-0 h-4 w-4 rounded border-[#E5E5EA] text-[#007AFF]" />
                            <span className="text-xs font-semibold text-[#6E6E73] group-hover:text-[#1D1D1F] transition-colors leading-relaxed">
                              I will transfer or cancel all utilities by my move-out date.
                            </span>
                          </label>
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input type="checkbox" required checked={cleaningChecked} onChange={(e) => setCleaningChecked(e.target.checked)} className="mt-1 shrink-0 h-4 w-4 rounded border-[#E5E5EA] text-[#007AFF]" />
                            <span className="text-xs font-semibold text-[#6E6E73] group-hover:text-[#1D1D1F] transition-colors leading-relaxed">
                              I have read and agree to the move-out cleaning standards to ensure a full deposit return.
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Confirmation Summary */}
                      <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl p-4 space-y-2">
                        <p className="text-xs font-extrabold text-[#0369A1] uppercase tracking-wider mb-2">Confirm Your Notice</p>
                        <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                          <span className="text-[#6E6E73] font-semibold">Move-Out Date:</span>
                          <span className="font-bold text-[#1D1D1F]">{moveOutDate ? new Date(moveOutDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}</span>
                          <span className="text-[#6E6E73] font-semibold">Reason:</span>
                          <span className="font-bold text-[#1D1D1F]">{moveOutReason === "Other" ? `Other: ${otherReasonNote}` : moveOutReason}</span>
                          <span className="text-[#6E6E73] font-semibold">Forwarding Address:</span>
                          <span className="font-bold text-[#1D1D1F]">{forwardingFull || "—"}</span>
                          <span className="text-[#6E6E73] font-semibold">Refund Method:</span>
                          <span className="font-bold text-[#1D1D1F]">Direct Bank Transfer</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Footer */}
                <div className="px-6 py-4 border-t border-[#F1F5F9] flex gap-3 shrink-0 bg-slate-50/50">
                  {moveOutStep === 1 ? (
                    <Button type="button" variant="outline" onClick={() => setShowMoveOutModal(false)}
                      className="flex-1 rounded-xl h-11 border-[#E5E5EA] text-[#6E6E73] font-bold">Cancel</Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => setMoveOutStep(1)}
                      className="flex-1 rounded-xl h-11 border-[#E5E5EA] text-[#6E6E73] font-bold">← Back</Button>
                  )}
                  <Button
                    type="submit"
                    disabled={
                      (moveOutStep === 1 && !step1Valid) ||
                      (moveOutStep === 2 && (!step2Valid || moveOutSubmitting))
                    }
                    className={`flex-1 rounded-xl h-11 font-bold text-white disabled:opacity-50 ${
                      isShortNotice ? "bg-amber-500 hover:bg-amber-600" : "bg-[#007AFF] hover:bg-[#0062CC]"
                    }`}
                  >
                    {moveOutStep < 2
                      ? "Next →"
                      : moveOutSubmitting
                        ? "Submitting..."
                        : isShortNotice
                          ? "Submit Early Notice (Fee May Apply)"
                          : "Confirm & Submit Notice"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        );
      })()}
      <ConfirmDialog
        open={declineRenewalLeaseId !== null}
        onOpenChange={(open) => { if (!open) setDeclineRenewalLeaseId(null); }}
        title="Decline Renewal"
        description="Are you sure you want to decline the renewal? This will mark your lease for move-out."
        confirmLabel="Decline Renewal"
        confirmVariant="destructive"
        onConfirm={() => { if (declineRenewalLeaseId) handleRejectRenewal(declineRenewalLeaseId); }}
      />
    </div>
  );
}
