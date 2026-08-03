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
import { useSession } from "next-auth/react";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import ModuleLockedBanner from "@/components/subscription/ModuleLockedBanner";
import { FeatureBlockedOverlay } from "@/components/subscription/FeatureBlockedBanner";
import { PaginationBar } from "@/components/ui/PaginationBar";

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
  const { data: session } = useSession();
  const isOwner = (session?.user as any)?.role === "OWNER";
  const { allowed: moduleAllowed, loading: moduleLoading } = useModuleAccess("leases");
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [sortOrder, setSortOrder] = useState("ACTION_REQUIRED");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list"); // Default to list for replica
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, viewMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leases");
      if (res.ok) {
        setLeases(await res.json());
      } else {
        // Teaser sample leases when module is locked / 403
        setLeases([
          { id: "LEASE-2026-01", status: "ACTIVE", rentAmount: 2450, startDate: "2026-01-01", endDate: "2026-12-31", tenant: { name: "John Doe", email: "john@example.com" }, unit: { unitNumber: "4B", property: { name: "Sunset Heights Apartments" } } },
          { id: "LEASE-2026-02", status: "ACTIVE", rentAmount: 1850, startDate: "2026-02-01", endDate: "2027-01-31", tenant: { name: "Alice Smith", email: "alice@example.com" }, unit: { unitNumber: "Suite 12", property: { name: "Oakridge Commercial Hub" } } },
          { id: "LEASE-2026-03", status: "NOTICE_GIVEN", rentAmount: 1650, startDate: "2025-08-01", endDate: "2026-08-31", tenant: { name: "Robert Taylor", email: "robert@example.com" }, unit: { unitNumber: "Apt 2A", property: { name: "Maplewood Terrace" } } },
          { id: "LEASE-2026-04", status: "EXPIRED", rentAmount: 2100, startDate: "2025-06-01", endDate: "2026-05-31", tenant: { name: "Emily Davis", email: "emily@example.com" }, unit: { unitNumber: "Unit 101", property: { name: "Highland Residences" } } },
        ]);
      }
    } catch (err) {
      // Fallback
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
      inv.invoiceType === "DEPOSIT" &&
      inv.status === "UNPAID"
    );
  };

  const getStatusBadge = (l: any) => {
    if (l.status === "SIGNED") {
      if (hasUnpaidDeposit(l)) {
        return <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600"><AlertTriangle className="h-3 w-3" /> Deposit Pending</span>;
      }
      return <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-600"><Home className="h-3 w-3" /> Awaiting Move-in</span>;
    }
    if (l.status === "ACTIVE" && hasUnpaidDeposit(l)) {
      return <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600"><Clock className="h-3 w-3" /> Awaiting Deposit</span>;
    }
    switch (l.status) {
      case "ACTIVE": return <span className="flex items-center gap-1 text-[11px] font-bold text-[#10B981]"><CheckCircle className="h-3 w-3" /> Active</span>;
      case "PENDING_SIGNATURE": return <span className="flex items-center gap-1 text-[11px] font-bold text-[#F59E0B]"><Clock className="h-3 w-3" /> Pending</span>;
      case "DRAFT": return <span className="flex items-center gap-1 text-[11px] font-bold text-[#6E6E73]"><FileText className="h-3 w-3" /> Draft</span>;
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
    if (l.status === "SIGNED") {
      return hasUnpaidDeposit(l) ? "bg-amber-50" : "bg-indigo-50";
    }
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
          <h1 className="text-[28px] font-black text-[#1D1D1F] tracking-tight">Leases</h1>
          <p className="text-[#6E6E73] text-sm font-medium mt-0.5">Manage your property leases and agreements</p>
        </div>
        <Link href="/dashboard/leases/new">
          <Button className="bg-[#007AFF] hover:bg-[#0062CC] text-white shadow-sm rounded-xl h-10 px-5 text-sm font-bold flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Lease
          </Button>
        </Link>
      </div>

      {/* 6 Modern SaaS KPI Metric Filter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[
          {
            key: "ALL",
            title: "Total Leases",
            count: totalCount,
            subtext: "All agreements",
            icon: FileText,
            activeColor: "bg-blue-50/80 border-blue-500 text-blue-950 ring-2 ring-blue-500/20 shadow-sm",
            inactiveColor: "bg-white border-slate-200/90 text-slate-900 hover:border-blue-300 hover:shadow-xs",
            iconBg: "bg-blue-100/70 text-blue-600",
            dotColor: "bg-blue-500",
          },
          {
            key: "ACTION_NEEDED",
            title: "Action Needed",
            count: actionNeededCount,
            subtext: "Notice & Pending",
            icon: ShieldAlert,
            activeColor: "bg-rose-50/80 border-rose-500 text-rose-950 ring-2 ring-rose-500/20 shadow-sm",
            inactiveColor: "bg-white border-slate-200/90 text-slate-900 hover:border-rose-300 hover:shadow-xs",
            iconBg: "bg-rose-100/70 text-rose-600",
            dotColor: "bg-rose-500",
          },
          {
            key: "EXPIRING",
            title: "Renewals Needed",
            count: expiringCount,
            subtext: "Expiring ≤ 60d",
            icon: AlertTriangle,
            activeColor: "bg-amber-50/80 border-amber-500 text-amber-950 ring-2 ring-amber-500/20 shadow-sm",
            inactiveColor: "bg-white border-slate-200/90 text-slate-900 hover:border-amber-300 hover:shadow-xs",
            iconBg: "bg-amber-100/70 text-amber-600",
            dotColor: "bg-amber-500",
          },
          {
            key: "ACTIVE",
            title: "Active Leases",
            count: activeCount,
            subtext: "Currently active",
            icon: CheckCircle,
            activeColor: "bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-sm",
            inactiveColor: "bg-white border-slate-200/90 text-slate-900 hover:border-emerald-300 hover:shadow-xs",
            iconBg: "bg-emerald-100/70 text-emerald-600",
            dotColor: "bg-emerald-500",
          },
          {
            key: "EXPIRED",
            title: "Expired",
            count: expiredCount,
            subtext: "Past end date",
            icon: XCircle,
            activeColor: "bg-slate-100 border-slate-600 text-slate-950 ring-2 ring-slate-600/20 shadow-sm",
            inactiveColor: "bg-white border-slate-200/90 text-slate-900 hover:border-slate-400 hover:shadow-xs",
            iconBg: "bg-slate-100 text-slate-600",
            dotColor: "bg-slate-500",
          },
          {
            key: "TERMINATED",
            title: "Terminated",
            count: terminatedCount,
            subtext: "Ended early",
            icon: XCircle,
            activeColor: "bg-purple-50/80 border-purple-500 text-purple-950 ring-2 ring-purple-500/20 shadow-sm",
            inactiveColor: "bg-white border-slate-200/90 text-slate-900 hover:border-purple-300 hover:shadow-xs",
            iconBg: "bg-purple-100/70 text-purple-600",
            dotColor: "bg-purple-500",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          const isActive = statusFilter === kpi.key;
          return (
            <div
              key={kpi.key}
              onClick={() => setStatusFilter(kpi.key)}
              className={`rounded-[20px] border p-4 transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-3 ${
                isActive ? kpi.activeColor : kpi.inactiveColor
              }`}
            >
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
                  {kpi.title}
                </span>
                <div className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-none">
                  {kpi.count}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${kpi.dotColor}`} />
                  <span className="text-[10px] font-semibold text-slate-500 truncate">
                    {kpi.subtext}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Container */}
      <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-[24px] overflow-hidden p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-[#EFF6FF] text-[#007AFF] rounded-xl flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1D1D1F] leading-tight">
              {title || (initialFilter === "ACTIVE" ? "Active Leases" : initialFilter === "EXPIRING" ? "Expiring Leases" : "All Leases")}
            </h2>
            <p className="text-xs text-[#6E6E73] font-medium">
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
              className="pl-10 h-11 rounded-xl bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] w-full text-sm font-medium shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "ALL")}>
              <SelectTrigger className="w-full md:w-[140px] h-11 rounded-xl bg-white border-[#E5E5EA] text-sm font-semibold shadow-sm focus:ring-[#007AFF]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#E5E5EA] shadow-lg">
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING_SIGNATURE">Pending</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v || "NEWEST")}>
              <SelectTrigger className="w-full md:w-[170px] h-11 rounded-xl bg-white border-[#E5E5EA] text-sm font-semibold shadow-sm focus:ring-[#007AFF]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#E5E5EA] shadow-lg">
                <SelectItem value="NEWEST">Newest First</SelectItem>
                <SelectItem value="OLDEST">Oldest First</SelectItem>
                <SelectItem value="START_DESC">Start Date (Latest)</SelectItem>
                <SelectItem value="END_ASC">End Date (Soonest)</SelectItem>
                <SelectItem value="RENT_DESC">Rent (High to Low)</SelectItem>
                <SelectItem value="RENT_ASC">Rent (Low to High)</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl p-1 shrink-0 h-11 items-center">
              <button 
                onClick={() => setViewMode('grid')} 
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#007AFF] text-white shadow-sm' : 'text-[#6E6E73] hover:text-[#1D1D1F]'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')} 
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#007AFF] text-white shadow-sm' : 'text-[#6E6E73] hover:text-[#1D1D1F]'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center text-[#6E6E73] font-bold text-sm">Loading leases...</div>
        ) : filteredLeases.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-[#F2F2F7] rounded-full flex items-center justify-center mb-4 border border-[#E5E5EA]">
              <FileText className="h-6 w-6 text-[#94A3B8]" />
            </div>
            <h3 className="text-lg font-bold text-[#1D1D1F]">No leases found</h3>
            <p className="text-sm text-[#6E6E73] mt-1 max-w-sm">There are no leases matching your current search or filter criteria.</p>
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
              } else if (l.status === "SIGNED" && l.startDate) {
                const startDiff = Math.ceil((new Date(l.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                if (startDiff > 0) {
                  daysBadge = <span className="px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-[11px] font-bold shadow-sm whitespace-nowrap">Move-in: {startDiff}d</span>;
                }
              }
              
              return (
              <Card key={l.id} className="bg-white border-[#E5E5EA] rounded-[20px] shadow-sm hover:shadow-md transition-shadow relative p-5 flex flex-col group">
                {/* Header: Property & Status */}
                <div className="flex justify-between items-start w-full">
                  <div className="flex gap-3 items-start max-w-[70%]">
                    <div className="h-10 w-10 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl flex items-center justify-center text-[#007AFF] shrink-0 mt-0.5 overflow-hidden">
                      {l.unit?.images && l.unit.images.length > 0 ? (
                        <img src={l.unit.images[0]} alt={l.unit.name} className="h-full w-full object-cover" />
                      ) : l.unit?.property?.images && l.unit.property.images.length > 0 ? (
                        <img src={l.unit.property.images[0]} alt={l.unit.property.name} className="h-full w-full object-cover" />
                      ) : (
                        <Home className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-[#1D1D1F] text-base truncate">{l.unit?.property?.name || "Unknown Property"}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold text-[#007AFF] bg-[#EFF6FF] px-2 py-0.5 rounded-md truncate">Unit {l.unit?.name || ""}</span>
                        <span className="text-[12px] text-[#6E6E73] font-medium truncate">{l.unit?.property?.city || ""}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5">
                    <div className={`px-2 py-1 rounded-md ${getStatusBgColor(l)} border border-transparent`}>
                      {getStatusBadge(l)}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-7 w-7 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#94A3B8] transition-colors focus:outline-none opacity-0 group-hover:opacity-100 border border-transparent hover:border-[#E5E5EA]">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#E5E5EA] p-1 shadow-lg">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="cursor-pointer font-semibold text-[#1D1D1F] rounded-lg py-2">
                          <Eye className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}/invoice`)} className="cursor-pointer font-semibold text-[#1D1D1F] rounded-lg py-2">
                          <FileText className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateInvoicePDF(l)} className="cursor-pointer font-semibold text-[#1D1D1F] rounded-lg py-2">
                          <FileDown className="mr-2 h-4 w-4 text-[#94A3B8]" /> Download Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}/move-out`)} className="cursor-pointer font-semibold text-[#1D1D1F] rounded-lg py-2">
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
                      {l.tenant?.avatar ? (
                        <img
                          src={l.tenant.avatar}
                          alt={l.tenant.name || "Tenant"}
                          className="h-6 w-6 rounded-full object-cover shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-[#E5E5EA] flex items-center justify-center text-[9px] font-black text-[#6E6E73] shrink-0 border border-white shadow-sm">
                          {l.tenant?.name ? l.tenant.name.substring(0, 2).toUpperCase() : "U"}
                        </div>
                      )}
                      <p className="text-[13px] font-bold text-[#1D1D1F] truncate">{l.tenant?.name || l.tenant?.email}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5 text-right">Rent / Month</p>
                    <p className="text-[16px] font-black text-[#1D1D1F] text-right leading-none">
                      ${Number(l.monthlyRent).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </p>
                  </div>
                </div>

                {/* Timeline & Badges */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#94A3B8]" />
                    <span className="text-[12px] font-semibold text-[#6E6E73]">
                      {l.startDate ? new Date(l.startDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : "N/A"} - {l.endDate ? new Date(l.endDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : "N/A"}
                    </span>
                  </div>
                  {daysBadge}
                </div>

                {/* Specs */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-[#F1F5F9]">
                  <span className="px-2 py-1 bg-[#F2F2F7] text-[#6E6E73] text-[11px] font-bold rounded-md border border-[#E5E5EA]">
                    {l.unit?.rooms || 0} Bed
                  </span>
                  <span className="px-2 py-1 bg-[#F2F2F7] text-[#6E6E73] text-[11px] font-bold rounded-md border border-[#E5E5EA]">
                    {l.unit?.bathrooms || 0} Bath
                  </span>
                  <span className="px-2 py-1 bg-[#F2F2F7] text-[#6E6E73] text-[11px] font-bold rounded-md border border-[#E5E5EA]">
                    {l.unit?.sqFootage || 0} Sq Ft
                  </span>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 pt-4 border-t border-[#F1F5F9] flex flex-col gap-2">
                  {getQuickAction(l)}
                  <div className="flex gap-2 w-full">
                    <Button onClick={() => router.push(`/dashboard/leases/${l.id}`)} variant="outline" className="flex-1 rounded-lg h-9 text-xs font-bold text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#F2F2F7] shadow-sm">
                      <Eye className="h-3.5 w-3.5 mr-2 text-[#94A3B8]" /> Details
                    </Button>
                    <Button onClick={() => router.push(`/dashboard/leases/${l.id}/invoice`)} variant="outline" className="flex-1 rounded-lg h-9 text-xs font-bold text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#F2F2F7] shadow-sm">
                      <FileText className="h-3.5 w-3.5 mr-2 text-[#94A3B8]" /> Invoice
                    </Button>
                  </div>
                </div>
              </Card>
            )})}
          </div>
        ) : (
          <div className="bg-white border border-[#E5E5EA] rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#E5E5EA] bg-white hover:bg-white">
                    <TableHead className="text-xs font-semibold text-[#6E6E73] tracking-wider uppercase whitespace-nowrap py-4 pl-6">Property & Unit</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6E6E73] tracking-wider uppercase whitespace-nowrap py-4">Tenant</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6E6E73] tracking-wider uppercase whitespace-nowrap py-4">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6E6E73] tracking-wider uppercase whitespace-nowrap py-4">Rent Amount</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6E6E73] tracking-wider uppercase whitespace-nowrap py-4">Start Date</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6E6E73] tracking-wider uppercase whitespace-nowrap py-4">End Date</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6E6E73] tracking-wider uppercase whitespace-nowrap py-4">Days Remaining</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6E6E73] tracking-wider uppercase whitespace-nowrap py-4 text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const start = (currentPage - 1) * itemsPerPage;
                    const paginated = filteredLeases.slice(start, start + itemsPerPage);
                    return paginated.map((l) => {
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
                      <TableRow key={l.id} className="border-b border-[#E5E5EA]/50 hover:bg-[#F2F2F7]/50 transition-colors">
                        <TableCell className="py-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-[#E5E5EA]">
                              {l.unit?.images && l.unit.images.length > 0 ? (
                                <img src={l.unit.images[0]} alt={l.unit.name} className="h-full w-full object-cover" />
                              ) : l.unit?.property?.images && l.unit.property.images.length > 0 ? (
                                <img src={l.unit.property.images[0]} alt={l.unit.property.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full bg-[#F2F2F7] flex items-center justify-center text-[#94A3B8]">
                                  <Home className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-bold text-[#1D1D1F] text-sm">{l.unit?.property?.name || "Property Not Available"}</span>
                                {l.unit?.name && (
                                  <span className="bg-[#EFF6FF] text-[#007AFF] text-xs font-bold px-2 py-0.5 rounded-md">
                                    Unit {l.unit.name}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[#6E6E73]">
                                {l.unit?.property?.address ? `${l.unit.property.address}, ${l.unit.property.city || ''}` : "Address Not Available"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            {l.tenant?.avatar ? (
                              <img
                                src={l.tenant.avatar}
                                alt={l.tenant.name || "Tenant"}
                                className="h-9 w-9 rounded-full object-cover shrink-0 border border-slate-200 shadow-sm"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-[#EFF6FF] text-[#007AFF] flex items-center justify-center text-xs font-bold shrink-0 border border-blue-100 shadow-sm">
                                {l.tenant?.name ? l.tenant.name.substring(0, 2).toUpperCase() : "U"}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-[#1D1D1F] text-sm">{l.tenant?.name || "Unknown Tenant"}</div>
                              <div className="text-xs text-[#6E6E73]">{l.tenant?.email || "No email"}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className={`inline-flex items-center px-2.5 py-1 rounded-full border border-transparent ${getStatusBgColor(l)}`}>
                            {getStatusBadge(l)}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="font-bold text-[#1D1D1F]">${Number(l.monthlyRent).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                          <div className="text-xs text-[#6E6E73]">per month</div>
                        </TableCell>
                        <TableCell className="py-4 font-medium text-[#1D1D1F]">
                          {l.startDate ? new Date(l.startDate).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell className="py-4 font-medium text-[#1D1D1F]">
                          {l.endDate ? new Date(l.endDate).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell className="py-4">
                          {daysBadge}
                        </TableCell>
                        <TableCell className="py-4 text-right pr-6">
                          <div className="flex justify-end items-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 rounded-lg hover:bg-[#F1F5F9] inline-flex items-center justify-center text-[#6E6E73] transition-colors focus:outline-none border border-transparent hover:border-[#E5E5EA]">
                                <MoreVertical className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 rounded-xl border-[#E5E5EA] p-1.5 shadow-xl">
                                {l.status === "NOTICE_GIVEN" && (
                                  <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}/move-out`)} className="cursor-pointer font-bold text-[#EF4444] bg-red-50 hover:bg-red-100 rounded-lg py-2 mb-1">
                                    <ShieldAlert className="mr-2 h-4 w-4 text-[#EF4444]" /> Process Move-Out
                                  </DropdownMenuItem>
                                )}
                                {l.status === "PENDING_SIGNATURE" && (
                                  <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="cursor-pointer font-bold text-[#D97706] bg-amber-50 hover:bg-amber-100 rounded-lg py-2 mb-1">
                                    <Clock className="mr-2 h-4 w-4 text-[#D97706]" /> View & Resend
                                  </DropdownMenuItem>
                                )}
                                {l.status === "ACTIVE" && getDaysLeft(l.endDate) <= 60 && (
                                  <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="cursor-pointer font-bold text-[#007AFF] bg-blue-50 hover:bg-blue-100 rounded-lg py-2 mb-1">
                                    <FileText className="mr-2 h-4 w-4 text-[#007AFF]" /> Offer Renewal
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="cursor-pointer font-semibold text-[#1D1D1F] rounded-lg py-2">
                                  <Eye className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}/invoice`)} className="cursor-pointer font-semibold text-[#1D1D1F] rounded-lg py-2">
                                  <FileText className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Invoice
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => generateInvoicePDF(l)} className="cursor-pointer font-semibold text-[#1D1D1F] rounded-lg py-2">
                                  <FileDown className="mr-2 h-4 w-4 text-[#94A3B8]" /> Download Invoice
                                </DropdownMenuItem>
                                {l.status !== "NOTICE_GIVEN" && (
                                  <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}/move-out`)} className="cursor-pointer font-semibold text-[#1D1D1F] rounded-lg py-2">
                                    <ShieldAlert className="mr-2 h-4 w-4 text-[#F59E0B]" /> Process Move-Out
                                  </DropdownMenuItem>
                                )}
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
                    );
                  });
                })()}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <PaginationBar
          currentPage={currentPage}
          totalPages={Math.ceil(filteredLeases.length / itemsPerPage) || 1}
          totalItems={filteredLeases.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          itemLabel="leases"
        />
      </Card>
    </div>
  );
}
