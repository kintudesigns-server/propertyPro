"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Calendar, Clock, RotateCw, AlertTriangle, LayoutGrid, List, FileDown, Eye, MoreVertical, Building } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateLeasePDF } from "@/lib/pdfGenerator";

export default function ExpiringLeasesDashboard() {
  const router = useRouter();
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeframeFilter, setTimeframeFilter] = useState("30");
  const [sortOrder, setSortOrder] = useState("DATE_ASC");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leases");
      if (res.ok) {
        const data = await res.json();
        // Only keep active leases with an end date
        const activeLeases = data.filter((l: any) => l.status === "ACTIVE" && l.endDate);
        setLeases(activeLeases);
      } else {
        toast.error("Failed to load leases");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getDaysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // KPIs
  const next30 = leases.filter(l => { const d = getDaysLeft(l.endDate); return d > 0 && d <= 30; }).length;
  const next60 = leases.filter(l => { const d = getDaysLeft(l.endDate); return d > 30 && d <= 60; }).length;
  const next90 = leases.filter(l => { const d = getDaysLeft(l.endDate); return d > 60 && d <= 90; }).length;
  const renewalReady = next30 + next60;

  const filteredLeases = leases.filter(l => {
    const searchString = `${l.id} ${l.tenant?.name} ${l.unit?.property?.name}`.toLowerCase();
    if (searchTerm && !searchString.includes(searchTerm.toLowerCase())) return false;
    
    const days = getDaysLeft(l.endDate);
    if (days <= 0) return false; // Already expired

    if (timeframeFilter === "30" && days > 30) return false;
    if (timeframeFilter === "60" && days > 60) return false;
    if (timeframeFilter === "90" && days > 90) return false;
    
    return true;
  }).sort((a, b) => {
    const dateA = new Date(a.endDate).getTime();
    const dateB = new Date(b.endDate).getTime();
    const rentA = Number(a.monthlyRent) || 0;
    const rentB = Number(b.monthlyRent) || 0;

    switch (sortOrder) {
      case "DATE_ASC": return dateA - dateB;
      case "DATE_DESC": return dateB - dateA;
      case "RENT_DESC": return rentB - rentA;
      case "RENT_ASC": return rentA - rentB;
      default: return dateA - dateB;
    }
  });

  const getUrgencyBadge = (days: number) => {
    if (days <= 15) return <Badge className="bg-[#FEE2E2] text-[#DC2626] border-0 hover:bg-[#FEE2E2]">Critical</Badge>;
    if (days <= 30) return <Badge className="bg-[#FEF9C3] text-[#CA8A04] border-0 hover:bg-[#FEF9C3]">High</Badge>;
    if (days <= 60) return <Badge className="bg-[#FEF3C7] text-[#D97706] border-0 hover:bg-[#FEF3C7]">Medium</Badge>;
    return <Badge className="bg-[#EFF6FF] text-[#3B82F6] border-0 hover:bg-[#EFF6FF]">Low</Badge>;
  };

  const getUrgencyBgColor = (days: number) => {
    if (days <= 15) return "bg-[#FEE2E2]";
    if (days <= 30) return "bg-[#FEF9C3]";
    if (days <= 60) return "bg-[#FEF3C7]";
    return "bg-[#EFF6FF]";
  };

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20 px-2 sm:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-black text-[#0F172A] tracking-tight">Expiring Leases</h1>
          <p className="text-[#64748B] text-sm font-medium mt-0.5">Manage leases that are expiring soon and require attention</p>
        </div>
        <Link href="/dashboard/leases/new">
          <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm rounded-xl h-10 px-5 text-sm font-bold flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Lease
          </Button>
        </Link>
      </div>

      {/* 4 KPI Cards matching screenshot exactly */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[16px] p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-bold text-[#0F172A]">Next 30 Days</h3>
            <div className="h-7 w-7 rounded-lg bg-[#FEE2E2] flex items-center justify-center text-[#EF4444]">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[28px] font-black text-[#0F172A] leading-none mt-4">{next30}</div>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[16px] p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-bold text-[#0F172A]">Next 60 Days</h3>
            <div className="h-7 w-7 rounded-lg bg-[#FFEDD5] flex items-center justify-center text-[#F97316]">
              <Calendar className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[28px] font-black text-[#0F172A] leading-none mt-4">{next60}</div>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[16px] p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-bold text-[#0F172A]">Next 90 Days</h3>
            <div className="h-7 w-7 rounded-lg bg-[#FEF9C3] flex items-center justify-center text-[#EAB308]">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[28px] font-black text-[#0F172A] leading-none mt-4">{next90}</div>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[16px] p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-bold text-[#0F172A]">Renewal Ready</h3>
            <div className="h-7 w-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6]">
              <RotateCw className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[28px] font-black text-[#0F172A] leading-none mt-4">{renewalReady}</div>
        </Card>
      </div>

      {/* Main Container */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] overflow-hidden p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-[#FEE2E2] text-[#EF4444] rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] leading-tight">Expiring Leases ({filteredLeases.length})</h2>
            <p className="text-xs text-[#64748B] font-medium">Leases expiring soon that require attention</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input 
              placeholder="Search expiring leases..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] w-full text-sm font-medium shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={timeframeFilter} onValueChange={(v) => setTimeframeFilter(v || "30")}>
              <SelectTrigger className="w-full md:w-[150px] h-11 rounded-xl bg-white border-[#E2E8F0] text-sm font-semibold shadow-sm focus:ring-[#3B82F6]">
                <SelectValue placeholder="Next 30 Days" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#E2E8F0] shadow-lg">
                <SelectItem value="30">Next 30 Days</SelectItem>
                <SelectItem value="60">Next 60 Days</SelectItem>
                <SelectItem value="90">Next 90 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v || "DATE_ASC")}>
              <SelectTrigger className="w-full md:w-[180px] h-11 rounded-xl bg-white border-[#E2E8F0] text-sm font-semibold shadow-sm focus:ring-[#3B82F6]">
                <SelectValue placeholder="End Date (Soonest)" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#E2E8F0] shadow-lg">
                <SelectItem value="DATE_ASC">End Date (Soonest)</SelectItem>
                <SelectItem value="DATE_DESC">Expiry Date (Latest)</SelectItem>
                <SelectItem value="RENT_DESC">Rent (High to Low)</SelectItem>
                <SelectItem value="RENT_ASC">Rent (Low to High)</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-1 shrink-0 h-11 items-center">
              <button 
                onClick={() => setViewMode('grid')} 
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#3B82F6] text-white shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')} 
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#3B82F6] text-white shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center text-[#64748B] font-bold text-sm">Loading expiring leases...</div>
        ) : filteredLeases.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-[#F8FAFC] rounded-full flex items-center justify-center mb-4 border border-[#E2E8F0]">
              <AlertTriangle className="h-6 w-6 text-[#94A3B8]" />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A]">No expiring leases</h3>
            <p className="text-sm text-[#64748B] mt-1 max-w-sm">There are no leases expiring within the selected timeframe.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredLeases.map((l) => {
              const daysLeft = getDaysLeft(l.endDate);
              const urgencyColorClass = daysLeft <= 15 ? "text-[#DC2626]" : daysLeft <= 30 ? "text-[#CA8A04]" : "text-[#D97706]";
              
              return (
                <Card key={l.id} className="bg-white border-[#E2E8F0] rounded-[20px] shadow-sm hover:shadow-md transition-shadow relative p-4 flex flex-col">
                  <div className="flex justify-between items-start w-full">
                    <div className="h-10 w-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full flex items-center justify-center text-[#3B82F6] shrink-0">
                      <Building className="h-4 w-4" />
                    </div>
                    <div className={`px-2.5 py-1 rounded-full ${getUrgencyBgColor(daysLeft)} shadow-sm`}>
                      {getUrgencyBadge(daysLeft)}
                    </div>
                  </div>

                  <div className="mt-4 flex-1">
                    <h3 className="font-bold text-[#0F172A] text-base truncate">{l.unit?.property?.name || "Unknown Property"}</h3>
                    <p className="text-[13px] text-[#64748B] font-medium mt-1 truncate">Unit {l.unit?.name || ""} - {l.unit?.property?.city || "Unknown City"}</p>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-[#E2E8F0] flex items-center justify-center shrink-0 border border-white shadow-sm">
                      <div className="text-[10px] font-black text-[#64748B]">
                        {l.tenant?.name ? l.tenant.name.substring(0, 2).toUpperCase() : "U"}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-[#0F172A] truncate">{l.tenant?.name || l.tenant?.email}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 rounded-full hover:bg-[#F8FAFC] flex items-center justify-center text-[#94A3B8] transition-colors">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl border-[#E2E8F0] p-1 shadow-lg">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="cursor-pointer font-semibold text-[#0F172A] rounded-lg py-2">
                          <Eye className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer font-semibold text-[#3B82F6] rounded-lg py-2">
                          <RotateCw className="mr-2 h-4 w-4 text-[#3B82F6]" /> Renew Lease
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateLeasePDF(l)} className="cursor-pointer font-semibold text-[#0F172A] rounded-lg py-2">
                          <FileDown className="mr-2 h-4 w-4 text-[#94A3B8]" /> Download PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#F1F5F9] flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Expiry</span>
                      <span className="text-[11px] font-bold text-[#0F172A]">{new Date(l.endDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                    </div>
                    <div className={`text-[12px] font-black ${urgencyColorClass}`}>
                      {daysLeft} days left
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F8FAFC]">
                  <TableHead className="font-bold text-[#64748B] rounded-tl-xl">Property</TableHead>
                  <TableHead className="font-bold text-[#64748B]">Tenant</TableHead>
                  <TableHead className="font-bold text-[#64748B]">Rent</TableHead>
                  <TableHead className="font-bold text-[#64748B]">Expiry Date</TableHead>
                  <TableHead className="font-bold text-[#64748B]">Days Left</TableHead>
                  <TableHead className="font-bold text-[#64748B]">Urgency</TableHead>
                  <TableHead className="text-right font-bold text-[#64748B] rounded-tr-xl">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeases.map((l) => {
                  const daysLeft = getDaysLeft(l.endDate);
                  const urgencyColorClass = daysLeft <= 15 ? "text-[#DC2626]" : daysLeft <= 30 ? "text-[#CA8A04]" : "text-[#D97706]";
                  
                  return (
                    <TableRow key={l.id} className="border-[#E2E8F0] hover:bg-[#F8FAFC]/50 transition-colors">
                      <TableCell>
                        <div className="font-bold text-[#0F172A] truncate max-w-[200px]">{l.unit?.property?.name || "Unknown Property"}</div>
                        <div className="text-xs font-semibold text-[#64748B] truncate">Unit {l.unit?.name || ""} - {l.unit?.property?.city}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[8px] font-black text-[#64748B]">
                            {l.tenant?.name ? l.tenant.name.substring(0, 2).toUpperCase() : "U"}
                          </div>
                          <div className="font-semibold text-[#0F172A] text-sm">{l.tenant?.name || l.tenant?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-black text-[#0F172A]">
                        ${Number(l.monthlyRent).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-semibold text-[#64748B]">
                        {new Date(l.endDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                      </TableCell>
                      <TableCell className={`font-black ${urgencyColorClass}`}>
                        {daysLeft} days
                      </TableCell>
                      <TableCell>
                        {getUrgencyBadge(daysLeft)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 p-0 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#E2E8F0] inline-flex items-center justify-center rounded-lg transition-colors">
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#E2E8F0] p-1 shadow-lg">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="cursor-pointer font-semibold text-[#0F172A] rounded-lg">
                              <Eye className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer font-semibold text-[#3B82F6] rounded-lg">
                              <RotateCw className="mr-2 h-4 w-4 text-[#3B82F6]" /> Renew Lease
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => generateLeasePDF(l)} className="cursor-pointer font-semibold text-[#0F172A] rounded-lg">
                              <FileDown className="mr-2 h-4 w-4 text-[#94A3B8]" /> Download PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
