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
import { Search, RefreshCw, MapPin, Building, BedDouble, Bath, LayoutGrid, List, AlignJustify, MoreVertical, Eye, Edit, Trash2, Home, DollarSign, Users, Square, Plus } from "lucide-react";
import { toast } from "sonner";
import { PaginationBar } from "@/components/ui/PaginationBar";

export default function UnitsPage() {
  const router = useRouter();
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, viewMode]);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/units");
      if (res.ok) {
        const data = await res.json();
        setUnits(data);
      } else {
        toast.error("Failed to fetch units");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const filteredUnits = units.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.property?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUnits = units.length;
  let occupiedCount = 0;
  let vacantCount = 0;
  let totalRent = 0;
  
  const typeCounts: Record<string, number> = {};

  units.forEach(u => {
    if (u.status === "OCCUPIED") occupiedCount++;
    if (u.status === "VACANT") vacantCount++;
    
    totalRent += Number(u.rentAmount || 0);
    
    const t = u.type || "Apartment";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  const avgRent = totalUnits > 0 ? (totalRent / totalUnits) : 0;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : 0;
  
  let mostCommonType = "None";
  let highestTypeCount = 0;
  Object.entries(typeCounts).forEach(([type, count]) => {
    if (count > highestTypeCount) {
      highestTypeCount = count;
      mostCommonType = type;
    }
  });

  return (
    <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">All Units</h1>
          <p className="text-xs text-[#6E6E73] font-normal mt-0.5">Manage all individual units across your portfolio</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={fetchUnits}
            disabled={loading}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 font-medium rounded-xl text-xs h-9 px-4 shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/dashboard/properties/new">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-9 px-4 rounded-xl shadow-xs transition-all cursor-pointer">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Property
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Total Units" 
          value={totalUnits} 
          subtext={`${vacantCount} Vacant`} 
          icon={Home} 
          variant="blue" 
        />
        <KpiCard 
          title="Average Rent" 
          value={`$${avgRent.toFixed(2)}`} 
          subtext="Across all properties" 
          icon={DollarSign} 
          variant="green" 
        />
        <KpiCard 
          title="Most Common" 
          value={mostCommonType} 
          subtext={`${highestTypeCount} units`} 
          icon={Building} 
          variant="purple" 
        />
        <KpiCard 
          title="Occupancy Rate" 
          value={`${occupancyRate}%`} 
          subtext={`${occupiedCount} Occupied`} 
          icon={Users} 
          variant="emerald" 
        />
      </div>

      {/* Directory Card */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden">
        {/* Card Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 shadow-2xs">
              <Home className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-base tracking-tight">Unit Directory</h2>
              <p className="text-xs text-[#6E6E73] font-normal">Showing {filteredUnits.length} units</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200/80 rounded-xl p-1 shadow-2xs">
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === "grid" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === "table" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search units..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-white border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus-visible:ring-slate-400 shadow-2xs"
            />
          </div>
          <select className="h-10 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-semibold text-slate-900 outline-none shadow-2xs cursor-pointer min-w-[120px]">
            <option>All Properties</option>
          </select>
          <select className="h-10 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-semibold text-slate-900 outline-none shadow-2xs cursor-pointer min-w-[120px]">
            <option>All Statuses</option>
            <option>Vacant</option>
            <option>Occupied</option>
          </select>
        </div>

        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="bg-slate-50/70 border-b border-slate-200/80">
                <TableRow>
                  <TableHead className="font-medium text-[11px] uppercase text-slate-500 py-3.5 px-6">Unit</TableHead>
                  <TableHead className="font-medium text-[11px] uppercase text-slate-500 py-3.5 px-6">Property</TableHead>
                  <TableHead className="font-medium text-[11px] uppercase text-slate-500 py-3.5 px-6">Status</TableHead>
                  <TableHead className="font-medium text-[11px] uppercase text-slate-500 py-3.5 px-6">Details</TableHead>
                  <TableHead className="font-medium text-[11px] uppercase text-slate-500 py-3.5 px-6">Rent</TableHead>
                  <TableHead className="font-medium text-[11px] uppercase text-slate-500 py-3.5 px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {filteredUnits.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-500 font-extrabold text-xs">
                      No units found.
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const start = (currentPage - 1) * itemsPerPage;
                    const paginated = filteredUnits.slice(start, start + itemsPerPage);
                    return paginated.map((u) => (
                      <TableRow key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                              {u.images && u.images.length > 0 ? (
                                 <img src={u.images[0]} alt={u.name} className="h-full w-full object-cover" />
                              ) : (
                                 <div className="h-full w-full bg-slate-100 flex items-center justify-center">
                                   <Home className="h-4 w-4 text-slate-400" />
                                 </div>
                              )}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 text-xs">{u.name}</p>
                              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{u.type || "Apartment"} • Floor {u.floor || 1}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 text-xs">{u.property?.name}</span>
                            <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                               <MapPin className="h-3 w-3 text-slate-400" />
                               {u.property?.city}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          {u.status === "VACANT" ? (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">VACANT</span>
                          ) : u.status === "OCCUPIED" ? (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">OCCUPIED</span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">{u.status}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-3 text-xs text-slate-900 font-extrabold">
                              <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5 text-slate-400" /> {u.rooms}</span>
                              <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5 text-slate-400" /> {u.bathrooms || 1}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-semibold">{u.sqFootage} sq ft</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-xs">${Number(u.rentAmount).toFixed(2)}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">/month</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center rounded-lg cursor-pointer">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-2xl border-slate-200 p-1 shadow-xl font-sans">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/properties/${u.propertyId}/units/${u.id}`)} className="cursor-pointer font-extrabold text-xs text-slate-900 rounded-xl">
                                <Eye className="mr-2 h-4 w-4 text-slate-400" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/properties/${u.propertyId}/edit`)} className="cursor-pointer font-extrabold text-xs text-slate-900 rounded-xl">
                                <Edit className="mr-2 h-4 w-4 text-slate-400" /> Edit Unit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ));
                  })()
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredUnits.length === 0 && !loading ? (
              <div className="col-span-full text-center py-10 text-slate-500 font-extrabold text-xs">
                No units found.
              </div>
            ) : (
              (() => {
                const start = (currentPage - 1) * itemsPerPage;
                const paginated = filteredUnits.slice(start, start + itemsPerPage);
                return paginated.map((u) => (
                  <div key={u.id} className="border border-slate-200 bg-white rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 group flex flex-col">
                    <div className="relative h-[180px] bg-slate-100 overflow-hidden">
                      {u.images && u.images.length > 0 ? (
                        <img src={u.images[0]} alt={u.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-400">
                          <Home className="h-8 w-8 opacity-50" />
                        </div>
                      )}
                      
                      <div className="absolute top-3 left-3">
                        {u.status === "VACANT" ? (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">Available</span>
                        ) : u.status === "OCCUPIED" ? (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">Occupied</span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">{u.status}</span>
                        )}
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="bg-white/90 text-slate-700 border border-slate-200/80 shadow-2xs rounded-md px-2.5 py-0.5 font-black text-[10px] uppercase tracking-wider backdrop-blur-md flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {u.type || "Apartment"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900 text-base tracking-tight">Unit {u.name}</h3>
                        <p className="text-xs text-[#6E6E73] font-normal mt-0.5 truncate">{u.property?.name}</p>
                        
                        <div className="flex items-center gap-1 text-xs text-[#6E6E73] font-normal mt-2.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{u.property?.city}, {u.property?.country}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">${Number(u.rentAmount).toFixed(2)} <span className="text-[10px] text-slate-500 font-semibold">/mo</span></p>
                        </div>
                        <Button onClick={() => router.push(`/dashboard/properties/${u.propertyId}/units/${u.id}`)} className="h-8 px-3 rounded-xl bg-slate-900 text-white font-black text-xs shadow-2xs hover:bg-slate-800 cursor-pointer">
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        )}

        <PaginationBar
          currentPage={currentPage}
          totalPages={Math.ceil(filteredUnits.length / itemsPerPage) || 1}
          totalItems={filteredUnits.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          itemLabel="units"
        />
      </div>
    </div>
  );
}

