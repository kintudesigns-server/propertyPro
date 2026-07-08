"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ShieldAlert, Layers, Search, DollarSign, MoreHorizontal, RefreshCw, Mail, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function AdminSubscriptionsClient({ owners, mrr }: { owners: any[], mrr: number }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSyncStripe = async (userId: string) => {
    try {
      setSyncingId(userId);
      const res = await fetch("/api/admin/subscriptions/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert(`Sync complete. Status is now: ${data.status}`);
      window.location.reload(); // Refresh data to show changes
    } catch (err: any) {
      alert(`Failed to sync: ${err.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  const filteredOwners = owners.filter(o => {
    if (search && !o.name?.toLowerCase().includes(search.toLowerCase()) && !o.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "ALL" && (o.subscriptionStatus || "N/A") !== statusFilter) return false;
    if (tierFilter !== "ALL" && (o.pricingTier?.name || "No Active Plan") !== tierFilter) return false;
    return true;
  });

  const totalOwners = owners.length;
  const ownersWithPlans = owners.filter(o => o.pricingTier).length;

  // Extract unique tier names for the filter dropdown
  const uniqueTiers = Array.from(new Set(owners.map(o => o.pricingTier?.name || "No Active Plan")));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#64748B]">Total Owners</p>
                <p className="text-2xl font-black text-[#0F172A]">{totalOwners}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#64748B]">Active Subscriptions</p>
                <p className="text-2xl font-black text-[#0F172A]">{ownersWithPlans}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#64748B]">No Active Plan</p>
                <p className="text-2xl font-black text-[#0F172A]">{totalOwners - ownersWithPlans}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#64748B]">Total MRR</p>
                <p className="text-2xl font-black text-[#0F172A]">${mrr.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 border border-[#E2E8F0] rounded-2xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
          <Input 
            placeholder="Search owners by name or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#F8FAFC] border-transparent focus:bg-white focus:border-blue-500 rounded-xl h-10 w-full"
          />
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "ALL")}>
            <SelectTrigger className="w-full sm:w-[150px] bg-[#F8FAFC] border-transparent rounded-xl h-10 font-medium">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="bg-white rounded-xl">
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Past_Due">Past Due</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={(v) => setTierFilter(v || "ALL")}>
            <SelectTrigger className="w-full sm:w-[150px] bg-[#F8FAFC] border-transparent rounded-xl h-10 font-medium">
              <SelectValue placeholder="All Tiers" />
            </SelectTrigger>
            <SelectContent className="bg-white rounded-xl">
              <SelectItem value="ALL">All Tiers</SelectItem>
              {uniqueTiers.map(tier => (
                <SelectItem key={tier} value={tier}>{tier}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <Table>
            <TableHeader className="bg-[#F8FAFC]">
              <TableRow className="border-[#E2E8F0] hover:bg-transparent">
                <TableHead className="w-12 text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">#</TableHead>
                <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Owner Name</TableHead>
                <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Email Address</TableHead>
                <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Subscription Tier</TableHead>
                <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Usage / Limit</TableHead>
                <TableHead className="text-right text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Properties</TableHead>
                <TableHead className="text-right text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOwners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-[#64748B] font-medium">
                    No owners found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOwners.map((owner, idx) => {
                  const totalUnits = owner.ownedProperties.reduce((acc: any, p: any) => acc + p.units.length, 0);
                  const isOverLimit = owner.pricingTier && totalUnits >= owner.pricingTier.maxUnits;

                  return (
                  <TableRow key={owner.id} className="border-[#E2E8F0] hover:bg-blue-50/50 transition-colors">
                    <TableCell className="text-[#64748B] text-sm font-bold">{idx + 1}</TableCell>
                    <TableCell className="font-bold text-[#0F172A]">{owner.name || "Unknown"}</TableCell>
                    <TableCell className="text-sm text-[#64748B]">{owner.email}</TableCell>
                    <TableCell>
                      {owner.pricingTier ? (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 rounded-lg px-2.5 py-1 font-bold text-xs">
                          {owner.pricingTier.name}
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500 border-0 rounded-lg px-2.5 py-1 font-bold text-xs">
                          No Active Plan
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`border-0 rounded-lg px-2.5 py-1 font-bold text-xs ${
                        owner.subscriptionStatus === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                        owner.subscriptionStatus === 'Past_Due' ? 'bg-amber-100 text-amber-700' :
                        owner.subscriptionStatus === 'Inactive' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {owner.subscriptionStatus || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {owner.pricingTier ? (
                        <span className={`font-bold ${isOverLimit ? 'text-red-500' : 'text-[#0F172A]'}`}>
                          {totalUnits} / {owner.pricingTier.maxUnits} <span className="text-[#64748B] font-medium text-xs">Units</span>
                        </span>
                      ) : (
                        <span className="text-[#64748B]">{totalUnits} Units</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-black text-[#0F172A] bg-slate-100 px-3 py-1 rounded-md">{owner.ownedProperties.length}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg inline-flex items-center justify-center">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-white rounded-xl shadow-lg border-[#E2E8F0]">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="font-bold text-[#64748B] text-xs uppercase tracking-wider py-2">Quick Actions</DropdownMenuLabel>
                            
                            <DropdownMenuItem 
                              className="flex items-center gap-2 cursor-pointer font-medium text-sm text-[#0F172A] focus:bg-[#F8FAFC]" 
                              disabled={syncingId === owner.id || !owner.stripeSubscriptionId}
                              onClick={() => handleSyncStripe(owner.id)}
                            >
                              <RefreshCw className={`h-4 w-4 text-blue-500 ${syncingId === owner.id ? 'animate-spin' : ''}`} /> 
                              {syncingId === owner.id ? "Syncing..." : "Force Sync with Stripe"}
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem 
                              className="flex items-center gap-2 cursor-pointer font-medium text-sm text-[#0F172A] focus:bg-[#F8FAFC]" 
                              disabled={!owner.stripeCustomerId}
                              onClick={() => window.open(`https://dashboard.stripe.com/customers/${owner.stripeCustomerId || ''}`, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4 text-emerald-500" /> View in Stripe
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator className="bg-[#E2E8F0]" />
                          <DropdownMenuGroup>
                            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer font-medium text-sm text-[#0F172A] focus:bg-[#F8FAFC]" onClick={() => window.location.href = `mailto:${owner.email}`}>
                              <Mail className="h-4 w-4 text-slate-500" /> Email Owner
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
