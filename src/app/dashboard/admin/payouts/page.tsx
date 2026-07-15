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

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
}

// â”€â”€â”€ Aging helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getAgingInfo(createdAt: string) {
  const hrs = (Date.now() - new Date(createdAt).getTime()) / 36e5;
  if (hrs < 24) return { label: `${Math.floor(hrs)}h ago`, color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
  if (hrs < 72) return { label: `${Math.floor(hrs / 24)}d pending`, color: "text-amber-600 bg-amber-50 border-amber-200" };
  return { label: `${Math.floor(hrs / 24)}d overdue`, color: "text-red-600 bg-red-50 border-red-200" };
}

const REJECTION_REASONS = [
  "Fraud Suspected",
  "Insufficient Verification",
  "Incorrect Bank Details",
  "Duplicate Request",
  "Unreconciled Amount",
  "Admin Decision",
];

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchPayouts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pagination.pageSize),
        status: statusFilter,
        type: activeTab,
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
        toast.error("Failed to load payouts");
      }
    } catch {
      toast.error("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, activeTab, searchTerm, fromDate, toDate, pagination.pageSize]);

  useEffect(() => {
    if (sessionStatus === "authenticated") fetchPayouts(1);
  }, [sessionStatus, statusFilter, activeTab, fromDate, toDate]);

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
      toast.error("File too large â€” maximum 10 MB.");
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
        toast.success("âœ… Payout authorized and disbursed successfully!");
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
        <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">Loading payouts ledger...</p>
      </div>
    );
  }

  const isStripeRefund = (po: PayoutRecord) => po.bankName === "STRIPE";

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-6 pb-24 px-2 sm:px-6">

      {/* â”€â”€ Header â”€â”€ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-50 rounded-xl">
            <Shield className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Payouts Control Ledger</h1>
            <p className="text-slate-500 text-sm mt-0.5">Authorize withdrawals Â· Disburse refunds Â· Audit all transactions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            className="text-slate-500 hover:bg-slate-100 rounded-xl"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* â”€â”€ Stats Row â”€â”€ */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Pending */}
          <Card className="bg-amber-50 border-amber-200 rounded-2xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Pending</p>
                <Wallet className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-extrabold text-amber-700">{stats.pendingCount}</p>
              <p className="text-xs text-amber-600 font-semibold mt-0.5">${stats.pendingAmountAtRisk.toLocaleString(undefined, { minimumFractionDigits: 2 })} at risk</p>
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">{stats.pendingOwnerCount} owner</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full">{stats.pendingTenantCount} tenant</span>
              </div>
            </CardContent>
          </Card>

          {/* Settled */}
          <Card className="bg-emerald-50 border-emerald-200 rounded-2xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Settled</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-700">${stats.settledVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">Total disbursed</p>
            </CardContent>
          </Card>

          {/* Rejected */}
          <Card className="bg-red-50 border-red-200 rounded-2xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-red-800 uppercase tracking-wider">Rejected</p>
                <XCircle className="h-4 w-4 text-red-400" />
              </div>
              <p className="text-2xl font-extrabold text-red-600">${stats.rejectedVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-red-500 font-semibold mt-0.5">Volume reversed</p>
            </CardContent>
          </Card>

          {/* Avg Processing */}
          <Card className="bg-white border-slate-200 rounded-2xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Avg Time</p>
                <Timer className="h-4 w-4 text-violet-400" />
              </div>
              <p className="text-2xl font-extrabold text-slate-800">
                {stats.avgProcessingHours < 48 ? `${stats.avgProcessingHours}h` : `${Math.round(stats.avgProcessingHours / 24)}d`}
              </p>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Avg to disburse</p>
            </CardContent>
          </Card>

          {/* Total Processed */}
          <Card className="bg-white border-slate-200 rounded-2xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Processed</p>
                <Activity className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-2xl font-extrabold text-slate-800">{stats.processedCount}</p>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Total completed + rejected</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* â”€â”€ Tabs â”€â”€ */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["ALL", "OWNER", "TENANT"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "ALL" ? "All Payouts" : tab === "OWNER" ? "Owner Withdrawals" : "Tenant Refunds"}
          </button>
        ))}
      </div>

      {/* â”€â”€ Filter Toolbar â”€â”€ */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
          <span className="text-slate-400 text-sm">â†’</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 text-sm font-semibold w-36 shadow-sm"
          />
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(""); setToDate(""); }} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <span className="text-xs text-slate-400 font-semibold ml-auto">
          {pagination.totalCount} result{pagination.totalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* â”€â”€ Main Table â”€â”€ */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-base font-bold text-slate-900">
            {statusFilter === "PENDING" || statusFilter === "ALL"
              ? "Pending Payout Requests"
              : statusFilter === "COMPLETED" ? "Completed Payouts" : "Rejected Payouts"}
          </CardTitle>
          <CardDescription className="text-slate-500 text-sm">
            Review recipient credentials and process disbursements. Click any row for full details.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
              <span className="text-slate-400 font-semibold text-sm">Loading...</span>
            </div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Wallet className="h-12 w-12 mx-auto text-slate-200 mb-3" />
              <p className="font-bold">No payouts match your filters.</p>
              <p className="text-sm mt-1">Try adjusting the search or date range.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="w-[140px] text-slate-400 font-extrabold text-[10px] uppercase tracking-wider pl-5 align-top pt-4">Requested</TableHead>
                  <TableHead className="w-[170px] text-slate-400 font-extrabold text-[10px] uppercase tracking-wider align-top pt-4">Type</TableHead>
                  <TableHead className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider align-top pt-4">Recipient</TableHead>
                  <TableHead className="w-[200px] text-slate-400 font-extrabold text-[10px] uppercase tracking-wider align-top pt-4">Bank Details</TableHead>
                  <TableHead className="w-[140px] text-slate-400 font-extrabold text-[10px] uppercase tracking-wider align-top pt-4">Amount</TableHead>
                  <TableHead className="w-[130px] text-slate-400 font-extrabold text-[10px] uppercase tracking-wider align-top pt-4">Status</TableHead>
                  <TableHead className="w-[90px] text-right text-slate-400 font-extrabold text-[10px] uppercase tracking-wider pr-5 align-top pt-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((po) => {
                  const isTenantRefund = !!po.tenantId;
                  const recipient = isTenantRefund ? po.tenant : po.owner;
                  const aging = po.status === "PENDING" ? getAgingInfo(po.createdAt) : null;
                  const isStripe = isStripeRefund(po);

                  return (
                    <TableRow
                      key={po.id}
                      className="border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors"
                      onClick={() => setDrawerPayout(po)}
                    >
                      {/* Date */}
                      <TableCell className="pl-5 py-5 align-top">
                        <p className="font-semibold text-slate-800 text-sm">
                          {new Date(po.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
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
                              âš¡ Stripe
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Recipient */}
                      <TableCell className="py-5 align-top">
                        <p className="font-bold text-slate-800 text-sm leading-snug">{recipient?.name || "N/A"}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />{recipient?.email || "â€”"}
                        </p>
                        {!isTenantRefund && po.owner?.balance !== undefined && (
                          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5 font-medium">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            Ledger Balance: <span className="font-bold text-slate-600">${Number(po.owner.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </p>
                        )}
                      </TableCell>

                      {/* Bank */}
                      <TableCell className="py-5 align-top">
                        <p className="font-semibold text-slate-800 text-sm leading-snug">{po.bankName}</p>
                        <p className="text-xs text-slate-500 mt-1">{po.accountName}</p>
                        <div className="mt-1.5">
                          <UnmaskAccountNumber apiUrl={`/api/payouts/${po.id}/unmask`} maskedNumber={po.accountNumber || "N/A"} />
                        </div>
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="py-5 align-top">
                        <p className="font-extrabold text-slate-900 text-base leading-none">${Number(po.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        {po.status === "COMPLETED" && po.refNumber && (
                          <p className="text-[10px] text-slate-400 font-semibold font-mono mt-2 bg-slate-50 border border-slate-100 px-1 py-0.5 rounded w-fit">
                            Ref: {po.refNumber}
                          </p>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-5 align-top">
                        {po.status === "PENDING" && (
                          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold text-xs">â³ Pending</Badge>
                        )}
                        {po.status === "COMPLETED" && (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">âœ“ Completed</Badge>
                        )}
                        {po.status === "REJECTED" && (
                          <div>
                            <Badge className="bg-red-50 text-red-700 border border-red-200 font-bold text-xs">âœ• Rejected</Badge>
                            {po.rejectionReason && (
                              <p className="text-[10px] text-slate-400 mt-1 max-w-[120px] truncate" title={po.rejectionReason}>{po.rejectionReason}</p>
                            )}
                          </div>
                        )}
                        {po.proofUrl && po.status === "COMPLETED" && (
                          <a
                            href={po.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 mt-2 w-fit"
                          >
                            <FileText className="h-3.5 w-3.5" /> Proof
                          </a>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-5 py-5 align-top" onClick={(e) => e.stopPropagation()}>
                        {po.status === "PENDING" ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center ml-auto text-slate-500 focus:outline-none">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 bg-white border border-slate-200 shadow-lg rounded-xl p-1 z-50">
                              {isTenantRefund && po.leaseId ? (
                                <DropdownMenuItem
                                  onClick={() => router.push(`/dashboard/leases/${po.leaseId}`)}
                                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 text-slate-400" /> View Lease
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => router.push(`/dashboard/admin/users?search=${recipient?.email || ""}`)}
                                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 text-slate-400" /> View Owner Profile
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
                        ) : (
                          <button
                            onClick={() => setDrawerPayout(po)}
                            className="text-xs text-slate-400 hover:text-slate-600 font-semibold flex items-center gap-1 ml-auto"

                          >
                            <Eye className="h-3.5 w-3.5" /> Details
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* â”€â”€ Pagination â”€â”€ */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-slate-500">
            Page <span className="font-bold text-slate-700">{pagination.page}</span> of <span className="font-bold text-slate-700">{pagination.totalPages}</span>
            &nbsp;Â·&nbsp;<span className="font-bold text-slate-700">{pagination.totalCount}</span> total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchPayouts(pagination.page - 1)}
              className="rounded-xl border-slate-200 font-semibold"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => fetchPayouts(pagination.page + 1)}
              className="rounded-xl border-slate-200 font-semibold"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* Authorize Disbursement Modal                                           */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showApproveModal && selectedPayout && (() => {
        const isTenantRefundModal = !!selectedPayout.tenantId;
        const recipientName = isTenantRefundModal ? selectedPayout.tenant?.name : selectedPayout.owner?.name;
        const recipientEmail = isTenantRefundModal ? selectedPayout.tenant?.email : selectedPayout.owner?.email;
        const payoutAmount = Number(selectedPayout.amount);
        const ledgerBalance = !isTenantRefundModal && selectedPayout.owner?.balance !== undefined ? Number(selectedPayout.owner.balance) : null;
        const allChecked = checklist.nameVerified && checklist.accountConfirmed && checklist.amountReconciled;
        const isHighValue = payoutAmount >= 5000;
        const CHECKLIST_ITEMS = [
          {
            key: "nameVerified",
            icon: "ðŸ‘¤",
            label: "Identity confirmed",
            sublabel: `Account holder "${selectedPayout.accountName}" matches recipient ID on file`,
          },
          {
            key: "accountConfirmed",
            icon: "ðŸ¦",
            label: "Bank details verified",
            sublabel: `${selectedPayout.bankName} confirmed with recipient`,
          },
          {
            key: "amountReconciled",
            icon: "âœ“",
            label: "Amount reconciled",
            sublabel: ledgerBalance !== null
              ? `$${payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} verified against ledger ($${ledgerBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} available)`
              : `$${payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} verified against ledger`,
          },
        ];
        const TRANSFER_METHODS = [
          { value: "BANK_TRANSFER",  label: "Bank Transfer (NEFT/WIRE)" },
          { value: "RTGS",          label: "RTGS" },
          { value: "CHECK",         label: "Cheque / Check" },
          { value: "CASH",          label: "Cash" },
          { value: "STRIPE",        label: "âš¡ Stripe (Auto)" },
          { value: "OTHER",         label: "Other" },
        ];
        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">

              {/* â”€â”€ Sticky Header â”€â”€ */}
              <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 leading-tight">Authorize Disbursement</h2>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">Complete all steps â€” this action is irreversible</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl p-1.5 transition-colors flex-shrink-0 ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* â”€â”€ Scrollable Body â”€â”€ */}
              <div className="overflow-y-auto flex-1 p-6 space-y-5">

                {/* High-Value Warning Banner */}
                {isHighValue && (
                  <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">High-Value Disbursement</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        You are about to disburse <span className="font-bold">${payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>. Double-check all details â€” this cannot be undone once confirmed.
                      </p>
                    </div>
                  </div>
                )}

                {/* Stripe Auto-Refund */}
                {isStripeRefund(selectedPayout) && (
                  <div className="bg-violet-50 border border-violet-200 rounded-2xl p-3.5 flex items-start gap-3">
                    <span className="text-violet-500 text-xl flex-shrink-0">âš¡</span>
                    <div>
                      <p className="text-sm font-bold text-violet-800">Stripe Auto-Refund Will Fire</p>
                      <p className="text-xs text-violet-600 mt-0.5">No manual bank transfer is needed. Stripe will process the refund automatically to the original payment method. Enter the Stripe refund ID as the reference.</p>
                    </div>
                  </div>
                )}

                {/* â”€â”€ Recipient Identity Card â”€â”€ */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Recipient</span>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isTenantRefundModal ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>{isTenantRefundModal ? "Tenant Refund" : "Owner Withdrawal"}</span>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-semibold">Full Name</span>
                      <span className="text-sm font-bold text-slate-900">{recipientName || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-semibold">Email</span>
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />{recipientEmail || "â€”"}
                      </span>
                    </div>
                    {!isTenantRefundModal && ledgerBalance !== null && (
                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
                        <span className="text-xs text-slate-400 font-semibold">Ledger Balance</span>
                        <span className={`text-sm font-extrabold ${
                          ledgerBalance >= payoutAmount ? "text-emerald-600" : "text-red-600"
                        }`}>
                          ${ledgerBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          {ledgerBalance < payoutAmount && <span className="ml-1.5 text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">INSUFFICIENT</span>}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* â”€â”€ Bank Details Card â”€â”€ */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Bank &amp; Payout Details</span>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-semibold">Bank</span>
                      <span className="text-sm font-bold text-slate-800">{selectedPayout.bankName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-semibold">Account Holder</span>
                      <span className="text-sm font-bold text-slate-800">{selectedPayout.accountName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-semibold">Account Number</span>
                      <UnmaskAccountNumber apiUrl={`/api/payouts/${selectedPayout.id}/unmask`} maskedNumber={selectedPayout.accountNumber || "N/A"} />
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-600">Disbursement Amount</span>
                      <span className="text-xl font-extrabold text-emerald-600">
                        ${payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Admin Mediation */}
                {selectedPayout.lease?.moveOutStatus === "ADMIN_MEDIATION" && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                    <h3 className="font-bold text-red-800 text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Admin Mediation â€” Adjust Amount
                    </h3>
                    <p className="text-xs text-red-700 bg-red-100 rounded-xl px-3 py-2"><span className="font-bold">Tenant dispute:</span> {selectedPayout.lease.tenantDisputeNote}</p>
                    <div>
                      <label className="text-xs font-bold text-red-800 uppercase tracking-wider">Final Payout Amount ($) *</label>
                      <Input
                        type="number"
                        value={adjustedAmount}
                        onChange={(e) => setAdjustedAmount(e.target.value)}
                        className="mt-1.5 rounded-xl border-red-200 text-slate-900 font-extrabold bg-white text-right text-lg"
                      />
                      <p className="text-[10px] text-red-600 font-medium mt-1.5">âš  Your adjusted amount is final and binding. The tenant will be notified.</p>
                    </div>
                  </div>
                )}

                {/* Deductions */}
                {selectedPayout.lease?.deductions && (selectedPayout.lease.deductions as any[]).length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Inspection Deductions</span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {(selectedPayout.lease.deductions as any[]).map((d: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                          <span className="text-slate-600 font-medium">{d.description}</span>
                          <span className="text-red-500 font-bold">âˆ’${Number(d.amount).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200">
                        <span className="text-slate-700">Net Payout</span>
                        <span className="text-emerald-600">${payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* â”€â”€ Verification Checklist â”€â”€ */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Verification Checklist</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      allChecked ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {Object.values(checklist).filter(Boolean).length}/3 Complete
                    </span>
                  </div>
                  <div className="space-y-2">
                    {CHECKLIST_ITEMS.map((item) => {
                      const checked = checklist[item.key as keyof typeof checklist];
                      return (
                        <label
                          key={item.key}
                          className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition-all ${
                            checked
                              ? "bg-emerald-50 border-emerald-200"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                            checked ? "bg-emerald-500 border-emerald-500" : "border-slate-300 bg-white"
                          }`}>
                            {checked && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setChecklist((c) => ({ ...c, [item.key]: e.target.checked }))}
                            className="sr-only"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold leading-tight ${
                              checked ? "text-emerald-800" : "text-slate-800"
                            }`}>
                              <span className="mr-1.5">{item.icon}</span>{item.label}
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-snug">{item.sublabel}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* â”€â”€ Transfer Method + Reference â”€â”€ */}
                <div className="space-y-3">
                  <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Transfer Details *</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Method</label>
                      <select
                        value={transferMethod}
                        onChange={(e) => setTransferMethod(e.target.value)}
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold px-3 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      >
                        {TRANSFER_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {transferMethod === "CHECK" ? "Check Number *" : transferMethod === "STRIPE" ? "Stripe Refund ID *" : "Transaction Reference *"}
                      </label>
                      <Input
                        placeholder={
                          transferMethod === "CHECK" ? "e.g. 40992" :
                          transferMethod === "STRIPE" ? "e.g. re_3Px..." :
                          transferMethod === "CASH" ? "e.g. CASH-2026-001" :
                          "e.g. TXN-1099238"
                        }
                        value={refNumber}
                        onChange={(e) => setRefNumber(e.target.value)}
                        className="h-10 rounded-xl border-slate-200 text-slate-900 font-bold font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Receipt / Proof of Payment Upload */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Bank Receipt / Proof of Payment
                      <span className="ml-1.5 text-slate-300 font-medium normal-case tracking-normal">(Optional)</span>
                    </label>
                    {proofUrl && (
                      <button
                        onClick={() => { setProofUrl(""); setProofFile(null); }}
                        className="text-[10px] font-bold text-red-400 hover:text-red-600 flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    )}
                  </div>

                  {proofUrl && !proofUploading ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        {proofFile?.type === "application/pdf" ? (
                          <FileText className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-emerald-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-emerald-800 truncate">
                          {proofFile?.name || "Receipt uploaded"}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                          {proofFile ? `${(proofFile.size / 1024).toFixed(0)} KB Â· Saved to Cloudinary` : "Cloudinary URL"}
                        </p>
                      </div>
                      <a
                        href={proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-800 flex-shrink-0"
                        title="Open receipt"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  ) : proofUploading ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3">
                      <Loader2 className="h-5 w-5 text-slate-400 animate-spin flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-600">Uploading receipt...</p>
                        <p className="text-[10px] text-slate-400">{proofFile?.name}</p>
                      </div>
                    </div>
                  ) : (
                    <label
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 transition-all cursor-pointer p-5 group"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files[0];
                        if (f) handleProofUpload(f);
                      }}
                    >
                      <div className="h-10 w-10 rounded-2xl bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                        <Upload className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-600 group-hover:text-emerald-700">
                          Drop receipt here or <span className="text-emerald-600 underline underline-offset-2">browse files</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBP or PDF Â· Max 10 MB</p>
                      </div>
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

                {/* â”€â”€ Admin Internal Notes â”€â”€ */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admin Notes <span className="text-slate-300 font-medium normal-case tracking-normal">(Internal only â€” not shown to recipient)</span></label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Verified via phone call with owner. Processed as per Q3 schedule."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 font-medium px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                  />
                </div>

                {/* â”€â”€ Confirm Gate for High-Value â”€â”€ */}
                {isHighValue && !confirmGate && (
                  <div className="bg-slate-900 rounded-2xl p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">Final confirmation required</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        You're about to irreversibly disburse <span className="text-white font-bold">${payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> to <span className="text-white font-bold">{recipientName}</span>.
                      </p>
                      <button
                        onClick={() => setConfirmGate(true)}
                        className="mt-2.5 text-xs font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2"
                      >
                        I have verified all details â€” proceed to confirm
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* â”€â”€ Sticky Footer â”€â”€ */}
              <div className="flex gap-3 p-6 pt-4 border-t border-slate-100 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1 rounded-xl font-bold text-slate-700 h-11 border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmApproval}
                  disabled={processing || !allChecked || !refNumber.trim() || (isHighValue && !confirmGate)}
                  className="flex-1 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white h-11 shadow-md shadow-emerald-200 transition-all"
                >
                  {processing ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Authorizing...</>
                  ) : (
                    <><Check className="h-4 w-4 mr-2" />Confirm &amp; Disburse ${payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</>
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
              <p className="text-sm text-slate-500 mt-1">Rejected funds are automatically returned to the sender's ledger.</p>
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
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rejection Reason *</label>
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
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Additional Note (Optional)</label>
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
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{drawerPayout.id}</p>
                </div>
                <button onClick={() => setDrawerPayout(null)} className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100">
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
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                  {drawerPayout.tenantId ? "Tenant Refund" : "Owner Withdrawal"}
                </p>
                <p className="text-4xl font-extrabold text-slate-900">${Number(drawerPayout.amount).toFixed(2)}</p>
                {drawerPayout.disbursedAt && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1">Disbursed {new Date(drawerPayout.disbursedAt).toLocaleDateString()}</p>
                )}
              </div>

              {/* Recipient */}
              <section>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Recipient
                </p>
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  {[
                    ["Name", (drawerPayout.tenantId ? drawerPayout.tenant?.name : drawerPayout.owner?.name) || "N/A"],
                    ["Email", (drawerPayout.tenantId ? drawerPayout.tenant?.email : drawerPayout.owner?.email) || "N/A"],
                    ...(!drawerPayout.tenantId && drawerPayout.owner?.balance !== undefined ? [["Current Ledger Balance", `$${Number(drawerPayout.owner.balance).toFixed(2)}`]] : []),
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-slate-400 font-semibold">{label}</span>
                      <span className="font-bold text-slate-800">{value}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Bank */}
              <section>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" /> Bank Details
                </p>
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-semibold">Bank</span>
                    <span className="font-bold text-slate-800">{drawerPayout.bankName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-semibold">Account Holder</span>
                    <span className="font-bold text-slate-800">{drawerPayout.accountName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-semibold">Account Number</span>
                    <UnmaskAccountNumber apiUrl={`/api/payouts/${drawerPayout.id}/unmask`} maskedNumber={drawerPayout.accountNumber || "N/A"} />
                  </div>
                  {drawerPayout.refNumber && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400 font-semibold">Reference</span>
                      <span className="font-bold text-slate-800">{drawerPayout.refNumber}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Rejection reason */}
              {drawerPayout.rejectionReason && (
                <section>
                  <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Rejection Reason</p>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-700 font-semibold">{drawerPayout.rejectionReason}</p>
                  </div>
                </section>
              )}

              {/* Proof */}
              {drawerPayout.proofUrl && (
                <section>
                  <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Proof of Payment</p>
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
                  <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Property Context</p>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                    {[
                      ["Unit", drawerPayout.lease.unit.name || "â€”"],
                      ["Property", drawerPayout.lease.unit.property?.name || "â€”"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-slate-400 font-semibold">{label}</span>
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
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Timeline</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-blue-400 flex-shrink-0" />
                    <span className="text-slate-500">Requested</span>
                    <span className="font-bold text-slate-800 ml-auto">{new Date(drawerPayout.createdAt).toLocaleString()}</span>
                  </div>
                  {drawerPayout.disbursedAt && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="text-slate-500">Disbursed</span>
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

