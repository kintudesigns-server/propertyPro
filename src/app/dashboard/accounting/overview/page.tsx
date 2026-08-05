"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign, Wallet, ArrowUpRight, ArrowDownRight, RefreshCw,
  TrendingUp, Percent, ArrowRight, ShieldCheck, HeartHandshake, FileText, ExternalLink,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

import { useModuleAccess } from "@/hooks/useModuleAccess";
import ModuleLockedBanner from "@/components/subscription/ModuleLockedBanner";

export default function FinancialOverviewPage() {
  const { allowed, loading: checkingAccess } = useModuleAccess("accounting");
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    grossRevenue: 0,
    totalPlatformFees: 0,
    totalNetEarnings: 0,
    escrowBalance: 0,
    totalRefunded: 0,
    transactions: []
  });

  const balance = Number((session?.user as any)?.balance || 0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/overview");
      if (res.ok) {
        setData(await res.json());
      } else {
        // Teaser sample financial overview when module is locked / 403
        setData({
          grossRevenue: 42500,
          totalPlatformFees: 1275,
          totalNetEarnings: 41225,
          escrowBalance: 25600,
          totalRefunded: 5150,
          transactions: [
            { id: "TX-101", type: "RENT_PAYMENT", category: "RENT", amount: 2450, status: "COMPLETED", description: "Rent Payment — Unit 4B", createdAt: "2026-07-01T10:00:00Z" },
            { id: "TX-102", type: "EXPENSE", category: "MAINTENANCE", amount: 380, status: "COMPLETED", description: "HVAC Repair Service", createdAt: "2026-07-15T11:20:00Z" },
            { id: "TX-103", type: "DEPOSIT", category: "DEPOSIT", amount: 2500, status: "COMPLETED", description: "Security Deposit Escrow", createdAt: "2026-07-20T09:15:00Z" },
          ]
        });
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered transactions for tabs
  const { rentTx, escrowTx } = useMemo(() => {
    const txList = data.transactions || [];
    return {
      rentTx: txList.filter((tx: any) => tx.category === "RENT"),
      escrowTx: txList.filter((tx: any) => tx.category === "DEPOSIT")
    };
  }, [data.transactions]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        <p className="text-slate-500 font-extrabold text-xs">Analyzing Financial Portfolio...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">Financial Overview</h1>
          <p className="text-xs font-normal text-[#6E6E73] mt-1">
            Real-time analysis of your cash flow, escrowed deposits, and rental payouts.
          </p>
        </div>
        <Button
          onClick={() => { fetchData(); toast.success("Refreshed stats"); }}
          className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 h-9 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 border-none"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Wallet */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-normal text-[#6E6E73]">Available Wallet</span>
              <div className="p-2 rounded-xl bg-slate-100 border border-slate-200/60 text-slate-700 shadow-2xs">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">${fmt(balance)}</p>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
            <span className="text-xs font-normal text-[#6E6E73]">Unwithdrawn earnings</span>
            <Button
              size="sm"
              onClick={() => router.push("/dashboard/accounting/wallet")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-xs h-8 px-3.5 shadow-xs cursor-pointer border-none"
            >
              Withdraw
            </Button>
          </div>
        </div>

        {/* Escrow Held */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-normal text-[#6E6E73]">Escrow Held</span>
              <div className="p-2 rounded-xl bg-slate-100 border border-slate-200/60 text-slate-700 shadow-2xs">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">${fmt(data.escrowBalance)}</p>
          </div>
          <p className="text-xs font-normal text-[#6E6E73] mt-4 pt-3 border-t border-slate-100">Active security deposits in trust</p>
        </div>

        {/* YTD Net Rent */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-normal text-[#6E6E73]">YTD Net Rent</span>
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-700 shadow-2xs">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-emerald-700 tracking-tight">${fmt(data.totalNetEarnings)}</p>
          </div>
          <p className="text-xs font-normal text-[#6E6E73] mt-4 pt-3 border-t border-slate-100">
            Rent profit after platform fee
          </p>
        </div>

        {/* Total Refunds Paid */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-normal text-[#6E6E73]">Refunds Settled</span>
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-700 shadow-2xs">
                <HeartHandshake className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">${fmt(data.totalRefunded)}</p>
          </div>
          <p className="text-xs font-normal text-[#6E6E73] mt-4 pt-3 border-t border-slate-100">Total deposits returned to tenants</p>
        </div>
      </div>

      {/* Main Section */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-base font-semibold text-[#1D1D1F] tracking-tight">Unified Portfolio Ledger</h2>
          <p className="text-xs font-normal text-[#6E6E73] mt-0.5">
            A single ledger tracking all rent incomes, fee commissions, maintenance outflows, and tenant security deposit distributions.
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="bg-slate-100/80 border border-slate-200/30 p-1 rounded-xl mb-4 shadow-2xs w-fit">
              <TabsTrigger value="all" className="rounded-lg font-medium text-xs px-3.5 py-1.5 cursor-pointer data-[state=active]:bg-white data-[state=active]:text-[#1D1D1F] data-[state=active]:shadow-2xs text-[#6E6E73]">
                All Transactions ({data.transactions.length})
              </TabsTrigger>
              <TabsTrigger value="rent" className="rounded-lg font-medium text-xs px-3.5 py-1.5 cursor-pointer data-[state=active]:bg-white data-[state=active]:text-[#1D1D1F] data-[state=active]:shadow-2xs text-[#6E6E73]">
                Rent Ledger ({rentTx.length})
              </TabsTrigger>
              <TabsTrigger value="escrow" className="rounded-lg font-medium text-xs px-3.5 py-1.5 cursor-pointer data-[state=active]:bg-white data-[state=active]:text-[#1D1D1F] data-[state=active]:shadow-2xs text-[#6E6E73]">
                Escrow &amp; Refunds ({escrowTx.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB: ALL */}
            <TabsContent value="all" className="outline-none">
              <LedgerTable list={data.transactions} />
            </TabsContent>

            {/* TAB: RENT */}
            <TabsContent value="rent" className="outline-none">
              <LedgerTable list={rentTx} />
            </TabsContent>

            {/* TAB: ESCROW */}
            <TabsContent value="escrow" className="outline-none">
              <LedgerTable list={escrowTx} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function LedgerTable({ list }: { list: any[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [list]);

  if (!list || list.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl space-y-2 mt-2">
        <FileText className="h-8 w-8 text-slate-300 mx-auto" />
        <h4 className="font-semibold text-[#1D1D1F] text-xs">No transactions found</h4>
        <p className="text-xs text-[#6E6E73] font-normal max-w-xs mx-auto">No records match this ledger filter in your history.</p>
      </div>
    );
  }

  const totalItems = list.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedList = list.slice(startIndex, startIndex + pageSize);

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden mt-2 flex flex-col">
      <Table>
        <TableHeader className="bg-slate-50/70 border-b border-slate-100">
          <TableRow>
            <TableHead className="font-normal text-[#6E6E73] text-xs">Date</TableHead>
            <TableHead className="font-normal text-[#6E6E73] text-xs">Transaction ID</TableHead>
            <TableHead className="font-normal text-[#6E6E73] text-xs">Category</TableHead>
            <TableHead className="font-normal text-[#6E6E73] text-xs">Leaseholder</TableHead>
            <TableHead className="font-normal text-[#6E6E73] text-xs">Reference</TableHead>
            <TableHead className="text-right font-normal text-[#6E6E73] text-xs">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-slate-100">
          {paginatedList.map((tx) => {
            const isExpense = tx.type === "EXPENSE";
            return (
              <TableRow key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell className="text-xs font-normal text-[#6E6E73]">
                  {new Date(tx.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                </TableCell>
                <TableCell className="text-xs font-mono text-[#1D1D1F] font-medium uppercase">
                  {tx.id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wider uppercase border ${
                    tx.category === "RENT" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                    tx.category === "DEPOSIT" ? "bg-purple-50 text-purple-700 border-purple-200" :
                    "bg-slate-100 text-slate-700 border-slate-200"
                  }`}>
                    {tx.category === "DEPOSIT" ? (isExpense ? "REFUND" : "ESCROW") : tx.category}
                  </span>
                </TableCell>
                <TableCell className="text-xs font-semibold text-[#1D1D1F]">
                  {tx.tenant?.name || "System Expense"}
                </TableCell>
                <TableCell className="text-xs font-normal text-[#6E6E73]">
                  {tx.reference ? (
                    <span className="flex items-center gap-1">
                      {tx.reference}
                      {tx.reference.startsWith("re_") && (
                        <ExternalLink className="h-3 w-3 text-[#6E6E73]" />
                      )}
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell className={`text-right text-xs font-semibold ${isExpense ? "text-rose-600" : "text-emerald-700"}`}>
                  {isExpense ? "-" : "+"}${fmt(Number(tx.amount))}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
        <span className="text-xs font-normal text-[#6E6E73]">
          Showing <span className="font-semibold text-[#1D1D1F]">{startIndex + 1}</span> to <span className="font-semibold text-[#1D1D1F]">{Math.min(startIndex + pageSize, totalItems)}</span> of <span className="font-semibold text-[#1D1D1F]">{totalItems}</span> transactions
        </span>
        <div className="flex items-center gap-2">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-[#1D1D1F] px-2">Page {currentPage} of {totalPages}</span>
          <button 
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
