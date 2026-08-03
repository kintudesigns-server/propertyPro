"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileSignature,
  Lock,
  Mail,
  ShieldCheck,
  Wallet,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Download,
  CreditCard,
  DollarSign,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PayoutDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [payout, setPayout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchPayout() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/payouts/${id}`);
        if (res.ok) {
          const data = await res.json();
          setPayout(data);
        } else {
          toast.error("Failed to load payout details");
        }
      } catch (err) {
        toast.error("Error loading payout details");
      } finally {
        setLoading(false);
      }
    }
    fetchPayout();
  }, [id]);

  function maskAccount(acc?: string) {
    if (!acc) return "•••• ••••";
    const cleaned = acc.replace(/\s+/g, "");
    if (cleaned.length <= 4) return `•••• ${cleaned}`;
    return `•••• ${cleaned.slice(-4)}`;
  }

  function handleCopyReference(ref: string) {
    navigator.clipboard.writeText(ref);
    setCopied(true);
    toast.success("Reference code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 flex flex-col items-center justify-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
        <p className="text-xs font-bold text-slate-500">Loading payout dossier...</p>
      </div>
    );
  }

  if (!payout) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 flex flex-col items-center justify-center space-y-4">
        <XCircle className="h-12 w-12 text-rose-500" />
        <h2 className="text-xl font-bold text-slate-900">Payout Record Not Found</h2>
        <p className="text-xs text-slate-500">The payout disbursal record you requested does not exist or has been removed.</p>
        <Link href="/dashboard/accounting/wallet">
          <Button className="bg-slate-900 text-white font-bold text-xs h-10 px-4 rounded-xl">
            Return to Wallet &amp; Payouts
          </Button>
        </Link>
      </div>
    );
  }

  const isCompleted = payout.status === "COMPLETED";
  const isPending = payout.status === "PENDING";
  const isRejected = payout.status === "REJECTED";

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-6">
      
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/accounting/wallet"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Wallet &amp; Payouts
        </Link>
        <div className="text-xs font-semibold text-slate-400">
          Disbursal ID: <span className="font-mono text-slate-800 font-bold">{payout.id}</span>
        </div>
      </div>

      {/* Hero Disbursal Card */}
      <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {isCompleted && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-black">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Disbursed
                </span>
              )}
              {isPending && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-black">
                  <Clock className="h-4 w-4 text-amber-600 animate-pulse" /> Under Review
                </span>
              )}
              {isRejected && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-xs font-black">
                  <XCircle className="h-4 w-4 text-rose-600" /> Disbursal Rejected
                </span>
              )}
              <span className="text-xs font-bold text-slate-400">
                Requested on {format(new Date(payout.createdAt), "MMM d, yyyy 'at' hh:mm a")}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                ${Number(payout.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h1>
              <span className="text-sm font-bold text-slate-500">USD</span>
            </div>

            <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-slate-400" />
              Transfer destination: <strong className="text-slate-800">{payout.bankName}</strong> ({maskAccount(payout.accountNumber)})
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {payout.proofUrl && (
              <a href={payout.proofUrl} target="_blank" rel="noopener noreferrer">
                <Button className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 rounded-xl gap-2 shadow-xs border-none">
                  <Download className="h-4 w-4" /> Download Official Receipt
                </Button>
              </a>
            )}
            {payout.refNumber && (
              <Button
                variant="outline"
                onClick={() => handleCopyReference(payout.refNumber)}
                className="h-10 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 rounded-xl gap-2 shadow-2xs"
              >
                <Copy className="h-4 w-4 text-slate-400" /> {copied ? "Copied!" : "Copy Reference"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2-Column SaaS Command Center Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Columns: Disbursal Metadata & Rejection Callout */}
        <div className="lg:col-span-2 space-y-6">

          {/* Rejection Alert Box if Rejected */}
          {isRejected && (
            <Card className="bg-rose-50/70 border border-rose-200/90 rounded-2xl overflow-hidden shadow-xs">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-rose-100 border border-rose-200 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-rose-900">Disbursal Action Required</h3>
                    <p className="text-xs text-rose-700 font-medium mt-0.5 leading-relaxed">
                      This payout request could not be processed by the finance clearing system.
                    </p>
                  </div>
                </div>

                {payout.rejectionReason && (
                  <div className="bg-white/80 border border-rose-200 rounded-xl p-4 text-xs font-semibold text-rose-900 space-y-1">
                    <p className="text-[10px] uppercase font-extrabold text-rose-500 tracking-wider">Reason Provided by Admin</p>
                    <p className="text-sm font-bold">{payout.rejectionReason}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <Link href="/dashboard/owner#settings">
                    <Button className="h-9 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 rounded-xl border-none">
                      Update Bank Credentials
                    </Button>
                  </Link>
                  <Link href="/dashboard/accounting/wallet">
                    <Button variant="outline" className="h-9 border-rose-200 bg-white hover:bg-rose-50 text-rose-800 font-bold text-xs px-4 rounded-xl">
                      Re-submit Payout Request
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Disbursal Audit Details */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-blue-600" /> Disbursal Audit Record
              </h3>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                System Verified
              </span>
            </div>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Disbursal Reference</p>
                  <p className="font-mono text-sm font-extrabold text-slate-900 mt-1">
                    {payout.refNumber || "Pending Disbursal"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Payment Method</p>
                  <p className="font-bold text-sm text-slate-900 mt-1">
                    Direct Bank Wire / ACH Transfer
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Date Requested</p>
                  <p className="font-bold text-slate-800 mt-1">
                    {format(new Date(payout.createdAt), "MMMM d, yyyy 'at' hh:mm:ss a")}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Date Disbursed</p>
                  <p className="font-bold text-slate-800 mt-1">
                    {payout.disbursedAt ? format(new Date(payout.disbursedAt), "MMMM d, yyyy 'at' hh:mm:ss a") : "Awaiting Disbursal"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Destination Bank</p>
                  <p className="font-bold text-slate-800 mt-1">{payout.bankName}</p>
                </div>

                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Account Holder Name</p>
                  <p className="font-bold text-slate-800 mt-1">{payout.accountName || "On File"}</p>
                </div>

                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Account Number (Masked)</p>
                  <p className="font-mono font-bold text-slate-800 mt-1">{maskAccount(payout.accountNumber)}</p>
                </div>

                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Recipient Email</p>
                  <p className="font-bold text-slate-800 mt-1">{payout.owner?.email || payout.tenant?.email || "N/A"}</p>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Chronological Audit Timeline */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" /> Processing Event Timeline
              </h3>
            </div>

            <CardContent className="p-6">
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                
                {/* Event 1: Request Created */}
                <div className="relative">
                  <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-blue-500 ring-4 ring-white" />
                  <p className="text-xs font-extrabold text-slate-900">Payout Requested</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Owner submitted withdrawal request for ${Number(payout.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}.
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    {format(new Date(payout.createdAt), "MMM d, yyyy, hh:mm a")}
                  </p>
                </div>

                {/* Event 2: Under Review */}
                <div className="relative">
                  <div className={`absolute -left-6 top-0.5 h-4 w-4 rounded-full ring-4 ring-white ${isPending ? "bg-amber-500 animate-pulse" : "bg-blue-500"}`} />
                  <p className="text-xs font-extrabold text-slate-900">Compliance &amp; Clearing Review</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    System verified owner balance and queued wire batch for clearing.
                  </p>
                </div>

                {/* Event 3: Final Disposition */}
                {isCompleted && (
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-emerald-500 ring-4 ring-white" />
                    <p className="text-xs font-extrabold text-emerald-900">Funds Disbursed &amp; Settled</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Bank confirmed wire execution. Reference code: <span className="font-mono font-bold text-slate-800">{payout.refNumber}</span>.
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">
                      {payout.disbursedAt ? format(new Date(payout.disbursedAt), "MMM d, yyyy, hh:mm a") : ""}
                    </p>
                  </div>
                )}

                {isRejected && (
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-rose-500 ring-4 ring-white" />
                    <p className="text-xs font-extrabold text-rose-900">Disbursal Rejected</p>
                    <p className="text-[11px] text-rose-600 font-medium">
                      {payout.rejectionReason || "Bank details rejected by clearing house."}
                    </p>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right 1 Column: Account Balance Recap & Support */}
        <div className="space-y-6">

          {/* Account Overview */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600" /> Account Summary
              </h3>
            </div>

            <CardContent className="p-6 space-y-4 text-xs">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Recipient Name</span>
                <span className="font-bold text-slate-900">{payout.owner?.name || payout.tenant?.name || "On File"}</span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Current Wallet Balance</span>
                <span className="font-bold text-emerald-600">${Number(payout.owner?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500">Transfer ID</span>
                <span className="font-mono font-bold text-slate-700">{payout.id.substring(0, 12)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Bank Clearing Guarantee Card */}
          <Card className="bg-slate-900 text-white rounded-2xl overflow-hidden shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="h-10 w-10 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Bank-Grade Clearing Protocol</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  All property management disbursals are executed via 256-bit encrypted ACH / FedWire banking rails.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => window.open(`mailto:support@propertypro.com?subject=Inquiry regarding Payout ${payout.id}`)}
                className="w-full h-9 border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl gap-2"
              >
                <Mail className="h-3.5 w-3.5" /> Contact Finance Support
              </Button>
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}
