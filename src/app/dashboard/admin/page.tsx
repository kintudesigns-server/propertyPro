"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, Users, Loader2, DollarSign, UserPlus, Shield, RefreshCw, Settings, Activity, Server, Database as DatabaseIcon, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [profitData, setProfitData] = useState({ totalProfit: 0, totalVolumeProcessed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const fetchAdminData = async () => {
    try {
      const [payoutRes, propRes, ownerRes, profitRes] = await Promise.all([
        fetch("/api/payouts"),
        fetch("/api/properties"),
        fetch("/api/admin/owners/list"),
        fetch("/api/admin/profit")
      ]);
      setPayouts(await payoutRes.json());
      setProperties(await propRes.json());
      if (ownerRes.ok) setOwners(await ownerRes.json());
      if (profitRes.ok) setProfitData(await profitRes.json());
    } catch (err) {
      console.error(err);
      toast.error("Failed to load platform data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchAdminData();
  }, [status]);

  if (loading || status === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#EF4444]" />
        <p className="text-[#64748B] font-bold text-sm uppercase tracking-wider">Loading admin portal...</p>
      </div>
    );
  }

  const pendingPayouts = Array.isArray(payouts) ? payouts.filter((p) => p.status === "PENDING") : [];
  const pendingProperties = Array.isArray(properties) ? properties.filter((p) => p.approvalStatus === "PENDING") : [];
  const settledVolume = Array.isArray(payouts) ? payouts.filter((p) => p.status === "COMPLETED").reduce((a, c) => a + Number(c.amount), 0) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-6 pb-20 px-2 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-50 text-red-500 rounded-xl">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">Admin Overview</h1>
            <p className="text-[#64748B] text-base mt-0.5">System administration and management overview</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => fetchAdminData()} className="text-[#64748B] hover:bg-[#F8FAFC]">
            <RefreshCw className="h-5 w-5" />
          </Button>
          <Link href="/dashboard/admin/settings/pricing">
            <Button variant="outline" className="border-[#E2E8F0] text-[#0F172A] font-semibold h-11 px-5 rounded-xl flex items-center gap-2 hover:bg-slate-50">
              <Settings className="h-4 w-4 text-[#64748B]" /> Pricing Tiers
            </Button>
          </Link>
          <Link href="/dashboard/admin/owner-applications">
            <Button variant="outline" className="border-amber-200 text-amber-700 font-semibold h-11 px-5 rounded-xl flex items-center gap-2 hover:bg-amber-50 bg-amber-50">
              <UserPlus className="h-4 w-4" /> Owner Applications
            </Button>
          </Link>
          <Link href="/dashboard/admin/users/new">
            <Button className="bg-[#1E293B] hover:bg-[#0F172A] text-white font-semibold rounded-xl flex items-center gap-2 h-11 px-6 shadow-sm">
              <UserPlus className="h-4 w-4" /> Add User
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-[#0F172A]">Total Users</p>
              <Users className="h-5 w-5 text-[#94A3B8]" />
            </div>
            <p className="text-3xl font-bold text-[#0F172A] mb-1">{Array.isArray(owners) ? owners.length : 0}</p>
            <p className="text-sm text-[#64748B]">{Array.isArray(owners) ? owners.length : 0} active</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-[#0F172A]">Properties</p>
              <Building className="h-5 w-5 text-[#94A3B8]" />
            </div>
            <p className="text-3xl font-bold text-[#0F172A] mb-1">{Array.isArray(properties) ? properties.length : 0}</p>
            <p className="text-sm text-[#64748B]">{Array.isArray(properties) ? properties.filter(p => p.approvalStatus === "APPROVED").length : 0} approved</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-[#0F172A]">Platform Profit</p>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600 mb-1">
              ${(profitData?.totalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-[#64748B] flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-[#94A3B8]" /> Net commissions collected
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-[#0F172A]">System Health</p>
              <Activity className="h-5 w-5 text-[#94A3B8]" />
            </div>
            <p className="text-3xl font-bold text-[#0F172A] mb-1">91%</p>
            <p className="text-sm text-[#64748B]">Performance requires attention</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-[#0F172A]">Active Sessions</p>
              <Server className="h-5 w-5 text-[#94A3B8]" />
            </div>
            <p className="text-3xl font-bold text-[#0F172A] mb-1">3</p>
            <p className="text-sm text-[#64748B]">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-[#0F172A]">Database</p>
              <DatabaseIcon className="h-5 w-5 text-[#94A3B8]" />
            </div>
            <p className="text-3xl font-bold text-[#16A34A] mb-1">Online</p>
            <p className="text-sm text-[#64748B]">PostgreSQL connected</p>
          </CardContent>
        </Card>
      </div>

      {/* Overview Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardHeader className="border-b border-[#E2E8F0] pb-4">
            <CardTitle className="text-lg font-bold text-[#0F172A]">Recent User Activity</CardTitle>
            <CardDescription className="text-[#64748B]">Latest user registrations on the platform.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {owners.slice(0, 4).map((o, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center font-bold text-sm shrink-0">
                    {o.name?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="truncate">
                        <p className="font-bold text-[#0F172A] truncate">{o.name || "Unknown User"}</p>
                        <p className="text-xs text-[#64748B] truncate">{o.email}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200 shrink-0 font-bold uppercase tracking-wider">{o.role}</Badge>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-1">{o.ownedProperties?.length || 0} properties linked • Joined {new Date(o.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {(!owners || owners.length === 0) && (
                <p className="text-sm text-[#64748B] italic">No recent activity.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardHeader className="border-b border-[#E2E8F0] pb-4">
            <CardTitle className="text-lg font-bold text-[#0F172A]">System Alerts</CardTitle>
            <CardDescription className="text-[#64748B]">Active operational system notifications.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Email status is DEGRADED</p>
                  <p className="text-xs text-[#64748B] mt-0.5">{new Date().toLocaleDateString()} • System Health</p>
                </div>
              </div>
              {pendingPayouts.length > 0 && (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{pendingPayouts.length} payout request(s) pending approval</p>
                    <p className="text-xs text-[#64748B] mt-0.5">Requires admin action • Finance</p>
                  </div>
                </div>
              )}
              {pendingProperties.length > 0 && (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{pendingProperties.length} propert(ies) pending approval</p>
                    <p className="text-xs text-[#64748B] mt-0.5">Requires admin action • Listings</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
