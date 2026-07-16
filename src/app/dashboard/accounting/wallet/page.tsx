"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Wallet, Building, Loader2, CheckCircle2, Clock,
  XCircle, AlertTriangle, ArrowDownRight, RefreshCw, Info,
  TrendingUp, Percent, ExternalLink, Copy, ArrowRight,
  ShieldCheck, Banknote, CircleDollarSign, ChevronRight, X, Plus, ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

const STATUS_CONFIG = {
  COMPLETED: { label: "Paid",     bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", stripe: "border-l-emerald-500" },
  PENDING:   { label: "Pending",  bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   dot: "bg-amber-400",   stripe: "border-l-amber-400"   },
  REJECTED:  { label: "Rejected", bg: "bg-red-50",     border: "border-red-100",     text: "text-red-600",     dot: "bg-red-500",     stripe: "border-l-red-500"     },
};

export default function WalletPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WalletStats>({ grossRevenue: 0, totalPlatformFees: 0, totalNetEarnings: 0 });
  const [panelOpen, setPanelOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [userProfileLoading, setUserProfileLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "COMPLETED" | "REJECTED">("ALL");

  const balance = Number((session?.user as any)?.balance || 0);

  useEffect(() => { fetchPayouts(); fetchUserProfile(); fetchStats(); }, []);

  const fetchStats = async () => {
    try { const r = await fetch("/api/wallet/stats"); if (r.ok) setStats(await r.json()); } catch {}
  };
  const fetchUserProfile = async () => {
    try {
      const r = await fetch("/api/users");
      if (r.ok) { const d = await r.json(); setBankName(d.bankName || ""); setAccountName(d.accountName || ""); setAccountNumber(d.accountNumber || ""); }
    } catch {} finally { setUserProfileLoading(false); }
  };
  const fetchPayouts = async () => {
    try { const r = await fetch("/api/payouts"); if (r.ok) { const d = await r.json(); setPayouts(Array.isArray(d) ? d : (d.payouts ?? [])); } }
    catch {} finally { setLoading(false); }
  };

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

  const filteredPayouts = useMemo(() =>
    statusFilter === "ALL" ? payouts : payouts.filter(p => p.status === statusFilter),
    [payouts, statusFilter]
  );

  const feeRate = stats.grossRevenue > 0 ? ((stats.totalPlatformFees / stats.grossRevenue) * 100).toFixed(1) : "—";
  const isAmountValid = Number(amount) >= 10 && Number(amount) <= balance;

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!bankName || !accountNumber) { toast.error("Please connect a bank account first."); return; }
    if (amt < 10) { toast.error("Minimum withdrawal is $10.00."); return; }
    if (amt > balance) { toast.error("Amount exceeds your available balance."); return; }
    setSubmitting(true);
    try {
      const r = await fetch("/api/payouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: amt, bankName, accountNumber, accountName }) });
      if (r.ok) {
        toast.success("Withdrawal request submitted! You will be notified once processed.");
        setAmount(""); setPanelOpen(false); fetchPayouts(); await update(); router.refresh();
      } else { const err = await r.json(); toast.error(err.error || "Failed to submit request."); }
    } catch { toast.error("Network error — please try again."); }
    finally { setSubmitting(false); }
  };

  const TABS = ["ALL", "PENDING", "COMPLETED", "REJECTED"] as const;
  const tabCounts = { ALL: payouts.length, PENDING: payouts.filter(p => p.status === "PENDING").length, COMPLETED: payouts.filter(p => p.status === "COMPLETED").length, REJECTED: payouts.filter(p => p.status === "REJECTED").length };

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-20 px-4 sm:px-6 space-y-6">

      {/* PAGE HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Wallet & Payouts</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your rental income and request bank transfers.</p>
        </div>
        <button onClick={() => { fetchPayouts(); fetchStats(); toast.success("Refreshed"); }}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl px-3 py-2 hover:bg-slate-50 transition-all">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* HERO BALANCE STRIP */}
      <div className="relative overflow-hidden rounded-2xl text-white shadow-lg" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #0f172a 100%)" }}>
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-violet-400/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-extrabold text-blue-300 uppercase tracking-widest">Available Balance</span>
                <span className="flex items-center gap-1 bg-white/10 border border-white/10 rounded-full px-2 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-400 uppercase">Live</span>
                </span>
              </div>
              <p className="text-5xl sm:text-6xl font-black tracking-tight">${fmt(balance)}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><Info className="h-3 w-3" />Net earned: <span className="text-emerald-400 font-bold ml-1">+${fmt(stats.totalNetEarnings)}</span></span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" />Withdrawn: <span className="text-rose-400 font-bold ml-1">-${fmt(completedAmount)}</span></span>
                {pendingAmount > 0 && <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />Pending: <span className="text-amber-400 font-bold ml-1">-${fmt(pendingAmount)}</span></span>}
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-3">
              <Button onClick={() => setPanelOpen(true)}
                className="flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 font-black h-11 px-6 rounded-xl shadow-sm text-sm transition-all">
                <ArrowUpRight className="h-4 w-4" /> Withdraw Funds
              </Button>
              {bankName && !userProfileLoading && (
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Building className="h-3.5 w-3.5" />
                  <span className="font-medium">{bankName}</span>
                  <span className="font-mono opacity-70">{maskAccount(accountNumber)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Gross Income",    value: `$${fmt(stats.grossRevenue)}`,     sub: "Total rent collected",                                                        Icon: TrendingUp,      icolor: "text-violet-600", ibg: "bg-violet-50", vcolor: "text-slate-900"   },
          { label: "Platform Fees",   value: `-$${fmt(stats.totalPlatformFees)}`, sub: `${feeRate}% commission on gross`,                                           Icon: Percent,         icolor: "text-rose-600",   ibg: "bg-rose-50",   vcolor: "text-rose-600"    },
          { label: "Net Earnings",    value: `$${fmt(stats.totalNetEarnings)}`, sub: "After all fees deducted",                                                     Icon: CircleDollarSign, icolor: "text-emerald-600", ibg: "bg-emerald-50", vcolor: "text-emerald-600" },
          { label: "Total Withdrawn", value: `$${fmt(completedAmount)}`,        sub: `${payouts.filter(p => p.status === "COMPLETED").length} payouts completed`,   Icon: ArrowDownRight,  icolor: "text-blue-600",   ibg: "bg-blue-50",   vcolor: "text-blue-600"    },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all">
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-8 w-8 ${c.ibg} rounded-xl flex items-center justify-center shrink-0`}>
                <c.Icon className={`h-4 w-4 ${c.icolor}`} />
              </div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{c.label}</span>
            </div>
            <p className={`text-2xl font-black ${c.vcolor}`}>{c.value}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* PENDING ALERT */}
      {hasPending && (
        <div className="relative flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="absolute left-0 top-0 w-1 h-full bg-amber-400 rounded-l-xl" />
          <Clock className="ml-2 h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-900">
              {pendingCount === 1 ? `1 withdrawal of $${fmt(pendingAmount)} is being reviewed` : `${pendingCount} withdrawals totalling $${fmt(pendingAmount)} are in review`}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">Admin typically processes withdrawals within <strong>2–3 business days</strong>.</p>
          </div>
        </div>
      )}

      {/* PAYOUT HISTORY TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900">Payout History</h2>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">{payouts.length} total withdrawal requests</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {TABS.map((tab) => (
              <button key={tab} onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${statusFilter === tab ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}>
                {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                <span className={`ml-1.5 text-[9px] font-extrabold ${statusFilter === tab ? "text-slate-400" : "text-slate-400"}`}>{tabCounts[tab]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
            <p className="text-xs text-slate-400 font-semibold">Loading payouts...</p>
          </div>
        ) : filteredPayouts.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="h-16 w-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <Wallet className="h-7 w-7 text-slate-300" />
            </div>
            <h3 className="text-base font-black text-slate-800 mb-1">No payout requests yet</h3>
            <p className="text-sm text-slate-400 max-w-xs mx-auto">
              {statusFilter === "ALL" ? "Click \"Withdraw Funds\" above to request your first payout." : `No ${statusFilter.toLowerCase()} payouts found.`}
            </p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-12 px-6 py-2.5 bg-slate-50/80 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
              <div className="col-span-1">#</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-3">Destination Bank</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-2 text-right">Reference</div>
            </div>

            <div className="divide-y divide-slate-50">
              {filteredPayouts.map((p, i) => {
                const cfg = STATUS_CONFIG[p.status];
                const days = ageDays(p.createdAt);
                return (
                  <div key={p.id} className={`border-l-4 ${cfg.stripe} hover:bg-slate-50/50 transition-colors`}>
                    <div className="grid grid-cols-12 items-center px-6 py-4 gap-2">
                      {/* # */}
                      <div className="col-span-1">
                        <span className="text-[11px] font-bold text-slate-400">#{payouts.length - i}</span>
                      </div>

                      {/* Date */}
                      <div className="col-span-2">
                        <p className="text-sm font-bold text-slate-800">
                          {new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <p className={`text-[10px] font-semibold mt-0.5 ${cfg.text}`}>
                          {p.status === "PENDING" && (days === 0 ? "Today" : `${days}d ago`)}
                          {p.status === "COMPLETED" && p.disbursedAt && `Paid ${new Date(p.disbursedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                          {p.status === "REJECTED" && "Action needed"}
                        </p>
                      </div>

                      {/* Bank */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <div className={`h-8 w-8 ${cfg.bg} border ${cfg.border} rounded-lg flex items-center justify-center shrink-0`}>
                            <Building className={`h-3.5 w-3.5 ${cfg.text}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{p.bankName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{maskAccount(p.accountNumber)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="col-span-2 text-right">
                        <p className="text-sm font-black text-slate-900">${Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        {p.proofUrl && (
                          <a href={p.proofUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:underline mt-0.5">
                            <ExternalLink className="h-2.5 w-2.5" /> Receipt
                          </a>
                        )}
                      </div>

                      {/* Status badge */}
                      <div className="col-span-2 flex flex-col items-center gap-1">
                        <div className={`inline-flex items-center gap-1.5 ${cfg.bg} border ${cfg.border} rounded-full px-3 py-1`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${p.status === "PENDING" ? "animate-pulse" : ""}`} />
                          <span className={`text-[10px] font-black ${cfg.text}`}>{cfg.label}</span>
                        </div>
                        {p.status === "PENDING" && <span className="text-[9px] text-amber-600 font-semibold">2–3 biz days</span>}
                      </div>

                      {/* Ref number */}
                      <div className="col-span-2 text-right">
                        {p.refNumber ? (
                          <button type="button"
                            onClick={() => { navigator.clipboard.writeText(p.refNumber!); toast.success("Reference copied!"); }}
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 hover:bg-white transition-all">
                            {p.refNumber.length > 10 ? p.refNumber.slice(0, 10) + "…" : p.refNumber}
                            <Copy className="h-2.5 w-2.5 text-slate-400" />
                          </button>
                        ) : <span className="text-[11px] text-slate-300">—</span>}
                      </div>
                    </div>

                    {/* Rejection reason inline */}
                    {p.status === "REJECTED" && p.rejectionReason && (
                      <div className="mx-6 mb-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                        <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-red-600 font-semibold leading-snug">{p.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Footer */}
        {!loading && payouts.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-400 font-semibold">
              Showing {filteredPayouts.length} of {payouts.length} requests
            </p>
            <button onClick={() => setPanelOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
              <Plus className="h-3.5 w-3.5" /> New withdrawal
            </button>
          </div>
        )}
      </div>

      {/* SLIDE-OUT WITHDRAWAL PANEL */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setPanelOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl z-10">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-slate-900 rounded-xl flex items-center justify-center">
                  <Banknote className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Withdraw Funds</h2>
                  <p className="text-[11px] text-slate-400">Transfer to your bank account</p>
                </div>
              </div>
              <button onClick={() => setPanelOpen(false)}
                className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Balance recap */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Available to Withdraw</p>
                <p className="text-3xl font-black text-slate-900">${fmt(balance)}</p>
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5 text-[11px] text-slate-500">
                  <div className="flex justify-between"><span>Net earnings</span><span className="font-bold text-emerald-600">+${fmt(stats.totalNetEarnings)}</span></div>
                  <div className="flex justify-between"><span>Already withdrawn</span><span className="font-bold text-rose-500">-${fmt(completedAmount)}</span></div>
                  {pendingAmount > 0 && <div className="flex justify-between"><span>In review</span><span className="font-bold text-amber-600">-${fmt(pendingAmount)}</span></div>}
                </div>
              </div>

              {/* Destination account */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Destination Account</label>
                {userProfileLoading ? (
                  <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                ) : bankName ? (
                  <div className="flex items-center justify-between border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <Building className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{bankName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{accountName} · {maskAccount(accountNumber)}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => router.push("/dashboard/owner#settings")}
                      className="text-[10px] font-bold text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg px-2.5 py-1.5 flex items-center gap-1 transition-all">
                      Change <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
                    <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-amber-900 mb-1">No bank account connected</p>
                    <p className="text-[11px] text-amber-700 mb-3">Add your bank details in settings to enable withdrawals.</p>
                    <Button type="button" onClick={() => router.push("/dashboard/owner#settings")} className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold h-9 rounded-xl">Connect Bank Account</Button>
                  </div>
                )}
              </div>

              {bankName && (
                <>
                  {/* Amount */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Amount (USD)</label>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">Max: ${fmt(balance)}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[25, 50, 75, 100].map((pct) => {
                        const target = ((balance * pct) / 100).toFixed(2);
                        const selected = amount === target;
                        return (
                          <button key={pct} type="button" onClick={() => setAmount(target)}
                            className={`h-9 text-xs font-bold rounded-xl border transition-all ${selected ? "bg-slate-900 text-white border-slate-900 scale-105 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                            {pct === 100 ? "MAX" : `${pct}%`}
                          </button>
                        );
                      })}
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 pointer-events-none select-none">$</span>
                      <Input type="number" required step="0.01" min="10" max={balance} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                        className="h-16 pl-10 text-3xl font-black bg-slate-50 border-slate-200 rounded-xl placeholder:text-slate-200 focus-visible:ring-slate-400" />
                    </div>
                    {Number(amount) > 0 && Number(amount) < 10 && (
                      <div className="flex items-center gap-2 text-[11px] text-red-600 font-semibold bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Minimum withdrawal is $10.00
                      </div>
                    )}
                  </div>

                  {/* How it works */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 space-y-1.5">
                    <p className="font-bold text-blue-900">How payouts work</p>
                    <p>• Reviewed by an admin within <strong>2–3 business days</strong></p>
                    <p>• Email notification once approved or rejected</p>
                    <p>• Rejected requests can be re-submitted</p>
                  </div>

                  {hasPending && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-[11px] text-amber-700 font-semibold">
                      <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      You already have a pending withdrawal. You may still submit another.
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Panel Footer */}
            {bankName && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 space-y-3">
                <Button onClick={handleWithdraw as any} disabled={submitting || !isAmountValid}
                  className="w-full h-12 rounded-xl font-black text-sm bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 transition-all">
                  {submitting ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Submitting...</span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Banknote className="h-4 w-4" />
                      {isAmountValid ? `Withdraw $${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "Enter an amount"}
                      {isAmountValid && <ArrowRight className="h-4 w-4" />}
                    </span>
                  )}
                </Button>
                <div className="flex items-center justify-center gap-1.5 text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <p className="text-[10px] font-semibold">Admin-verified · Encrypted transfer</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
