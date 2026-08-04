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
import { useSession } from "next-auth/react";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { PaginationBar } from "@/components/ui/PaginationBar";

export default function TenantsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isOwner = (session?.user as any)?.role === "OWNER";
  const { allowed: moduleAllowed, loading: moduleLoading } = useModuleAccess("tenants");
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, viewMode]);
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
  const pendingTenants = tenants.filter(t => t.leases?.length === 0).length;
  const thisMonth = tenants.filter(t => new Date(t.createdAt).getMonth() === new Date().getMonth()).length;

  return (
    <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tenants</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Manage tenant applications, directory and profiles</p>
        </div>
        {!checkingProperties && properties.some(p => p.approvalStatus === "APPROVED") ? (
          <Link href="/dashboard/tenants/new">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-xs rounded-xl h-9 px-4 text-xs font-black flex items-center gap-2 cursor-pointer">
              <Plus className="h-4 w-4" /> Add Tenant
            </Button>
          </Link>
        ) : (
          <Button disabled className="bg-slate-100 text-slate-400 border border-slate-200 shadow-xs rounded-xl h-9 px-4 text-xs font-bold flex items-center gap-2 cursor-not-allowed">
            <Plus className="h-4 w-4" /> Add Tenant (Locked)
          </Button>
        )}
      </div>

      {!checkingProperties && !properties.some(p => p.approvalStatus === "APPROVED") && (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-900 rounded-xl shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-950 text-base">Tenant Creation Suspended</h3>
              <p className="text-amber-900 text-xs mt-0.5 font-semibold leading-relaxed">
                You must have at least one approved property on the platform before you can register new tenant profiles.
              </p>
            </div>
          </div>
          <Link href="/dashboard/properties">
            <Button type="button" className="bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold whitespace-nowrap px-4 py-2 h-9 text-xs shrink-0 shadow-xs border-0">
              View Properties
            </Button>
          </Link>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Tenants" value={totalTenants} subtext="All tenant profiles" icon={Users} variant="blue" />
        <KpiCard title="Active Tenants" value={activeTenants} subtext="Currently living in properties" icon={UserCheck} variant="emerald" />
        <KpiCard title="Pending Review" value={pendingTenants} subtext="Awaiting background check" icon={Clock} variant="amber" />
        <KpiCard title="This Month" value={thisMonth} subtext="New applications" icon={CalendarDays} variant="purple" />
      </div>

      {/* Main Content Area */}
      <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-slate-100 text-slate-800 border border-slate-200/80 rounded-xl flex items-center justify-center shrink-0">
              <Users className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base leading-tight">Tenants ({filteredTenants.length})</h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Showing {filteredTenants.length} of {tenants.length} tenants</p>
            </div>
          </div>
          <div className="flex items-center bg-slate-100 border border-slate-200/80 p-1 rounded-xl shadow-2xs">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === "table" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <List className="h-3.5 w-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === "cards" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Cards
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-3 border-b border-slate-100">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search tenants by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-white border-slate-200 rounded-xl font-semibold text-xs text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 shadow-xs"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-semibold text-slate-900 outline-none min-w-[180px] shadow-xs cursor-pointer"
          >
            <option>All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Approved">Approved</option>
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-900 border-r-transparent mb-2"></div>
            <p className="text-xs text-slate-500 font-bold">Loading tenants...</p>
          </div>
        )}

        {/* TABLE VIEW */}
        {!loading && viewMode === "table" && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200/80 bg-slate-50/70 hover:bg-slate-50/70">
                  <TableHead className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] py-3.5 pl-6">Tenant</TableHead>
                  <TableHead className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Status</TableHead>
                  <TableHead className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Contact</TableHead>
                  <TableHead className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Employment</TableHead>
                  <TableHead className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] py-3.5 text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-slate-500 font-medium">
                      No tenants found.
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const start = (currentPage - 1) * itemsPerPage;
                    const paginated = filteredTenants.slice(start, start + itemsPerPage);
                    return paginated.map((t) => {
                      const hasActiveLease = t.leases?.some((l:any) => l.status === "ACTIVE");
                      const badgeConfig = hasActiveLease || t.tenantStatus === "Active" 
                        ? { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Active" }
                        : t.tenantStatus === "Approved"
                        ? { bg: "bg-slate-100 text-slate-800 border-slate-200", label: "Approved" }
                        : { bg: "bg-amber-50 text-amber-800 border-amber-200", label: t.tenantStatus || "Pending Review" };

                      return (
                        <TableRow key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="py-3.5 pl-6">
                            <div className="flex items-center gap-3">
                              {t.avatar ? (
                                <img
                                  src={t.avatar}
                                  alt={t.name || "Tenant Avatar"}
                                  className="h-9 w-9 rounded-xl object-cover shrink-0 border border-slate-200"
                                />
                              ) : (
                                <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-black text-xs shrink-0 border border-slate-200/80">
                                  {t.name ? t.name.charAt(0).toUpperCase() : "U"}
                                </div>
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="font-extrabold text-slate-900 text-xs truncate">{t.name}</span>
                                <span className="text-[11px] text-slate-500 font-medium truncate">{t.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <Badge className={`${badgeConfig.bg} border rounded-lg px-2.5 py-0.5 font-extrabold text-[10px] uppercase shadow-2xs whitespace-nowrap`}>
                              {badgeConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="text-xs font-extrabold text-slate-900">{t.phone || "-"}</div>
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">{t.email}</div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="text-xs font-extrabold text-slate-900 truncate max-w-[150px]" title={t.position || t.employmentStatus}>
                              {t.employmentStatus === "EMPLOYED" 
                                ? (t.position || "Employed") 
                                : t.employmentStatus 
                                  ? t.employmentStatus.charAt(0).toUpperCase() + t.employmentStatus.slice(1).toLowerCase().replace('_', ' ') 
                                  : "-"}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate max-w-[150px]" title={`${t.employer || ''} ${t.annualIncome ? `$${t.annualIncome}/yr` : ''}`}>
                              {t.employer ? t.employer : "-"} {t.annualIncome ? `• $${t.annualIncome.toLocaleString()}/yr` : ""}
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5 text-right pr-6">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center rounded-xl transition-colors cursor-pointer">
                                <MoreVertical className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-2xl border-slate-200 p-1.5 shadow-xl">
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/tenants/${t.id}`)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                                  <Eye className="mr-2 h-4 w-4 text-slate-500" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/tenants/${t.id}/edit`)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                                  <Edit className="mr-2 h-4 w-4 text-slate-500" /> Edit Tenant
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openStatusModal(t)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                                  <RefreshCw className="mr-2 h-4 w-4 text-slate-500" /> Change Status
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => { if (!hasActiveLease) handleDelete(t.id) }} 
                                  disabled={hasActiveLease}
                                  className={`cursor-pointer font-bold text-xs rounded-xl py-2 ${hasActiveLease ? 'text-slate-400 cursor-not-allowed opacity-50' : 'text-rose-600'}`}
                                >
                                  <Trash2 className="mr-2 h-4 w-4 text-rose-600" /> Delete Tenant
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* CARDS VIEW */}
        {!loading && viewMode === "cards" && (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 bg-slate-50/50">
            {filteredTenants.length === 0 ? (
              <div className="col-span-full py-16 text-center border border-dashed border-slate-200 rounded-3xl bg-white">
                <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-extrabold text-slate-900">No Tenants Found</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Try adjusting your search or add a new tenant.</p>
              </div>
            ) : (
              (() => {
                const start = (currentPage - 1) * itemsPerPage;
                const paginated = filteredTenants.slice(start, start + itemsPerPage);
                return paginated.map((t) => {
                  const hasActiveLease = t.leases?.some((l:any) => l.status === "ACTIVE");
                  const badgeConfig = hasActiveLease || t.tenantStatus === "Active" 
                        ? { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Active" }
                        : t.tenantStatus === "Approved"
                        ? { bg: "bg-slate-100 text-slate-800 border-slate-200", label: "Approved" }
                        : { bg: "bg-amber-50 text-amber-800 border-amber-200", label: t.tenantStatus || "Pending Review" };
                  
                  return (
                    <div key={t.id} className="bg-white border border-slate-200 rounded-3xl p-5 hover:shadow-md transition-all relative group flex flex-col">
                      <div className="absolute top-4 right-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center rounded-xl transition-colors cursor-pointer">
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-2xl border-slate-200 p-1.5 shadow-xl">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/tenants/${t.id}`)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                              <Eye className="mr-2 h-4 w-4 text-slate-500" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/tenants/${t.id}/edit`)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                              <Edit className="mr-2 h-4 w-4 text-slate-500" /> Edit Tenant
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openStatusModal(t)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                              <RefreshCw className="mr-2 h-4 w-4 text-slate-500" /> Change Status
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => { if (!hasActiveLease) handleDelete(t.id) }} 
                              disabled={hasActiveLease}
                              className={`cursor-pointer font-bold text-xs rounded-xl py-2 ${hasActiveLease ? 'text-slate-400 cursor-not-allowed opacity-50' : 'text-rose-600'}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4 text-rose-600" /> Delete Tenant
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-col items-center text-center mt-1 mb-4">
                        {t.avatar ? (
                          <img
                            src={t.avatar}
                            alt={t.name || "Tenant Avatar"}
                            className="h-14 w-14 rounded-2xl object-cover mb-3 border border-slate-200 shadow-2xs"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center font-black text-xl mb-3 border border-slate-200">
                            {t.name ? t.name.charAt(0).toUpperCase() : "U"}
                          </div>
                        )}
                        <h3 className="font-extrabold text-slate-900 text-base truncate w-full">{t.name}</h3>
                        <p className="text-xs text-slate-500 font-medium truncate w-full mt-0.5">{t.email}</p>
                        <div className="mt-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 w-full text-center">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {t.employmentStatus === "EMPLOYED" ? t.position || "Employed" : t.employmentStatus ? t.employmentStatus.charAt(0).toUpperCase() + t.employmentStatus.slice(1).toLowerCase().replace('_', ' ') : "Employment N/A"}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                            {t.employer ? t.employer : "No details"} {t.annualIncome ? `• $${t.annualIncome.toLocaleString()}/yr` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto pt-3.5 border-t border-slate-100 flex justify-between items-center">
                        <Badge className={`${badgeConfig.bg} border rounded-lg px-2.5 py-0.5 font-extrabold text-[10px] uppercase shadow-2xs`}>
                          {badgeConfig.label}
                        </Badge>
                        <span className="text-xs font-bold text-slate-700">{t.phone || "-"}</span>
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        )}

        <PaginationBar
          currentPage={currentPage}
          totalPages={Math.ceil(filteredTenants.length / itemsPerPage) || 1}
          totalItems={filteredTenants.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          itemLabel="tenants"
        />
      </Card>

      {/* Change Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <Card className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-extrabold text-slate-900 text-base">Change Tenant Status</h2>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-lg cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleStatusChange}>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">New Status</label>
                  <select 
                    value={newStatus} 
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-semibold text-slate-900 outline-none shadow-xs"
                  >
                    <option value="Active">Activate Tenant</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Terminated">Terminate Tenant</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Reason / Notes (Optional)</label>
                  <textarea 
                    rows={3}
                    placeholder="Enter reason for status change..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none resize-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-xs"
                  ></textarea>
                </div>
              </CardContent>
              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowStatusModal(false)} className="h-9 px-4 rounded-xl font-bold text-xs border-slate-200 text-slate-700 bg-white">
                  Cancel
                </Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-5 rounded-xl font-black text-xs shadow-xs">
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
