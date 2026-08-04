"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Loader2,
  RefreshCw,
  Search,
  Download,
  Info,
  X,
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Printer,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Wrench,
  Shield,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import ModuleLockedBanner from "@/components/subscription/ModuleLockedBanner";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureBlockedOverlay } from "@/components/subscription/FeatureBlockedBanner";

export default function TransactionsPage() {
  const featureAccess = useFeatureAccess("view_transactions");
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const isTenant = role === "TENANT";
  const isOwner = role === "OWNER";
  const { allowed: moduleAllowed, loading: moduleLoading } = useModuleAccess("transactions");

  // Data State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"payments" | "payouts" | "all">("payments");
  const [activeStatusFilter, setActiveStatusFilter] = useState<"ALL" | "SUCCESS" | "REFUNDED" | "FAILED">("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [showTipBanner, setShowTipBanner] = useState(true);

  // Modal / Detailed view state
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  // Manual Transaction creation states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leases, setLeases] = useState<any[]>([]);
  const [txFormData, setTxFormData] = useState({
    type: "INCOME",
    category: "RENT",
    amount: "",
    reference: "",
    tenantId: "",
    status: "COMPLETED"
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions");
      if (res.ok) {
        setTransactions(await res.json());
      } else {
        // Teaser sample transactions when module is locked / 403
        setTransactions([
          { id: "TX-901", type: "INCOME", category: "RENT", amount: 2450, status: "COMPLETED", reference: "CHASE-DIRECT-8921", createdAt: "2026-07-01T10:00:00Z", tenant: { name: "John Doe", email: "john@example.com" } },
          { id: "TX-902", type: "EXPENSE", category: "MAINTENANCE", amount: 380, status: "COMPLETED", reference: "APEX-HVAC-3301", createdAt: "2026-07-15T11:20:00Z", tenant: { name: "Alice Smith", email: "alice@example.com" } },
          { id: "TX-903", type: "INCOME", category: "DEPOSIT", amount: 1850, status: "COMPLETED", reference: "ESCROW-DEP-002", createdAt: "2026-07-20T09:15:00Z", tenant: { name: "Robert Taylor", email: "robert@example.com" } },
          { id: "TX-904", type: "EXPENSE", category: "FEE", amount: 149, status: "COMPLETED", reference: "SUB-PRO-2026", createdAt: "2026-07-25T16:40:00Z", tenant: { name: "Emily Davis", email: "emily@example.com" } },
        ]);
      }
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchLeases = async () => {
    try {
      const res = await fetch("/api/leases");
      if (res.ok) {
        const data = await res.json();
        setLeases(data.filter((l: any) => l.status === "ACTIVE"));
      }
    } catch (e) {}
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txFormData.tenantId || !txFormData.amount) {
      toast.error("Please select a tenant and enter an amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(txFormData),
      });

      if (res.ok) {
        toast.success("Transaction recorded successfully!");
        setIsCreateModalOpen(false);
        setTxFormData({
          type: "INCOME",
          category: "RENT",
          amount: "",
          reference: "",
          tenantId: "",
          status: "COMPLETED"
        });
        fetchTransactions();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to record transaction");
      }
    } catch (e) {
      toast.error("An error occurred while saving the transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    fetchTransactions();
    if (role === "OWNER") {
      fetchLeases();
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const query = params.get("search");
      if (query) {
        setSearchQuery(query);
        setActiveTab("all");
      }
    }
  }, [status, router]);

  const getTxDetails = (tx: any) => {
    if (!tx) return {
      title: "Transaction",
      subtitle: "",
      icon: <Info className="h-4 w-4 text-slate-500" />,
      iconBg: "bg-slate-100",
      badgeStyle: "bg-slate-100 text-slate-700 border border-slate-200",
      badgeLabel: "Other",
    };

    const isIncome = tx.type === "INCOME";
    const isRefund = (tx.category === "DEPOSIT" && tx.type === "EXPENSE") || tx.status === "REFUNDED";

    if (tx.category === "RENT") {
      return {
        title: "Rent Payment",
        subtitle: isTenant ? "Paid Rent Outflow" : "Rent Inflow",
        icon: isTenant ? (
          <ArrowUpRight className="h-4.5 w-4.5 text-rose-600 font-bold" />
        ) : (
          <ArrowDownLeft className="h-4.5 w-4.5 text-emerald-600 font-bold" />
        ),
        iconBg: isTenant ? "bg-rose-50" : "bg-emerald-50",
        badgeStyle: "bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold",
        badgeLabel: "Rent",
      };
    }
    if (tx.category === "DEPOSIT") {
      if (isRefund) {
        return {
          title: "Security Deposit Refund",
          subtitle: isTenant ? "Refund Received" : "Returned to Tenant",
          icon: isTenant ? (
            <ArrowDownLeft className="h-4.5 w-4.5 text-emerald-600 font-bold" />
          ) : (
            <ArrowUpRight className="h-4.5 w-4.5 text-amber-600 font-bold" />
          ),
          iconBg: isTenant ? "bg-emerald-50" : "bg-amber-50",
          badgeStyle: "bg-amber-50 text-amber-900 border border-amber-200 font-extrabold",
          badgeLabel: "Refund",
        };
      } else {
        return {
          title: "Security Deposit",
          subtitle: isTenant ? "Escrow Deposit Paid" : "Received in Escrow",
          icon: isTenant ? (
            <ArrowUpRight className="h-4.5 w-4.5 text-rose-600 font-bold" />
          ) : (
            <ArrowDownLeft className="h-4.5 w-4.5 text-teal-600 font-bold" />
          ),
          iconBg: isTenant ? "bg-rose-50" : "bg-teal-50",
          badgeStyle: "bg-purple-50 text-purple-800 border border-purple-200 font-extrabold",
          badgeLabel: "Escrow Deposit",
        };
      }
    }
    if (tx.category === "MAINTENANCE") {
      return {
        title: "Maintenance Cost",
        subtitle: isTenant ? "Paid Maintenance Charge" : "Repairs & Services",
        icon: <Wrench className="h-4.5 w-4.5 text-rose-600 font-bold" />,
        iconBg: "bg-rose-50",
        badgeStyle: "bg-amber-50 text-amber-900 border border-amber-200 font-extrabold",
        badgeLabel: "Maintenance",
      };
    }
    if (tx.category === "FEE") {
      return {
        title: "Platform Fee",
        subtitle: isIncome ? "Collected Fee" : "Processing Charge",
        icon: <ArrowUpRight className="h-4.5 w-4.5 text-slate-600 font-bold" />,
        iconBg: "bg-slate-100",
        badgeStyle: "bg-slate-100 text-slate-700 border border-slate-200 font-extrabold",
        badgeLabel: "Processing Fee",
      };
    }

    return {
      title: isIncome ? "Ledger Credit" : "Ledger Debit",
      subtitle: `${tx.category || "General"} Activity`,
      icon: isIncome ? (
        <ArrowDownLeft className="h-4.5 w-4.5 text-slate-600 font-bold" />
      ) : (
        <ArrowUpRight className="h-4.5 w-4.5 text-slate-600 font-bold" />
      ),
      iconBg: "bg-slate-50",
      badgeStyle: "bg-slate-100 text-slate-700 border border-slate-200 font-extrabold",
      badgeLabel: tx.category || "Other",
    };
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (activeTab === "payments" && tx.type !== "INCOME") return false;
      if (activeTab === "payouts" && tx.type !== "EXPENSE") return false;

      const isRefunded = (tx.category === "DEPOSIT" && tx.type === "EXPENSE") || tx.status === "REFUNDED";
      const mappedStatus = tx.status === "COMPLETED" ? "SUCCESS" : tx.status === "PENDING" ? "SUCCESS" : "FAILED";
      const currentTxStatus = isRefunded ? "REFUNDED" : mappedStatus;

      if (activeStatusFilter !== "ALL" && currentTxStatus !== activeStatusFilter) return false;
      if (selectedCategoryFilter !== "all" && tx.category !== selectedCategoryFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const refMatch = (tx.reference || "").toLowerCase().includes(query);
        const categoryMatch = (tx.category || "").toLowerCase().includes(query);
        const tenantMatch = (tx.tenant?.name || "").toLowerCase().includes(query);
        const tenantEmailMatch = (tx.tenant?.email || "").toLowerCase().includes(query);
        const amountMatch = String(tx.amount).includes(query);
        if (!refMatch && !categoryMatch && !tenantMatch && !tenantEmailMatch && !amountMatch) {
          return false;
        }
      }

      if (selectedDateFilter !== "all") {
        const txDate = new Date(tx.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - txDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (selectedDateFilter === "30days" && diffDays > 30) return false;
        if (selectedDateFilter === "7days" && diffDays > 7) return false;
        if (selectedDateFilter === "24hours" && diffDays > 1) return false;
      }

      return true;
    });
  }, [transactions, activeTab, activeStatusFilter, searchQuery, selectedDateFilter, selectedCategoryFilter]);

  const metrics = useMemo(() => {
    let succeeded = 0;
    let refunded = 0;
    let failed = 0;

    transactions.forEach((tx) => {
      if (activeTab === "payments" && tx.type !== "INCOME") return;
      if (activeTab === "payouts" && tx.type !== "EXPENSE") return;
      if (selectedCategoryFilter !== "all" && tx.category !== selectedCategoryFilter) return;

      const isRefund = (tx.category === "DEPOSIT" && tx.type === "EXPENSE") || tx.status === "REFUNDED";
      if (isRefund) {
        refunded++;
      } else if (tx.status === "COMPLETED" || tx.status === "PENDING") {
        succeeded++;
      } else {
        failed++;
      }
    });

    return {
      all: succeeded + refunded + failed,
      succeeded,
      refunded,
      failed,
    };
  }, [transactions, activeTab, selectedCategoryFilter]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, activeStatusFilter, searchQuery, selectedDateFilter, selectedCategoryFilter]);

  const handleExportCSV = () => {
    try {
      const headers = ["Reference ID", "Tenant", "Email", "Category", "Type", "Amount (USD)", "Status", "Date"];
      const rows = filteredTransactions.map((tx) => [
        tx.reference || "Direct Transfer",
        tx.tenant?.name || "N/A",
        tx.tenant?.email || "N/A",
        tx.category,
        tx.type,
        tx.amount,
        tx.status,
        new Date(tx.createdAt).toLocaleDateString(),
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `transactions_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV Export downloaded successfully!");
    } catch (err) {
      toast.error("Export failed");
    }
  };

  const isTenantBlocked = isTenant && !featureAccess.allowed;

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-4 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        <p className="text-slate-500 font-extrabold text-xs">Syncing payments ledger...</p>
      </div>
    );
  }

  return (
    <div className="relative font-sans">
      {isTenantBlocked && (
        <FeatureBlockedOverlay
          featureLabel="Payment Transactions & Ledger"
          reason={featureAccess.reason}
          adminNote={featureAccess.adminNote}
          expiresAt={featureAccess.expiresAt}
        />
      )}
      <div className={isTenantBlocked ? "pointer-events-none select-none blur-[2.5px] opacity-70" : ""}>
      <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-700 tracking-widest uppercase">Stripe Sandbox Connected</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">Transactions</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            {isTenant
              ? "View and monitor your rent payments, receipts, and invoices."
              : "Monitor your payments ledger, payout logs, and direct tenant card transactions."}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={fetchTransactions}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 font-black rounded-xl text-xs h-9 px-4 shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          {!isTenant && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs h-9 px-4 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Record Transaction
            </Button>
          )}
        </div>
      </div>

      {/* ── STRIPE ALERTS BANNER ── */}
      {showTipBanner && (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 flex items-start gap-3 relative shadow-2xs">
          <div className="h-8 w-8 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-900 shrink-0">
            <Info className="h-4 w-4" />
          </div>
          <div className="pr-8 flex-1">
            <p className="text-xs font-black text-slate-900">Stripe Payments Sandbox</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Your property dashboard operates directly with secure tokenized payments. All card transactions processed
              by tenants via Stripe Elements update the ledger logs in real-time.
            </p>
          </div>
          <button
            onClick={() => setShowTipBanner(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── TABS NAVIGATION ── */}
      <div className="flex gap-1.5 bg-slate-100 border border-slate-200/80 p-1 rounded-xl shadow-2xs w-fit">
        {[
          { id: "payments", label: isTenant ? "Rent Payments (Outflows)" : "Payments (Inflows)" },
          { id: "payouts", label: isTenant ? "Refunds & Credits (Inflows)" : "Payouts & Refunds (Outflows)" },
          { id: "all", label: "All Activity" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setActiveStatusFilter("ALL");
            }}
            className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── METRICS CARDS ROW (FILTERABLE) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            id: "ALL",
            label: "All Transactions",
            value: metrics.all,
            variant: "blue" as const,
            icon: CreditCard,
          },
          {
            id: "SUCCESS",
            label: "Succeeded",
            value: metrics.succeeded,
            variant: "green" as const,
            icon: CheckCircle2,
          },
          {
            id: "REFUNDED",
            label: "Refunded",
            value: metrics.refunded,
            variant: "amber" as const,
            icon: ArrowDownLeft,
          },
          {
            id: "FAILED",
            label: "Failed",
            value: metrics.failed,
            variant: "red" as const,
            icon: AlertCircle,
          }
        ].map((card) => (
          <KpiCard
            key={card.id}
            title={card.label}
            value={card.value}
            icon={card.icon}
            variant={card.variant}
            active={activeStatusFilter === card.id}
            onClick={() => setActiveStatusFilter(card.id as any)}
          />
        ))}
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search reference, tenant, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-10 border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 shadow-2xs"
            />
          </div>

          {/* Category Filter Dropdown */}
          <div className="relative w-full sm:w-44">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full h-10 pl-3 pr-8 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-900 outline-none shadow-2xs cursor-pointer"
            >
              <option value="all">Category: All</option>
              <option value="RENT">Rent Payments</option>
              <option value="DEPOSIT">Security Deposits</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="FEE">Fees</option>
            </select>
          </div>

          {/* Date Filter Dropdown */}
          <div className="relative w-full sm:w-44">
            <select
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="w-full h-10 pl-3 pr-8 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-900 outline-none shadow-2xs cursor-pointer"
            >
              <option value="all">Date: All Time</option>
              <option value="24hours">Last 24 Hours</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            onClick={handleExportCSV}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-xs font-black text-slate-900 rounded-xl h-10 px-4 flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" /> Export CSV
          </Button>
        </div>
      </div>

      {/* ── TRANSACTION LEDGER TABLE ── */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-slate-50/70 border-b border-slate-200/80">
              <TableRow>
                <TableHead className="font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Transaction</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Reference &amp; Channel</TableHead>
                {!isTenant && <TableHead className="font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Customer</TableHead>}
                <TableHead className="font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Amount</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isTenant ? 4 : 5} className="h-36 text-center text-slate-500 text-xs font-semibold">
                    No transactions match your current filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((tx) => {
                  const details = getTxDetails(tx);
                  const isIncome = tx.type === "INCOME";
                  const isRefund = (tx.category === "DEPOSIT" && tx.type === "EXPENSE") || tx.status === "REFUNDED";
                  
                  return (
                    <TableRow
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                    >

                      {/* Transaction details & Category */}
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl ${details.iconBg} flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs`}>
                            {details.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-xs truncate">{details.title}</span>
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shadow-2xs ${details.badgeStyle}`}>
                                {details.badgeLabel}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-semibold mt-0.5 truncate">{details.subtitle}</div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Reference & Channel */}
                      <TableCell className="py-4 px-6">
                        <div>
                          <div className="font-mono text-xs font-extrabold text-slate-900 truncate max-w-[150px]">
                            {tx.reference || `Direct Ref: ${tx.id.substring(0, 8)}`}
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            {tx.reference?.startsWith("pi_") || tx.reference?.startsWith("cs_") || (!tx.reference && tx.category === "RENT")
                              ? "Stripe Checkout"
                              : tx.reference?.includes("MANUAL_PAY") || tx.reference
                                ? "Manual Ledger"
                                : "Direct Admin Transfer"}
                          </div>
                        </div>
                      </TableCell>

                      {/* Customer info */}
                      {!isTenant && (
                        <TableCell className="py-4 px-6">
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs">{tx.tenant?.name || "N/A"}</div>
                            <div className="text-[11px] text-slate-500 font-semibold">{tx.tenant?.email || "No email"}</div>
                          </div>
                        </TableCell>
                      )}

                      {/* Amount column */}
                      <TableCell className="py-4 px-6">
                        {(() => {
                          const isTenantOutflow = isTenant ? isIncome : !isIncome;
                          const displaySign = isTenantOutflow ? "-" : "+";
                          const displayColor = isTenantOutflow ? "text-rose-600" : "text-emerald-700";
                          
                          return (
                            <div>
                              <span className={`font-black text-xs sm:text-sm ${displayColor}`}>
                                {displaySign}${Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <div className="mt-0.5">
                                {isRefund ? (
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-black text-[9px] uppercase tracking-wider shadow-2xs">
                                    Refunded
                                  </span>
                                ) : tx.status === "COMPLETED" || tx.status === "PENDING" ? (
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-black text-[9px] uppercase tracking-wider shadow-2xs">
                                    Succeeded
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-black text-[9px] uppercase tracking-wider shadow-2xs">
                                    Failed
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </TableCell>

                      {/* Date Paid */}
                      <TableCell className="py-4 px-6 text-slate-500 text-xs font-semibold">
                        {new Date(tx.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── FOOTER PAGINATION ── */}
        <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-semibold">
            Showing <span className="font-extrabold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-extrabold text-slate-900">
              {Math.min(currentPage * itemsPerPage, filteredTransactions.length)}
            </span>{" "}
            of <span className="font-extrabold text-slate-900">{filteredTransactions.length}</span> transactions
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-extrabold text-slate-800 px-2">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}
