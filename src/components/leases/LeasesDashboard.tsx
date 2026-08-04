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
import { PaginationBar } from "@/components/ui/PaginationBar";
import { KpiCard } from "@/components/ui/KpiCard";

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
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
        setLeases([
          { id: "LEASE-2026-01", status: "ACTIVE", monthlyRent: 2450, startDate: "2026-01-01", endDate: "2026-12-31", tenant: { name: "John Doe", email: "john@example.com" }, unit: { name: "4B", property: { name: "Sunset Heights Apartments" } } },
          { id: "LEASE-2026-02", status: "ACTIVE", monthlyRent: 1850, startDate: "2026-02-01", endDate: "2027-01-31", tenant: { name: "Alice Smith", email: "alice@example.com" }, unit: { name: "Suite 12", property: { name: "Oakridge Commercial Hub" } } },
          { id: "LEASE-2026-03", status: "NOTICE_GIVEN", monthlyRent: 1650, startDate: "2025-08-01", endDate: "2026-08-31", tenant: { name: "Robert Taylor", email: "robert@example.com" }, unit: { name: "Apt 2A", property: { name: "Maplewood Terrace" } } },
          { id: "LEASE-2026-04", status: "EXPIRED", monthlyRent: 2100, startDate: "2025-06-01", endDate: "2026-05-31", tenant: { name: "Emily Davis", email: "emily@example.com" }, unit: { name: "Unit 101", property: { name: "Highland Residences" } } },
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
        return <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-amber-800"><AlertTriangle className="h-3 w-3" /> Deposit Pending</span>;
      }
      return <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-indigo-700"><Home className="h-3 w-3" /> Awaiting Move-in</span>;
    }
    if (l.status === "ACTIVE" && hasUnpaidDeposit(l)) {
      return <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-slate-800"><Clock className="h-3 w-3" /> Awaiting Deposit</span>;
    }
    switch (l.status) {
      case "ACTIVE": return <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-emerald-700"><CheckCircle className="h-3 w-3" /> Active</span>;
      case "PENDING_SIGNATURE": return <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-amber-800"><Clock className="h-3 w-3" /> Pending</span>;
      case "DRAFT": return <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-slate-700"><FileText className="h-3 w-3" /> Draft</span>;
      case "TERMINATED": return <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-rose-700"><XCircle className="h-3 w-3" /> Terminated</span>;
      case "EXPIRED": return <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-rose-700"><XCircle className="h-3 w-3" /> Expired</span>;
      default: return <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-slate-700">{l.status}</span>;
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
        <Button onClick={() => router.push(`/dashboard/leases/${l.id}/move-out`)} className="bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold h-8 text-xs px-3 shadow-none border border-rose-200 w-full md:w-auto">
          Process Move-Out
        </Button>
      );
    }
    if (l.status === "PENDING_SIGNATURE") {
      return (
        <Button onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold h-8 text-xs px-3 shadow-none border border-amber-200 w-full md:w-auto">
          View & Resend
        </Button>
      );
    }
    if (l.status === "ACTIVE" && getDaysLeft(l.endDate) <= 60) {
      return (
        <Button onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="bg-slate-100 text-slate-800 hover:bg-slate-200 font-bold h-8 text-xs px-3 shadow-none border border-slate-200 w-full md:w-auto">
          Offer Renewal
        </Button>
      );
    }
    return null;
  };

  const getStatusBadgeClass = (l: any) => {
    if (l.status === "SIGNED") {
      return hasUnpaidDeposit(l) ? "bg-amber-50 border-amber-200" : "bg-indigo-50 border-indigo-200";
    }
    if (l.status === "ACTIVE" && hasUnpaidDeposit(l)) return "bg-slate-100 border-slate-200";
    switch (l.status) {
      case "ACTIVE": return "bg-emerald-50 border-emerald-200";
      case "PENDING_SIGNATURE": return "bg-amber-50 border-amber-200";
      case "DRAFT": return "bg-slate-100 border-slate-200";
      case "TERMINATED": return "bg-rose-50 border-rose-200";
      case "EXPIRED": return "bg-rose-50 border-rose-200";
      default: return "bg-slate-100 border-slate-200";
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Leases</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Manage your property leases and agreements</p>
        </div>
        <Link href="/dashboard/leases/new">
          <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-xs rounded-xl h-9 px-4 text-xs font-black flex items-center gap-2 cursor-pointer">
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
            variant: "blue",
          },
          {
            key: "ACTION_NEEDED",
            title: "Action Needed",
            count: actionNeededCount,
            subtext: "Notice & Pending",
            icon: ShieldAlert,
            variant: "red",
          },
          {
            key: "EXPIRING",
            title: "Renewals Needed",
            count: expiringCount,
            subtext: "Expiring ≤ 60d",
            icon: AlertTriangle,
            variant: "amber",
          },
          {
            key: "ACTIVE",
            title: "Active Leases",
            count: activeCount,
            subtext: "Currently active",
            icon: CheckCircle,
            variant: "emerald",
          },
          {
            key: "EXPIRED",
            title: "Expired",
            count: expiredCount,
            subtext: "Past end date",
            icon: XCircle,
            variant: "slate",
          },
          {
            key: "TERMINATED",
            title: "Terminated",
            count: terminatedCount,
            subtext: "Ended early",
            icon: XCircle,
            variant: "purple",
          },
        ].map((kpi) => (
          <KpiCard
            key={kpi.key}
            title={kpi.title}
            value={kpi.count}
            subtext={kpi.subtext}
            icon={kpi.icon}
            variant={kpi.variant as any}
            active={statusFilter === kpi.key}
            onClick={() => setStatusFilter(kpi.key)}
          />
        ))}
      </div>

      {/* Main Container */}
      <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 bg-slate-100 text-slate-800 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/80">
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 leading-tight">
              {title || (initialFilter === "ACTIVE" ? "Active Leases" : initialFilter === "EXPIRING" ? "Expiring Leases" : "All Leases")}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {subtitle || (initialFilter === "ACTIVE" ? "Manage your currently active leases and track revenue" : initialFilter === "EXPIRING" ? "Leases expiring within the next 30 days" : "Manage and view all your property leases")}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search leases by tenant or property..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 w-full text-xs font-semibold text-slate-900 shadow-xs"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "ALL")}>
              <SelectTrigger className="w-full md:w-[140px] h-10 rounded-xl bg-white border-slate-200 text-xs font-semibold text-slate-900 shadow-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-200 shadow-lg">
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING_SIGNATURE">Pending</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v || "NEWEST")}>
              <SelectTrigger className="w-full md:w-[170px] h-10 rounded-xl bg-white border-slate-200 text-xs font-semibold text-slate-900 shadow-xs">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-200 shadow-lg">
                <SelectItem value="NEWEST">Newest First</SelectItem>
                <SelectItem value="OLDEST">Oldest First</SelectItem>
                <SelectItem value="START_DESC">Start Date (Latest)</SelectItem>
                <SelectItem value="END_ASC">End Date (Soonest)</SelectItem>
                <SelectItem value="RENT_DESC">Rent (High to Low)</SelectItem>
                <SelectItem value="RENT_ASC">Rent (Low to High)</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex bg-slate-100 border border-slate-200/80 rounded-xl p-1 shrink-0 h-10 items-center">
              <button 
                onClick={() => setViewMode('grid')} 
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')} 
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 font-bold text-xs">Loading leases...</div>
        ) : filteredLeases.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3 border border-slate-200">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">No leases found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm font-medium">There are no leases matching your current search or filter criteria.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLeases.map((l) => {
              const daysLeft = getDaysLeft(l.endDate);
              let daysBadge = null;
              if (l.status === "ACTIVE") {
                if (daysLeft <= 30) {
                  daysBadge = <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-extrabold uppercase shadow-2xs whitespace-nowrap">{daysLeft} days remaining</span>;
                } else {
                  daysBadge = <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-extrabold uppercase shadow-2xs whitespace-nowrap">{daysLeft} days remaining</span>;
                }
              } else if (l.status === "EXPIRED") {
                daysBadge = <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-extrabold uppercase shadow-2xs whitespace-nowrap">Expired</span>;
              } else if (l.status === "SIGNED" && l.startDate) {
                const startDiff = Math.ceil((new Date(l.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                if (startDiff > 0) {
                  daysBadge = <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-extrabold uppercase shadow-2xs whitespace-nowrap">Move-in: {startDiff}d</span>;
                }
              }
              
              return (
              <Card key={l.id} className="bg-white border-slate-200 rounded-3xl shadow-xs hover:shadow-md transition-all relative p-5 flex flex-col group">
                {/* Header: Property & Status */}
                <div className="flex justify-between items-start w-full">
                  <div className="flex gap-3 items-start max-w-[70%]">
                    <div className="h-10 w-10 bg-slate-100 border border-slate-200/80 rounded-xl flex items-center justify-center text-slate-800 shrink-0 mt-0.5 overflow-hidden">
                      {l.unit?.images && l.unit.images.length > 0 ? (
                        <img src={l.unit.images[0]} alt={l.unit.name} className="h-full w-full object-cover" />
                      ) : l.unit?.property?.images && l.unit.property.images.length > 0 ? (
                        <img src={l.unit.property.images[0]} alt={l.unit.property.name} className="h-full w-full object-cover" />
                      ) : (
                        <Home className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-slate-900 text-sm truncate">{l.unit?.property?.name || "Unknown Property"}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-extrabold uppercase text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md truncate">Unit {l.unit?.name || ""}</span>
                        <span className="text-xs text-slate-500 font-medium truncate">{l.unit?.property?.city || ""}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5">
                    <div className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-extrabold uppercase shadow-2xs ${getStatusBadgeClass(l)}`}>
                      {getStatusBadge(l)}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-7 w-7 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors focus:outline-none opacity-0 group-hover:opacity-100 cursor-pointer">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-2xl border-slate-200 p-1.5 shadow-xl">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                          <Eye className="mr-2 h-4 w-4 text-slate-500" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}/invoice`)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                          <FileText className="mr-2 h-4 w-4 text-slate-500" /> View Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateInvoicePDF(l)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                          <FileDown className="mr-2 h-4 w-4 text-slate-500" /> Download Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}/move-out`)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                          <ShieldAlert className="mr-2 h-4 w-4 text-amber-500" /> Process Move-Out
                        </DropdownMenuItem>
                        {l.status === "ACTIVE" || l.status === "PENDING_SIGNATURE" ? (
                          <DropdownMenuItem onClick={() => handleTerminateLease(l.id)} className="cursor-pointer font-bold text-xs text-rose-600 rounded-xl py-2">
                            <XCircle className="mr-2 h-4 w-4 text-rose-600" /> Terminate Lease
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleDeleteLease(l.id)} className="cursor-pointer font-bold text-xs text-rose-600 rounded-xl py-2">
                            <XCircle className="mr-2 h-4 w-4 text-rose-600" /> Delete Lease
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Tenant & Financial Row */}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tenant</p>
                    <div className="flex items-center gap-2">
                      {l.tenant?.avatar ? (
                        <img
                          src={l.tenant.avatar}
                          alt={l.tenant.name || "Tenant"}
                          className="h-6 w-6 rounded-full object-cover shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-800 shrink-0 border border-slate-200">
                          {l.tenant?.name ? l.tenant.name.substring(0, 2).toUpperCase() : "U"}
                        </div>
                      )}
                      <p className="text-xs font-extrabold text-slate-900 truncate">{l.tenant?.name || l.tenant?.email}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 text-right">Rent / Month</p>
                    <p className="text-sm font-black text-slate-900 text-right leading-none">
                      ${Number(l.monthlyRent).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </p>
                  </div>
                </div>

                {/* Timeline & Badges */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600">
                      {l.startDate ? new Date(l.startDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : "N/A"} - {l.endDate ? new Date(l.endDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : "N/A"}
                    </span>
                  </div>
                  {daysBadge}
                </div>

                {/* Quick Actions */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                  {getQuickAction(l)}
                  <div className="flex gap-2 w-full">
                    <Button onClick={() => router.push(`/dashboard/leases/${l.id}`)} variant="outline" className="flex-1 rounded-xl h-8 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs">
                      <Eye className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Details
                    </Button>
                    <Button onClick={() => router.push(`/dashboard/leases/${l.id}/invoice`)} variant="outline" className="flex-1 rounded-xl h-8 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs">
                      <FileText className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Invoice
                    </Button>
                  </div>
                </div>
              </Card>
            )})}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200/80 bg-slate-50/70 hover:bg-slate-50/70">
                    <TableHead className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap py-3.5 pl-6">Property & Unit</TableHead>
                    <TableHead className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap py-3.5">Tenant</TableHead>
                    <TableHead className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap py-3.5">Status</TableHead>
                    <TableHead className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap py-3.5">Rent Amount</TableHead>
                    <TableHead className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap py-3.5">Start Date</TableHead>
                    <TableHead className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap py-3.5">End Date</TableHead>
                    <TableHead className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap py-3.5">Days Remaining</TableHead>
                    <TableHead className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap py-3.5 text-right pr-6">Actions</TableHead>
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
                          daysBadge = <span className="text-rose-600 font-bold text-xs">Expired</span>;
                        } else if (daysLeft <= 15) {
                          daysBadge = <span className="text-rose-600 font-black text-xs">{daysLeft} days</span>;
                        } else if (daysLeft <= 60) {
                          daysBadge = <span className="text-amber-700 font-bold text-xs">{daysLeft} days</span>;
                        } else {
                          daysBadge = <span className="text-emerald-700 font-bold text-xs">{daysLeft} days</span>;
                        }
                      } else if (l.status === "EXPIRED") {
                        daysBadge = <span className="text-rose-600 font-bold text-xs">Expired</span>;
                      } else {
                        daysBadge = <span className="text-slate-400 font-bold text-xs">-</span>;
                      }

                      return (
                      <TableRow key={l.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="py-3.5 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/80">
                              {l.unit?.images && l.unit.images.length > 0 ? (
                                <img src={l.unit.images[0]} alt={l.unit.name} className="h-full w-full object-cover" />
                              ) : l.unit?.property?.images && l.unit.property.images.length > 0 ? (
                                <img src={l.unit.property.images[0]} alt={l.unit.property.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-500">
                                  <Home className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-extrabold text-slate-900 text-xs">{l.unit?.property?.name || "Property Not Available"}</span>
                                {l.unit?.name && (
                                  <span className="bg-slate-100 text-slate-800 text-[10px] font-extrabold uppercase border border-slate-200 px-2 py-0.5 rounded-md">
                                    Unit {l.unit.name}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium">
                                {l.unit?.property?.address ? `${l.unit.property.address}, ${l.unit.property.city || ''}` : "Address Not Available"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2.5">
                            {l.tenant?.avatar ? (
                              <img
                                src={l.tenant.avatar}
                                alt={l.tenant.name || "Tenant"}
                                className="h-8 w-8 rounded-full object-cover shrink-0 border border-slate-200 shadow-2xs"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-black shrink-0 border border-slate-200">
                                {l.tenant?.name ? l.tenant.name.substring(0, 2).toUpperCase() : "U"}
                              </div>
                            )}
                            <div>
                              <div className="font-extrabold text-slate-900 text-xs">{l.tenant?.name || "Unknown Tenant"}</div>
                              <div className="text-[11px] text-slate-500 font-medium">{l.tenant?.email || "No email"}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-[10px] font-extrabold uppercase shadow-2xs ${getStatusBadgeClass(l)}`}>
                            {getStatusBadge(l)}
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="font-extrabold text-slate-900 text-xs">${Number(l.monthlyRent).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                          <div className="text-[10px] text-slate-500 font-semibold">per month</div>
                        </TableCell>
                        <TableCell className="py-3.5 font-semibold text-slate-700 text-xs">
                          {l.startDate ? new Date(l.startDate).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell className="py-3.5 font-semibold text-slate-700 text-xs">
                          {l.endDate ? new Date(l.endDate).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell className="py-3.5">
                          {daysBadge}
                        </TableCell>
                        <TableCell className="py-3.5 text-right pr-6">
                          <div className="flex justify-end items-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 rounded-xl hover:bg-slate-100 inline-flex items-center justify-center text-slate-400 transition-colors focus:outline-none cursor-pointer">
                                <MoreVertical className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 rounded-2xl border-slate-200 p-1.5 shadow-xl">
                                {l.status === "NOTICE_GIVEN" && (
                                  <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}/move-out`)} className="cursor-pointer font-bold text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl py-2 mb-1">
                                    <ShieldAlert className="mr-2 h-4 w-4 text-rose-600" /> Process Move-Out
                                  </DropdownMenuItem>
                                )}
                                {l.status === "PENDING_SIGNATURE" && (
                                  <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="cursor-pointer font-bold text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl py-2 mb-1">
                                    <Clock className="mr-2 h-4 w-4 text-amber-600" /> View & Resend
                                  </DropdownMenuItem>
                                )}
                                {l.status === "ACTIVE" && getDaysLeft(l.endDate) <= 60 && (
                                  <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="cursor-pointer font-bold text-xs text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl py-2 mb-1">
                                    <FileText className="mr-2 h-4 w-4 text-slate-700" /> Offer Renewal
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}`)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                                  <Eye className="mr-2 h-4 w-4 text-slate-500" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}/invoice`)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                                  <FileText className="mr-2 h-4 w-4 text-slate-500" /> View Invoice
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => generateInvoicePDF(l)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                                  <FileDown className="mr-2 h-4 w-4 text-slate-500" /> Download Invoice
                                </DropdownMenuItem>
                                {l.status !== "NOTICE_GIVEN" && (
                                  <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/${l.id}/move-out`)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                                    <ShieldAlert className="mr-2 h-4 w-4 text-amber-500" /> Process Move-Out
                                  </DropdownMenuItem>
                                )}
                                {l.status === "ACTIVE" || l.status === "PENDING_SIGNATURE" ? (
                                  <DropdownMenuItem onClick={() => handleTerminateLease(l.id)} className="cursor-pointer font-bold text-xs text-rose-600 rounded-xl py-2">
                                    <XCircle className="mr-2 h-4 w-4 text-rose-600" /> Terminate Lease
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleDeleteLease(l.id)} className="cursor-pointer font-bold text-xs text-rose-600 rounded-xl py-2">
                                    <XCircle className="mr-2 h-4 w-4 text-rose-600" /> Delete Lease
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
