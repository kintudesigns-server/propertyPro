"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/KpiCard";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Users, UserCheck, Clock, CalendarDays, Search, LayoutGrid, List,
  MoreVertical, Eye, Edit, Trash2, RefreshCw, Plus
} from "lucide-react";
import { toast } from "sonner";

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [properties, setProperties] = useState<any[]>([]);
  const [checkingProperties, setCheckingProperties] = useState(true);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("Active");

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenants(data);
      }
    } catch (error) {
      toast.error("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetch("/api/properties")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProperties(data);
      })
      .catch(err => console.error(err))
      .finally(() => setCheckingProperties(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tenant?")) return;
    try {
      const res = await fetch("/api/tenants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Tenant deleted successfully");
        setTenants(tenants.filter(t => t.id !== id));
      } else {
        toast.error("Failed to delete tenant");
      }
    } catch (error) {
      toast.error("Error deleting tenant");
    }
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    
    try {
      const res = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedTenant.id, status: newStatus }),
      });
      
      if (res.ok) {
        toast.success(`Tenant status changed to ${newStatus}`);
        // Locally update (since user model doesn't explicitly have a status in prisma, we'll pretend or just re-fetch)
        fetchTenants();
        setShowStatusModal(false);
      } else {
        toast.error("Failed to change status");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const openStatusModal = (tenant: any) => {
    setSelectedTenant(tenant);
    setNewStatus("Active");
    setShowStatusModal(true);
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.leases?.some((l:any) => l.status === "ACTIVE")).length;
  const pendingTenants = tenants.filter(t => t.leases?.length === 0).length; // Simulated pending
  const thisMonth = tenants.filter(t => new Date(t.createdAt).getMonth() === new Date().getMonth()).length;

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1D1D1F] tracking-tight">Tenants</h1>
          <p className="text-[#6E6E73] text-sm mt-1">Manage tenant applications and profiles</p>
        </div>
        {!checkingProperties && properties.some(p => p.approvalStatus === "APPROVED") ? (
          <Link href="/dashboard/tenants/new">
            <Button className="bg-[#007AFF] hover:bg-[#0062CC] text-white shadow-sm rounded-xl h-11 font-bold px-6 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Tenant
            </Button>
          </Link>
        ) : (
          <Button disabled className="bg-slate-200 text-[#8E8E93] border border-slate-200 shadow-sm rounded-xl h-11 font-bold px-6 flex items-center gap-2 cursor-not-allowed">
            <Plus className="h-4 w-4" /> Add Tenant (Locked)
          </Button>
        )}
      </div>

      {!checkingProperties && !properties.some(p => p.approvalStatus === "APPROVED") && (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-950 text-base">Tenant Creation Suspended</h3>
              <p className="text-amber-800 text-xs mt-0.5 font-semibold">
                You must have at least one approved property on the platform before you can register new tenant profiles.
              </p>
            </div>
          </div>
          <Link href="/dashboard/properties">
            <Button type="button" className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold whitespace-nowrap px-5 py-2 h-10 shrink-0 shadow-sm border-0">
              View Properties
            </Button>
          </Link>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Tenants" value={totalTenants} subtext="All tenant profiles" icon={Users} variant="blue" />
        <KpiCard title="Active Tenants" value={activeTenants} subtext="Currently living in properties" icon={UserCheck} variant="green" />
        <KpiCard title="Pending Review" value={pendingTenants} subtext="Awaiting background check" icon={Clock} variant="orange" />
        <KpiCard title="This Month" value={thisMonth} subtext="New applications" icon={CalendarDays} variant="purple" />
      </div>

      {/* Main Content Area */}
      <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-[#E5E5EA] bg-[#F2F2F7]/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="font-bold text-[#1D1D1F] text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-[#007AFF]" /> Tenants ({filteredTenants.length})
            </h2>
            <p className="text-xs text-[#6E6E73] mt-0.5">Showing {filteredTenants.length} of {tenants.length} tenants</p>
          </div>
          <div className="flex items-center bg-[#F1F5F9] p-1 rounded-xl">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                viewMode === "table" ? "bg-white text-[#1D1D1F] shadow-sm" : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              <List className="h-4 w-4" /> Table
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                viewMode === "cards" ? "bg-[#007AFF] text-white shadow-sm" : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" /> Cards
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col md:flex-row gap-4 border-b border-[#E5E5EA]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input 
              placeholder="Search tenants..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-[#F2F2F7] border-[#E5E5EA] rounded-xl focus-visible:ring-1 focus-visible:ring-[#007AFF] focus-visible:border-[#007AFF]"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 bg-white border border-[#E5E5EA] rounded-xl px-4 text-sm font-semibold text-[#1D1D1F] outline-none min-w-[180px]"
          >
            <option>All Statuses</option>
            <option>Active</option>
            <option>Pending Review</option>
            <option>Approved</option>
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#007AFF] border-r-transparent"></div>
            <p className="mt-4 text-[#6E6E73] font-semibold">Loading tenants...</p>
          </div>
        )}

        {/* TABLE VIEW */}
        {!loading && viewMode === "table" && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#F2F2F7]">
                  <TableHead className="font-extrabold text-[#6E6E73] uppercase tracking-wider text-xs">Tenant</TableHead>
                  <TableHead className="font-extrabold text-[#6E6E73] uppercase tracking-wider text-xs">Status</TableHead>
                  <TableHead className="font-extrabold text-[#6E6E73] uppercase tracking-wider text-xs">Contact</TableHead>
                  <TableHead className="font-extrabold text-[#6E6E73] uppercase tracking-wider text-xs">Employment</TableHead>
                  <TableHead className="font-extrabold text-[#6E6E73] uppercase tracking-wider text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((t) => {
                  const hasActiveLease = t.leases?.some((l:any) => l.status === "ACTIVE");
                  const badgeConfig = hasActiveLease || t.tenantStatus === "Active" 
                    ? { bg: "bg-[#DCFCE7]", text: "text-[#16A34A]", label: "Active" }
                    : t.tenantStatus === "Approved"
                    ? { bg: "bg-[#EFF6FF]", text: "text-[#007AFF]", label: "Approved" }
                    : { bg: "bg-[#FEF9C3]", text: "text-[#CA8A04]", label: t.tenantStatus || "Pending Review" };

                  return (
                    <TableRow key={t.id} className="border-b border-[#E5E5EA] hover:bg-[#F2F2F7]/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#EFF6FF] text-[#007AFF] flex items-center justify-center font-bold text-lg shrink-0">
                            {t.name ? t.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[#1D1D1F] truncate">{t.name}</span>
                            <span className="text-xs text-[#6E6E73] truncate">{t.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${badgeConfig.bg} ${badgeConfig.text} border-0 rounded-lg px-2.5 py-1 font-bold shadow-sm whitespace-nowrap`}>
                          {badgeConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-semibold text-[#1D1D1F]">{t.phone || "-"}</div>
                        <div className="text-xs text-[#6E6E73] mt-0.5 truncate">{t.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-semibold text-[#1D1D1F] truncate max-w-[150px]" title={t.position || t.employmentStatus}>
                          {t.employmentStatus === "EMPLOYED" 
                            ? (t.position || "Employed") 
                            : t.employmentStatus 
                              ? t.employmentStatus.charAt(0).toUpperCase() + t.employmentStatus.slice(1).toLowerCase().replace('_', ' ') 
                              : "-"}
                        </div>
                        <div className="text-xs text-[#6E6E73] mt-0.5 truncate max-w-[150px]" title={`${t.employer || ''} ${t.annualIncome ? `$${t.annualIncome}/yr` : ''}`}>
                          {t.employer ? t.employer : "-"} {t.annualIncome ? `• $${t.annualIncome.toLocaleString()}/yr` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 p-0 text-[#94A3B8] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] inline-flex items-center justify-center rounded-lg">
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#E5E5EA] p-1">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/tenants/${t.id}`)} className="cursor-pointer font-semibold text-[#1D1D1F] rounded-lg">
                              <Eye className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/tenants/${t.id}/edit`)} className="cursor-pointer font-semibold text-[#1D1D1F] rounded-lg">
                              <Edit className="mr-2 h-4 w-4 text-[#94A3B8]" /> Edit Tenant
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openStatusModal(t)} className="cursor-pointer font-semibold text-[#1D1D1F] rounded-lg">
                              <RefreshCw className="mr-2 h-4 w-4 text-[#94A3B8]" /> Change Status
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => { if (!hasActiveLease) handleDelete(t.id) }} 
                              disabled={hasActiveLease}
                              className={`cursor-pointer font-semibold rounded-lg ${hasActiveLease ? 'text-gray-400 opacity-50' : 'text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50'}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Tenant
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredTenants.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-[#6E6E73]">
                      No tenants found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* CARDS VIEW */}
        {!loading && viewMode === "cards" && (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-[#F2F2F7]/50">
            {filteredTenants.map((t) => {
              const hasActiveLease = t.leases?.some((l:any) => l.status === "ACTIVE");
              const badgeConfig = hasActiveLease || t.tenantStatus === "Active" 
                    ? { bg: "bg-[#DCFCE7]", text: "text-[#16A34A]", label: "Active" }
                    : t.tenantStatus === "Approved"
                    ? { bg: "bg-[#EFF6FF]", text: "text-[#007AFF]", label: "Approved" }
                    : { bg: "bg-[#FEF9C3]", text: "text-[#CA8A04]", label: t.tenantStatus || "Pending Review" };
              
              return (
                <div key={t.id} className="bg-white border border-[#E5E5EA] rounded-[20px] p-5 hover:shadow-lg transition-shadow relative group flex flex-col">
                  <div className="absolute top-4 right-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 p-0 text-[#94A3B8] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] inline-flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#E5E5EA] p-1">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/tenants/${t.id}`)} className="cursor-pointer font-semibold text-[#1D1D1F] rounded-lg">
                          <Eye className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/tenants/${t.id}/edit`)} className="cursor-pointer font-semibold text-[#1D1D1F] rounded-lg">
                          <Edit className="mr-2 h-4 w-4 text-[#94A3B8]" /> Edit Tenant
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openStatusModal(t)} className="cursor-pointer font-semibold text-[#1D1D1F] rounded-lg">
                          <RefreshCw className="mr-2 h-4 w-4 text-[#94A3B8]" /> Change Status
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => { if (!hasActiveLease) handleDelete(t.id) }} 
                          disabled={hasActiveLease}
                          className={`cursor-pointer font-semibold rounded-lg ${hasActiveLease ? 'text-gray-400 opacity-50' : 'text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50'}`}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Tenant
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-col items-center text-center mt-2 mb-4">
                    <div className="h-16 w-16 rounded-full bg-[#EFF6FF] text-[#007AFF] flex items-center justify-center font-black text-2xl mb-3 ring-4 ring-[#EFF6FF]/50">
                      {t.name ? t.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <h3 className="font-extrabold text-[#1D1D1F] text-lg truncate w-full">{t.name}</h3>
                    <p className="text-sm text-[#6E6E73] truncate w-full">{t.email}</p>
                    <div className="mt-3 bg-slate-50 border border-slate-100 rounded-lg p-2 w-full text-center">
                      <p className="text-xs font-bold text-slate-700 truncate">
                        {t.employmentStatus === "EMPLOYED" ? t.position || "Employed" : t.employmentStatus ? t.employmentStatus.charAt(0).toUpperCase() + t.employmentStatus.slice(1).toLowerCase().replace('_', ' ') : "Employment N/A"}
                      </p>
                      <p className="text-[10px] text-[#6E6E73] mt-0.5 truncate">
                        {t.employer ? t.employer : "No details"} {t.annualIncome ? `• $${t.annualIncome.toLocaleString()}/yr` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-[#F1F5F9] flex justify-between items-center">
                    <Badge className={`${badgeConfig.bg} ${badgeConfig.text} border-0`}>
                      {badgeConfig.label}
                    </Badge>
                    <span className="text-xs font-bold text-[#6E6E73]">{t.phone || "-"}</span>
                  </div>
                </div>
              );
            })}
            {filteredTenants.length === 0 && (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-[#E5E5EA] rounded-2xl bg-white">
                <Users className="h-12 w-12 text-[#94A3B8] mx-auto mb-3" />
                <h3 className="text-lg font-bold text-[#1D1D1F]">No Tenants Found</h3>
                <p className="text-sm text-[#6E6E73] mt-1">Try adjusting your search or add a new tenant.</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Change Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white border-0 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E5E5EA] flex justify-between items-center bg-[#F2F2F7]">
              <h2 className="font-bold text-[#1D1D1F] text-lg">Change Tenant Status</h2>
              <button onClick={() => setShowStatusModal(false)} className="text-[#6E6E73] hover:text-[#1D1D1F]">✕</button>
            </div>
            <form onSubmit={handleStatusChange}>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-bold text-[#1D1D1F] mb-2 block">New Status</label>
                  <select 
                    value={newStatus} 
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full h-11 bg-white border border-[#E5E5EA] rounded-xl px-4 text-sm font-semibold text-[#1D1D1F] outline-none"
                  >
                    <option value="Active">Activate Tenant</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Terminated">Terminate Tenant</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-[#1D1D1F] mb-2 block">Reason / Notes (Optional)</label>
                  <textarea 
                    rows={3}
                    placeholder="Enter reason for status change..."
                    className="w-full bg-white border border-[#E5E5EA] rounded-xl p-3 text-sm text-[#1D1D1F] outline-none resize-none focus:ring-2 focus:ring-[#007AFF]"
                  ></textarea>
                </div>
              </CardContent>
              <div className="p-6 border-t border-[#E5E5EA] bg-[#F2F2F7] flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowStatusModal(false)} className="h-11 px-6 rounded-xl font-bold border-[#E5E5EA]">
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#007AFF] hover:bg-[#0062CC] text-white h-11 px-6 rounded-xl font-bold">
                  Save Status
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}

function MetricCard({ title, value, subtext, icon: Icon, color, iconColor }: any) {
  return (
    <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden">
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm font-bold text-[#1D1D1F]">{title}</p>
          <div className={`p-2 rounded-xl shrink-0 ${color} ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div>
          <p className="font-extrabold text-[#1D1D1F] text-3xl leading-tight">{value}</p>
          <p className="text-xs text-[#6E6E73] mt-1 font-medium">{subtext}</p>
        </div>
      </CardContent>
    </Card>
  );
}
