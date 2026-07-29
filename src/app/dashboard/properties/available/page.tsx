"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, RefreshCw, MapPin, Building, BedDouble, Bath, Maximize, LayoutGrid, List, AlignJustify, MoreVertical, Eye, Edit, Trash2, Home, DollarSign, Activity, Square, Plus } from "lucide-react";
import { toast } from "sonner";

export default function AvailableUnitsPage() {
  const router = useRouter();
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/units");
      if (res.ok) {
        const data = await res.json();
        // Only keep vacant units
        setUnits(data.filter((u: any) => u.status === "VACANT"));
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

  // Stats calculation
  const totalAvailable = units.length;
  
  let totalRent = 0;
  let minRent = Infinity;
  let maxRent = 0;
  let totalSqft = 0;
  let minSqft = Infinity;
  let maxSqft = 0;
  
  const typeCounts: Record<string, number> = {};

  units.forEach(u => {
    const rent = Number(u.rentAmount);
    totalRent += rent;
    if (rent < minRent) minRent = rent;
    if (rent > maxRent) maxRent = rent;
    
    const sqft = Number(u.sqFootage);
    totalSqft += sqft;
    if (sqft < minSqft) minSqft = sqft;
    if (sqft > maxSqft) maxSqft = sqft;
    
    const t = u.type || "Apartment";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  const avgRent = totalAvailable > 0 ? (totalRent / totalAvailable) : 0;
  const avgSqft = totalAvailable > 0 ? (totalSqft / totalAvailable) : 0;
  
  let mostCommonType = "None";
  let highestTypeCount = 0;
  Object.entries(typeCounts).forEach(([type, count]) => {
    if (count > highestTypeCount) {
      highestTypeCount = count;
      mostCommonType = type;
    }
  });

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1D1D1F]">Available Units</h1>
          <p className="text-[#6E6E73] mt-1">Individual units currently available for rent</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchUnits}
            disabled={loading}
            className="bg-white border border-[#E5E5EA] shadow-sm text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-xl flex items-center gap-2 font-semibold h-11 px-5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/dashboard/properties/new">
            <Button className="bg-[#007AFF] hover:bg-[#0062CC] text-white shadow-sm rounded-xl flex items-center gap-2 font-semibold h-11 px-5">
              <Plus className="h-5 w-5" />
              Add Property
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Available Units" 
          value={totalAvailable} 
          subtext={`Across ${new Set(units.map(u => u.propertyId)).size} properties`} 
          Icon={Home} 
          iconBg="bg-[#DCFCE7]" iconColor="text-[#22C55E]" 
        />
        <StatCard 
          title="Average Rent" 
          value={`$${avgRent.toFixed(2)}`} 
          subtext={totalAvailable > 0 ? `Range: $${minRent} - $${maxRent}` : "No data"} 
          Icon={DollarSign} 
          iconBg="bg-[#DCFCE7]" iconColor="text-[#22C55E]" 
        />
        <StatCard 
          title="Most Common Type" 
          value={mostCommonType} 
          subtext={totalAvailable > 0 ? `${highestTypeCount} units available` : "No data"} 
          Icon={Building} 
          iconBg="bg-[#E0F2FE]" iconColor="text-[#0EA5E9]" 
        />
        <StatCard 
          title="Average Size" 
          value={`${avgSqft.toFixed(0)} ft²`} 
          subtext={totalAvailable > 0 ? `Range: ${minSqft} - ${maxSqft} ft²` : "No data"} 
          Icon={Square} 
          iconBg="bg-[#F0FDF4]" iconColor="text-[#4ADE80]" 
        />
      </div>

      <div className="bg-white border border-[#E5E5EA] rounded-2xl shadow-sm overflow-hidden mt-8">
        {/* Table Header */}
        <div className="p-5 border-b border-[#E5E5EA] bg-[#F2F2F7]/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#DCFCE7] text-[#22C55E] rounded-xl border border-[#bbf7d0]">
              <CheckCircleIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-[#1D1D1F] text-lg">Available Units</h2>
              <p className="text-xs text-[#6E6E73]">Individual units currently available for rent</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-[#E5E5EA] rounded-xl p-1 shadow-sm">
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-[#007AFF] text-white shadow-sm" : "text-[#94A3B8] hover:text-[#1D1D1F]"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "table" ? "bg-[#007AFF] text-white shadow-sm" : "text-[#94A3B8] hover:text-[#1D1D1F]"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="p-5 border-b border-[#E5E5EA] flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input
              placeholder="Search available units..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-[#F2F2F7] border-[#E5E5EA] rounded-xl focus-visible:ring-[#007AFF]"
            />
          </div>
          <select className="h-11 bg-white border border-[#E5E5EA] rounded-xl px-4 text-sm text-[#1D1D1F] outline-none cursor-pointer min-w-[120px]">
            <option>All Types</option>
          </select>
          <select className="h-11 bg-white border border-[#E5E5EA] rounded-xl px-4 text-sm text-[#1D1D1F] outline-none cursor-pointer min-w-[120px]">
            <option>Any Beds</option>
          </select>
          <select className="h-11 bg-white border border-[#E5E5EA] rounded-xl px-4 text-sm text-[#1D1D1F] outline-none cursor-pointer min-w-[120px]">
            <option>Any Baths</option>
          </select>
          <select className="h-11 bg-white border border-[#E5E5EA] rounded-xl px-4 text-sm text-[#1D1D1F] outline-none cursor-pointer min-w-[120px]">
            <option>All Units</option>
          </select>
        </div>

        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#E5E5EA] hover:bg-transparent">
                  <TableHead className="text-[#6E6E73] font-bold text-xs uppercase tracking-wider py-4 pl-6">Unit</TableHead>
                  <TableHead className="text-[#6E6E73] font-bold text-xs uppercase tracking-wider">Property</TableHead>
                  <TableHead className="text-[#6E6E73] font-bold text-xs uppercase tracking-wider">Location</TableHead>
                  <TableHead className="text-[#6E6E73] font-bold text-xs uppercase tracking-wider">Details</TableHead>
                  <TableHead className="text-[#6E6E73] font-bold text-xs uppercase tracking-wider">Rent</TableHead>
                  <TableHead className="text-[#6E6E73] font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnits.map((u) => (
                  <TableRow key={u.id} className="border-[#E5E5EA] hover:bg-[#F2F2F7]/80 transition-colors">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                          {u.images && u.images.length > 0 ? (
                             <img src={u.images[0]} alt={u.name} className="h-full w-full object-cover" />
                          ) : (
                             <div className="h-full w-full bg-[#E5E5EA] flex items-center justify-center">
                               <Home className="h-5 w-5 text-[#94A3B8]" />
                             </div>
                          )}
                        </div>
                        <div>
                          <p className="font-extrabold text-[#1D1D1F] text-sm">{u.name}</p>
                          <p className="text-xs text-[#6E6E73] font-medium mt-0.5">{u.type || "Apartment"} • Floor {u.floor || 1}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-[#1D1D1F] text-sm">{u.property?.name}</span>
                        <span className="text-[11px] text-[#6E6E73]">{u.property?.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 font-semibold text-[#1D1D1F] text-sm">
                          <MapPin className="h-3 w-3 text-[#94A3B8]" />
                          {u.property?.city}, {u.property?.country}
                        </span>
                        <span className="text-[11px] text-[#6E6E73] ml-4 mt-0.5">{u.property?.address}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3 text-xs text-[#1D1D1F] font-bold">
                          <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5 text-[#94A3B8]" /> {u.rooms}</span>
                          <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5 text-[#94A3B8]" /> {u.bathrooms || 1}</span>
                        </div>
                        <span className="text-[11px] text-[#6E6E73] font-medium">{u.sqFootage} sq ft</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-[#1D1D1F] text-sm">${Number(u.rentAmount).toFixed(2)}</span>
                        <span className="text-[11px] text-[#6E6E73] mt-0.5">/month</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 text-[#94A3B8] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] inline-flex items-center justify-center rounded-lg">
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl border-[#E5E5EA]">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/properties/${u.propertyId}/units/${u.id}`)} className="cursor-pointer font-semibold text-[#1D1D1F]">
                            <Eye className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/properties/${u.propertyId}/edit`)} className="cursor-pointer font-semibold text-[#1D1D1F]">
                            <Edit className="mr-2 h-4 w-4 text-[#94A3B8]" /> Edit Unit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUnits.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-[#6E6E73]">
                      No available units found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredUnits.map((u) => (
              <div key={u.id} className="border border-[#E5E5EA] bg-white rounded-[20px] overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col">
                <div className="relative h-[200px] bg-[#F2F2F7] overflow-hidden">
                  {u.images && u.images.length > 0 ? (
                    <img src={u.images[0]} alt={u.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[#94A3B8]">
                      <Home className="h-10 w-10 opacity-50" />
                    </div>
                  )}
                  
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-[#DCFCE7] text-[#16A34A] hover:bg-[#DCFCE7] border-0 rounded-full px-3 py-1 font-bold text-xs shadow-sm">Available</Badge>
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-white/90 text-[#475569] hover:bg-white border-0 shadow-sm rounded-full px-3 py-1 font-bold text-xs backdrop-blur-md flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5" />
                      {u.type || "Apartment"}
                    </Badge>
                  </div>
                  
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                    <button onClick={() => router.push(`/dashboard/properties/${u.propertyId}/units/${u.id}`)} className="w-10 h-10 bg-white text-[#1D1D1F] rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                      <Eye className="h-5 w-5" />
                    </button>
                    <button onClick={() => router.push(`/dashboard/properties/${u.propertyId}/edit`)} className="w-10 h-10 bg-white text-[#1D1D1F] rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                      <Edit className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-extrabold text-[#1D1D1F] text-lg leading-tight">Unit {u.name}</h3>
                  <p className="text-sm text-[#6E6E73] font-medium mt-1 truncate">{u.property?.name}</p>
                  
                  <div className="flex items-center gap-1.5 text-sm text-[#6E6E73] mt-3 font-medium">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="truncate">{u.property?.city}, {u.property?.country}</span>
                  </div>
                  
                  <div className="mt-4 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-4 text-[#1D1D1F] font-bold text-sm">
                      <span className="flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-[#94A3B8]" /> {u.rooms} Beds</span>
                      <span className="flex items-center gap-1.5"><Bath className="h-4 w-4 text-[#94A3B8]" /> {u.bathrooms || 1} Baths</span>
                    </div>
                    <span className="text-xs text-[#6E6E73] font-medium">Size: {u.sqFootage} sq ft</span>
                  </div>
                  
                  <div className="mt-5 pt-4 border-t border-[#E5E5EA] flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="font-extrabold text-[#1D1D1F] text-base">${Number(u.rentAmount).toFixed(2)} <span className="text-xs text-[#6E6E73] font-medium">/month</span></p>
                      <p className="text-[11px] font-bold text-[#16A34A] mt-0.5">Vacant Unit</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 p-0 text-[#94A3B8] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] inline-flex items-center justify-center rounded-lg">
                        <MoreVertical className="h-5 w-5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-xl border-[#E5E5EA]">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/properties/${u.propertyId}/units/${u.id}`)} className="cursor-pointer font-semibold text-[#1D1D1F]">
                          <Eye className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/properties/${u.propertyId}/edit`)} className="cursor-pointer font-semibold text-[#1D1D1F]">
                          <Edit className="mr-2 h-4 w-4 text-[#94A3B8]" /> Edit Unit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
            {filteredUnits.length === 0 && !loading && (
              <div className="col-span-full text-center py-10 text-[#6E6E73]">
                No available units found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, subtext, Icon, iconBg, iconColor }: any) {
  return (
    <Card className="bg-white border border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm font-extrabold text-[#1D1D1F] leading-tight pr-4">{title}</p>
          <div className={`p-2 rounded-full ${iconBg} ${iconColor} shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div>
          <h3 className="text-3xl font-black text-[#1D1D1F] tracking-tight">{value}</h3>
          <p className="text-[11px] text-[#6E6E73] mt-1.5 font-semibold uppercase">{subtext}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
