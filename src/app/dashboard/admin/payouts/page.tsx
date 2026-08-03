"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield, Wallet, DollarSign, Activity, Search, RefreshCw, MoreVertical,
  Check, X, Mail, Eye, Loader2, FileText, ArrowDownRight, ArrowUpRight,
  Clock, AlertTriangle, ChevronLeft, ChevronRight, Download, Copy,
  TrendingDown, CheckCircle2, XCircle, Timer, Users, Upload, ImageIcon, Trash2, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { UnmaskAccountNumber } from "@/components/UnmaskAccountNumber";
import { PaginationBar } from "@/components/ui/PaginationBar";

// ─── Types ───────────────────────────────────────────────────────────────────
interface PayoutRecord {
  id: string;
  ownerId?: string;
  tenantId?: string;
  leaseId?: string;
  amount: string | number;
  status: "PENDING" | "COMPLETED" | "REJECTED";
  bankName: string;
  accountNumber: string;
  accountName: string;
  proofUrl?: string;
  refNumber?: string;
  rejectionReason?: string;
  disbursedAt?: string;
  createdAt: string;
  owner?: { name: string; email: string; balance?: string | number };
  tenant?: { name: string; email: string };
  lease?: {
    moveOutStatus?: string;
    tenantDisputeNote?: string;
    deductions?: any[];
    unit?: { name: string; property?: { name: string } };
  };
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface Stats {
  pendingCount: number;
  pendingAmountAtRisk: number;
  pendingOwnerCount: number;
  pendingTenantCount: number;
  settledVolume: number;
  rejectedVolume: number;
  processedCount: number;
  avgProcessingHours: number;
  overdueCount: number;
  approvalRate: number;
  ownerCount: number;
  tenantCount: number;
}

// ─── Aging helper ─────────────────────────────────────────────────────────────
function getAgingInfo(createdAt: string, slaHours: number = 48) {
  const hrs = (Date.now() - new Date(createdAt).getTime()) / 36e5;
  if (hrs >= slaHours) {
    const overdueHrs = Math.floor(hrs - slaHours);
    const overdueDays = Math.floor(overdueHrs / 24);
    const label = overdueHrs >= 24 ? `${overdueDays}d overdue` : `${overdueHrs}h overdue`;
    return { label, color: "text-red-600 bg-red-50 border-red-200 font-bold", isOverdue: true };
  }
  if (hrs < 24) return { label: `${Math.floor(hrs)}h pending`, color: "text-emerald-600 bg-emerald-50 border-emerald-200 font-bold", isOverdue: false };
  return { label: `${Math.floor(hrs / 24)}d pending`, color: "text-amber-600 bg-amber-50 border-amber-200 font-bold", isOverdue: false };
}

const REJECTION_REASONS = [
  "Fraud Suspected",
  "Insufficient Verification",
  "Incorrect Bank Details",
  "Duplicate Request",
  "Unreconciled Amount",
  "Admin Decision",
];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AdminPayoutsPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  // Data state
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, pageSize: 25, totalCount: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "OWNER" | "TENANT">("ALL");
  const [slaHours, setSlaHours] = useState(48);

