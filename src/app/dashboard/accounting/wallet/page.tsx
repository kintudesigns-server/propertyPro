"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, Wallet, Building, Loader2, CheckCircle2, Clock,
  XCircle, AlertTriangle, ArrowDownRight, RefreshCw, Info,
  TrendingUp, Percent, ExternalLink, Copy, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PayoutRecord {
  id: string;
  amount: string | number;
  status: "PENDING" | "COMPLETED" | "REJECTED";
  bankName: string;
  accountNumber: string;
  accountName: string;
  refNumber?: string;
  proofUrl?: string;
  rejectionReason?: string;
  disbursedAt?: string;
  createdAt: string;
}

interface WalletStats {
  grossRevenue: number;
  totalPlatformFees: number;
  totalNetEarnings: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function maskAccount(acct: string) {
  if (!acct) return "—";
  const clean = acct.replace(/\D/g, "");
  return clean.length >= 4 ? `•••• ${clean.slice(-4)}` : `•••• ${acct.slice(-4)}`;
}

function ageDays(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WalletPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WalletStats>({ grossRevenue: 0, totalPlatformFees: 0, totalNetEarnings: 0 });

  // Withdrawal form
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [userProfileLoading, setUserProfileLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const balance = Number((session?.user as any)?.balance || 0);

  useEffect(() => {
    fetchPayouts();
    fetchUserProfile();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/wallet/stats");
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  };

  const fetchUserProfile = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const d = await res.json();
        setBankName(d.bankName || "");
        setAccountName(d.accountName || "");
        setAccountNumber(d.accountNumber || "");
      }
    } catch { /* silent */ }
    finally { setUserProfileLoading(false); }
  };

  const fetchPayouts = async () => {
    try {
      const res = await fetch("/api/payouts");
      if (res.ok) {
        const data = await res.json();
        setPayouts(Array.isArray(data) ? data : (data.payouts ?? []));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  // ── Derived stats ────────────────────────────────────────────────────────
  const { pendingCount, pendingAmount, completedAmount, rejectedAmount, hasPending } = useMemo(() => {
    const pending   = payouts.filter(p => p.status === "PENDING");
    const completed = payouts.filter(p => p.status === "COMPLETED");
    const rejected  = payouts.filter(p => p.status === "REJECTED");
    return {
      pendingCount:    pending.length,
      pendingAmount:   pending.reduce((s, p) => s + Number(p.amount), 0),
      completedAmount: completed.reduce((s, p) => s + Number(p.amount), 0),
      rejectedAmount:  rejected.reduce((s, p) => s + Number(p.amount), 0),
      hasPending:      pending.length > 0,
    };
  }, [payouts]);

  const feeRate = stats.grossRevenue > 0
    ? ((stats.totalPlatformFees / stats.grossRevenue) * 100).toFixed(1)
    : "—";

  // ── Withdrawal submit ─────────────────────────────────────────────────────
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountNumber) {
      toast.error("Please connect a bank account in your settings first.");
      return;
    }
    const amt = Number(amount);
    if (amt <= 0 || amt > balance) {
      toast.error("Invalid amount — must be between $0.01 and your available balance.");
      return;
    }
    if (amt < 10) {
      toast.error("Minimum withdrawal is $10.00.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, bankName, accountNumber, accountName }),
      });
      if (res.ok) {
        toast.success("Withdrawal request submitted! Admin will process it within 2–3 business days.");
        setAmount("");
        fetchPayouts();
        await update();
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit request.");
      }
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const quickAmounts = [25, 50, 75, 100];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-6 pb-20">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Wallet &amp; Payouts</h1>
          <p className="text-slate-500 font-medium mt-1">Your earnings overview and withdrawal requests.</p>
        </div>
        <button
          onClick={() => { fetchPayouts(); fetchStats(); toast.success("Refreshed"); }}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl px-3 py-2 hover:bg-slate-50 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* ── Pending withdrawal alert banner ── */}
      {hasPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">
              {pendingCount === 1
                ? `You have 1 pending withdrawal of $${fmt(pendingAmount)}`
                : `You have ${pendingCount} pending withdrawals totalling $${fmt(pendingAmount)}`}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Admin reviews withdrawals within <strong>2–3 business days</strong>. You will be notified once processed.
            </p>
          </div>
        </div>
      )}

      {/* ── 4-metric KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Income */}
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 bg-slate-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-slate-600" />
              </div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Gross Income</p>
            </div>
            <p className="text-2xl font-black text-slate-900">${fmt(stats.grossRevenue)}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Total rent received from tenants</p>
          </CardContent>
        </Card>

