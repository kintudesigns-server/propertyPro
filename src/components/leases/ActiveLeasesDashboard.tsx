"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Calendar, DollarSign, AlertTriangle, LayoutGrid, List, FileText, Eye, MoreVertical, Building, XCircle, FilePlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateLeasePDF } from "@/lib/pdfGenerator";

export default function ActiveLeasesDashboard() {
  const router = useRouter();
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("START_DESC");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leases");
      if (res.ok) {
        const data = await res.json();
        // Only keep active leases
        const activeLeases = data.filter((l: any) => l.status === "ACTIVE");
        setLeases(activeLeases);
      } else {
        toast.error("Failed to load active leases");
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
    if (!endDate) return 999;
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // KPIs
  const totalActive = leases.length;
  const totalMonthlyRent = leases.reduce((sum, l) => sum + (Number(l.monthlyRent) || 0), 0);
  const expiringSoon = leases.filter(l => getDaysLeft(l.endDate) <= 30 && getDaysLeft(l.endDate) > 0).length;
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const newThisMonth = leases.filter(l => {
    if (!l.startDate) return false;
    const sd = new Date(l.startDate);
    return sd.getMonth() === currentMonth && sd.getFullYear() === currentYear;
  }).length;

  const filteredLeases = leases.filter(l => {
    const searchString = `${l.id} ${l.tenant?.name} ${l.unit?.property?.name} ${l.unit?.name}`.toLowerCase();
    if (searchTerm && !searchString.includes(searchTerm.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const startA = new Date(a.startDate || 0).getTime();
    const startB = new Date(b.startDate || 0).getTime();
    const endA = new Date(a.endDate || 0).getTime();
    const endB = new Date(b.endDate || 0).getTime();
    const rentA = Number(a.monthlyRent) || 0;
    const rentB = Number(b.monthlyRent) || 0;

    switch (sortOrder) {
      case "START_DESC": return startB - startA;
      case "START_ASC": return startA - startB;
      case "END_ASC": return endA - endB;
      case "RENT_DESC": return rentB - rentA;
      case "RENT_ASC": return rentA - rentB;
      default: return startB - startA;
    }
  });

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20 px-2 sm:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-black text-[#0F172A] tracking-tight">Active Leases</h1>
          <p className="text-[#64748B] text-sm font-medium mt-0.5">Manage your currently active leases and track revenue</p>
        </div>
        <Link href="/dashboard/leases/new">
          <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm rounded-xl h-10 px-5 text-sm font-bold flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Lease
          </Button>
        </Link>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[16px] p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-bold text-[#0F172A]">Total Active</h3>
            <div className="h-7 w-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6]">
              <Building className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[28px] font-black text-[#0F172A] leading-none mt-4">{totalActive}</div>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[16px] p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-bold text-[#0F172A]">Total Monthly Rent</h3>
            <div className="h-7 w-7 rounded-lg bg-[#ECFDF5] flex items-center justify-center text-[#10B981]">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[28px] font-black text-[#0F172A] leading-none mt-4">
            ${totalMonthlyRent.toLocaleString()}
          </div>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[16px] p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-bold text-[#0F172A]">Expiring &lt; 30 Days</h3>
            <div className="h-7 w-7 rounded-lg bg-[#FEE2E2] flex items-center justify-center text-[#EF4444]">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[28px] font-black text-[#0F172A] leading-none mt-4">{expiringSoon}</div>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[16px] p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-bold text-[#0F172A]">New This Month</h3>
            <div className="h-7 w-7 rounded-lg bg-[#F5F3FF] flex items-center justify-center text-[#8B5CF6]">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[28px] font-black text-[#0F172A] leading-none mt-4">{newThisMonth}</div>
        </Card>
      </div>

      {/* Main Container */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] overflow-hidden p-6">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input 
              placeholder="Search active leases..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] w-full text-sm font-medium shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v || "START_DESC")}>
              <SelectTrigger className="w-full md:w-[200px] h-11 rounded-xl bg-white border-[#E2E8F0] text-sm font-semibold shadow-sm focus:ring-[#3B82F6]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#E2E8F0] shadow-lg">
                <SelectItem value="START_DESC">Start Date (Newest)</SelectItem>
                <SelectItem value="START_ASC">Start Date (Oldest)</SelectItem>
                <SelectItem value="END_ASC">End Date (Soonest)</SelectItem>
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
          <div className="py-20 text-center text-[#64748B] font-bold text-sm">Loading active leases...</div>
        ) : filteredLeases.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-[#F8FAFC] rounded-full flex items-center justify-center mb-4 border border-[#E2E8F0]">
              <Building className="h-6 w-6 text-[#94A3B8]" />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A]">No active leases found</h3>
            <p className="text-sm text-[#64748B] mt-1 max-w-sm">Try adjusting your search or create a new lease.</p>
            <Link href="/dashboard/leases/new" className="mt-4">
              <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl h-10 px-6 font-bold shadow-sm">
                Create Lease
              </Button>
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredLeases.map((l) => (
              <Card key={l.id} className="bg-white border-[#E2E8F0] rounded-[20px] shadow-sm hover:shadow-md transition-shadow relative p-4 flex flex-col">
                <div className="flex justify-between items-start w-full">
                  <div className="h-10 w-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full flex items-center justify-center text-[#3B82F6] shrink-0">
                    <Building className="h-4 w-4" />
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse"></div>
                    <span className="text-[11px] font-bold text-[#059669]">Active</span>
                  </div>
                </div>

                <div className="mt-4 flex-1">
                  <h3 className="font-bold text-[#0F172A] text-base truncate">{l.unit?.property?.name || "Unknown Property"}</h3>
                  <p className="text-[13px] text-[#64748B] font-medium mt-1 truncate">Unit {l.unit?.name || ""} - {l.unit?.property?.city || "Unknown City"}</p>
                </div>

                <div className="mt-4 p-3 bg-[#F8FAFC] rounded-xl flex items-center justify-between border border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-[#E2E8F0] flex items-center justify-center shrink-0 border border-white shadow-sm">
                      <div className="text-[10px] font-black text-[#64748B]">
                        {l.tenant?.name ? l.tenant.name.substring(0, 2).toUpperCase() : "U"}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Tenant</span>
                      <span className="text-[11px] font-bold text-[#0F172A] truncate w-24">{l.tenant?.name || l.tenant?.email}</span>
                    </div>
                  </div>
                  <div className="text-right">
                     <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Rent</span>
                     <div className="text-[13px] font-black text-[#0F172A]">${Number(l.monthlyRent).toLocaleString()}</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#F1F5F9] pt-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Started</span>
                    <span className="text-[11px] font-bold text-[#0F172A] flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-[#94A3B8]" />
                      {new Date(l.startDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                    </span>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-8 w-8 rounded-full hover:bg-[#F8FAFC] flex items-center justify-center text-[#94A3B8] transition-colors border border-[#E2E8F0]">
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#E2E8F0] p-1 shadow-lg">
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="cursor-pointer font-semibold text-[#0F172A] rounded-lg py-2">
                        <Eye className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => generateLeasePDF(l)} className="cursor-pointer font-semibold text-[#0F172A] rounded-lg py-2">
                        <FileText className="mr-2 h-4 w-4 text-[#94A3B8]" /> Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer font-semibold text-[#10B981] rounded-lg py-2">
                        <FilePlus className="mr-2 h-4 w-4 text-[#10B981]" /> Generate Invoice
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer font-semibold text-[#EF4444] rounded-lg py-2 focus:text-[#EF4444] focus:bg-[#FEE2E2]">
                        <XCircle className="mr-2 h-4 w-4" /> Terminate Lease
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F8FAFC]">
                  <TableHead className="font-bold text-[#64748B] rounded-tl-xl">Property</TableHead>
                  <TableHead className="font-bold text-[#64748B]">Tenant</TableHead>
                  <TableHead className="font-bold text-[#64748B]">Monthly Rent</TableHead>
                  <TableHead className="font-bold text-[#64748B]">Start Date</TableHead>
                  <TableHead className="font-bold text-[#64748B]">End Date</TableHead>
                  <TableHead className="text-right font-bold text-[#64748B] rounded-tr-xl">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeases.map((l) => (
                  <TableRow key={l.id} className="border-[#E2E8F0] hover:bg-[#F8FAFC]/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-center text-[#3B82F6] shrink-0">
                           <Building className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-[#0F172A] truncate max-w-[200px]">{l.unit?.property?.name || "Unknown Property"}</div>
                          <div className="text-xs font-semibold text-[#64748B] truncate">Unit {l.unit?.name || ""} - {l.unit?.property?.city}</div>
                        </div>
                      </div>
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
                      {l.startDate ? new Date(l.startDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : "N/A"}
                    </TableCell>
                    <TableCell className="font-semibold text-[#64748B]">
                      {l.endDate ? new Date(l.endDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#E2E8F0] inline-flex items-center justify-center rounded-lg transition-colors border border-transparent">
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#E2E8F0] p-1 shadow-lg">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="cursor-pointer font-semibold text-[#0F172A] rounded-lg">
                            <Eye className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateLeasePDF(l)} className="cursor-pointer font-semibold text-[#0F172A] rounded-lg">
                            <FileText className="mr-2 h-4 w-4 text-[#94A3B8]" /> Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer font-semibold text-[#10B981] rounded-lg">
                            <FilePlus className="mr-2 h-4 w-4 text-[#10B981]" /> Generate Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer font-semibold text-[#EF4444] rounded-lg focus:text-[#EF4444] focus:bg-[#FEE2E2]">
                            <XCircle className="mr-2 h-4 w-4" /> Terminate Lease
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
