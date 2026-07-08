"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, DollarSign, Activity, ChevronLeft, ShieldCheck, PieChart, TrendingUp, Download } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminProfitDashboard() {
  const { status } = useSession();
  const router = useRouter();
  const [profitData, setProfitData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"commissions" | "subscriptions">("commissions");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const fetchProfitData = async () => {
    try {
      const res = await fetch("/api/admin/profit");
      if (res.ok) {
        setProfitData(await res.json());
      } else {
        toast.error("Failed to load profit data.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred fetching profit data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchProfitData();
  }, [status]);

  if (loading || status === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#16A34A]" />
        <p className="text-[#64748B] font-bold text-sm uppercase tracking-wider">Compiling Profit Reports...</p>
      </div>
    );
  }

  const detailedProfits = profitData?.detailedProfits || [];
  const detailedSubscriptions = profitData?.detailedSubscriptions || [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-6 pb-20 px-2 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin">
            <Button variant="ghost" size="icon" className="text-[#64748B] hover:bg-slate-200">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
            <TrendingUp className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">Platform Profit</h1>
            <p className="text-[#64748B] text-base mt-0.5">Detailed breakdown of commission revenues</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-[#E2E8F0] text-[#0F172A] font-semibold h-11 px-5 rounded-xl flex items-center gap-2 hover:bg-slate-50">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Link href="/dashboard/admin/settings/pricing">
            <Button className="bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold rounded-xl flex items-center gap-2 h-11 px-6 shadow-sm">
              <PieChart className="h-4 w-4" /> Adjust Commission Rate
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="bg-gradient-to-br from-green-500 to-green-700 border-none shadow-lg rounded-2xl text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-bold text-green-100 uppercase tracking-widest">Total Net Profit</p>
              <ShieldCheck className="h-6 w-6 text-green-200" />
            </div>
            <p className="text-4xl font-black mb-1">
              ${(profitData?.totalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-green-100 opacity-90 flex items-center gap-1">
              <Activity className="h-3 w-3" /> Combined MRR & Commission
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-bold text-[#64748B] uppercase tracking-widest">Subscription MRR</p>
              <PieChart className="h-6 w-6 text-[#94A3B8]" />
            </div>
            <p className="text-4xl font-black text-[#0F172A] mb-1">
              ${(profitData?.subscriptionMRR || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-[#64748B] flex items-center gap-1">
              <Activity className="h-3 w-3" /> Monthly Owner Subscriptions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-bold text-[#64748B] uppercase tracking-widest">Rent Commissions</p>
              <DollarSign className="h-6 w-6 text-[#94A3B8]" />
            </div>
            <p className="text-4xl font-black text-[#0F172A] mb-1">
              ${(profitData?.totalCommissionProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-[#64748B] flex items-center gap-1">
              <Activity className="h-3 w-3" /> Percentage cuts on volume
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Tabs & Tables */}
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-[#F1F5F9] rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("commissions")}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === "commissions"
                ? "bg-white text-[#0F172A] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Rent Commissions
          </button>
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === "subscriptions"
                ? "bg-white text-[#0F172A] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Active Subscriptions
          </button>
        </div>

        {/* Tables */}
        {activeTab === "commissions" ? (
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-5">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-[#0F172A]">Detailed Commission Ledger</CardTitle>
                  <CardDescription className="text-[#64748B] text-sm mt-1">Line-by-line breakdown of where your percentage profit comes from.</CardDescription>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1 font-bold text-xs uppercase tracking-wider">
                  {detailedProfits.length} Transactions
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#F1F5F9]">
                    <TableRow className="hover:bg-transparent border-b border-[#E2E8F0]">
                      <TableHead className="font-bold text-[#475569] h-12">Date</TableHead>
                      <TableHead className="font-bold text-[#475569] h-12">Property & Unit</TableHead>
                      <TableHead className="font-bold text-[#475569] h-12">Landlord</TableHead>
                      <TableHead className="font-bold text-[#475569] h-12">Gross Rent Billed</TableHead>
                      <TableHead className="font-bold text-[#475569] h-12 text-right">Commission (%)</TableHead>
                      <TableHead className="font-extrabold text-green-700 h-12 text-right">Platform Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedProfits.map((item: any) => (
                      <TableRow key={item.id} className="hover:bg-[#F8FAFC] border-b border-[#E2E8F0] transition-colors">
                        <TableCell className="font-medium text-[#64748B] py-4">
                          {new Date(item.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="py-4">
                          <p className="font-bold text-[#0F172A]">{item.property}</p>
                          <p className="text-xs font-semibold text-[#64748B] mt-0.5">Unit {item.unit}</p>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[#475569] font-bold text-xs">
                              {item.owner.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-[#334155]">{item.owner}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 font-black text-[#0F172A]">
                          ${item.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 font-bold">
                            {item.percentageCut}%
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <p className="font-black text-green-600 text-lg">
                            +${item.platformFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] font-bold text-[#94A3B8] uppercase mt-0.5 tracking-wider">
                            Retained Cut
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {detailedProfits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <div className="flex flex-col items-center justify-center text-[#64748B]">
                            <ShieldCheck className="h-8 w-8 mb-2 opacity-50" />
                            <p className="font-semibold">No profit recorded yet.</p>
                            <p className="text-sm">When tenants pay rent, your commission cut will appear here.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-5">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-[#0F172A]">Active Subscription Roster</CardTitle>
                  <CardDescription className="text-[#64748B] text-sm mt-1">Directory of landlords currently paying a monthly flat fee.</CardDescription>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 font-bold text-xs uppercase tracking-wider">
                  {detailedSubscriptions.length} Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#F1F5F9]">
                    <TableRow className="hover:bg-transparent border-b border-[#E2E8F0]">
                      <TableHead className="font-bold text-[#475569] h-12">Landlord</TableHead>
                      <TableHead className="font-bold text-[#475569] h-12">Joined</TableHead>
                      <TableHead className="font-bold text-[#475569] h-12">Pricing Tier</TableHead>
                      <TableHead className="font-bold text-[#475569] h-12">Status</TableHead>
                      <TableHead className="font-extrabold text-blue-700 h-12 text-right">Monthly Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedSubscriptions.map((item: any) => (
                      <TableRow key={item.id} className="hover:bg-[#F8FAFC] border-b border-[#E2E8F0] transition-colors">
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[#475569] font-bold text-xs">
                              {item.owner.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-[#334155]">{item.owner}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-[#64748B] py-4">
                          {new Date(item.joinedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="secondary" className="font-bold text-slate-700 bg-slate-100">
                            {item.tier}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 font-bold">
                            {item.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <p className="font-black text-blue-600 text-lg">
                            +${item.monthlyPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] font-bold text-[#94A3B8] uppercase mt-0.5 tracking-wider">
                            Per Month
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {detailedSubscriptions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center">
                          <div className="flex flex-col items-center justify-center text-[#64748B]">
                            <PieChart className="h-8 w-8 mb-2 opacity-50" />
                            <p className="font-semibold">No active subscriptions.</p>
                            <p className="text-sm">Landlords on paid tiers will appear here.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
