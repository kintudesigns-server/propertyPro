"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Wallet, Building, ArrowRight, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function WalletPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Withdrawal Form State
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const balance = (session?.user as any)?.balance || 0;

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const res = await fetch("/api/payouts");
      if (res.ok) {
        const data = await res.json();
        setPayouts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(amount) <= 0 || Number(amount) > balance) {
      toast.error("Invalid withdrawal amount. Must be within your available balance.");
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          bankName,
          accountNumber,
          accountName
        }),
      });

      if (res.ok) {
        toast.success("Withdrawal request submitted successfully!");
        setAmount("");
        setBankName("");
        setAccountNumber("");
        setAccountName("");
        fetchPayouts();
        // Force session update to reflect new balance
        await update();
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit request.");
      }
    } catch (err) {
      toast.error("Error submitting withdrawal request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-6 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Wallet & Payouts</h1>
        <p className="text-[#64748B] font-medium">Manage your earnings and request withdrawals.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Balance & Request Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] text-white border-0 shadow-lg rounded-[28px] overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-300 font-extrabold text-xs uppercase tracking-wider flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Available Balance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black tracking-tight mt-2 flex items-center">
                <DollarSign className="h-8 w-8 text-slate-400 mr-1" />
                {Number(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium">Ready for withdrawal to your bank account.</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
            <CardHeader className="bg-[#F8FAFC] border-b border-[#E2E8F0] rounded-t-2xl pb-4">
              <CardTitle className="text-lg font-bold text-[#0F172A]">Request Withdrawal</CardTitle>
              <CardDescription className="text-[#64748B]">Transfer funds to your linked bank account.</CardDescription>
            </CardHeader>
            <form onSubmit={handleWithdraw}>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">Amount ($)</Label>
                  <Input 
                    type="number"
                    required
                    step="0.01"
                    max={balance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-11 bg-[#F8FAFC] border-[#E2E8F0] rounded-xl font-bold text-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">Bank Name</Label>
                  <Input 
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Chase Bank"
                    className="h-11 bg-[#F8FAFC] border-[#E2E8F0] rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">Account Name</Label>
                  <Input 
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="John Doe"
                    className="h-11 bg-[#F8FAFC] border-[#E2E8F0] rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">Account Number</Label>
                  <Input 
                    required
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="********1234"
                    className="h-11 bg-[#F8FAFC] border-[#E2E8F0] rounded-xl font-medium"
                  />
                </div>
              </CardContent>
              <CardFooter className="p-5 pt-0">
                <Button 
                  type="submit" 
                  disabled={submitting || Number(amount) <= 0 || Number(amount) > balance}
                  className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white h-12 rounded-xl font-bold text-base shadow-sm"
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Submit Request"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Right Col: Payout History */}
        <div className="lg:col-span-2">
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl h-full flex flex-col">
            <CardHeader className="border-b border-[#E2E8F0] pb-4">
              <CardTitle className="text-lg font-bold text-[#0F172A]">Withdrawal History</CardTitle>
              <CardDescription className="text-[#64748B]">Track your recent payout requests and their status.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
                </div>
              ) : payouts.length === 0 ? (
                <div className="text-center py-16 text-[#64748B]">
                  <Wallet className="h-12 w-12 mx-auto text-slate-200 mb-3" />
                  <p className="font-bold text-slate-500">No withdrawal history found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#E2E8F0] hover:bg-transparent">
                      <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Date</TableHead>
                      <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Bank Details</TableHead>
                      <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Amount</TableHead>
                      <TableHead className="text-right text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((p) => (
                      <TableRow key={p.id} className="border-[#E2E8F0] hover:bg-[#F8FAFC]">
                        <TableCell className="font-semibold text-[#0F172A]">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <p className="font-bold text-[#0F172A]">{p.bankName}</p>
                          <p className="text-xs text-[#64748B] font-medium">Acc: ***{p.accountNumber.slice(-4)}</p>
                        </TableCell>
                        <TableCell className="font-black text-[#0F172A]">
                          ${Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.status === "COMPLETED" ? (
                            <Badge className="bg-[#DCFCE7] text-[#16A34A] border-0 rounded-lg px-2.5 py-1 font-bold shadow-sm">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1 inline" /> Completed
                            </Badge>
                          ) : p.status === "REJECTED" ? (
                            <Badge className="bg-[#FEE2E2] text-[#EF4444] border-0 rounded-lg px-2.5 py-1 font-bold shadow-sm">
                              <XCircle className="h-3.5 w-3.5 mr-1 inline" /> Rejected
                            </Badge>
                          ) : (
                            <Badge className="bg-[#FEF9C3] text-[#CA8A04] border-0 rounded-lg px-2.5 py-1 font-bold shadow-sm">
                              <Clock className="h-3.5 w-3.5 mr-1 inline" /> Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
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