  // Approve modal state
  const [selectedPayout, setSelectedPayout] = useState<PayoutRecord | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [adjustedAmount, setAdjustedAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [checklist, setChecklist] = useState({ nameVerified: false, accountConfirmed: false, amountReconciled: false });
  const [adminNotes, setAdminNotes] = useState("");
  const [transferMethod, setTransferMethod] = useState("BANK_TRANSFER");
  const [confirmGate, setConfirmGate] = useState(false);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectPayout, setRejectPayout] = useState<PayoutRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);
  const [rejectionNote, setRejectionNote] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Detail drawer state
  const [drawerPayout, setDrawerPayout] = useState<PayoutRecord | null>(null);

  // ─── Fetch ───────────────────────────────────────────────────────────────────
  const fetchPayouts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pagination.pageSize),
        status: statusFilter,
        type: activeTab,
        slaHours: String(slaHours),
        ...(searchTerm && { search: searchTerm }),
        ...(fromDate && { from: fromDate }),
        ...(toDate && { to: toDate }),
      });
      const res = await fetch(`/api/payouts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPayouts(data.payouts || []);
        setPagination(data.pagination || { page: 1, pageSize: 25, totalCount: 0, totalPages: 1 });
        setStats(data.stats || null);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || `Failed to load payouts (${res.status})`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, activeTab, searchTerm, fromDate, toDate, slaHours, pagination.pageSize]);

  useEffect(() => {
    if (sessionStatus === "authenticated") fetchPayouts(1);
  }, [sessionStatus, statusFilter, activeTab, fromDate, toDate, slaHours]);


  // Debounce search
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    const t = setTimeout(() => fetchPayouts(1), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // â”€â”€ Export CSV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleExport = async () => {
    const params = new URLSearchParams({
      export: "csv",
      status: statusFilter,
      type: activeTab,
      ...(searchTerm && { search: searchTerm }),
      ...(fromDate && { from: fromDate }),
      ...(toDate && { to: toDate }),
    });
    const a = document.createElement("a");
    a.href = `/api/payouts?${params}`;
    a.download = "";
    a.click();
  };

  // â”€â”€ Approve flow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openApproveModal = (po: PayoutRecord) => {
    setSelectedPayout(po);
    setRefNumber("");
    setProofUrl("");
    setProofFile(null);
    setProofUploading(false);
    setAdjustedAmount(String(po.amount));
    setAdminNotes("");
    setTransferMethod("BANK_TRANSFER");
    setConfirmGate(false);
    setChecklist({ nameVerified: false, accountConfirmed: false, amountReconciled: false });
    setShowApproveModal(true);
  };

  const handleProofUpload = async (file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP, or PDF files are accepted.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large — maximum 10 MB.");
      return;
    }
    setProofFile(file);
    setProofUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setProofUrl(url);
      toast.success("Receipt uploaded successfully.");
    } catch {
      toast.error("Could not upload receipt. Try again or paste a URL.");
      setProofFile(null);
      setProofUrl("");
    } finally {
      setProofUploading(false);
    }
  };

  const handleConfirmApproval = async () => {
    if (!refNumber) { toast.error("Please enter a transaction reference number."); return; }
    if (!checklist.nameVerified || !checklist.accountConfirmed || !checklist.amountReconciled) {
      toast.error("Please complete all verification checklist items before authorizing."); return;
    }
    setProcessing(true);
    try {
      const res = await fetch("/api/payouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutId: selectedPayout!.id,
          status: "COMPLETED",
          proofUrl: proofUrl || undefined,
          refNumber,
          amount: adjustedAmount ? Number(adjustedAmount) : undefined,
        }),
      });
      if (res.ok) {
        toast.success("Payout authorized and disbursed successfully!");
        setShowApproveModal(false);
        fetchPayouts(pagination.page);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to authorize payout");
      }
    } catch {
      toast.error("Error processing payout.");
    } finally {
      setProcessing(false);
    }
  };

  // â”€â”€ Reject flow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openRejectModal = (po: PayoutRecord) => {
    setRejectPayout(po);
    setRejectionReason(REJECTION_REASONS[0]);
    setRejectionNote("");
    setShowRejectModal(true);
  };

  const handleConfirmRejection = async () => {
    if (!rejectPayout) return;
    setRejecting(true);
    const finalReason = rejectionNote ? `${rejectionReason}: ${rejectionNote}` : rejectionReason;
    try {
      const res = await fetch("/api/payouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId: rejectPayout.id, status: "REJECTED", rejectionReason: finalReason }),
      });
      if (res.ok) {
        toast.success("Payout rejected. Funds returned to ledger.");
        setShowRejectModal(false);
        fetchPayouts(pagination.page);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to reject payout");
      }
    } catch {
      toast.error("Error rejecting payout.");
    } finally {
      setRejecting(false);
    }
  };

  // â”€â”€ Loading state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (sessionStatus === "loading" || (loading && payouts.length === 0)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-red-500" />
        <p className="text-[#6E6E73] font-bold text-sm uppercase tracking-wider">Loading payouts ledger...</p>
      </div>
    );
  }

  const isStripeRefund = (po: PayoutRecord) => po.bankName === "STRIPE";

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-6 pb-24 px-2 sm:px-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-50 rounded-xl">
            <Shield className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Payouts Control Ledger</h1>
            <p className="text-[#6E6E73] text-sm mt-0.5">
              {stats ? (
                stats.overdueCount > 0 ? (
                  <span className="text-red-600 font-semibold">{stats.pendingCount} pending · {stats.overdueCount} past {slaHours}h SLA</span>
                ) : (
                  <span>{stats.pendingCount} pending · All within {slaHours}h SLA target</span>
                )
              ) : (
                "Authorize withdrawals · Disburse refunds · Audit all transactions"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* SLA Target Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
            <Clock className="h-4 w-4 text-[#6E6E73]" />
            <span className="text-xs font-bold text-[#6E6E73]">SLA:</span>
            <select
              value={slaHours}
              onChange={(e) => setSlaHours(Number(e.target.value))}
              className="text-xs font-bold text-[#1D1D1F] bg-transparent focus:outline-none cursor-pointer"
            >
              <option value={12}>12 Hours</option>
              <option value={24}>24 Hours (1 Day)</option>
              <option value={48}>48 Hours (2 Days)</option>
              <option value={72}>72 Hours (3 Days)</option>
              <option value={120}>120 Hours (5 Days)</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchPayouts(pagination.page)}
            className="text-[#6E6E73] hover:bg-slate-100 rounded-xl"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">

          {/* Pending */}
          <div className="bg-white border-[#E5E5EA] border-l-4 border-l-amber-500 shadow-sm rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-widest">Pending</p>
              <p className="text-xl font-black text-[#1D1D1F] mt-0.5">{stats.pendingCount}</p>
              <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                ${stats.pendingAmountAtRisk.toLocaleString(undefined, { minimumFractionDigits: 2 })} at risk
              </p>
            </div>
            <Wallet className="h-5 w-5 text-amber-400 shrink-0" />
          </div>

          {/* Settled */}
          <div className="bg-white border-[#E5E5EA] border-l-4 border-l-emerald-500 shadow-sm rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-widest">Settled</p>
              <p className="text-xl font-black text-emerald-700 mt-0.5">
                ${stats.settledVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Total disbursed</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          </div>

          {/* Rejected */}
          <div className="bg-white border-[#E5E5EA] border-l-4 border-l-red-500 shadow-sm rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-widest">Rejected</p>
              <p className="text-xl font-black text-red-600 mt-0.5">
                ${stats.rejectedVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-red-500 font-semibold mt-0.5">Volume reversed</p>
            </div>
            <XCircle className="h-5 w-5 text-red-400 shrink-0" />
          </div>

          {/* Avg Processing */}
          <div className="bg-white border-[#E5E5EA] border-l-4 border-l-violet-500 shadow-sm rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-widest">Avg Time</p>
              <p className="text-xl font-black text-[#1D1D1F] mt-0.5">
                {stats.avgProcessingHours < 48 ? `${stats.avgProcessingHours}h` : `${Math.round(stats.avgProcessingHours / 24)}d`}
              </p>
              <p className="text-[10px] text-[#94A3B8] font-semibold mt-0.5">Avg to disburse</p>
            </div>
            <Timer className="h-5 w-5 text-violet-400 shrink-0" />
          </div>

          {/* 30-Day Approval Rate */}
          <div className="bg-white border-[#E5E5EA] border-l-4 border-l-blue-500 shadow-sm rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-widest">30-Day Approval</p>
              <p className="text-xl font-black text-blue-700 mt-0.5">{stats.approvalRate}%</p>
              <p className="text-[10px] text-blue-600 font-semibold mt-0.5">Rolling operational score</p>
            </div>
            <Activity className="h-5 w-5 text-blue-400 shrink-0" />
          </div>

        </div>
      )}

      {/* SLA Breach Warning Banner */}
      {stats && stats.overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-800">
                {stats.overdueCount} payout{stats.overdueCount > 1 ? "s exceed" : " exceeds"} the target {slaHours}h SLA
              </p>
              <p className="text-xs text-red-600">
                Prioritize pending disbursements marked as overdue below.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => { setStatusFilter("PENDING"); setActiveTab("ALL"); }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg"
          >
            Filter Overdue
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => { setActiveTab("ALL"); }}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === "ALL"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-[#6E6E73] hover:text-slate-700"
          }`}
        >
          All Payouts ({pagination.totalCount})
        </button>
        <button
          onClick={() => { setActiveTab("OWNER"); }}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === "OWNER"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-[#6E6E73] hover:text-slate-700"
          }`}
        >
          Owner Withdrawals ({stats?.ownerCount || 0})
        </button>
        <button
          onClick={() => { setActiveTab("TENANT"); }}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === "TENANT"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-[#6E6E73] hover:text-slate-700"
          }`}
        >
          Tenant Refunds ({stats?.tenantCount || 0})
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
          <Input
            placeholder="Name, email or bank..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 rounded-xl bg-white border-slate-200 text-slate-800 font-semibold text-sm shadow-sm"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-300"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
        </select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 text-sm font-semibold w-36 shadow-sm"
          />
          <span className="text-[#8E8E93] text-sm">→</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 text-sm font-semibold w-36 shadow-sm"
          />
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(""); setToDate(""); }} className="text-[#8E8E93] hover:text-[#6E6E73]">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <span className="text-xs text-[#8E8E93] font-semibold ml-auto">
          {pagination.totalCount} result{pagination.totalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Main Table */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-0">

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
              <span className="text-[#8E8E93] font-semibold text-sm">Loading...</span>
            </div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-16 text-[#8E8E93]">
              <Wallet className="h-12 w-12 mx-auto text-slate-200 mb-3" />
              <p className="font-bold">No payouts match your filters.</p>
              <p className="text-sm mt-1">Try adjusting the search or date range.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="w-[140px] text-[#8E8E93] font-extrabold text-[10px] uppercase tracking-wider pl-5 align-top pt-4">Requested</TableHead>
                  <TableHead className="w-[170px] text-[#8E8E93] font-extrabold text-[10px] uppercase tracking-wider align-top pt-4">Type</TableHead>
                  <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase tracking-wider align-top pt-4">Recipient</TableHead>
                  <TableHead className="w-[200px] text-[#8E8E93] font-extrabold text-[10px] uppercase tracking-wider align-top pt-4">Bank Details</TableHead>
                  <TableHead className="w-[140px] text-[#8E8E93] font-extrabold text-[10px] uppercase tracking-wider align-top pt-4">Amount</TableHead>
                  <TableHead className="w-[130px] text-[#8E8E93] font-extrabold text-[10px] uppercase tracking-wider align-top pt-4">Status</TableHead>
                  <TableHead className="w-[90px] text-right text-[#8E8E93] font-extrabold text-[10px] uppercase tracking-wider pr-5 align-top pt-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((po) => {
                  const isTenantRefund = !!po.tenantId;
                  const recipient = isTenantRefund ? po.tenant : po.owner;
                  const aging = po.status === "PENDING" ? getAgingInfo(po.createdAt, slaHours) : null;
                  const isStripe = isStripeRefund(po);

                  return (
                    <TableRow
                      key={po.id}
                      className={`border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors ${
                        aging?.isOverdue ? "border-l-4 border-l-red-500 bg-red-50/20" : ""
                      }`}
                      onClick={() => setDrawerPayout(po)}
                    >
                      {/* Date */}
                      <TableCell className="pl-5 py-5 align-top">
                        <p className="font-semibold text-slate-800 text-sm">
                          {new Date(po.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <p className="text-xs text-[#8E8E93] mt-0.5">
                          {new Date(po.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                        </p>
                        {aging && (
                          <div className="mt-2">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${aging.color}`}>
                              <Clock className="h-2.5 w-2.5" /> {aging.label}
                            </span>
                          </div>
                        )}
                      </TableCell>

                      {/* Type */}
                      <TableCell className="py-5 align-top">
                        <div className="flex flex-col gap-1.5">
                          <Badge className={isTenantRefund
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs w-fit"
                            : "bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs w-fit"
                          }>
                            {isTenantRefund ? (
                              <><ArrowUpRight className="h-3 w-3 mr-1" />Tenant Refund</>
                            ) : (
                              <><ArrowDownRight className="h-3 w-3 mr-1" />Owner Withdrawal</>
                            )}
                          </Badge>
                          {isTenantRefund && po.lease?.moveOutStatus === "ADMIN_MEDIATION" && (
                            <Badge className="bg-red-50 text-red-700 border border-red-200 font-bold text-xs flex items-center gap-1 w-fit">
                              <AlertTriangle className="h-3 w-3" /> Mediation
                            </Badge>
                          )}
                          {isStripe && (
                            <Badge className="bg-violet-50 text-violet-700 border border-violet-200 font-bold text-[10px] flex items-center w-fit">
                              ⚡ Stripe
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Recipient */}
                      <TableCell className="py-5 align-top">
                        <p className="font-bold text-slate-800 text-sm leading-snug">{recipient?.name || "N/A"}</p>
                        <p className="text-xs text-[#8E8E93] flex items-center gap-1 mt-1">
                          <Mail className="h-3.5 w-3.5 text-[#8E8E93]" />{recipient?.email || "—"}
                        </p>
                        {!isTenantRefund && po.owner?.balance !== undefined && (
                          <p className="text-[11px] text-[#8E8E93] mt-2 flex items-center gap-1.5 font-medium">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            Ledger Balance: <span className="font-bold text-[#6E6E73]">${Number(po.owner.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </p>
                        )}
                      </TableCell>

                      {/* Bank */}
                      <TableCell className="py-5 align-top">
                        <p className="font-semibold text-slate-800 text-sm leading-snug">{po.bankName}</p>
                        <p className="text-xs text-[#6E6E73] mt-1">{po.accountName}</p>
                        <div className="mt-1.5">
                          <UnmaskAccountNumber apiUrl={`/api/payouts/${po.id}/unmask`} maskedNumber={po.accountNumber || "N/A"} />
                        </div>
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="py-5 align-top">
                        <p className="font-extrabold text-slate-900 text-base leading-none">${Number(po.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        {po.status === "COMPLETED" && po.refNumber && (
                          <p className="text-[10px] text-[#8E8E93] font-semibold font-mono mt-2 bg-slate-50 border border-slate-100 px-1 py-0.5 rounded w-fit">
                            Ref: {po.refNumber}
                          </p>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-5 align-top">
                        {po.status === "PENDING" && (
                          <Badge className={`font-bold text-xs flex items-center gap-1 w-fit ${
                            aging?.isOverdue
                              ? "bg-red-100 text-red-700 border border-red-300"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            <Clock className="h-3 w-3" /> {aging?.isOverdue ? "OVERDUE" : "Pending"}
                          </Badge>
                        )}
                        {po.status === "COMPLETED" && (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-1 w-fit">
                            <Check className="h-3 w-3" /> Completed
                          </Badge>
                        )}
                        {po.status === "REJECTED" && (
                          <div>
                            <Badge className="bg-red-50 text-red-700 border border-red-200 font-bold text-xs flex items-center gap-1 w-fit">
                              <X className="h-3 w-3" /> Rejected
                            </Badge>
                            {po.rejectionReason && (
                              <p className="text-[10px] text-[#8E8E93] mt-1 max-w-[120px] truncate" title={po.rejectionReason}>{po.rejectionReason}</p>
                            )}
                          </div>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-5 py-5 align-top" onClick={(e) => e.stopPropagation()}>
                        {po.status === "PENDING" ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center ml-auto text-[#6E6E73] focus:outline-none">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 bg-white border border-slate-200 shadow-lg rounded-xl p-1 z-50">
                              {isTenantRefund && po.leaseId ? (
                                <DropdownMenuItem
                                  onClick={() => router.push(`/dashboard/leases/${po.leaseId}`)}
                                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 text-[#8E8E93]" /> View Lease
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => router.push(`/dashboard/admin/users?search=${recipient?.email || ""}`)}
                                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 text-[#8E8E93]" /> View Owner Profile
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => openApproveModal(po)}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-emerald-600 rounded-lg hover:bg-emerald-50 cursor-pointer"
                              >
                                <Check className="h-4 w-4" /> Authorize Disbursement
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openRejectModal(po)}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                              >
                                <X className="h-4 w-4" /> Reject Request
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <PaginationBar
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalCount}
          itemsPerPage={pagination.pageSize}
          onPageChange={(page) => fetchPayouts(page)}
          itemLabel="payouts"
        />
      </Card>


      {/* Authorize Disbursement Modal */}
      {showApproveModal && selectedPayout && (() => {
        const isTenantRefundModal = !!selectedPayout.tenantId;
        const recipientName = isTenantRefundModal ? selectedPayout.tenant?.name : selectedPayout.owner?.name;
        const recipientEmail = isTenantRefundModal ? selectedPayout.tenant?.email : selectedPayout.owner?.email;
        const payoutAmount = Number(selectedPayout.amount);
        const ledgerBalance = !isTenantRefundModal && selectedPayout.owner?.balance !== undefined ? Number(selectedPayout.owner.balance) : null;
        const isHighValue = payoutAmount >= 5000;
        const isReadyToDisburse = refNumber.trim().length > 0 && checklist.nameVerified;

        const TRANSFER_METHODS = [
          { value: "BANK_TRANSFER",  label: "Bank Transfer (NEFT/WIRE)" },
          { value: "RTGS",          label: "RTGS" },
          { value: "CHECK",         label: "Cheque / Check" },
          { value: "CASH",          label: "Cash" },
          { value: "STRIPE",        label: "⚡ Stripe (Auto)" },
          { value: "OTHER",         label: "Other" },
        ];

        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">

              {/* Sticky Header */}
              <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-base leading-tight">Authorize Disbursement</h3>
                    <p className="text-xs text-[#8E8E93] mt-0.5">Verify details and enter transfer reference</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="text-[#8E8E93] hover:text-slate-700 hover:bg-slate-100 rounded-xl p-1.5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="overflow-y-auto flex-1 p-5 space-y-4">

                {/* High-Value Alert Banner */}
                {isHighValue && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">High-Value Payout (${payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })})</strong>
                      Ensure transfer details match before authorizing.
                    </div>
                  </div>
                )}

                {/* Stripe Auto-Refund */}
                {isStripeRefund(selectedPayout) && (
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-violet-800">
                    <span className="text-violet-600 text-base shrink-0">⚡</span>
                    <div>
                      <strong className="block font-bold">Stripe Auto-Refund</strong>
                      Stripe will process the refund automatically to the original payment method.
                    </div>
                  </div>
                )}

                {/* Combined Executive Summary Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isTenantRefundModal ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>
                        {isTenantRefundModal ? "Tenant Refund" : "Owner Withdrawal"}
                      </span>
                      <h4 className="font-extrabold text-slate-900 text-base mt-1.5">{recipientName || "N/A"}</h4>
                      <p className="text-xs text-[#6E6E73] flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3 text-[#8E8E93]" />{recipientEmail || "—"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">Disbursement</p>
                      <p className="text-2xl font-black text-emerald-600 mt-0.5">
                        ${payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      {ledgerBalance !== null && (
                        <p className={`text-[11px] font-bold mt-0.5 ${
                          ledgerBalance >= payoutAmount ? "text-slate-600" : "text-red-600"
                        }`}>
                          Available: ${ledgerBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bank info line */}
                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#8E8E93] font-semibold">Bank: </span>
                      <strong className="text-slate-800">{selectedPayout.bankName}</strong>
                      <span className="text-slate-400 mx-1.5">·</span>
                      <span className="text-[#8E8E93] font-semibold">Holder: </span>
                      <strong className="text-slate-800">{selectedPayout.accountName}</strong>
                    </div>
                    <div>
                      <UnmaskAccountNumber apiUrl={`/api/payouts/${selectedPayout.id}/unmask`} maskedNumber={selectedPayout.accountNumber || "N/A"} />
                    </div>
                  </div>
                </div>

                {/* Admin Mediation */}
                {selectedPayout.lease?.moveOutStatus === "ADMIN_MEDIATION" && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 space-y-2">
                    <h3 className="font-bold text-red-800 text-xs flex items-center gap-1.5">
                      <Shield className="h-4 w-4" /> Admin Mediation — Adjust Amount
                    </h3>
                    <p className="text-[11px] text-red-700 bg-red-100/70 rounded-lg px-2.5 py-1.5">
                      <span className="font-bold">Tenant dispute:</span> {selectedPayout.lease.tenantDisputeNote}
                    </p>
                    <div>
                      <label className="text-[10px] font-bold text-red-800 uppercase tracking-wider">Final Payout Amount ($) *</label>
                      <Input
                        type="number"
                        value={adjustedAmount}
                        onChange={(e) => setAdjustedAmount(e.target.value)}
                        className="mt-1 h-9 rounded-lg border-red-200 text-slate-900 font-bold bg-white text-right"
                      />
                    </div>
                  </div>
                )}

                {/* Deductions */}
                {selectedPayout.lease?.deductions && (selectedPayout.lease.deductions as any[]).length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                    <span className="text-[10px] font-extrabold text-[#8E8E93] uppercase tracking-widest block">Inspection Deductions</span>
                    {(selectedPayout.lease.deductions as any[]).map((d: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-[#6E6E73]">
                        <span>{d.description}</span>
                        <span className="text-red-500 font-bold">−${Number(d.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Transfer Details Form */}
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-[#6E6E73] uppercase tracking-wider">Method</label>
                      <select
                        value={transferMethod}
                        onChange={(e) => setTransferMethod(e.target.value)}
                        className="w-full h-9 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold px-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      >
                        {TRANSFER_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-[#6E6E73] uppercase tracking-wider">
                        {transferMethod === "CHECK" ? "Check Number *" : transferMethod === "STRIPE" ? "Stripe Refund ID *" : "Transaction Ref *"}
                      </label>
                      <Input
                        placeholder={
                          transferMethod === "CHECK" ? "e.g. 40992" :
                          transferMethod === "STRIPE" ? "e.g. re_3Px..." :
                          "e.g. TXN-1099238"
                        }
                        value={refNumber}
                        onChange={(e) => setRefNumber(e.target.value)}
                        className="h-9 rounded-xl border-slate-200 text-slate-900 font-mono font-bold text-xs"
                      />
                    </div>
                  </div>

                  {/* Proof Upload (Compact) */}
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-[#8E8E93] shrink-0" />
                      <span className="text-slate-700 font-semibold truncate">
                        {proofUrl ? (proofFile?.name || "Receipt attached") : "Bank Receipt / Proof (Optional)"}
                      </span>
                    </div>
                    {proofUrl ? (
                      <button
                        onClick={() => { setProofUrl(""); setProofFile(null); }}
                        className="text-[10px] font-bold text-red-500 hover:text-red-700 shrink-0 ml-2"
                      >
                        Remove
                      </button>
                    ) : proofUploading ? (
                      <Loader2 className="h-3.5 w-3.5 text-[#8E8E93] animate-spin shrink-0" />
                    ) : (
                      <label className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer shrink-0 ml-2">
                        Upload
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleProofUpload(f);
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Single Clean Verification Confirmation */}
                  <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={checklist.nameVerified}
                      onChange={(e) => setChecklist((c) => ({ ...c, nameVerified: e.target.checked, accountConfirmed: e.target.checked, amountReconciled: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 font-semibold select-none">
                      I confirm account details & recipient identity have been verified.
                    </span>
                  </label>
                </div>

              </div>

              {/* Sticky Footer */}
              <div className="flex gap-3 p-5 pt-3 border-t border-slate-100 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1 rounded-xl font-bold text-slate-700 h-10 border-slate-200 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmApproval}
                  disabled={processing || !isReadyToDisburse}
                  className="flex-1 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white h-10 shadow-sm text-xs transition-all"
                >
                  {processing ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Disbursing...</>
                  ) : (
                    <><Check className="h-4 w-4 mr-1.5" />Confirm & Disburse ${payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}


      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* Reject Modal                                                           */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showRejectModal && rejectPayout && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <X className="h-5 w-5 text-red-500 bg-red-50 rounded-full p-0.5" /> Reject Payout Request
              </h2>
              <p className="text-sm text-[#6E6E73] mt-1">Rejected funds are automatically returned to the sender's ledger.</p>
            </div>

            {/* Summary */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-red-600 font-semibold">Recipient</span>
                <span className="font-bold text-slate-900">{rejectPayout.tenant?.name || rejectPayout.owner?.name || "N/A"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600 font-semibold">Amount</span>
                <span className="font-extrabold text-red-700 text-base">${Number(rejectPayout.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600 font-semibold">Type</span>
                <span className="font-bold text-slate-800">{rejectPayout.tenantId ? "Tenant Refund" : "Owner Withdrawal"}</span>
              </div>
            </div>

            {/* Rejection reason dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Rejection Reason *</label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                {REJECTION_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Optional note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Additional Note (Optional)</label>
              <textarea
                rows={3}
                placeholder="Add details for the owner/tenant notification..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => setShowRejectModal(false)}
                className="flex-1 rounded-xl font-bold text-slate-700 h-11 border-slate-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRejection}
                disabled={rejecting}
                className="flex-1 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white h-11 shadow-md shadow-red-200"
              >
                {rejecting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Rejecting...</> : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* Detail Drawer (slide-over)                                             */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {drawerPayout && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
          onClick={() => setDrawerPayout(null)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-5">
              {/* Drawer header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Payout Details</h2>
                  <p className="text-xs text-[#8E8E93] font-mono mt-0.5">{drawerPayout.id}</p>
                </div>
                <button onClick={() => setDrawerPayout(null)} className="text-[#8E8E93] hover:text-[#6E6E73] rounded-lg p-1 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Status badge */}
              <div>
                {drawerPayout.status === "PENDING" && <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold">â³ Pending Authorization</Badge>}
                {drawerPayout.status === "COMPLETED" && <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">âœ“ Completed</Badge>}
                {drawerPayout.status === "REJECTED" && <Badge className="bg-red-50 text-red-700 border border-red-200 font-bold">âœ• Rejected</Badge>}
              </div>

              {/* Amount */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
                <p className="text-xs text-[#8E8E93] font-bold uppercase tracking-wider mb-1">
                  {drawerPayout.tenantId ? "Tenant Refund" : "Owner Withdrawal"}
                </p>
                <p className="text-4xl font-extrabold text-slate-900">${Number(drawerPayout.amount).toFixed(2)}</p>
                {drawerPayout.disbursedAt && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1">Disbursed {new Date(drawerPayout.disbursedAt).toLocaleDateString()}</p>
                )}
              </div>

              {/* Recipient */}
              <section>
                <p className="text-xs font-extrabold text-[#8E8E93] uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Recipient
                </p>
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  {[
                    ["Name", (drawerPayout.tenantId ? drawerPayout.tenant?.name : drawerPayout.owner?.name) || "N/A"],
                    ["Email", (drawerPayout.tenantId ? drawerPayout.tenant?.email : drawerPayout.owner?.email) || "N/A"],
                    ...(!drawerPayout.tenantId && drawerPayout.owner?.balance !== undefined ? [["Current Ledger Balance", `$${Number(drawerPayout.owner.balance).toFixed(2)}`]] : []),
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-[#8E8E93] font-semibold">{label}</span>
                      <span className="font-bold text-slate-800">{value}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Bank */}
              <section>
                <p className="text-xs font-extrabold text-[#8E8E93] uppercase tracking-wider mb-2 flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" /> Bank Details
                </p>
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8E8E93] font-semibold">Bank</span>
                    <span className="font-bold text-slate-800">{drawerPayout.bankName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8E8E93] font-semibold">Account Holder</span>
                    <span className="font-bold text-slate-800">{drawerPayout.accountName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8E8E93] font-semibold">Account Number</span>
                    <UnmaskAccountNumber apiUrl={`/api/payouts/${drawerPayout.id}/unmask`} maskedNumber={drawerPayout.accountNumber || "N/A"} />
                  </div>
                  {drawerPayout.refNumber && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#8E8E93] font-semibold">Reference</span>
                      <span className="font-bold text-slate-800">{drawerPayout.refNumber}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Rejection reason */}
              {drawerPayout.rejectionReason && (
                <section>
                  <p className="text-xs font-extrabold text-[#8E8E93] uppercase tracking-wider mb-2">Rejection Reason</p>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-700 font-semibold">{drawerPayout.rejectionReason}</p>
                  </div>
                </section>
              )}

              {/* Proof */}
              {drawerPayout.proofUrl && (
                <section>
                  <p className="text-xs font-extrabold text-[#8E8E93] uppercase tracking-wider mb-2">Proof of Payment</p>
                  <a
                    href={drawerPayout.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 font-bold hover:underline flex items-center gap-2 text-sm"
                  >
                    <FileText className="h-4 w-4" /> View Proof Document
                  </a>
                </section>
              )}

              {/* Lease context */}
              {drawerPayout.lease?.unit && (
                <section>
                  <p className="text-xs font-extrabold text-[#8E8E93] uppercase tracking-wider mb-2">Property Context</p>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                    {[
                      ["Unit", drawerPayout.lease.unit.name || "—"],
                      ["Property", drawerPayout.lease.unit.property?.name || "—"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-[#8E8E93] font-semibold">{label}</span>
                        <span className="font-bold text-slate-800">{value}</span>
                      </div>
                    ))}
                  </div>
                  {drawerPayout.leaseId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/leases/${drawerPayout.leaseId}`)}
                      className="mt-3 w-full rounded-xl border-slate-200 font-semibold"
                    >
                      <Eye className="h-4 w-4 mr-2" /> View Lease Details
                    </Button>
                  )}
                </section>
              )}

              {/* Timeline */}
              <section>
                <p className="text-xs font-extrabold text-[#8E8E93] uppercase tracking-wider mb-2">Timeline</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-blue-400 flex-shrink-0" />
                    <span className="text-[#6E6E73]">Requested</span>
                    <span className="font-bold text-slate-800 ml-auto">{new Date(drawerPayout.createdAt).toLocaleString()}</span>
                  </div>
                  {drawerPayout.disbursedAt && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="text-[#6E6E73]">Disbursed</span>
                      <span className="font-bold text-slate-800 ml-auto">{new Date(drawerPayout.disbursedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Action buttons for pending from drawer */}
              {drawerPayout.status === "PENDING" && (
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => { setDrawerPayout(null); openApproveModal(drawerPayout); }}
                    className="flex-1 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-11"
                  >
                    <Check className="h-4 w-4 mr-2" /> Authorize
                  </Button>
                  <Button
                    onClick={() => { setDrawerPayout(null); openRejectModal(drawerPayout); }}
                    variant="outline"
                    className="flex-1 rounded-xl font-bold text-red-600 border-red-200 hover:bg-red-50 h-11"
                  >
                    <X className="h-4 w-4 mr-2" /> Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

