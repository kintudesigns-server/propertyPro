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
  TrendingUp, Percent, ArrowRight, ShieldCheck, HeartHandshake, FileText, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FinancialOverviewPage() {
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
        throw new Error();
      }
    } catch {
      toast.error("Failed to load financial overview.");
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
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-[#8E8E93] font-bold text-sm">Analyzing Financial Portfolio...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-6 pb-20">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Financial Overview</h1>
          <p className="text-[#6E6E73] font-medium mt-1">Real-time analysis of your cash flow, escrowed deposits, and rental payouts.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => { fetchData(); toast.success("Refreshed stats"); }}
          className="flex items-center gap-2 text-xs font-bold text-[#6E6E73] hover:text-slate-800 border border-slate-200 rounded-xl px-3 py-2 hover:bg-[#F5F5F7] transition-all shadow-none"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available to Withdraw */}
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <Wallet className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-[10px] font-extrabold text-[#8E8E93] uppercase tracking-widest">Available Wallet</p>
            </div>
            <p className="text-3xl font-black text-slate-900">${fmt(balance)}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <span className="text-[11px] text-[#8E8E93] font-bold">Unwithdrawn earnings</span>
              <Button
                size="sm"
                onClick={() => router.push("/dashboard/accounting/wallet")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg text-xs h-7 px-2.5 shadow-none"
              >
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Escrow Held */}
        <Card className="bg-purple-50 border-purple-100 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 bg-purple-100 rounded-xl flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-[10px] font-extrabold text-purple-400 uppercase tracking-widest">Escrow Held</p>
            </div>
            <p className="text-3xl font-black text-purple-700">${fmt(data.escrowBalance)}</p>
            <p className="text-xs text-purple-500 mt-1 font-semibold pt-3 border-t border-purple-100/50">Active security deposits in trust</p>
          </CardContent>
        </Card>

        {/* YTD Net Earnings */}
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-widest">YTD Net Rent</p>
            </div>
            <p className="text-3xl font-black text-emerald-700">${fmt(data.totalNetEarnings)}</p>
            <p className="text-xs text-emerald-500 mt-1 font-semibold pt-3 border-t border-emerald-100/50">
              Rent profit after platform fee
            </p>
          </CardContent>
        </Card>

        {/* Total Refunds Paid */}
        <Card className="bg-red-50 border-red-100 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 bg-red-100 rounded-xl flex items-center justify-center">
                <HeartHandshake className="h-4 w-4 text-red-600" />
              </div>
              <p className="text-[10px] font-extrabold text-red-400 uppercase tracking-widest">Refunds Settled</p>
            </div>
            <p className="text-3xl font-black text-red-700">${fmt(data.totalRefunded)}</p>
            <p className="text-xs text-red-500 mt-1 font-semibold pt-3 border-t border-red-100/50">Total deposits returned to tenants</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Section */}
      <Card className="border-slate-200 shadow-sm rounded-[24px] overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 py-5 px-6">
          <CardTitle className="text-lg font-black text-slate-900">Unified Portfolio Ledger</CardTitle>
          <CardDescription className="text-xs font-semibold text-[#6E6E73]">
            A single ledger tracking all rent incomes, fee commissions, maintenance outflows, and tenant security deposit distributions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="bg-slate-100 p-1 rounded-xl mb-4">
              <TabsTrigger value="all" className="rounded-lg font-bold text-xs px-4">
                All Transactions ({data.transactions.length})
              </TabsTrigger>
              <TabsTrigger value="rent" className="rounded-lg font-bold text-xs px-4">
                Rent Ledger ({rentTx.length})
              </TabsTrigger>
              <TabsTrigger value="escrow" className="rounded-lg font-bold text-xs px-4">
                Escrow & Refunds ({escrowTx.length})
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
        </CardContent>
      </Card>
    </div>
  );
}

function LedgerTable({ list }: { list: any[] }) {
  if (!list || list.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl space-y-2 mt-2">
        <FileText className="h-8 w-8 text-slate-300 mx-auto" />
        <h4 className="font-bold text-slate-700 text-sm">No transactions found</h4>
        <p className="text-xs text-[#8E8E93] font-medium max-w-xs mx-auto">No records match this ledger filter in your history.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden mt-2">
      <Table>
        <TableHeader className="bg-[#F5F5F7]">
          <TableRow>
            <TableHead className="font-bold text-[#6E6E73] text-xs">Date</TableHead>
            <TableHead className="font-bold text-[#6E6E73] text-xs">Transaction ID</TableHead>
            <TableHead className="font-bold text-[#6E6E73] text-xs">Category</TableHead>
            <TableHead className="font-bold text-[#6E6E73] text-xs">Leaseholder</TableHead>
            <TableHead className="font-bold text-[#6E6E73] text-xs">Reference</TableHead>
            <TableHead className="text-right font-bold text-[#6E6E73] text-xs">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((tx) => {
            const isExpense = tx.type === "EXPENSE";
            return (
              <TableRow key={tx.id} className="hover:bg-[#F5F5F7]/50">
                <TableCell className="text-xs font-semibold text-[#6E6E73]">
                  {new Date(tx.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                </TableCell>
                <TableCell className="text-xs font-mono text-[#6E6E73] uppercase">
                  {tx.id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <Badge className={`text-[10px] font-black tracking-wider uppercase ${
                    tx.category === "RENT" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    tx.category === "DEPOSIT" ? "bg-purple-50 text-purple-700 border-purple-200" :
                    "bg-slate-50 text-[#6E6E73] border-slate-200"
                  }`}>
                    {tx.category === "DEPOSIT" ? (isExpense ? "REFUND" : "ESCROW") : tx.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-bold text-slate-700">
                  {tx.tenant?.name || "System Expense"}
                </TableCell>
                <TableCell className="text-xs font-medium text-[#6E6E73]">
                  {tx.reference ? (
                    <span className="flex items-center gap-1">
                      {tx.reference}
                      {tx.reference.startsWith("re_") && (
                        <ExternalLink className="h-3 w-3 text-[#8E8E93]" />
                      )}
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell className={`text-right text-xs font-black ${isExpense ? "text-red-600" : "text-emerald-700"}`}>
                  {isExpense ? "-" : "+"}${fmt(Number(tx.amount))}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
