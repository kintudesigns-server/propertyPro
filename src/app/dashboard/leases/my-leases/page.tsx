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
    if (!confirm("Are you sure you want to decline the renewal? This will mark your lease for move-out.")) return;
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
        <Loader2 className="h-10 w-10 animate-spin text-[#3B82F6]" />
        <p className="text-slate-400 font-extrabold text-sm uppercase tracking-wider">
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
    return "bg-slate-100 text-slate-600 border border-slate-200";
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

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#EFF6FF] text-[#3B82F6] p-3 rounded-2xl flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">My Leases</h1>
            <p className="text-[#64748B] text-sm mt-0.5">View and manage your lease agreements</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Grid / List toggle */}
          <div className="flex items-center bg-white border border-[#E2E8F0] rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-[#3B82F6] text-white shadow-sm"
                  : "text-[#64748B] hover:bg-slate-100"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-[#3B82F6] text-white shadow-sm"
                  : "text-[#64748B] hover:bg-slate-100"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button
            onClick={fetchLeases}
            variant="outline"
            className="bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] rounded-xl font-semibold flex items-center gap-2 h-10 px-4 shadow-sm"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Pending Lease Alert ── */}
      {pendingLease && (
        <Card className="bg-amber-50 border border-amber-200 rounded-2xl shadow-sm p-6">
          <CardHeader className="pb-4 p-0">
            <CardTitle className="text-base font-extrabold flex items-center gap-2 text-amber-900">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Action Required: Lease Pending Signature
            </CardTitle>
            <CardDescription className="text-amber-700 text-xs font-semibold">
              Pending lease for {pendingLease.unit?.name} at{" "}
              {pendingLease.unit?.property?.name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 p-0 space-y-3 text-sm">
            <div className="flex justify-between pb-3 border-b border-amber-200/60">
              <span className="text-amber-700">Monthly Rent</span>
              <strong className="text-amber-900 font-extrabold">
                ${Number(pendingLease.monthlyRent).toLocaleString()}
              </strong>
            </div>
            <Button
              onClick={() => router.push(`/dashboard/leases/${pendingLease.id}`)}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-10 rounded-xl shadow-sm"
            >
              View & Sign Lease Contract
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Pending Renewal Alert ── */}
      {pendingRenewal && (
        <Card className="bg-purple-50 border border-purple-200 rounded-2xl shadow-sm p-6">
          <CardHeader className="pb-4 p-0">
            <CardTitle className="text-base font-extrabold flex items-center gap-2 text-purple-900">
              <ShieldAlert className="h-5 w-5 text-purple-600" />
              Action Required: Lease Renewal Offer
            </CardTitle>
            <CardDescription className="text-purple-700 text-xs font-semibold">
              Your lease for {pendingRenewal.unit?.name} at{" "}
              {pendingRenewal.unit?.property?.name} is expiring soon. The owner has offered a renewal.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 p-0 space-y-3 text-sm">
            <div className="flex justify-between pb-3 border-b border-purple-200/60">
              <span className="text-purple-700">Proposed New Rent</span>
              <strong className="text-purple-900 font-extrabold">
                ${Number(pendingRenewal.monthlyRent).toLocaleString()}
              </strong>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => handleAcceptRenewal(pendingRenewal.id)}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold h-10 rounded-xl shadow-sm"
              >
                Accept & Renew Lease
              </Button>
              <Button
                onClick={() => handleRejectRenewal(pendingRenewal.id)}
                variant="outline"
                className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-100 font-bold h-10 rounded-xl bg-white"
              >
                Decline (Move Out)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Leases */}
        <Card className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B]">Total Leases</p>
              <h3 className="text-3xl font-black text-[#0F172A] mt-1 tracking-tight">{leases.length}</h3>
              <p className="text-xs text-[#94A3B8] mt-1">{leases.length} currently active</p>
            </div>
            <div className="p-2.5 bg-[#EFF6FF] rounded-xl text-[#3B82F6]">
              <Home className="h-5 w-5" />
            </div>
          </div>
        </Card>

        {/* Active Leases */}
        <Card className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B]">Active Leases</p>
              <h3 className="text-3xl font-black text-[#0F172A] mt-1 tracking-tight">{activeCount}</h3>
              <p className="text-xs text-[#94A3B8] mt-1">Currently occupied</p>
            </div>
            <div className="p-2.5 bg-[#F0FDF4] rounded-xl text-[#16A34A]">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </Card>

        {/* Expiring Soon */}
        <Card className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B]">Expiring Soon</p>
              <h3 className="text-3xl font-black text-[#0F172A] mt-1 tracking-tight">{expiringCount}</h3>
              <p className="text-xs text-[#94A3B8] mt-1">Within 60 days</p>
            </div>
            <div className="p-2.5 bg-[#FFFBEB] rounded-xl text-[#D97706]">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </Card>

        {/* Total Monthly Rent */}
        <Card className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B]">Total Monthly Rent</p>
              <h3 className="text-2xl font-black text-[#0F172A] mt-1 tracking-tight">
                ${totalRent.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-[#94A3B8] mt-1">Combined across all leases</p>
            </div>
            <div className="p-2.5 bg-[#F0FDF4] rounded-xl text-[#16A34A]">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Leases Panel (full-width) ── */}
      <Card className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-3">
            <div className="bg-[#EFF6FF] text-[#3B82F6] p-2 rounded-xl">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#0F172A]">Leases</h2>
              <p className="text-xs text-[#64748B]">Manage your property leases and agreements</p>
            </div>
          </div>
          {/* Duplicate view toggle inside card header — matches reference */}
          <div className="flex items-center bg-slate-100 border border-[#E2E8F0] rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-[#3B82F6] text-white shadow-sm"
                  : "text-[#64748B] hover:bg-white"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-[#3B82F6] text-white shadow-sm"
                  : "text-[#64748B] hover:bg-white"
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
              className="pl-10 pr-4 py-2.5 w-full bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#3B82F6] shadow-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#E2E8F0] text-sm text-[#0F172A] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#3B82F6] shadow-sm cursor-pointer font-semibold min-w-[130px]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="pending_signature">Pending Signature</option>
            <option value="terminated">Terminated</option>
            <option value="expired">Expired</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-[#E2E8F0] text-sm text-[#0F172A] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#3B82F6] shadow-sm cursor-pointer font-semibold min-w-[140px]"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="rent_high">Rent: High to Low</option>
            <option value="rent_low">Rent: Low to High</option>
          </select>
        </div>

        {/* Sub-heading */}
        <div className="px-6 pt-5 pb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#3B82F6]" />
          <h3 className="font-extrabold text-[#0F172A] text-sm">
            My Leases ({filtered.length})
          </h3>
          <span className="text-xs text-[#64748B] font-normal">
            — Manage all your lease agreements and property details
          </span>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {filtered.length === 0 ? (
            <div className="text-center py-14 text-[#64748B] italic font-semibold border border-dashed border-[#E2E8F0] rounded-2xl bg-[#F8FAFC]">
              No leases match your search.
            </div>
          ) : viewMode === "list" ? (
            /* ── LIST VIEW ── */
            <div className="overflow-x-auto rounded-xl border border-[#F1F5F9]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-[#F8FAFC]">
                    <TableHead className="font-bold text-xs uppercase text-[#64748B] py-3 pl-4">Property & Unit</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B] py-3">Lease Period</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B] py-3">Monthly Rent</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B] py-3">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B] py-3">Days Until</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B] py-3 text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => {
                    const daysLeft = Math.ceil((new Date(l.endDate).getTime() - Date.now()) / 86400000);
                    const months = Math.round(Math.abs(daysLeft) / 30);
                    return (
                      <TableRow key={l.id} className="hover:bg-[#F8FAFC] transition-colors border-t border-[#F1F5F9]">
                        <TableCell className="py-4 pl-4">
                          <div>
                            <p className="font-bold text-[#0F172A] text-sm">
                              {l.unit?.property?.name || "Unknown"}
                            </p>
                            {l.unit?.property?.address && (
                              <p className="text-[11px] text-[#64748B] truncate max-w-[180px]">
                                {l.unit.property.address}, {l.unit.property.city}, {l.unit.property.state} {l.unit.property.zip}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-[#0F172A] font-semibold">
                            {new Date(l.startDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} - {new Date(l.endDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                          </p>
                          <p className="text-[11px] text-[#94A3B8]">{months} month{months !== 1 ? "s" : ""}</p>
                          <p className="text-[11px] text-[#64748B]">Deposit: ${Number(l.securityDeposit || l.monthlyRent).toLocaleString()}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-bold text-[#0F172A]">${Number(l.monthlyRent).toLocaleString()}</p>
                          <p className="text-[11px] text-[#94A3B8]">Deposit: ${Number(l.securityDeposit || l.monthlyRent).toLocaleString()}</p>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${statusBadge(l)}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDot(l)}`} />
                            {formatStatus(l)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {l.status === "SIGNED" && new Date(l.startDate).getTime() > Date.now() ? (
                            <span className="text-sm text-indigo-600 font-semibold">Move-in in {Math.ceil((new Date(l.startDate).getTime() - Date.now()) / 86400000)} days</span>
                          ) : daysLeft > 0 ? (
                            <span className="text-sm text-[#64748B] font-semibold">{daysLeft} days remaining</span>
                          ) : (
                            <span className="text-sm text-red-500 font-semibold">Expired {Math.abs(daysLeft)} days ago</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((l) => {
                const daysLeft = Math.ceil(
                  (new Date(l.endDate).getTime() - Date.now()) / 86400000
                );
                const expiringSoon = l.status === "ACTIVE" && daysLeft <= 60 && daysLeft > 0;
                return (
                  <Card
                    key={l.id}
                    className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all duration-200 relative"
                  >
                    {/* Top-Right Action Menu */}
                    <div className="absolute top-3 right-3 z-30">
                      <LeaseActionsMenu lease={l} onSignLease={handleSignLease} onRequestMoveOut={openMoveOutModal} variant="card" />
                    </div>

                    {/* Property image / placeholder */}
                    <div className="h-40 w-full bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] relative overflow-hidden">
                      {l.unit?.property?.coverPhoto ? (
                        <img
                          src={l.unit.property.coverPhoto}
                          alt={l.unit.property.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Home className="h-12 w-12 text-[#93C5FD] opacity-60" />
                        </div>
                      )}
                      {/* Status badge overlay */}
                      <div className="absolute top-3 left-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm ${
                          l.status === "ACTIVE" && hasUnpaidDeposit(l)
                            ? "bg-blue-500 text-white"
                            : l.status === "ACTIVE"
                            ? "bg-emerald-500 text-white"
                            : l.status === "PENDING_SIGNATURE"
                            ? "bg-amber-500 text-white"
                            : "bg-slate-500 text-white"
                        }`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                          {formatStatus(l)}
                        </span>
                      </div>
                      {expiringSoon && (
                        <div className="absolute top-3 right-12">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white shadow-sm">
                            <Clock className="h-2.5 w-2.5" /> {daysLeft}d left
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex flex-col flex-1 space-y-4">
                      {/* Property name + unit */}
                      <div>
                        <h3 className="font-black text-base text-[#0F172A] truncate">
                          {l.unit?.property?.name || "Unknown Property"}
                        </h3>
                        <p className="text-xs font-semibold text-[#3B82F6] mt-0.5">
                          Unit {l.unit?.name || "—"}
                        </p>
                      </div>

                      {/* Address */}
                      {l.unit?.property?.address && (
                        <div className="flex items-start gap-1.5 text-[#64748B]">
                          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span className="text-xs leading-relaxed line-clamp-2">
                            {l.unit.property.address}, {l.unit.property.city}
                            {l.unit.property.state ? `, ${l.unit.property.state}` : ""}
                            {l.unit.property.zip ? ` ${l.unit.property.zip}` : ""}
                          </span>
                        </div>
                      )}

                      <div className="h-px bg-[#F1F5F9]" />

                      {/* Rent + Deposit */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Monthly Rent</p>
                          <p className="text-sm font-black text-[#3B82F6] mt-0.5">
                            ${Number(l.monthlyRent).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Deposit</p>
                          <p className="text-sm font-bold text-[#0F172A] mt-0.5">
                            ${Number(l.securityDeposit || l.monthlyRent).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="h-px bg-[#F1F5F9]" />

                      {/* Lease term */}
                      <div>
                        <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Lease Term</p>
                        <p className="text-xs text-[#0F172A] font-semibold mt-0.5">
                          {new Date(l.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {" "}&ndash;{" "}
                          {new Date(l.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>

                      {/* Action */}
                      {l.status === "PENDING_SIGNATURE" && (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => router.push(`/dashboard/leases/${l.id}`)}
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold h-9 rounded-xl shadow-sm text-sm"
                          >
                            View & Sign
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
                  <h2 className="text-xl font-extrabold text-[#0F172A]">Request Move-Out</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">{activeLeaseForMoveOut.unit?.property?.name} — {activeLeaseForMoveOut.unit?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Step dots */}
                  <div className="flex gap-1.5">
                    {[1, 2].map((step) => (
                      <div key={step} className={`h-1.5 rounded-full transition-all ${moveOutStep >= step ? 'w-8 bg-[#3B82F6]' : 'w-4 bg-[#E2E8F0]'}`} />
                    ))}
                  </div>
                  <button type="button" onClick={() => setShowMoveOutModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
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
                      <p className="text-sm font-semibold text-[#64748B]">Step 1 of 2 — Notice Details</p>

                      {/* Move-Out Date */}
                      <div>
                        <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Planned Move-Out Date *</label>
                        <input
                          type="date"
                          required
                          value={moveOutDate}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) => setMoveOutDate(e.target.value)}
                          className="w-full mt-1.5 p-3 rounded-xl border border-[#E2E8F0] focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] outline-none text-sm"
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
                        <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Reason for Moving *</label>
                        <select
                          required
                          value={moveOutReason}
                          onChange={(e) => setMoveOutReason(e.target.value)}
                          className="w-full mt-1.5 p-3 rounded-xl border border-[#E2E8F0] focus:border-[#3B82F6] outline-none text-sm bg-white"
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
                              className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:border-[#3B82F6] outline-none text-sm"
                            />
                            {otherReasonNote.length > 0 && otherReasonNote.length < 10 && (
                              <p className="text-red-500 text-xs mt-1">{10 - otherReasonNote.length} more characters required.</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Forwarding Address — always visible */}
                      <div>
                        <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Forwarding Address *</label>
                        <p className="text-[10px] text-[#94A3B8] mt-0.5 mb-1.5">Your deposit disposition letter will be mailed here — required regardless of refund method.</p>
                        <input
                          required
                          placeholder="Street Address"
                          value={forwardingStreet}
                          onChange={(e) => setForwardingStreet(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-[#E2E8F0] focus:border-[#3B82F6] outline-none text-sm"
                        />
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <input
                            required
                            placeholder="City"
                            value={forwardingCity}
                            onChange={(e) => setForwardingCity(e.target.value)}
                            className="col-span-1 p-2.5 rounded-lg border border-[#E2E8F0] focus:border-[#3B82F6] outline-none text-sm"
                          />
                          <input
                            required
                            placeholder="State"
                            value={forwardingState}
                            onChange={(e) => setForwardingState(e.target.value)}
                            className="p-2.5 rounded-lg border border-[#E2E8F0] focus:border-[#3B82F6] outline-none text-sm"
                          />
                          <input
                            required
                            placeholder="Zip"
                            value={forwardingZip}
                            onChange={(e) => setForwardingZip(e.target.value)}
                            className="p-2.5 rounded-lg border border-[#E2E8F0] focus:border-[#3B82F6] outline-none text-sm"
                          />
                        </div>
                      </div>

                      {/* Deposit info */}
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-xl flex justify-between items-center text-xs">
                        <span className="font-bold text-[#64748B]">Security Deposit Timeline:</span>
                        <span className="font-black text-[#3B82F6]">Within {activeLeaseForMoveOut.depositReturnDays || 21} days of move-out</span>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 2: Confirm & Refund Method ── */}
                  {moveOutStep === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <p className="text-sm font-semibold text-[#64748B]">Step 2 of 2 — Confirm & Refund Method</p>

                      {/* Deposit Refund Account */}
                      <div>
                        <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Deposit Refund Account *</label>
                        <p className="text-xs text-[#64748B] mt-1 mb-3">Please provide your bank details. Your deposit refund will be securely transferred via encrypted wire. This is the fastest and safest method.</p>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1 block">Bank Name</label>
                            <input
                              required
                              placeholder="e.g. Chase Bank"
                              value={refundBankName}
                              onChange={(e) => setRefundBankName(e.target.value)}
                              className="w-full p-2.5 rounded-lg border border-[#E2E8F0] focus:border-[#3B82F6] outline-none text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1 block">Account Holder Name</label>
                            <input
                              required
                              placeholder="e.g. John Doe"
                              value={refundAccountName}
                              onChange={(e) => setRefundAccountName(e.target.value)}
                              className="w-full p-2.5 rounded-lg border border-[#E2E8F0] focus:border-[#3B82F6] outline-none text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1 block">Account Number</label>
                            <input
                              required
                              type="text"
                              placeholder="Account Number"
                              value={refundAccountNumber}
                              onChange={(e) => setRefundAccountNumber(e.target.value)}
                              className="w-full p-2.5 rounded-lg border border-[#E2E8F0] focus:border-[#3B82F6] outline-none text-sm font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Your Responsibilities */}
                      <div>
                        <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Your Responsibilities</label>
                        <div className="mt-2 space-y-3">
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input type="checkbox" required checked={utilitiesChecked} onChange={(e) => setUtilitiesChecked(e.target.checked)} className="mt-1 shrink-0 h-4 w-4 rounded border-[#E2E8F0] text-[#3B82F6]" />
                            <span className="text-xs font-semibold text-[#64748B] group-hover:text-[#0F172A] transition-colors leading-relaxed">
                              I will transfer or cancel all utilities by my move-out date.
                            </span>
                          </label>
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input type="checkbox" required checked={cleaningChecked} onChange={(e) => setCleaningChecked(e.target.checked)} className="mt-1 shrink-0 h-4 w-4 rounded border-[#E2E8F0] text-[#3B82F6]" />
                            <span className="text-xs font-semibold text-[#64748B] group-hover:text-[#0F172A] transition-colors leading-relaxed">
                              I have read and agree to the move-out cleaning standards to ensure a full deposit return.
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Confirmation Summary */}
                      <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl p-4 space-y-2">
                        <p className="text-xs font-extrabold text-[#0369A1] uppercase tracking-wider mb-2">Confirm Your Notice</p>
                        <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                          <span className="text-[#64748B] font-semibold">Move-Out Date:</span>
                          <span className="font-bold text-[#0F172A]">{moveOutDate ? new Date(moveOutDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}</span>
                          <span className="text-[#64748B] font-semibold">Reason:</span>
                          <span className="font-bold text-[#0F172A]">{moveOutReason === "Other" ? `Other: ${otherReasonNote}` : moveOutReason}</span>
                          <span className="text-[#64748B] font-semibold">Forwarding Address:</span>
                          <span className="font-bold text-[#0F172A]">{forwardingFull || "—"}</span>
                          <span className="text-[#64748B] font-semibold">Refund Method:</span>
                          <span className="font-bold text-[#0F172A]">Direct Bank Transfer</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Footer */}
                <div className="px-6 py-4 border-t border-[#F1F5F9] flex gap-3 shrink-0 bg-slate-50/50">
                  {moveOutStep === 1 ? (
                    <Button type="button" variant="outline" onClick={() => setShowMoveOutModal(false)}
                      className="flex-1 rounded-xl h-11 border-[#E2E8F0] text-[#64748B] font-bold">Cancel</Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => setMoveOutStep(1)}
                      className="flex-1 rounded-xl h-11 border-[#E2E8F0] text-[#64748B] font-bold">← Back</Button>
                  )}
                  <Button
                    type="submit"
                    disabled={
                      (moveOutStep === 1 && !step1Valid) ||
                      (moveOutStep === 2 && (!step2Valid || moveOutSubmitting))
                    }
                    className={`flex-1 rounded-xl h-11 font-bold text-white disabled:opacity-50 ${
                      isShortNotice ? "bg-amber-500 hover:bg-amber-600" : "bg-[#3B82F6] hover:bg-[#2563EB]"
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
    </div>
  );
}