        {/* Platform Fees */}
        <Card className="bg-rose-50 border-rose-100 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 bg-rose-100 rounded-xl flex items-center justify-center">
                <Percent className="h-4 w-4 text-rose-600" />
              </div>
              <p className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest">Platform Fees</p>
            </div>
            <p className="text-2xl font-black text-rose-700">−${fmt(stats.totalPlatformFees)}</p>
            <p className="text-xs text-rose-500 mt-1 font-medium">{feeRate}% commission on gross income</p>
          </CardContent>
        </Card>

        {/* Net Earnings */}
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-widest">Net Earnings</p>
            </div>
            <p className="text-2xl font-black text-emerald-700">${fmt(stats.totalNetEarnings)}</p>
            <p className="text-xs text-emerald-500 mt-1 font-medium">After platform fees deducted</p>
          </CardContent>
        </Card>

        {/* Total Paid Out */}
        <Card className="bg-blue-50 border-blue-100 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 bg-blue-100 rounded-xl flex items-center justify-center">
                <ArrowDownRight className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest">Total Withdrawn</p>
            </div>
            <p className="text-2xl font-black text-blue-700">${fmt(completedAmount)}</p>
            <p className="text-xs text-blue-500 mt-1 font-medium">Successfully paid to your bank</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main 2-col layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Balance card + Request form */}
        <div className="lg:col-span-1 space-y-4">

          {/* Available Balance */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[24px] p-6 text-white shadow-xl">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Wallet className="h-3.5 w-3.5" /> Available Balance
            </p>
            <p className="text-5xl font-black mt-3 tracking-tight">
              ${fmt(balance)}
            </p>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Ready to withdraw to your bank account
            </p>

            {/* Breakdown */}
            <div className="mt-5 pt-4 border-t border-slate-700 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><Info className="h-3 w-3" />Net earnings to date</span>
                <span className="font-bold text-emerald-400">+${fmt(stats.totalNetEarnings)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" />Already withdrawn</span>
                <span className="font-bold text-rose-400">−${fmt(completedAmount)}</span>
              </div>
              {pendingAmount > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />Pending payout</span>
                  <span className="font-bold text-amber-400">−${fmt(pendingAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-700 text-white font-black">
                <span>Available now</span>
                <span>${fmt(balance)}</span>
              </div>
            </div>
          </div>

          {/* Request Withdrawal Form */}
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
            <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-2xl pb-4">
              <CardTitle className="text-base font-bold text-slate-900">Request Withdrawal</CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Minimum $10.00 · Processed in 2–3 business days
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleWithdraw}>
              <CardContent className="p-5 space-y-5">

                {/* Destination account */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Destination Bank Account
                  </Label>
                  {userProfileLoading ? (
                    <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                  ) : bankName ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <Building className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{bankName}</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {accountName} · {maskAccount(accountNumber)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push("/dashboard/owner#settings")}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 border border-blue-200 hover:bg-blue-50 rounded-lg px-2 py-1 transition-all"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                      <AlertTriangle className="h-7 w-7 mx-auto text-amber-500 mb-2" />
                      <p className="text-xs font-bold text-amber-800 mb-1">No Bank Account Connected</p>
                      <p className="text-[11px] text-amber-700 mb-3">Add your bank details in settings to enable withdrawals.</p>
                      <Button
                        type="button"
                        onClick={() => router.push("/dashboard/owner#settings")}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white h-9 text-xs font-bold rounded-xl"
                      >
                        Connect Bank Account
                      </Button>
                    </div>
                  )}
                </div>

                {/* Amount field */}
                {bankName && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Amount</Label>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                        Available: ${fmt(balance)}
                      </span>
                    </div>

                    {/* Quick % buttons */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {quickAmounts.map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setAmount(((balance * pct) / 100).toFixed(2))}
                          className="h-8 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                        >
                          {pct === 100 ? "MAX" : `${pct}%`}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">$</div>
                      <Input
                        type="number"
                        required
                        step="0.01"
                        min="10"
                        max={balance}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-14 pl-9 bg-slate-50 border-slate-200 rounded-xl font-black text-2xl placeholder:text-slate-300"
                      />
                    </div>

                    {Number(amount) > 0 && Number(amount) < 10 && (
                      <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Minimum withdrawal is $10.00
                      </p>
                    )}
                    {hasPending && (
                      <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1.5 bg-amber-50 rounded-lg px-2.5 py-2">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        You already have a pending withdrawal. You may still submit another request.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>

              {bankName && (
                <CardFooter className="p-5 pt-0">
                  <Button
                    type="submit"
                    disabled={submitting || Number(amount) < 10 || Number(amount) > balance || !bankName}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white h-12 rounded-xl font-bold text-sm shadow-sm transition-all"
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</>
                    ) : (
                      <>Submit Withdrawal Request {amount ? `· $${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ""}</>
                    )}
                  </Button>
                </CardFooter>
              )}
            </form>
          </Card>
        </div>

        {/* RIGHT: Withdrawal History */}
        <div className="lg:col-span-2">
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl h-full flex flex-col">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Withdrawal History</CardTitle>
                  <CardDescription className="text-slate-500 text-xs mt-0.5">
                    All your payout requests and their current status.
                  </CardDescription>
                </div>
                {/* Mini summary pills */}
                {payouts.length > 0 && (
                  <div className="flex gap-2 flex-wrap justify-end">
                    {pendingAmount > 0 && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                        ${fmt(pendingAmount)} pending
                      </span>
                    )}
                    {completedAmount > 0 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                        ${fmt(completedAmount)} paid
                      </span>
                    )}
                    {rejectedAmount > 0 && (
                      <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                        ${fmt(rejectedAmount)} rejected
                      </span>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1">
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : payouts.length === 0 ? (
                <div className="text-center py-24 px-6">
                  <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Wallet className="h-9 w-9 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-2">No Withdrawals Yet</h3>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
                    Once you submit a withdrawal request it will appear here. Funds must be in your balance before requesting.
                  </p>
                </div>
              ) : (
                 <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow className="border-slate-100 hover:bg-transparent">
                      <TableHead className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-6 w-[20%]">
                        Requested
                      </TableHead>
                      <TableHead className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-[40%]">
                        Destination
                      </TableHead>
                      <TableHead className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right w-[20%]">
                        Amount
                      </TableHead>
                      <TableHead className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pr-6 text-right w-[20%]">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((p) => {
                      const days = ageDays(p.createdAt);
                      return (
                        <TableRow key={p.id} className="border-slate-100 hover:bg-slate-50 align-top">
                          {/* Date */}
                          <TableCell className="pl-6 py-4 w-[20%]">
                            <p className="text-sm font-bold text-slate-800">
                              {new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                            {p.status === "PENDING" && (
                              <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                                {days === 0 ? "Today" : `${days}d ago`}
                              </p>
                            )}
                            {p.status === "COMPLETED" && p.disbursedAt && (
                              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                                Paid {new Date(p.disbursedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </p>
                            )}
                          </TableCell>

                          {/* Bank details */}
                          <TableCell className="py-4 w-[40%]">
                            <p className="text-sm font-bold text-slate-900">{p.bankName}</p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{maskAccount(p.accountNumber)}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 items-center">
                              {p.refNumber && (
                                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                  Ref: <span className="font-mono font-semibold text-slate-600">{p.refNumber}</span>
                                  <button
                                    onClick={() => { navigator.clipboard.writeText(p.refNumber!); toast.success("Ref copied"); }}
                                    className="text-slate-300 hover:text-slate-500"
                                    title="Copy Reference"
                                    type="button"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </p>
                              )}
                              {p.proofUrl && (
                                <a
                                  href={p.proofUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-1.5 py-0.5 flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                                >
                                  <ExternalLink className="h-2.5 w-2.5" /> View Receipt
                                </a>
                              )}
                            </div>
                          </TableCell>

                          {/* Amount */}
                          <TableCell className="py-4 text-right w-[20%]">
                            <p className="text-sm font-black text-slate-900">
                              ${Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-4 pr-6 text-right w-[20%]">
                            {p.status === "COMPLETED" ? (
                              <div>
                                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-0.5 font-bold text-[10px]">
                                  <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Paid
                                </Badge>
                              </div>
                            ) : p.status === "REJECTED" ? (
                              <div className="space-y-1">
                                <div>
                                  <Badge className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-2.5 py-0.5 font-bold text-[10px]">
                                    <XCircle className="h-3 w-3 mr-1 inline" /> Rejected
                                  </Badge>
                                </div>
                                {p.rejectionReason && (
                                  <p className="text-[10px] text-red-500 font-medium leading-snug break-words max-w-[140px] ml-auto">
                                    {p.rejectionReason}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div>
                                <Badge className="bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-2.5 py-0.5 font-bold text-[10px]">
                                  <Clock className="h-3 w-3 mr-1 inline" /> Pending
                                </Badge>
                                <p className="text-[10px] text-amber-600 font-medium mt-1">2–3 business days</p>
                              </div>
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
        </div>
      </div>
    </div>
  );
}
