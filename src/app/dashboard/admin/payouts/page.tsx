"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, X, Wallet, Loader2, RefreshCw, Shield, DollarSign, Activity, Mail, Search, MoreVertical, Eye } from "lucide-react";
import { toast } from "sonner";

export default function AdminPayoutsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payouts");
      if (res.ok) {
        const data = await res.json();
        setPayouts(data);
      } else {
        toast.error("Failed to load payouts data.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching payouts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchPayouts();
  }, [status]);

  const handleProcessPayout = async (payoutId: string, approve: boolean) => {
    const statusText = approve ? "COMPLETED" : "REJECTED";
    try {
      const res = await fetch("/api/payouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId, status: statusText }),
      });
      if (res.ok) {
        toast.success(`Payout ${statusText.toLowerCase()} successfully`);
        fetchPayouts();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update payout");
      }
    } catch {
      toast.error("Error processing payout.");
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#EF4444]" />
        <p className="text-[#64748B] font-bold text-sm uppercase tracking-wider">Loading payouts ledger...</p>
      </div>
    );
  }

  const pendingPayouts = Array.isArray(payouts) ? payouts.filter((p) => p.status === "PENDING") : [];
  const processedPayouts = Array.isArray(payouts) ? payouts.filter((p) => p.status !== "PENDING") : [];
  const settledVolume = Array.isArray(payouts) ? payouts.filter((p) => p.status === "COMPLETED").reduce((a, c) => a + Number(c.amount), 0) : 0;

  const filteredPending = pendingPayouts.filter((po) => {
    const term = searchTerm.toLowerCase();
    return (
      po.owner?.name?.toLowerCase().includes(term) ||
      po.owner?.email?.toLowerCase().includes(term) ||
      po.bankName?.toLowerCase().includes(term)
    );
  });

  const filteredProcessed = processedPayouts.filter((po) => {
    const term = searchTerm.toLowerCase();
    return (
      po.owner?.name?.toLowerCase().includes(term) ||
      po.owner?.email?.toLowerCase().includes(term) ||
      po.bankName?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-6 pb-20 px-2 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-50 text-red-500 rounded-xl">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">Payouts</h1>
            <p className="text-[#64748B] text-base mt-0.5">Manage landlord payout request approvals and settled volumes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={fetchPayouts} className="text-[#64748B] hover:bg-[#F8FAFC]">
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-[#0F172A]">Pending Payouts</p>
              <Wallet className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-amber-600 mb-1">{pendingPayouts.length}</p>
            <p className="text-xs text-[#64748B] font-medium">Requires authorization</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-[#0F172A]">Settled Volume</p>
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600 mb-1">${settledVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-[#64748B] font-medium flex items-center gap-1">
              <Activity className="h-3 w-3 text-green-500" /> Disbursed to landlords
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-[#0F172A]">Processed History</p>
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-blue-600 mb-1">{processedPayouts.length}</p>
            <p className="text-xs text-[#64748B] font-medium">Total completed or rejected requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Filter */}
      <div className="flex justify-end">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by landlord, bank or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#EF4444] text-[#0F172A] font-semibold text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Pending Payouts Card */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
        <CardHeader className="border-b border-[#E2E8F0] pb-4">
          <CardTitle className="text-lg font-bold text-[#0F172A]">Pending Withdrawal Requests</CardTitle>
          <CardDescription className="text-[#64748B]">Review bank details and approve payouts to landlords.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPending.length === 0 ? (
            <div className="text-center py-16 text-[#64748B]">
              <Wallet className="h-12 w-12 mx-auto text-slate-200 mb-3" />
              <p className="font-bold">No pending payout requests matching filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#E2E8F0] hover:bg-transparent">
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider pl-6">Date</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Owner</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Bank Details</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Amount</TableHead>
                  <TableHead className="text-right text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPending.map((po) => (
                  <TableRow key={po.id} className="border-[#E2E8F0] hover:bg-[#F8FAFC]">
                    <TableCell className="font-semibold text-[#0F172A] pl-6">{new Date(po.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <p className="font-bold text-[#0F172A]">{po.owner?.name || "N/A"}</p>
                      <p className="text-xs text-[#64748B] flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3 text-[#94A3B8]" />
                        {po.owner?.email || ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-[#0F172A]">{po.bankName}</p>
                      <p className="text-xs text-[#64748B]">Holder: {po.accountName} | Acc: {po.accountNumber}</p>
                    </TableCell>
                    <TableCell className="font-black text-[#0F172A] text-base">${Number(po.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                     <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 flex items-center justify-center text-[#64748B] transition-colors focus:outline-none ml-auto">

                            <MoreVertical className="h-4 w-4 text-[#64748B]" />
                            <span className="sr-only">Open actions</span>

                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white border border-[#E2E8F0] shadow-md rounded-xl p-1 z-50">
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/admin/users?search=${po.owner?.email || ""}`)}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#0F172A] rounded-lg hover:bg-slate-50 cursor-pointer"
                          >
                            <Eye className="h-4 w-4 text-[#64748B]" />
                            View Owner Details
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => handleProcessPayout(po.id, true)}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-green-600 rounded-lg hover:bg-green-50 cursor-pointer"
                          >
                            <Check className="h-4 w-4" />
                            Approve Payout
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => handleProcessPayout(po.id, false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                            Reject Payout
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* History Card */}
      {filteredProcessed.length > 0 && (
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardHeader className="border-b border-[#E2E8F0] pb-4">
            <CardTitle className="text-lg font-bold text-[#0F172A]">Processed Withdrawals History</CardTitle>
            <CardDescription className="text-[#64748B]">Audit trails of settled or denied landlord withdraw queries.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-[#E2E8F0] hover:bg-transparent">
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider pl-6">Date</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Owner</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Bank</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Amount</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcessed.map((po) => (
                  <TableRow key={po.id} className="border-[#E2E8F0] hover:bg-[#F8FAFC]">
                    <TableCell className="font-semibold text-[#64748B] pl-6">{new Date(po.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="font-bold text-[#0F172A]">{po.owner?.name || "N/A"}</TableCell>
                    <TableCell className="text-[#64748B] text-sm">{po.bankName} (***{po.accountNumber?.slice(-4)})</TableCell>
                    <TableCell className="font-black text-[#0F172A]">${Number(po.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="pr-6">
                      {po.status === "COMPLETED" ? (
                        <Badge className="bg-[#DCFCE7] text-[#16A34A] border-0 rounded-lg px-2.5 py-1 font-bold">Completed</Badge>
                      ) : (
                        <Badge className="bg-[#FEE2E2] text-[#EF4444] border-0 rounded-lg px-2.5 py-1 font-bold">Rejected</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
