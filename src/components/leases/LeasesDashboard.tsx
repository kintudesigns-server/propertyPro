"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FileText, CheckCircle, Clock, XCircle, AlertTriangle, LayoutGrid, List, Home, Calendar, Building } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { generateLeasePDF, generateInvoicePDF } from "@/lib/pdfGenerator";
import { MoreVertical, Eye, FileDown, ShieldAlert } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function LeasesDashboard({ 
  initialFilter = "ALL",
  title,
  subtitle
}: { 
  initialFilter?: string;
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [sortOrder, setSortOrder] = useState("ACTION_REQUIRED");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list"); // Default to list for replica

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leases");
      if (res.ok) {
        setLeases(await res.json());
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

  // Stats calculation
  const totalCount = leases.length;
  const actionNeededCount = leases.filter(l => l.status === "NOTICE_GIVEN" || l.status === "PENDING_SIGNATURE").length;
  const activeCount = leases.filter(l => l.status === "ACTIVE").length;
  const expiredCount = leases.filter(l => l.status === "EXPIRED").length;
  const terminatedCount = leases.filter(l => l.status === "TERMINATED").length;
  
  const getDaysLeft = (endDate: string) => {
    if (!endDate) return 999;
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const expiringCount = leases.filter(l => {
    if (l.status !== "ACTIVE") return false;
    const diffDays = getDaysLeft(l.endDate);
    return diffDays <= 60 && diffDays > 0;
  }).length;

  // Filter & Sort
  const filteredLeases = leases.filter(l => {
    const searchString = `${l.id} ${l.tenant?.name} ${l.unit?.property?.name}`.toLowerCase();
    if (searchTerm && !searchString.includes(searchTerm.toLowerCase())) return false;
    
    if (statusFilter === "EXPIRING") {
      if (l.status !== "ACTIVE") return false;
      const diffDays = getDaysLeft(l.endDate);
      return diffDays <= 60 && diffDays > 0;
    } else if (statusFilter === "ACTION_NEEDED") {
      return l.status === "NOTICE_GIVEN" || l.status === "PENDING_SIGNATURE";
    } else if (statusFilter !== "ALL" && l.status !== statusFilter) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    const startA = new Date(a.startDate || 0).getTime();
    const startB = new Date(b.startDate || 0).getTime();
    const endA = new Date(a.endDate || 0).getTime();
    const endB = new Date(b.endDate || 0).getTime();
    const rentA = Number(a.monthlyRent) || 0;
    const rentB = Number(b.monthlyRent) || 0;

    switch (sortOrder) {
      case "ACTION_REQUIRED": 
        const statusWeight = (s: string) => {
          if (s === "NOTICE_GIVEN") return 4;
          if (s === "PENDING_SIGNATURE") return 3;
          if (s === "EXPIRED") return 2;
          return 1;
        };
        const weightDiff = statusWeight(b.status) - statusWeight(a.status);
        if (weightDiff !== 0) return weightDiff;
        return dateB - dateA;
      case "NEWEST": return dateB - dateA;
      case "OLDEST": return dateA - dateB;
      case "START_DESC": return startB - startA;
      case "END_ASC": return endA - endB;
      case "RENT_DESC": return rentB - rentA;
      case "RENT_ASC": return rentA - rentB;
      default: return dateB - dateA;
    }
  });

  const hasUnpaidDeposit = (l: any) => {
    return l.invoices?.some((inv: any) => 
      l.securityDeposit &&
      Number(inv.amount) === Number(l.securityDeposit) &&
      inv.status === "UNPAID"
    );
  };

  const getStatusBadge = (l: any) => {
    if (l.status === "ACTIVE" && hasUnpaidDeposit(l)) {
      return <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600"><Clock className="h-3 w-3" /> Awaiting Deposit</span>;
    }
    switch (l.status) {
      case "ACTIVE": return <span className="flex items-center gap-1 text-[11px] font-bold text-[#10B981]"><CheckCircle className="h-3 w-3" /> Active</span>;
      case "PENDING_SIGNATURE": return <span className="flex items-center gap-1 text-[11px] font-bold text-[#F59E0B]"><Clock className="h-3 w-3" /> Pending</span>;
      case "DRAFT": return <span className="flex items-center gap-1 text-[11px] font-bold text-[#64748B]"><FileText className="h-3 w-3" /> Draft</span>;
      case "TERMINATED": return <span className="flex items-center gap-1 text-[11px] font-bold text-[#EF4444]"><XCircle className="h-3 w-3" /> Terminated</span>;
      case "EXPIRED": return <span className="flex items-center gap-1 text-[11px] font-bold text-[#EF4444]"><XCircle className="h-3 w-3" /> Expired</span>;
      default: return <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500">{l.status}</span>;
    }
  };

  const handleDeleteLease = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lease? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/leases/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Lease deleted successfully");
        setLeases(leases.filter(l => l.id !== id));
      } else {
        toast.error("Failed to delete lease");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleTerminateLease = async (id: string) => {
    if (!confirm("Are you sure you want to terminate this lease? The unit will be marked as vacant, but the lease record will be preserved.")) return;
    try {
      const res = await fetch(`/api/leases/${id}/terminate`, { method: 'POST' });
      if (res.ok) {
        toast.success("Lease terminated successfully");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to terminate lease");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const getQuickAction = (l: any) => {
    if (l.status === "NOTICE_GIVEN") {
      return (
        <Button onClick={() => router.push(`/dashboard/leases/${l.id}/move-out`)} className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold h-8 text-xs px-3 shadow-none border border-red-200 w-full md:w-auto">
          Process Move-Out
        </Button>
      );
    }
    if (l.status === "PENDING_SIGNATURE") {
      return (
        <Button onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 font-bold h-8 text-xs px-3 shadow-none border border-amber-200 w-full md:w-auto">
          View & Resend
        </Button>
      );
    }
    if (l.status === "ACTIVE" && getDaysLeft(l.endDate) <= 60) {
      return (
        <Button onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 font-bold h-8 text-xs px-3 shadow-none border border-blue-200 w-full md:w-auto">
          Offer Renewal
        </Button>
      );
    }
    return null;
  };

  const getStatusBgColor = (l: any) => {
    if (l.status === "ACTIVE" && hasUnpaidDeposit(l)) return "bg-blue-50";
    switch (l.status) {
      case "ACTIVE": return "bg-[#DCFCE7]";
      case "PENDING_SIGNATURE": return "bg-[#FEF3C7]";
      case "DRAFT": return "bg-[#F1F5F9]";
      case "TERMINATED": return "bg-[#FEE2E2]";
      case "EXPIRED": return "bg-[#FEE2E2]";
      default: return "bg-gray-100";
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20 px-2 sm:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-black text-[#0F172A] tracking-tight">Leases</h1>
          <p className="text-[#64748B] text-sm font-medium mt-0.5">Manage your property leases and agreements</p>
        </div>
        <Link href="/dashboard/leases/new">
          <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm rounded-xl h-10 px-5 text-sm font-bold flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Lease
          </Button>
        </Link>
      </div>

      {/* 6 KPI Cards matching screenshot exactly */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total */}
        <Card onClick={() => setStatusFilter("ALL")} className={`bg-white border-[#E2E8F0] shadow-sm rounded-[16px] p-5 relative overflow-hidden group cursor-pointer transition-all hover:border-[#3B82F6] ${statusFilter === "ALL" ? "ring-2 ring-[#3B82F6]" : ""}`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-bold text-[#0F172A]">Total</h3>
            <div className="h-7 w-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6]">
              <FileText className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[28px] font-black text-[#0F172A] leading-none mt-4">{totalCount}</div>
        </Card>

        {/* Action Needed */}
        <Card onClick={() => setStatusFilter("ACTION_NEEDED")} className={`bg-white border-[#E2E8F0] shadow-sm rounded-[16px] p-5 relative overflow-hidden group cursor-pointer transition-all hover:border-red-500 ${statusFilter === "ACTION_NEEDED" ? "ring-2 ring-red-500 bg-red-50" : ""}`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-bold text-[#0F172A]">Action Needed</h3>
            <div className="h-7 w-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[28px] font-black text-[#0F172A] leading-none mt-4">{actionNeededCount}</div>
        </Card>

        {/* Renewals Needed */}
        <Card onClick={() => setStatusFilter("EXPIRING")} className={`bg-white border-[#E2E8F0] shadow-sm rounded-[16px] p-5 relative overflow-hidden group cursor-pointer transition-all hover:border-[#F59E0B] ${statusFilter === "EXPIRING" ? "ring-2 ring-[#F59E0B] bg-amber-50" : ""}`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-bold text-[#0F172A]">Renewals Needed</h3>
            <div className="h-7 w-7 rounded-lg bg-[#FEF3C7] flex items-center justify-center text-[#F59E0B]">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[28px] font-black text-[#0F172A] leading-none mt-4">{expiringCount}</div>
        </Card>

        {/* Active */}
        <Card onClick={() => setStatusFilter("ACTIVE")} className={`bg-white border-[#E2E8F0] shadow-sm rounded-[16px] p-5 relative overflow-hidden group cursor-pointer transition-all hover:border-[#10B981] ${statusFilter === "ACTIVE" ? "ring-2 ring-[#10B981]" : ""}`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-bold text-[#0F172A]">Active</h3>
            <div className="h-7 w-7 rounded-lg bg-[#DCFCE7] flex items-center justify-center text-[#10B981]">
              <CheckCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[28px] font-black text-[#0F172A] leading-none mt-4">{activeCount}</div>
        </Card>

        {/* Expired */}
        <Card onClick={() => setStatusFilter("EXPIRED")} className={`bg-white border-[#E2E8F0] shadow-sm rounded-[16px] p-5 relative overflow-hidden group cursor-pointer transition-all hover:border-[#EF4444] ${statusFilter === "EXPIRED" ? "ring-2 ring-[#EF4444]" : ""}`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-bold text-[#0F172A]">Expired</h3>
            <div className="h-7 w-7 rounded-lg bg-[#FEE2E2] flex items-center justify-center text-[#EF4444]">
              <XCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[28px] font-black text-[#0F172A] leading-none mt-4">{expiredCount}</div>
        </Card>

        {/* Terminated */}
        <Card onClick={() => setStatusFilter("TERMINATED")} className={`bg-white border-[#E2E8F0] shadow-sm rounded-[16px] p-5 relative overflow-hidden group cursor-pointer transition-all hover:border-[#EF4444] ${statusFilter === "TERMINATED" ? "ring-2 ring-[#EF4444]" : ""}`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-bold text-[#0F172A]">Terminated</h3>
            <div className="h-7 w-7 rounded-lg bg-[#FEE2E2] flex items-center justify-center text-[#EF4444]">
              <XCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[28px] font-black text-[#0F172A] leading-none mt-4">{terminatedCount}</div>
        </Card>
      </div>

      {/* Main Container */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] overflow-hidden p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-[#EFF6FF] text-[#3B82F6] rounded-xl flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] leading-tight">
              {title || (initialFilter === "ACTIVE" ? "Active Leases" : initialFilter === "EXPIRING" ? "Expiring Leases" : "All Leases")}
            </h2>
            <p className="text-xs text-[#64748B] font-medium">
              {subtitle || (initialFilter === "ACTIVE" ? "Manage your currently active leases and track revenue" : initialFilter === "EXPIRING" ? "Leases expiring within the next 30 days" : "Manage and view all your property leases")}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input 
              placeholder="Search leases..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] w-full text-sm font-medium shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "ALL")}>
              <SelectTrigger className="w-full md:w-[140px] h-11 rounded-xl bg-white border-[#E2E8F0] text-sm font-semibold shadow-sm focus:ring-[#3B82F6]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#E2E8F0] shadow-lg">
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING_SIGNATURE">Pending</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v || "NEWEST")}>
              <SelectTrigger className="w-full md:w-[170px] h-11 rounded-xl bg-white border-[#E2E8F0] text-sm font-semibold shadow-sm focus:ring-[#3B82F6]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#E2E8F0] shadow-lg">
                <SelectItem value="NEWEST">Newest First</SelectItem>
                <SelectItem value="OLDEST">Oldest First</SelectItem>
                <SelectItem value="START_DESC">Start Date (Latest)</SelectItem>
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
          <div className="py-20 text-center text-[#64748B] font-bold text-sm">Loading leases...</div>
        ) : filteredLeases.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-[#F8FAFC] rounded-full flex items-center justify-center mb-4 border border-[#E2E8F0]">
              <FileText className="h-6 w-6 text-[#94A3B8]" />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A]">No leases found</h3>
            <p className="text-sm text-[#64748B] mt-1 max-w-sm">There are no leases matching your current search or filter criteria.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLeases.map((l) => {
              const daysLeft = getDaysLeft(l.endDate);
              let daysBadge = null;
              if (l.status === "ACTIVE") {
                if (daysLeft <= 30) {
                  daysBadge = <span className="px-2 py-1 bg-[#FEE2E2] text-[#EF4444] rounded-lg text-[11px] font-bold shadow-sm whitespace-nowrap">{daysLeft} days remaining</span>;
                } else {
                  daysBadge = <span className="px-2 py-1 bg-[#DCFCE7] text-[#10B981] rounded-lg text-[11px] font-bold shadow-sm whitespace-nowrap">{daysLeft} days remaining</span>;
                }
              } else if (l.status === "EXPIRED") {
                daysBadge = <span className="px-2 py-1 bg-[#FEE2E2] text-[#EF4444] rounded-lg text-[11px] font-bold shadow-sm whitespace-nowrap">Expired</span>;
              }
              
              return (
              <Card key={l.id} className="bg-white border-[#E2E8F0] rounded-[20px] shadow-sm hover:shadow-md transition-shadow relative p-5 flex flex-col group">
                {/* Header: Property & Status */}
                <div className="flex justify-between items-start w-full">
                  <div className="flex gap-3 items-start max-w-[70%]">
                    <div className="h-10 w-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-center text-[#3B82F6] shrink-0 mt-0.5">
                      <Home className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-[#0F172A] text-base truncate">{l.unit?.property?.name || "Unknown Property"}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold text-[#3B82F6] bg-[#EFF6FF] px-2 py-0.5 rounded-md truncate">Unit {l.unit?.name || ""}</span>
                        <span className="text-[12px] text-[#64748B] font-medium truncate">{l.unit?.property?.city || ""}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5">
                    <div className={`px-2 py-1 rounded-md ${getStatusBgColor(l)} border border-transparent`}>
                      {getStatusBadge(l)}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-7 w-7 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#94A3B8] transition-colors focus:outline-none opacity-0 group-hover:opacity-100 border border-transparent hover:border-[#E2E8F0]">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#E2E8F0] p-1 shadow-lg">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="cursor-pointer font-semibold text-[#0F172A] rounded-lg py-2">
                          <Eye className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}/invoice`)} className="cursor-pointer font-semibold text-[#0F172A] rounded-lg py-2">
                          <FileText className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateInvoicePDF(l)} className="cursor-pointer font-semibold text-[#0F172A] rounded-lg py-2">
                          <FileDown className="mr-2 h-4 w-4 text-[#94A3B8]" /> Download Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}/move-out`)} className="cursor-pointer font-semibold text-[#0F172A] rounded-lg py-2">
                          <ShieldAlert className="mr-2 h-4 w-4 text-[#F59E0B]" /> Process Move-Out
                        </DropdownMenuItem>
                        {l.status === "ACTIVE" || l.status === "PENDING_SIGNATURE" ? (
                          <DropdownMenuItem onClick={() => handleTerminateLease(l.id)} className="cursor-pointer font-semibold text-[#EF4444] rounded-lg py-2 focus:text-[#EF4444] focus:bg-[#FEE2E2]">
                            <XCircle className="mr-2 h-4 w-4" /> Terminate Lease
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleDeleteLease(l.id)} className="cursor-pointer font-semibold text-[#EF4444] rounded-lg py-2 focus:text-[#EF4444] focus:bg-[#FEE2E2]">
                            <XCircle className="mr-2 h-4 w-4" /> Delete Lease
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Tenant & Financial Row */}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#F1F5F9]">
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">Tenant</p>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[9px] font-black text-[#64748B] shrink-0 border border-white shadow-sm">
                        {l.tenant?.name ? l.tenant.name.substring(0, 2).toUpperCase() : "U"}
                      </div>
                      <p className="text-[13px] font-bold text-[#0F172A] truncate">{l.tenant?.name || l.tenant?.email}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5 text-right">Rent / Month</p>
                    <p className="text-[16px] font-black text-[#0F172A] text-right leading-none">
                      ${Number(l.monthlyRent).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </p>
                  </div>
                </div>

                {/* Timeline & Badges */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#94A3B8]" />
                    <span className="text-[12px] font-semibold text-[#64748B]">
                      {l.startDate ? new Date(l.startDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : "N/A"} - {l.endDate ? new Date(l.endDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : "N/A"}
                    </span>
                  </div>
                  {daysBadge}
                </div>

                {/* Specs */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-[#F1F5F9]">
                  <span className="px-2 py-1 bg-[#F8FAFC] text-[#64748B] text-[11px] font-bold rounded-md border border-[#E2E8F0]">
                    {l.unit?.rooms || 0} Bed
                  </span>
                  <span className="px-2 py-1 bg-[#F8FAFC] text-[#64748B] text-[11px] font-bold rounded-md border border-[#E2E8F0]">
                    {l.unit?.bathrooms || 0} Bath
                  </span>
                  <span className="px-2 py-1 bg-[#F8FAFC] text-[#64748B] text-[11px] font-bold rounded-md border border-[#E2E8F0]">
                    {l.unit?.sqFootage || 0} Sq Ft
                  </span>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 pt-4 border-t border-[#F1F5F9] flex flex-col gap-2">
                  {getQuickAction(l)}
                  <div className="flex gap-2 w-full">
                    <Button onClick={() => router.push(`/dashboard/leases/${l.id}`)} variant="outline" className="flex-1 rounded-lg h-9 text-xs font-bold text-[#0F172A] border-[#E2E8F0] hover:bg-[#F8FAFC] shadow-sm">
                      <Eye className="h-3.5 w-3.5 mr-2 text-[#94A3B8]" /> Details
                    </Button>
                    <Button onClick={() => router.push(`/dashboard/leases/${l.id}/invoice`)} variant="outline" className="flex-1 rounded-lg h-9 text-xs font-bold text-[#0F172A] border-[#E2E8F0] hover:bg-[#F8FAFC] shadow-sm">
                      <FileText className="h-3.5 w-3.5 mr-2 text-[#94A3B8]" /> Invoice
                    </Button>
                  </div>
                </div>
              </Card>
            )})}
          </div>
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#E2E8F0] bg-white hover:bg-white">
                    <TableHead className="text-xs font-semibold text-[#64748B] tracking-wider uppercase whitespace-nowrap py-4 pl-6">Property & Unit</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] tracking-wider uppercase whitespace-nowrap py-4">Tenant</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] tracking-wider uppercase whitespace-nowrap py-4">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] tracking-wider uppercase whitespace-nowrap py-4">Rent Amount</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] tracking-wider uppercase whitespace-nowrap py-4">Start Date</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] tracking-wider uppercase whitespace-nowrap py-4">End Date</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] tracking-wider uppercase whitespace-nowrap py-4">Days Remaining</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] tracking-wider uppercase whitespace-nowrap py-4 text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeases.map((l) => {
                    const daysLeft = getDaysLeft(l.endDate);
                    let daysBadge = null;
                    if (l.status === "ACTIVE") {
                      if (daysLeft <= 0) {
                        daysBadge = <span className="text-[#EF4444] font-medium text-sm">Expired</span>;
                      } else if (daysLeft <= 15) {
                        daysBadge = <span className="text-[#EF4444] font-black text-sm">{daysLeft} days</span>;
                      } else if (daysLeft <= 60) {
                        daysBadge = <span className="text-[#F59E0B] font-medium text-sm">{daysLeft} days</span>;
                      } else {
                        daysBadge = <span className="text-[#10B981] font-medium text-sm">{daysLeft} days</span>;
                      }
                    } else if (l.status === "EXPIRED") {
                      daysBadge = <span className="text-[#EF4444] font-medium text-sm">Expired</span>;
                    } else {
                      daysBadge = <span className="text-[#94A3B8] font-medium text-sm">-</span>;
                    }

                    return (
                    <TableRow key={l.id} className="border-b border-[#E2E8F0]/50 hover:bg-[#F8FAFC]/50 transition-colors">
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <Home className="h-4 w-4 text-[#94A3B8]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-medium text-[#0F172A]">{l.unit?.property?.name || "Property Not Available"}</span>
                              {l.unit?.name && (
                                <span className="bg-[#EFF6FF] text-[#3B82F6] text-xs font-bold px-2 py-0.5 rounded-md">
                                  Unit {l.unit.name}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#64748B]">
                              {l.unit?.property?.address ? `${l.unit.property.address}, ${l.unit.property.city || ''}` : "Address Not Available"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-[#E2E8F0] flex items-center justify-center text-xs font-black text-[#64748B] shrink-0 border border-white shadow-sm">
                            {l.tenant?.name ? l.tenant.name.substring(0, 2).toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="font-medium text-[#0F172A] text-sm">{l.tenant?.name || "Unknown Tenant"}</div>
                            <div className="text-xs text-[#64748B]">{l.tenant?.email || "No email"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${l.status === 'ACTIVE' && hasUnpaidDeposit(l) ? 'border-blue-200 bg-blue-50 text-blue-700' : l.status === 'ACTIVE' ? 'border-[#10B981]/20 bg-[#10B981]/10 text-[#10B981]' : l.status === 'TERMINATED' ? 'border-[#EF4444]/20 bg-[#EF4444]/10 text-[#EF4444]' : 'border-[#64748B]/20 bg-[#F1F5F9] text-[#64748B]'}`}>
                          {l.status === 'ACTIVE' && hasUnpaidDeposit(l) ? <Clock className="h-3.5 w-3.5" /> : l.status === 'ACTIVE' ? <CheckCircle className="h-3.5 w-3.5" /> : l.status === 'TERMINATED' ? <XCircle className="h-3.5 w-3.5" /> : null}
                          <span className="text-xs font-bold capitalize">{l.status === 'ACTIVE' && hasUnpaidDeposit(l) ? 'Awaiting Deposit' : l.status.toLowerCase()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="font-bold text-[#0F172A]">${Number(l.monthlyRent).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                        <div className="text-xs text-[#64748B]">per month</div>
                      </TableCell>
                      <TableCell className="py-4 font-medium text-[#0F172A]">
                        {l.startDate ? new Date(l.startDate).toLocaleDateString() : "N/A"}
                      </TableCell>
                      <TableCell className="py-4 font-medium text-[#0F172A]">
                        {l.endDate ? new Date(l.endDate).toLocaleDateString() : "N/A"}
                      </TableCell>
                      <TableCell className="py-4">
                        {daysBadge}
                      </TableCell>
                      <TableCell className="py-4 text-right pr-6">
                        <div className="flex justify-end items-center gap-2">
                          {getQuickAction(l)}
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 rounded-lg hover:bg-[#F1F5F9] inline-flex items-center justify-center text-[#64748B] transition-colors focus:outline-none border border-transparent hover:border-[#E2E8F0]">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#E2E8F0] p-1 shadow-lg">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="cursor-pointer font-semibold text-[#0F172A] rounded-lg py-2">
                                <Eye className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}/invoice`)} className="cursor-pointer font-semibold text-[#0F172A] rounded-lg py-2">
                                <FileText className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => generateInvoicePDF(l)} className="cursor-pointer font-semibold text-[#0F172A] rounded-lg py-2">
                                <FileDown className="mr-2 h-4 w-4 text-[#94A3B8]" /> Download Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}/move-out`)} className="cursor-pointer font-semibold text-[#0F172A] rounded-lg py-2">
                                <ShieldAlert className="mr-2 h-4 w-4 text-[#F59E0B]" /> Process Move-Out
                              </DropdownMenuItem>
                              {l.status === "ACTIVE" || l.status === "PENDING_SIGNATURE" ? (
                                <DropdownMenuItem onClick={() => handleTerminateLease(l.id)} className="cursor-pointer font-semibold text-[#EF4444] rounded-lg py-2 focus:text-[#EF4444] focus:bg-[#FEE2E2]">
                                  <XCircle className="mr-2 h-4 w-4" /> Terminate Lease
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleDeleteLease(l.id)} className="cursor-pointer font-semibold text-[#EF4444] rounded-lg py-2 focus:text-[#EF4444] focus:bg-[#FEE2E2]">
                                  <XCircle className="mr-2 h-4 w-4" /> Delete Lease
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
