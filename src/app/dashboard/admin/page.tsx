"use client";

import React, { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Shield, Wallet, Check, X, FileText, Building, Users, LogOut, Loader2, DollarSign, Search, Bell, User, ChevronDown, ChevronRight, Settings } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [payouts, setPayouts] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Accordion Sidebar states
  const [payoutsOpen, setPayoutsOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(true);

  // Tab State connected to Sidebar
  const [activeTabState, setActiveTabState] = useState("payouts");

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        setActiveTabState(hash);
      }
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const activeTab = activeTabState;
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    window.history.pushState(null, "", `#${tab}`);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  const fetchAdminData = async () => {
    try {
      const [payoutRes, propRes] = await Promise.all([
        fetch("/api/payouts"),
        fetch("/api/properties"),
      ]);

      const payoutData = await payoutRes.json();
      const propData = await propRes.json();

      setPayouts(payoutData);
      setProperties(propData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load platform data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchAdminData();
    }
  }, [status]);

  const handleProcessPayout = async (payoutId: string, approve: boolean) => {
    const statusText = approve ? "COMPLETED" : "REJECTED";
    toast.info(`Processing payout request...`);
    try {
      const res = await fetch("/api/payouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId, status: statusText }),
      });

      if (res.ok) {
        toast.success(`Payout successfully marked as ${statusText.toLowerCase()}`);
        fetchAdminData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update payout request");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error processing payout request.");
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center text-[#111111] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-slate-400 font-extrabold text-sm tracking-wider uppercase">Loading admin control panel...</p>
      </div>
    );
  }

  const pendingPayouts = payouts.filter((p) => p.status === "PENDING");
  const processedPayouts = payouts.filter((p) => p.status !== "PENDING");

  const isPayoutsActive = ["payouts"].includes(activeTab);
  const isPropertiesActive = ["properties"].includes(activeTab);

  return (
    <div className="min-h-screen bg-slate-50/50 text-[#111111] font-sans flex relative">
      {/* 260px Collapsible Left Sidebar - Accordion Style */}
      <aside className="hidden md:flex w-64 bg-white border border-slate-100 rounded-3xl my-6 ml-6 py-6 px-4 flex-col justify-between shadow-sm z-30">
        <div className="flex flex-col gap-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2">
            <div className="bg-primary text-white p-2.5 rounded-2xl flex items-center justify-center shadow-md shadow-primary/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight block">PropertyPro</span>
              <span className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase">Admin Portal</span>
            </div>
          </div>

          {/* Navigation Accordion Menus */}
          <nav className="flex flex-col gap-4 mt-4">
            <span className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Controls</span>

            {/* Payouts Group */}
            <div className="flex flex-col">
              <button
                onClick={() => setPayoutsOpen(!payoutsOpen)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  isPayoutsActive ? "text-primary" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isPayoutsActive ? "bg-primary/10 text-primary" : "bg-slate-50 text-slate-500"}`}>
                    <Wallet className="h-3.5 w-3.5" />
                  </div>
                  <span>Payouts</span>
                </div>
                {payoutsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              {payoutsOpen && (
                <div className="tree-container flex flex-col gap-1 mt-1 ml-4.5">
                  <button
                    onClick={() => setActiveTab("payouts")}
                    className={`tree-item flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                      activeTab === "payouts" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    Requests ({pendingPayouts.length})
                  </button>
                </div>
              )}
            </div>

            {/* Properties Group */}
            <div className="flex flex-col">
              <button
                onClick={() => setPropertiesOpen(!propertiesOpen)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  isPropertiesActive ? "text-primary" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isPropertiesActive ? "bg-primary/10 text-primary" : "bg-slate-50 text-slate-500"}`}>
                    <Building className="h-3.5 w-3.5" />
                  </div>
                  <span>Properties</span>
                </div>
                {propertiesOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              {propertiesOpen && (
                <div className="tree-container flex flex-col gap-1 mt-1 ml-4.5">
                  <button
                    onClick={() => setActiveTab("properties")}
                    className={`tree-item flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                      activeTab === "properties" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    All Properties ({properties.length})
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* User profile card at bottom */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold text-sm uppercase">
              {session?.user?.name ? session.user.name.charAt(0) : "A"}
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xs text-slate-800 truncate max-w-[110px]">{session?.user?.name || "Admin"}</span>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Super Admin</span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            title="Sign Out"
            className="p-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto max-w-[1600px] mx-auto w-full">
        {/* Top Navbar */}
        <header className="flex items-center justify-between gap-4 mb-8 bg-white border border-slate-100 rounded-2xl px-6 py-3.5 shadow-sm">
          <div className="flex items-center gap-4">
            <button className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              <Shield className="h-4 w-4 text-primary" />
            </button>
            <div className="relative w-64 md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search..."
                className="pl-10 pr-12 py-2 w-full bg-slate-50 border-0 rounded-full text-xs text-slate-800 placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-primary/20 h-9"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 font-mono text-[9px] font-medium text-slate-400">
                <span className="text-[10px]">⌘</span>K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[7px] font-bold text-white">8</span>
            </button>
            <button className="p-2 rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors">
              <Settings className="h-4.5 w-4.5" />
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xs uppercase border border-primary/20 shadow-sm">
                {session?.user?.name ? session.user.name.charAt(0) : "A"}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-extrabold text-slate-800 leading-tight">{session?.user?.name || "Admin"}</span>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider leading-none">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border-0 rounded-[28px] shadow-sm p-6 flex flex-col justify-between min-h-[120px]">
            <CardHeader className="p-0">
              <CardDescription className="text-[#7F817F] text-xs font-bold uppercase tracking-wider">Total Listed Properties</CardDescription>
              <CardTitle className="text-3xl font-black mt-2 text-[#111111] flex items-center gap-2">
                <Building className="h-7 w-7 text-[#496E5C]" />
                {properties.length}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="bg-white border-0 rounded-[28px] shadow-sm p-6 flex flex-col justify-between min-h-[120px]">
            <CardHeader className="p-0">
              <CardDescription className="text-[#7F817F] text-xs font-bold uppercase tracking-wider">Pending Withdrawal Requests</CardDescription>
              <CardTitle className="text-3xl font-black mt-2 text-[#496E5C] flex items-center gap-2">
                <Wallet className="h-7 w-7 text-[#496E5C]" />
                {pendingPayouts.length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-[#496E5C] text-white border-0 rounded-[28px] shadow-sm p-6 flex flex-col justify-between min-h-[120px]">
            <CardHeader className="p-0">
              <CardDescription className="text-[#ECECE9] text-xs font-bold uppercase tracking-wider">Total Settled Volume</CardDescription>
              <CardTitle className="text-3xl font-black mt-2 flex items-center gap-2">
                <DollarSign className="h-7 w-7 text-[#ECECE9]" />
                ${payouts
                  .filter((p) => p.status === "COMPLETED")
                  .reduce((acc, curr) => acc + Number(curr.amount), 0)
                  .toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Manage Payouts Tab */}
          <TabsContent value="payouts" className="space-y-6 outline-none">
            {/* Pending Requests */}
            <Card className="bg-white border-0 rounded-[28px] shadow-sm p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-extrabold text-[#111111]">Pending Withdrawal Requests</CardTitle>
                <CardDescription className="text-[#7F817F] text-xs">Review bank details and approve payouts to landlords.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {pendingPayouts.length === 0 ? (
                  <div className="text-center py-8 text-[#7F817F]">No pending payout requests.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="border-[#E2E3E0]/60">
                        <TableRow className="hover:bg-transparent border-[#E2E3E0]/60">
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Request Date</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Owner</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Bank Details</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Amount</TableHead>
                          <TableHead className="text-right text-[#7F817F] font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingPayouts.map((po) => (
                          <TableRow key={po.id} className="border-[#E2E3E0]/40 hover:bg-[#F5F5F3]/30">
                            <TableCell className="font-semibold text-[#111111]">
                              {new Date(po.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-[#111111] py-4">
                              <strong className="block font-extrabold">{po.owner.name}</strong>
                              <span className="text-xs text-[#7F817F] font-semibold">{po.owner.email}</span>
                            </TableCell>
                            <TableCell className="text-[#7F817F] text-xs font-semibold">
                              <strong className="block text-[#111111]">{po.bankName}</strong>
                              <span>Holder: {po.accountName} | Acc: {po.accountNumber}</span>
                            </TableCell>
                            <TableCell className="font-extrabold text-[#496E5C] text-base">
                              ${Number(po.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleProcessPayout(po.id, true)}
                                  className="bg-[#496E5C] hover:bg-[#3E5C4E] text-white font-bold rounded-full px-4 flex items-center gap-1"
                                >
                                  <Check className="h-4 w-4" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleProcessPayout(po.id, false)}
                                  className="border-[#E05A47]/30 text-[#E05A47] hover:bg-[#E05A47]/10 font-bold rounded-full px-4 flex items-center gap-1"
                                >
                                  <X className="h-4 w-4" /> Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Processed Payouts History */}
            <Card className="bg-white border-0 rounded-[28px] shadow-sm p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-extrabold text-[#111111]">Processed Withdrawals History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {processedPayouts.length === 0 ? (
                  <div className="text-center py-8 text-[#7F817F]">No history available.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="border-[#E2E3E0]/60">
                        <TableRow className="hover:bg-transparent border-[#E2E3E0]/60">
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Request Date</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Owner</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Bank Details</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Amount</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {processedPayouts.map((po) => (
                          <TableRow key={po.id} className="border-[#E2E3E0]/40 hover:bg-[#F5F5F3]/30">
                            <TableCell className="font-semibold text-[#7F817F]">
                              {new Date(po.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-[#111111] font-bold">
                              <strong>{po.owner.name}</strong>
                            </TableCell>
                            <TableCell className="text-[#7F817F] text-xs font-semibold">
                              {po.bankName} (***{po.accountNumber.slice(-4)})
                            </TableCell>
                            <TableCell className="text-[#111111] font-extrabold">
                              ${Number(po.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              {po.status === "COMPLETED" ? (
                                <Badge className="bg-green-500/10 text-green-500 border border-green-500/20 rounded-full font-bold px-3 py-1">COMPLETED</Badge>
                              ) : (
                                <Badge className="bg-[#E05A47]/10 text-[#E05A47] border border-[#E05A47]/20 rounded-full font-bold px-3 py-1">REJECTED</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Properties Tab */}
          <TabsContent value="properties" className="outline-none">
            <Card className="bg-white border-0 rounded-[28px] shadow-sm p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-extrabold text-[#111111]">Global Listed Properties</CardTitle>
                <CardDescription className="text-[#7F817F] text-xs">Properties listed across all owners in the system.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {properties.length === 0 ? (
                  <div className="text-center py-8 text-[#7F817F]">No properties listed.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="border-[#E2E3E0]/60">
                        <TableRow className="hover:bg-transparent border-[#E2E3E0]/60">
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Name</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Location</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Landlord Owner</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Units Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {properties.map((p) => (
                          <TableRow key={p.id} className="border-[#E2E3E0]/40 hover:bg-[#F5F5F3]/30">
                            <TableCell className="font-extrabold text-[#111111] py-4">{p.name}</TableCell>
                            <TableCell className="text-[#7F817F] font-semibold">{p.city}, {p.country}</TableCell>
                            <TableCell className="text-[#111111] font-semibold">
                              <strong className="block font-bold">{p.owner.name}</strong>
                              <p className="text-xs text-[#7F817F] font-normal">{p.owner.email}</p>
                            </TableCell>
                            <TableCell className="text-[#496E5C] font-extrabold">{p.units?.length || 0} Units</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
