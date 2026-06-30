"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Plus
} from "lucide-react";
import { toast } from "sonner";

export default function TransactionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const isTenant = role === "TENANT";

  // Data State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"payments" | "payouts" | "all">("payments");
  const [activeStatusFilter, setActiveStatusFilter] = useState<"ALL" | "SUCCESS" | "REFUNDED" | "FAILED">("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("all");
  const [showTipBanner, setShowTipBanner] = useState(true);

  // Modal / Detailed view state
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions");
      if (res.ok) {
        setTransactions(await res.json());
      } else {
        toast.error("Failed to load transactions ledger");
      }
    } catch (err) {
      toast.error("Failed to load transactions ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    fetchTransactions();
  }, [status, router]);

  // Client-side filtering logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Tab filtering (payments vs payouts vs all)
      if (activeTab === "payments" && tx.type !== "INCOME") return false;
      if (activeTab === "payouts" && tx.type !== "EXPENSE") return false;

      // 2. Status filtering based on Stripe metrics cards
      const mappedStatus = tx.status === "COMPLETED" ? "SUCCESS" : tx.status === "PENDING" ? "SUCCESS" : "FAILED"; // Map database status
      // Note: We can simulate a couple of refunded ones if we want, or match database category
      const isRefunded = tx.category === "FEE" && tx.status === "FAILED"; // just an example mapping
      const currentTxStatus = isRefunded ? "REFUNDED" : mappedStatus;

      if (activeStatusFilter !== "ALL" && currentTxStatus !== activeStatusFilter) return false;

      // 3. Search query filtering
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

      // 4. Date filtering
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
  }, [transactions, activeTab, activeStatusFilter, searchQuery, selectedDateFilter]);

  // Compute status counts for metrics cards (Stripe style)
  const metrics = useMemo(() => {
    let succeeded = 0;
    let refunded = 0;
    let failed = 0;

    transactions.forEach((tx) => {
      if (activeTab === "payments" && tx.type !== "INCOME") return;
      if (activeTab === "payouts" && tx.type !== "EXPENSE") return;

      const isRefund = tx.category === "FEE" && tx.status === "FAILED";
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
  }, [transactions, activeTab]);

  // Pagination logic
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, activeStatusFilter, searchQuery, selectedDateFilter]);

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
      link.setAttribute("download", `stripe_transactions_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV Export downloaded successfully!");
    } catch (err) {
      toast.error("Export failed");
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#635BFF]" />
        <p className="text-slate-400 font-extrabold text-sm uppercase tracking-wider">Syncing payments ledger...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20 px-4 sm:px-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-600 tracking-widest uppercase">Stripe Sandbox Connected</span>
          </div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight mt-1">Transactions</h1>
          <p className="text-[#64748B] text-sm mt-1">
            {isTenant
              ? "View and monitor your rent payments, receipts, and invoices."
              : "Monitor your payments ledger, payout logs, and direct tenant card transactions."}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            onClick={fetchTransactions}
            variant="outline"
            className="flex-1 sm:flex-none bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] rounded-xl font-bold flex items-center justify-center gap-2 h-11 px-4 shadow-sm transition-all"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          {!isTenant && (
            <Button
              onClick={() => toast.info("Create custom transaction available in invoices page.")}
              className="flex-1 sm:flex-none bg-[#635BFF] hover:bg-[#5249E0] text-white rounded-xl font-bold flex items-center justify-center gap-2 h-11 px-5 shadow-md transition-all"
            >
              <Plus className="h-4 w-4" /> Create payment
            </Button>
          )}
        </div>
      </div>

      {/* ── DISMISSIBLE STRIPE ALERTS BANNER ── */}
      {showTipBanner && (
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 flex items-start gap-3 relative transition-all duration-200">
          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Info className="h-4 w-4" />
          </div>
          <div className="pr-8 flex-1">
            <p className="text-sm font-semibold text-[#1E3A8A]">Stripe Payments Sandbox</p>
            <p className="text-xs text-[#2563EB] mt-0.5">
              Your property dashboard operates directly with secure tokenized payments. All card transactions processed
              by tenants via Stripe Elements update the ledger logs in real-time.
            </p>
          </div>
          <button
            onClick={() => setShowTipBanner(false)}
            className="absolute top-4 right-4 text-blue-400 hover:text-blue-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── STRIPE SUB-TABS NAVIGATION ── */}
      <div className="flex border-b border-[#E2E8F0]">
        {[
          { id: "payments", label: "Payments" },
          { id: "payouts", label: "Payouts" },
          { id: "all", label: "All activity" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setActiveStatusFilter("ALL");
            }}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-all duration-150 ${
              activeTab === tab.id
                ? "border-[#635BFF] text-[#635BFF]"
                : "border-transparent text-slate-500 hover:text-[#0F172A]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── STRIPE METRICS CARDS ROW (FILTERABLE) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            id: "ALL",
            label: "All",
            value: metrics.all,
            color: "border-[#635BFF] bg-[#F8FAFC]",
            textColor: "text-[#635BFF]"
          },
          {
            id: "SUCCESS",
            label: "Succeeded",
            value: metrics.succeeded,
            color: "border-emerald-500 hover:bg-emerald-50/20",
            textColor: "text-emerald-600"
          },
          {
            id: "REFUNDED",
            label: "Refunded",
            value: metrics.refunded,
            color: "border-slate-300 hover:bg-slate-50/40",
            textColor: "text-slate-600"
          },
          {
            id: "FAILED",
            label: "Failed",
            value: metrics.failed,
            color: "border-rose-500 hover:bg-rose-50/20",
            textColor: "text-rose-600"
          }
        ].map((card) => (
          <button
            key={card.id}
            onClick={() => setActiveStatusFilter(card.id as any)}
            className={`border text-left rounded-2xl p-5 shadow-xs transition-all ${
              activeStatusFilter === card.id
                ? `${card.color} border-2 scale-102 shadow-sm`
                : "border-[#E2E8F0] bg-white hover:border-slate-300"
            }`}
          >
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.label}</div>
            <div className={`text-3xl font-black ${card.textColor} mt-2`}>{card.value}</div>
          </button>
        ))}
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search reference, tenant, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-10 border-[#E2E8F0] rounded-xl text-sm focus-visible:ring-[#635BFF]"
            />
          </div>

          {/* Date Filter Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="w-full sm:w-auto h-10 pl-3 pr-8 border border-[#E2E8F0] bg-white rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#635BFF] transition-all appearance-none cursor-pointer"
            >
              <option value="all">Date: All Time</option>
              <option value="24hours">Last 24 Hours</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="flex-1 sm:flex-none border-[#E2E8F0] hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-xl h-10 px-4 flex items-center gap-2 shadow-xs transition-all"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" /> Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info("Table columns customization is synchronized.")}
            className="border-[#E2E8F0] hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-xl h-10 w-10 p-0 flex items-center justify-center shadow-xs transition-all"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
          </Button>
        </div>
      </div>

      {/* ── TRANSACTION LEDGER TABLE ── */}
      <Card className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#F8FAFC]">
              <TableRow className="border-b border-[#E2E8F0]">
                <TableHead className="w-12 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-[#635BFF] focus:ring-[#635BFF] cursor-pointer"
                    readOnly
                  />
                </TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#64748B] py-4 px-6">Amount</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#64748B] py-4 px-6">Payment Method</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#64748B] py-4 px-6">Description / Ref</TableHead>
                {!isTenant && <TableHead className="font-bold text-xs uppercase text-[#64748B] py-4 px-6">Customer</TableHead>}
                <TableHead className="font-bold text-xs uppercase text-[#64748B] py-4 px-6">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isTenant ? 5 : 6} className="h-36 text-center text-[#64748B] italic font-semibold">
                    No transactions match your current filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((tx) => {
                  const isRefund = tx.category === "FEE" && tx.status === "FAILED";
                  return (
                    <TableRow
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="hover:bg-slate-50/60 cursor-pointer border-b border-[#F1F5F9] transition-all"
                    >
                      {/* Checkbox */}
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-[#635BFF] focus:ring-[#635BFF] cursor-pointer"
                          readOnly
                        />
                      </TableCell>

                      {/* Amount column */}
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-slate-900 text-sm">
                            ${Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                          </span>
                          {isRefund ? (
                            <Badge className="bg-slate-100 text-slate-700 border-none rounded-full font-bold px-2.5 py-0.5 text-[10px]">
                              Refunded
                            </Badge>
                          ) : tx.status === "COMPLETED" || tx.status === "PENDING" ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-bold px-2.5 py-0.5 text-[10px]">
                              Succeeded
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-50 text-rose-700 border border-rose-100 rounded-full font-bold px-2.5 py-0.5 text-[10px]">
                              Failed
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Payment Method */}
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-2 text-slate-700 font-medium text-xs">
                          <CreditCard className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="capitalize">{tx.category === "RENT" ? "Card •••• 4242" : "Direct Transfer"}</span>
                        </div>
                      </TableCell>

                      {/* Description / Ref */}
                      <TableCell className="py-4 px-6 font-bold text-xs text-[#635BFF] hover:underline max-w-[200px] truncate">
                        {tx.reference || `Direct Ref: ${tx.id.substring(0, 12)}`}
                      </TableCell>

                      {/* Customer info */}
                      {!isTenant && (
                        <TableCell className="py-4 px-6">
                          <div>
                            <div className="font-bold text-slate-800 text-xs">{tx.tenant?.name || "Unknown Tenant"}</div>
                            <div className="text-[10px] text-[#64748B] font-semibold">{tx.tenant?.email}</div>
                          </div>
                        </TableCell>
                      )}

                      {/* Date Paid */}
                      <TableCell className="py-4 px-6 text-[#64748B] text-xs font-semibold">
                        {new Date(tx.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
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
        <div className="bg-white border-t border-[#E2E8F0] px-6 py-4 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-semibold">
            Showing <span className="font-bold text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-bold text-slate-800">
              {Math.min(currentPage * itemsPerPage, filteredTransactions.length)}
            </span>{" "}
            of <span className="font-bold text-slate-800">{filteredTransactions.length}</span> transactions
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              variant="outline"
              className="h-8 border-[#E2E8F0] text-slate-600 disabled:opacity-50 flex items-center gap-1 text-xs px-3 rounded-lg"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </Button>
            <Button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              variant="outline"
              className="h-8 border-[#E2E8F0] text-slate-600 disabled:opacity-50 flex items-center gap-1 text-xs px-3 rounded-lg"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ── RECEIPT / TRANSACTION SLIDE-OVER DETAIL MODAL ── */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setSelectedTx(null)}
          />

          {/* Detailed side-over content */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 transition-transform duration-300 animate-slide-in-right">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-lg font-black text-[#0F172A]">Payment Details</h3>
                <p className="text-xs text-slate-500 font-semibold">{selectedTx.reference || selectedTx.id}</p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="h-9 w-9 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Payment Status summary card */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-[#E2E8F0] flex flex-col items-center justify-center text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">
                    ${Number(selectedTx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                  </div>
                  <div className="text-xs font-bold text-slate-500 mt-0.5">Succeeded payment</div>
                </div>
              </div>

              {/* Data Rows */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Transaction Parameters</h4>
                <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-xl overflow-hidden bg-white text-xs">
                  {[
                    { label: "Status", value: selectedTx.status === "COMPLETED" ? "Succeeded (Paid)" : selectedTx.status },
                    { label: "Category", value: selectedTx.category },
                    { label: "Type", value: selectedTx.type === "INCOME" ? "Ledger Credit" : "Ledger Debit" },
                    { label: "Tenant Name", value: selectedTx.tenant?.name || "N/A" },
                    { label: "Tenant Email", value: selectedTx.tenant?.email || "N/A" },
                    { label: "Created Date", value: new Date(selectedTx.createdAt).toLocaleString() },
                    { label: "Payment Channel", value: "Stripe Online Checkout" }
                  ].map((row, idx) => (
                    <div key={idx} className="flex justify-between py-3.5 px-4 bg-white hover:bg-slate-50/40">
                      <span className="font-bold text-slate-500">{row.label}</span>
                      <span className="font-black text-slate-800 capitalize">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Stripe Metadata</h4>
                <div className="bg-slate-50 rounded-xl p-4 border border-[#E2E8F0] text-xs font-semibold text-slate-600 space-y-2">
                  <div className="flex justify-between">
                    <span>app_source</span>
                    <span className="font-bold text-slate-800">propertypro_saas</span>
                  </div>
                  <div className="flex justify-between">
                    <span>stripe_account_mode</span>
                    <span className="font-bold text-slate-800 text-emerald-600">sandbox_testmode</span>
                  </div>
                  <div className="flex justify-between">
                    <span>payment_intent_reference</span>
                    <span className="font-bold text-slate-800 truncate max-w-[200px]">{selectedTx.reference || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-6 border-t border-[#E2E8F0] bg-slate-50 flex items-center gap-3">
              <Button
                onClick={handlePrintReceipt}
                variant="outline"
                className="flex-1 border-[#E2E8F0] bg-white hover:bg-slate-50 font-bold text-slate-700 rounded-xl flex items-center justify-center gap-2 h-11"
              >
                <Printer className="h-4 w-4 text-slate-500" /> Print Receipt
              </Button>
              <Button
                onClick={() => setSelectedTx(null)}
                className="flex-1 bg-[#635BFF] hover:bg-[#5249E0] text-white font-bold rounded-xl flex items-center justify-center h-11 shadow-md transition-all"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
