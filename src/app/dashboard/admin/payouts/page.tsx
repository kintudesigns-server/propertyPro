"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield, Wallet, DollarSign, Activity, Search, RefreshCw, MoreVertical, Check, X, Mail, Eye, Loader2, FileText, ArrowUpRight, FileDown } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function AdminPayoutsPage() {
  const router = useRouter();
  const { status } = useSession();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [refNumber, setRefNumber] = useState("");
  const [adjustedAmount, setAdjustedAmount] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  const fetchPayouts = async () => {
    try {
      const res = await fetch("/api/payouts");
      if (res.ok) {
        const data = await res.json();
        setPayouts(data);
      } else {
        toast.error("Failed to load payouts");
      }
    } catch {
      toast.error("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchPayouts();
  }, [status]);

  const handleProcessPayout = async (payoutId: string, approve: boolean) => {
    if (approve) {
      // Find the payout request and open approval proof modal
      const po = payouts.find((p) => p.id === payoutId);
      if (po) {
        setSelectedPayout(po);
        setRefNumber("");
        setProofUrl("");
        setAdjustedAmount(po.amount?.toString() || "");
        setShowApproveModal(true);
      }
      return;
    }

    // Handle rejection directly
    if (!confirm("Are you sure you want to REJECT this payout request? Funds will be returned to the ledger.")) return;
    
    try {
      const res = await fetch("/api/payouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId, status: "REJECTED" }),
      });
      if (res.ok) {
        toast.success("Payout rejected successfully");
        fetchPayouts();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to reject payout");
      }
    } catch {
      toast.error("Error processing payout.");
    }
  };

  const handleConfirmApproval = async () => {
    if (!refNumber) {
      toast.error("Please enter a transaction reference or check number.");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch("/api/payouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutId: selectedPayout.id,
          status: "COMPLETED",
          proofUrl,
          refNumber,
          amount: adjustedAmount ? Number(adjustedAmount) : undefined
        }),
      });
      if (res.ok) {
        toast.success("Payout authorized and completed successfully!");
        setShowApproveModal(false);
        fetchPayouts();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to authorize payout");
      }
    } catch (err) {
      toast.error("Error processing payout.");
    } finally {
      setProcessing(false);
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
    const recipientName = po.tenant?.name || po.owner?.name || "";
    const recipientEmail = po.tenant?.email || po.owner?.email || "";
    return (
      recipientName.toLowerCase().includes(term) ||
      recipientEmail.toLowerCase().includes(term) ||
      po.bankName?.toLowerCase().includes(term)
    );
  });

  const filteredProcessed = processedPayouts.filter((po) => {
    const term = searchTerm.toLowerCase();
    const recipientName = po.tenant?.name || po.owner?.name || "";
    const recipientEmail = po.tenant?.email || po.owner?.email || "";
    return (
      recipientName.toLowerCase().includes(term) ||
      recipientEmail.toLowerCase().includes(term) ||
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
            <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">Payouts Control Ledger</h1>
            <p className="text-[#64748B] text-base mt-0.5">Manage landlord withdrawals and tenant security deposit refunds</p>
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
              <p className="text-sm font-semibold text-[#0F172A]">Pending Authorization</p>
              <Wallet className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-amber-600 mb-1">{pendingPayouts.length}</p>
            <p className="text-xs text-[#64748B] font-medium">Requires verification</p>
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
              <Activity className="h-3 w-3 text-green-500" /> Disbursed to platform users
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
            placeholder="Search by recipient name, email or bank..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#EF4444] text-[#0F172A] font-semibold text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Pending Payouts Card */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
        <CardHeader className="border-b border-[#E2E8F0] pb-4">
          <CardTitle className="text-lg font-bold text-[#0F172A]">Pending Payout Queries</CardTitle>
          <CardDescription className="text-[#64748B]">Review recipient credentials and process disbursements.</CardDescription>
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
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Recipient</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Payout Details</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Amount</TableHead>
                  <TableHead className="text-right text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPending.map((po) => {
                  const isTenantRefund = !!po.tenantId;
                  const recipient = isTenantRefund ? po.tenant : po.owner;

                  return (
                    <TableRow key={po.id} className="border-[#E2E8F0] hover:bg-[#F8FAFC]">
                      <TableCell className="font-semibold text-[#0F172A] pl-6">{new Date(po.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={isTenantRefund 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold" 
                          : "bg-blue-50 text-blue-700 border border-blue-200 font-bold"
                        }>
                          {isTenantRefund ? "Tenant Refund" : "Owner Withdrawal"}
                        </Badge>
                        {isTenantRefund && po.lease?.moveOutStatus === "ADMIN_MEDIATION" && (
                          <Badge className="bg-red-50 text-red-700 border border-red-200 font-bold ml-2">
                            Mediation Required
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-[#0F172A]">{recipient?.name || "N/A"}</p>
                        <p className="text-xs text-[#64748B] flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 text-[#94A3B8]" />
                          {recipient?.email || ""}
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
                            {isTenantRefund && po.leaseId ? (
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/leases/${po.leaseId}`)}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#0F172A] rounded-lg hover:bg-slate-50 cursor-pointer"
                              >
                                <Eye className="h-4 w-4 text-[#64748B]" />
                                View Lease Details
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/admin/users?search=${recipient?.email || ""}`)}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#0F172A] rounded-lg hover:bg-slate-50 cursor-pointer"
                              >
                                <Eye className="h-4 w-4 text-[#64748B]" />
                                View Recipient Details
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem
                              onClick={() => handleProcessPayout(po.id, true)}
                              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-green-600 rounded-lg hover:bg-green-50 cursor-pointer"
                            >
                              <Check className="h-4 w-4" />
                              Authorize Disbursement
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem
                              onClick={() => handleProcessPayout(po.id, false)}
                              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                              Reject Request
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* History Card */}
      {filteredProcessed.length > 0 && (
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardHeader className="border-b border-[#E2E8F0] pb-4">
            <CardTitle className="text-lg font-bold text-[#0F172A]">Processed Withdrawal Registry</CardTitle>
            <CardDescription className="text-[#64748B]">Audit trail of settled or denied ledger disbursements.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-[#E2E8F0] hover:bg-transparent">
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider pl-6">Date</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Recipient</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Payout Details</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Amount</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider pr-6">Status / Proof</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcessed.map((po) => {
                  const isTenantRefund = !!po.tenantId;
                  const recipient = isTenantRefund ? po.tenant : po.owner;

                  return (
                    <TableRow key={po.id} className="border-[#E2E8F0] hover:bg-[#F8FAFC]">
                      <TableCell className="font-semibold text-[#64748B] pl-6">{new Date(po.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={isTenantRefund 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold" 
                          : "bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold"
                        }>
                          {isTenantRefund ? "Tenant Refund" : "Owner Withdrawal"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-[#0F172A]">{recipient?.name || "N/A"}</TableCell>
                      <TableCell className="text-[#64748B] text-sm">
                        <p className="font-bold text-[#0F172A]">{po.bankName}</p>
                        <p className="text-xs">Acc: ***{po.accountNumber?.slice(-4) || "N/A"}</p>
                      </TableCell>
                      <TableCell className="font-black text-[#0F172A]">${Number(po.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="pr-6 flex items-center gap-3 py-4">
                        {po.status === "COMPLETED" ? (
                          <Badge className="bg-[#DCFCE7] text-[#16A34A] border-0 rounded-lg px-2.5 py-1 font-bold">Completed</Badge>
                        ) : (
                          <Badge className="bg-[#FEE2E2] text-[#EF4444] border-0 rounded-lg px-2.5 py-1 font-bold">Rejected</Badge>
                        )}
                        {po.proofUrl && (
                          <a
                            href={po.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                          >
                            <FileText className="h-3.5 w-3.5" /> Proof
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Authorize Disbursement / Proof Modal */}
      {showApproveModal && selectedPayout && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full border border-[#E2E8F0] shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h2 className="text-xl font-extrabold text-[#0F172A] flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500 bg-green-50 rounded-full p-0.5" /> Authorize Disbursement
              </h2>
              <p className="text-sm text-[#64748B] mt-1">Record payment validation details to complete this payout.</p>
            </div>

            <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0] space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#64748B] font-semibold">Recipient:</span>
                <span className="font-bold text-[#0F172A]">{selectedPayout.tenant?.name || selectedPayout.owner?.name || "N/A"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#64748B] font-semibold">Type:</span>
                <span className="font-bold text-slate-800">{selectedPayout.tenantId ? "Tenant Refund" : "Owner Withdrawal"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#64748B] font-semibold">Payment Method:</span>
                <span className="font-bold text-slate-800">{selectedPayout.bankName}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                <span className="text-[#64748B] font-bold">Total Disbursing:</span>
                <span className="text-lg font-black text-green-600">${Number(selectedPayout.amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-4">
              {selectedPayout.lease?.moveOutStatus === "ADMIN_MEDIATION" && (
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 mt-4 space-y-4">
                  <h3 className="font-bold text-red-800 text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4"/> Admin Mediation Mode
                  </h3>
                  <div className="space-y-1">
                    <p className="text-xs text-red-700"><strong>Tenant Dispute Note:</strong> {selectedPayout.lease.tenantDisputeNote}</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-red-800 uppercase tracking-wider">Adjust Final Payout Amount ($) <span className="text-red-500">*</span></label>
                    <Input
                      type="number"
                      value={adjustedAmount}
                      onChange={(e) => setAdjustedAmount(e.target.value)}
                      className="rounded-xl border-red-200 text-slate-900 font-bold bg-white"
                    />
                    <p className="text-[10px] text-red-600 font-medium">As Admin, your adjusted amount is final and binding.</p>
                  </div>
                </div>
              )}

              {selectedPayout.lease?.deductions && (selectedPayout.lease.deductions as any[]).length > 0 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 space-y-2">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4"/> Inspection Deductions
                  </h3>
                  <div className="space-y-1 text-xs">
                    {(selectedPayout.lease.deductions as any[]).map((d: any, idx: number) => (
                      <div key={idx} className="flex justify-between border-b border-slate-200 pb-1">
                        <span className="text-slate-600">{d.description}</span>
                        <span className="text-red-500 font-bold">-${Number(d.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-4">
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wider">Transaction Reference / Check # <span className="text-red-500">*</span></label>
                <Input
                  placeholder="e.g. TXN-1099238 or Check 40992"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  className="rounded-xl border-[#E2E8F0] text-slate-900 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wider">Proof of Payment URL (Optional)</label>
                <Input
                  placeholder="e.g. Bank receipt URL or image link"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="rounded-xl border-[#E2E8F0] text-slate-900 font-bold"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowApproveModal(false)}
                className="flex-1 rounded-xl font-bold text-slate-700 h-11 border-slate-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmApproval}
                disabled={processing}
                className="flex-1 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white h-11 shadow-md shadow-green-200"
              >
                {processing ? "Authorizing..." : "Confirm & Send"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
