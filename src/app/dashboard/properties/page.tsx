"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Building,
  RefreshCw,
  Plus,
  CheckCircle2,
  Users,
  Wrench,
  Search,
  LayoutGrid,
  List,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  MapPin
} from "lucide-react";
import { toast } from "sonner";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { PaginationBar } from "@/components/ui/PaginationBar";

export default function PropertiesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isOwner = (session?.user as any)?.role === "OWNER";
  const { allowed: moduleAllowed, loading: moduleLoading } = useModuleAccess("properties");
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter, viewMode]);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/properties");
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      } else {
        toast.error("Failed to load properties");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading properties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this property? This action cannot be undone.")) return;
    
    try {
      const res = await fetch(`/api/properties?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Property deleted successfully");
        setProperties(properties.filter(p => p.id !== id));
      } else {
        toast.error("Failed to delete property");
      }
    } catch (err) {
      toast.error("Error deleting property");
    }
  };

  const availableProperties = properties.filter((p) => p.status === "AVAILABLE").length;
  
  let occupiedUnits = 0;
  properties.forEach((p) => {
    p.units?.forEach((u: any) => {
      if (u.status === "OCCUPIED") occupiedUnits++;
    });
  });

  const underMaintenance = properties.filter((p) => p.status === "MAINTENANCE").length;

  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "All Types" || (p.type && p.type.toLowerCase() === typeFilter.toLowerCase());
    const matchesStatus = statusFilter === "All Statuses" || (p.status && p.status.toLowerCase() === statusFilter.toLowerCase());
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Properties</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Manage your property portfolio and building listings</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/listings">
            <Button
              variant="outline"
              className="h-9 px-3.5 rounded-xl font-bold text-xs text-slate-700 bg-white border-slate-200 shadow-xs hover:bg-slate-50 cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              View Public Search Map
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={fetchProperties}
            disabled={loading}
            className="h-9 px-3.5 rounded-xl font-bold text-xs text-slate-700 bg-white border-slate-200 shadow-xs hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/dashboard/properties/new">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-xs rounded-xl h-9 px-4 text-xs font-black flex items-center gap-1.5 cursor-pointer">
              <Plus className="h-4 w-4" />
              Add Property
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Properties" value={properties.length} subtext="All property listings" icon={Building} variant="blue" />
        <KpiCard title="Available Properties" value={availableProperties} subtext="Ready for rent" icon={CheckCircle2} variant="emerald" />
        <KpiCard title="Occupied Properties" value={occupiedUnits} subtext="Currently rented units" icon={Users} variant="indigo" />
        <KpiCard title="Under Maintenance" value={underMaintenance} subtext="Needs attention" icon={Wrench} variant="amber" />
      </div>

      {/* Main Content Area */}
      <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
        {/* Table Header / View Mode */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-slate-100 text-slate-800 border border-slate-200/80 rounded-xl flex items-center justify-center shrink-0">
              <Building className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base leading-tight">Properties</h2>
              <p className="text-xs text-slate-500 font-medium">Showing {filteredProperties.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredProperties.length)} of {properties.length} properties</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200/80 rounded-xl p-1 shadow-2xs">
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === "grid" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"}`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === "table" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"}`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search properties by name or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-white border-slate-200 rounded-xl font-semibold text-xs text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 shadow-xs"
            />
          </div>
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-semibold text-slate-900 outline-none cursor-pointer min-w-[140px] shadow-xs"
          >
            <option>All Types</option>
            <option value="Apartment">Apartment</option>
            <option value="House">House</option>
            <option value="Commercial">Commercial</option>
          </select>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-semibold text-slate-900 outline-none cursor-pointer min-w-[140px] shadow-xs"
          >
            <option>All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>

        {/* Dynamic View (Table or Grid) */}
        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200/80 bg-slate-50/70 hover:bg-slate-50/70">
                  <TableHead className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] py-3.5 pl-6">Property</TableHead>
                  <TableHead className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Status</TableHead>
                  <TableHead className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Location</TableHead>
                  <TableHead className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Units</TableHead>
                  <TableHead className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Rent Range</TableHead>
                  <TableHead className="w-12 py-3.5 pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProperties.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-slate-500 font-medium">
                      No properties found matching criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const start = (currentPage - 1) * itemsPerPage;
                    const paginated = filteredProperties.slice(start, start + itemsPerPage);
                    return paginated.map((p) => {
                      const totalUnits = p.units?.length || 0;
                      const availableUnitsCount = p.units?.filter((u: any) => u.status === "VACANT").length || 0;
                      const occupiedUnitsCount = p.units?.filter((u: any) => u.status === "OCCUPIED").length || 0;
                      
                      let minRent = Infinity;
                      let maxRent = 0;
                      p.units?.forEach((u: any) => {
                        const rent = Number(u.rentAmount);
                        if (rent < minRent) minRent = rent;
                        if (rent > maxRent) maxRent = rent;
                      });
                      const rentDisplay = totalUnits > 0 && minRent !== Infinity ? `$${minRent.toFixed(0)} - $${maxRent.toFixed(0)}` : "N/A";

                      return (
                        <TableRow key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                          <TableCell className="py-3.5 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="h-11 w-11 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/80">
                                {p.coverPhoto ? (
                                  <img src={p.coverPhoto} alt={p.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-400">
                                    <Building className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                              <div 
                                className="cursor-pointer" 
                                onClick={() => router.push(`/dashboard/properties/${p.id}`)}
                              >
                                <p className="font-extrabold text-slate-900 text-xs group-hover:text-slate-700 transition-colors">{p.name}</p>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">ID: {p.id.slice(0, 8)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex flex-col gap-1 items-start">
                              <div className="flex flex-wrap gap-1">
                                {p.status === "AVAILABLE" ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[10px] uppercase rounded-lg px-2 py-0.5 shadow-2xs">{p.status}</Badge>
                                ) : p.status === "OCCUPIED" ? (
                                  <Badge className="bg-slate-100 text-slate-800 border border-slate-200 font-extrabold text-[10px] uppercase rounded-lg px-2 py-0.5 shadow-2xs">{p.status}</Badge>
                                ) : (
                                  <Badge className="bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-[10px] uppercase rounded-lg px-2 py-0.5 shadow-2xs">{p.status}</Badge>
                                )}
                                {p.approvalStatus === "PENDING" && (
                                  <Badge className="bg-amber-50 text-amber-800 border border-amber-200 font-extrabold text-[10px] uppercase rounded-lg px-2 py-0.5 shadow-2xs">Under Review</Badge>
                                )}
                                {p.approvalStatus === "APPROVED" && (
                                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[10px] uppercase rounded-lg px-2 py-0.5 shadow-2xs">Approved</Badge>
                                )}
                                {p.approvalStatus === "REJECTED" && (
                                  <Badge className="bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-[10px] uppercase rounded-lg px-2 py-0.5 shadow-2xs">Rejected</Badge>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {p.type} {p.type === "Commercial" && p.zoningType && <span className="text-slate-700 font-bold ml-1">• {p.zoningType}</span>}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex flex-col text-slate-900 font-semibold text-xs">
                              <span className="flex items-center gap-1 font-bold">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {p.city}, {p.country}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium ml-4.5 mt-0.5">{p.address}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-900 text-xs">{totalUnits} Units</span>
                              <div className="flex gap-2 text-[10px] mt-0.5 font-bold">
                                <span className="text-emerald-700">{availableUnitsCount} avail</span>
                                <span className="text-slate-600">{occupiedUnitsCount} occ</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-900 text-xs">{rentDisplay}</span>
                              <span className="text-[10px] text-slate-500 font-semibold mt-0.5">/month</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5 pr-6 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center rounded-xl transition-colors cursor-pointer">
                                <MoreVertical className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 rounded-2xl border-slate-200 p-1.5 shadow-xl">
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/properties/${p.id}`)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                                  <Eye className="mr-2 h-4 w-4 text-slate-500" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/properties/${p.id}/edit`)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                                  <Edit className="mr-2 h-4 w-4 text-slate-500" /> Edit Property
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(p.id)} className="cursor-pointer font-bold text-xs text-rose-600 rounded-xl py-2">
                                  <Trash2 className="mr-2 h-4 w-4 text-rose-600" /> Delete
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
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProperties.length === 0 && !loading ? (
              <div className="col-span-full text-center py-16 text-slate-500 font-medium">
                No properties found matching criteria.
              </div>
            ) : (
              (() => {
                const start = (currentPage - 1) * itemsPerPage;
                const paginated = filteredProperties.slice(start, start + itemsPerPage);
                return paginated.map((p) => {
                  const totalUnits = p.units?.length || 0;
                  const availableUnitsCount = p.units?.filter((u: any) => u.status === "VACANT").length || 0;
                  
                  let minRent = Infinity;
                  let maxRent = 0;
                  p.units?.forEach((u: any) => {
                    const rent = Number(u.rentAmount);
                    if (rent < minRent) minRent = rent;
                    if (rent > maxRent) maxRent = rent;
                  });
                  const rentDisplay = totalUnits > 0 && minRent !== Infinity ? `$${minRent.toFixed(0)} - $${maxRent.toFixed(0)}` : "N/A";

                  return (
                    <div key={p.id} className="border border-slate-200 bg-white rounded-3xl overflow-hidden hover:shadow-md transition-all duration-300 group flex flex-col">
                      {/* Image Header area */}
                      <div className="relative h-[180px] bg-slate-100 overflow-hidden">
                        {p.coverPhoto ? (
                          <img src={p.coverPhoto} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-400">
                            <Building className="h-10 w-10 opacity-50" />
                          </div>
                        )}
                        
                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                          {p.status === "AVAILABLE" ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[10px] uppercase rounded-lg px-2.5 py-0.5 shadow-2xs">Available</Badge>
                          ) : p.status === "OCCUPIED" ? (
                            <Badge className="bg-slate-100 text-slate-800 border border-slate-200 font-extrabold text-[10px] uppercase rounded-lg px-2.5 py-0.5 shadow-2xs">Occupied</Badge>
                          ) : (
                            <Badge className="bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-[10px] uppercase rounded-lg px-2.5 py-0.5 shadow-2xs">{p.status}</Badge>
                          )}
                          {p.approvalStatus === "PENDING" && (
                            <Badge className="bg-amber-50 text-amber-800 border border-amber-200 font-extrabold text-[10px] uppercase rounded-lg px-2.5 py-0.5 shadow-2xs">Under Review</Badge>
                          )}
                          {p.approvalStatus === "APPROVED" && (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[10px] uppercase rounded-lg px-2.5 py-0.5 shadow-2xs">Approved</Badge>
                          )}
                          {p.approvalStatus === "REJECTED" && (
                            <Badge className="bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-[10px] uppercase rounded-lg px-2.5 py-0.5 shadow-2xs">Rejected</Badge>
                          )}
                        </div>
                        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                          <Badge className="bg-white/90 text-slate-800 border border-slate-200/80 shadow-2xs rounded-lg px-2.5 py-0.5 font-extrabold text-[10px] uppercase backdrop-blur-md flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {p.type || "Apartment"}
                          </Badge>
                        </div>
                        
                        {/* Hover Overlay Buttons */}
                        <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2.5">
                          <button onClick={() => router.push(`/dashboard/properties/${p.id}`)} className="w-9 h-9 bg-white text-slate-900 rounded-xl flex items-center justify-center hover:scale-105 transition-transform shadow-md cursor-pointer">
                            <Eye className="h-4.5 w-4.5" />
                          </button>
                          <button onClick={() => router.push(`/dashboard/properties/${p.id}/edit`)} className="w-9 h-9 bg-white text-slate-900 rounded-xl flex items-center justify-center hover:scale-105 transition-transform shadow-md cursor-pointer">
                            <Edit className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Card Body */}
                      <div 
                        className="p-5 flex-1 flex flex-col cursor-pointer" 
                        onClick={() => router.push(`/dashboard/properties/${p.id}`)}
                      >
                        <h3 className="font-extrabold text-slate-900 text-base leading-tight group-hover:text-slate-700 transition-colors">{p.name}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1 truncate">{p.description || "No description provided"}</p>
                        
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-3 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{p.city}, {p.state}, {p.zip}</span>
                        </div>
                        
                        {/* Gray Units Box */}
                        <div className="mt-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 text-xs">{totalUnits} Units Total</span>
                            {availableUnitsCount > 0 && <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md">{availableUnitsCount} available</span>}
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">Type: {p.type || "Apartment"}</span>
                        </div>
                        
                        {/* Footer */}
                        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex flex-col">
                            <p className="font-black text-slate-900 text-sm">{rentDisplay} <span className="text-[11px] text-slate-500 font-medium">/mo</span></p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-7 w-7 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center rounded-xl transition-colors cursor-pointer">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 rounded-2xl border-slate-200 p-1.5 shadow-xl">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/properties/${p.id}`)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                                <Eye className="mr-2 h-4 w-4 text-slate-500" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/properties/${p.id}/edit`)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                                <Edit className="mr-2 h-4 w-4 text-slate-500" /> Edit Property
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(p.id)} className="cursor-pointer font-bold text-xs text-rose-600 rounded-xl py-2">
                                <Trash2 className="mr-2 h-4 w-4 text-rose-600" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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
          totalPages={Math.ceil(filteredProperties.length / itemsPerPage) || 1}
          totalItems={filteredProperties.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          itemLabel="properties"
        />
      </Card>
    </div>
  );
}
