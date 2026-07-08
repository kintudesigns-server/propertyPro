"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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

export default function PropertiesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

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
  }

  const availableProperties = properties.filter((p) => p.status === "AVAILABLE").length;
  
  let occupiedUnits = 0;
  properties.forEach((p) => {
    p.units?.forEach((u: any) => {
      if (u.status === "OCCUPIED") occupiedUnits++;
    });
  });

  const underMaintenance = properties.filter((p) => p.status === "MAINTENANCE").length;

  const filteredProperties = properties.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Properties</h1>
          <p className="text-[#64748B] mt-1">Manage your property portfolio</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/listings">
            <Button
              variant="outline"
              className="bg-white border border-[#E2E8F0] shadow-sm text-blue-600 hover:text-blue-700 hover:bg-[#EFF6FF] rounded-xl flex items-center gap-2 font-semibold h-11 px-5"
            >
              <Eye className="h-4 w-4" />
              View Public Search Map
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={fetchProperties}
            disabled={loading}
            className="bg-white border border-[#E2E8F0] shadow-sm text-[#0F172A] hover:bg-[#F8FAFC] rounded-xl flex items-center gap-2 font-semibold h-11 px-5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/dashboard/properties/new">
            <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm rounded-xl flex items-center gap-2 font-semibold h-11 px-5">
              <Plus className="h-5 w-5" />
              Add Property
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Properties" value={properties.length} subtext="All property listings" Icon={Building} iconBg="bg-[#EFF6FF]" iconColor="text-[#3B82F6]" />
        <StatCard title="Available Properties" value={availableProperties} subtext="Ready for rent" Icon={CheckCircle2} iconBg="bg-[#DCFCE7]" iconColor="text-[#22C55E]" />
        <StatCard title="Occupied Properties" value={occupiedUnits} subtext="Currently rented units" Icon={Users} iconBg="bg-[#E0F2FE]" iconColor="text-[#0EA5E9]" />
        <StatCard title="Under Maintenance" value={underMaintenance} subtext="Needs attention" Icon={Wrench} iconBg="bg-[#FEF9C3]" iconColor="text-[#EAB308]" />
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm mt-8 overflow-hidden">
        {/* Table Header / Filters */}
        <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#EFF6FF] text-[#3B82F6] rounded-xl">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-[#0F172A] text-lg">Properties</h2>
              <p className="text-xs text-[#64748B]">Showing 1 to {filteredProperties.length} of {properties.length} properties</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-[#E2E8F0] rounded-xl p-1 shadow-sm">
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-[#3B82F6] text-white shadow-sm" : "text-[#94A3B8] hover:text-[#0F172A]"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "table" ? "bg-[#3B82F6] text-white shadow-sm" : "text-[#94A3B8] hover:text-[#0F172A]"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="p-5 border-b border-[#E2E8F0] flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-[#F8FAFC] border-[#E2E8F0] rounded-xl focus-visible:ring-[#3B82F6]"
            />
          </div>
          <select className="h-11 bg-white border border-[#E2E8F0] rounded-xl px-4 text-sm text-[#0F172A] outline-none cursor-pointer min-w-[140px]">
            <option>All Types</option>
            <option>Apartment</option>
            <option>House</option>
            <option>Commercial</option>
          </select>
          <select className="h-11 bg-white border border-[#E2E8F0] rounded-xl px-4 text-sm text-[#0F172A] outline-none cursor-pointer min-w-[140px]">
            <option>All Statuses</option>
            <option>Available</option>
            <option>Occupied</option>
            <option>Maintenance</option>
          </select>
        </div>

        {/* Dynamic View (Table or Grid) */}
        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#E2E8F0] hover:bg-transparent">
                  <TableHead className="w-12 text-center"></TableHead>
                  <TableHead className="text-[#64748B] font-bold text-xs uppercase tracking-wider py-4">Property</TableHead>
                  <TableHead className="text-[#64748B] font-bold text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-[#64748B] font-bold text-xs uppercase tracking-wider">Location</TableHead>
                  <TableHead className="text-[#64748B] font-bold text-xs uppercase tracking-wider">Units</TableHead>
                  <TableHead className="text-[#64748B] font-bold text-xs uppercase tracking-wider">Rent</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProperties.map((p) => {
                  const totalUnits = p.units?.length || 0;
                  const availableUnits = p.units?.filter((u: any) => u.status === "VACANT").length || 0;
                  const occupiedUnits = p.units?.filter((u: any) => u.status === "OCCUPIED").length || 0;
                  
                  let minRent = Infinity;
                  let maxRent = 0;
                  p.units?.forEach((u: any) => {
                    const rent = Number(u.rentAmount);
                    if (rent < minRent) minRent = rent;
                    if (rent > maxRent) maxRent = rent;
                  });
                  const rentDisplay = totalUnits > 0 && minRent !== Infinity ? `$${minRent.toFixed(0)} - $${maxRent.toFixed(0)}` : "N/A";

                  return (
                    <TableRow key={p.id} className="border-[#E2E8F0] hover:bg-[#F8FAFC]/80 transition-colors group">
                      <TableCell className="text-center py-4">
                        <input type="checkbox" className="rounded text-[#3B82F6] border-[#CBD5E1] focus:ring-[#3B82F6] w-4 h-4 cursor-pointer" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                            {p.coverPhoto ? (
                              <img src={p.coverPhoto} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full bg-[#E2E8F0] flex items-center justify-center">
                                <Building className="h-5 w-5 text-[#94A3B8]" />
                              </div>
                            )}
                          </div>
                          <div 
                            className="cursor-pointer" 
                            onClick={() => router.push(`/dashboard/properties/${p.id}`)}
                          >
                            <p className="font-extrabold text-[#0F172A] text-sm group-hover:text-[#3B82F6] transition-colors">{p.name}</p>
                            <p className="text-xs text-[#64748B] font-medium mt-0.5">ID: {p.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <div className="flex flex-wrap gap-1">
                            {p.status === "AVAILABLE" ? (
                              <Badge className="bg-[#EFF6FF] text-[#3B82F6] hover:bg-[#EFF6FF] border-0 rounded-lg px-2 py-0.5 font-bold text-[11px]">{p.status}</Badge>
                            ) : p.status === "OCCUPIED" ? (
                              <Badge className="bg-[#DCFCE7] text-[#22C55E] hover:bg-[#DCFCE7] border-0 rounded-lg px-2 py-0.5 font-bold text-[11px]">{p.status}</Badge>
                            ) : (
                              <Badge className="bg-[#FEE2E2] text-[#EF4444] hover:bg-[#FEE2E2] border-0 rounded-lg px-2 py-0.5 font-bold text-[11px]">{p.status}</Badge>
                            )}
                            {p.approvalStatus === "PENDING" && (
                              <Badge className="bg-[#FEF3C7] text-[#D97706] hover:bg-[#FEF3C7] border-0 rounded-lg px-2 py-0.5 font-bold text-[11px]">Under Review</Badge>
                            )}
                            {p.approvalStatus === "APPROVED" && (
                              <Badge className="bg-[#D1FAE5] text-[#059669] hover:bg-[#D1FAE5] border-0 rounded-lg px-2 py-0.5 font-bold text-[11px]">Approved</Badge>
                            )}
                            {p.approvalStatus === "REJECTED" && (
                              <Badge className="bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FEE2E2] border-0 rounded-lg px-2 py-0.5 font-bold text-[11px]">Rejected</Badge>
                            )}
                          </div>
                          <span className="text-xs text-[#64748B] mt-0.5">
                            {p.type} {p.type === "Commercial" && p.zoningType && <span className="text-blue-600 font-bold ml-1">• {p.zoningType}</span>}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-[#0F172A] font-semibold text-sm">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />
                            {p.city}, {p.country}
                          </span>
                          <span className="text-xs text-[#64748B] font-medium ml-4.5 mt-0.5">{p.address}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-[#0F172A]">{totalUnits} Units</span>
                          <div className="flex gap-2 text-[11px] mt-1 font-semibold">
                            <span className="text-[#22C55E]">{availableUnits} available</span>
                            <span className="text-[#3B82F6]">{occupiedUnits} occupied</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-[#0F172A]">{rentDisplay}</span>
                          <span className="text-xs text-[#64748B] mt-0.5">/month</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 p-0 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] inline-flex items-center justify-center rounded-lg">
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-xl border-[#E2E8F0]">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/properties/${p.id}`)} className="cursor-pointer font-semibold text-[#0F172A]">
                              <Eye className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/properties/${p.id}/edit`)} className="cursor-pointer font-semibold text-[#0F172A]">
                              <Edit className="mr-2 h-4 w-4 text-[#94A3B8]" /> Edit Property
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(p.id)} className="cursor-pointer font-semibold text-red-500 hover:text-red-600 focus:text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredProperties.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-[#64748B]">
                      No properties found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProperties.map((p) => {
              const totalUnits = p.units?.length || 0;
              const availableUnits = p.units?.filter((u: any) => u.status === "VACANT").length || 0;
              
              let minRent = Infinity;
              let maxRent = 0;
              p.units?.forEach((u: any) => {
                const rent = Number(u.rentAmount);
                if (rent < minRent) minRent = rent;
                if (rent > maxRent) maxRent = rent;
              });
              const rentDisplay = totalUnits > 0 && minRent !== Infinity ? `$${minRent.toFixed(0)} - $${maxRent.toFixed(0)}` : "N/A";

              return (
                <div key={p.id} className="border border-[#E2E8F0] bg-white rounded-[20px] overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col">
                  {/* Image Header area */}
                  <div className="relative h-[200px] bg-[#F8FAFC] overflow-hidden">
                    {p.coverPhoto ? (
                      <img src={p.coverPhoto} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[#94A3B8]">
                        <Building className="h-10 w-10 opacity-50" />
                      </div>
                    )}
                    
                    {/* Top Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
                      {p.status === "AVAILABLE" ? (
                        <Badge className="bg-[#DCFCE7] text-[#16A34A] hover:bg-[#DCFCE7] border-0 rounded-full px-3 py-1 font-bold text-xs shadow-sm">Available</Badge>
                      ) : p.status === "OCCUPIED" ? (
                        <Badge className="bg-[#EFF6FF] text-[#3B82F6] hover:bg-[#EFF6FF] border-0 rounded-full px-3 py-1 font-bold text-xs shadow-sm">Occupied</Badge>
                      ) : (
                        <Badge className="bg-[#FEE2E2] text-[#EF4444] hover:bg-[#FEE2E2] border-0 rounded-full px-3 py-1 font-bold text-xs shadow-sm">{p.status}</Badge>
                      )}
                      {p.approvalStatus === "PENDING" && (
                        <Badge className="bg-[#FEF3C7] text-[#D97706] hover:bg-[#FEF3C7] border-0 rounded-full px-3 py-1 font-bold text-xs shadow-sm">Under Review</Badge>
                      )}
                      {p.approvalStatus === "APPROVED" && (
                        <Badge className="bg-[#D1FAE5] text-[#059669] hover:bg-[#D1FAE5] border-0 rounded-full px-3 py-1 font-bold text-xs shadow-sm">Approved</Badge>
                      )}
                      {p.approvalStatus === "REJECTED" && (
                        <Badge className="bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FEE2E2] border-0 rounded-full px-3 py-1 font-bold text-xs shadow-sm">Rejected</Badge>
                      )}
                    </div>
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
                      <Badge className="bg-white/90 text-[#475569] hover:bg-white border-0 shadow-sm rounded-full px-3 py-1 font-bold text-xs backdrop-blur-md flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5" />
                        {p.type || "Apartment"}
                      </Badge>
                      {p.type === "Commercial" && p.zoningType && (
                        <Badge className="bg-blue-600/90 text-white hover:bg-blue-600 border-0 shadow-sm rounded-full px-2.5 py-0.5 font-bold text-[10px] backdrop-blur-md">
                          Zoning: {p.zoningType}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Hover Overlay Buttons */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                      <button onClick={() => router.push(`/dashboard/properties/${p.id}`)} className="w-10 h-10 bg-white text-[#0F172A] rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                        <Eye className="h-5 w-5" />
                      </button>
                      <button onClick={() => router.push(`/dashboard/properties/${p.id}/edit`)} className="w-10 h-10 bg-white text-[#0F172A] rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                        <Edit className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Card Body */}
                  <div 
                    className="p-5 flex-1 flex flex-col cursor-pointer" 
                    onClick={() => router.push(`/dashboard/properties/${p.id}`)}
                  >
                    <h3 className="font-extrabold text-[#0F172A] text-lg leading-tight group-hover:text-[#3B82F6] transition-colors">{p.name}</h3>
                    <p className="text-sm text-[#64748B] font-medium mt-1 truncate">{p.description || "No description provided"}</p>
                    
                    <div className="flex items-center gap-1.5 text-sm text-[#64748B] mt-3 font-medium">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{p.city}, {p.state}, {p.zip}</span>
                    </div>
                    
                    {/* Gray Units Box */}
                    <div className="mt-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] p-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0F172A] text-sm">{totalUnits} Units</span>
                        {availableUnits > 0 && <span className="bg-[#DCFCE7] text-[#16A34A] text-[10px] font-bold px-2 py-0.5 rounded-full">{availableUnits} available</span>}
                        {occupiedUnits > 0 && <span className="bg-[#EFF6FF] text-[#3B82F6] text-[10px] font-bold px-2 py-0.5 rounded-full">{occupiedUnits} occupied</span>}
                      </div>
                      <span className="text-xs text-[#64748B] font-medium">Types: {p.type || "Apartment"}</span>
                    </div>
                    
                    {/* Footer */}
                    <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="font-extrabold text-[#0F172A] text-base">{rentDisplay} <span className="text-xs text-[#64748B] font-medium">/month</span></p>
                        {availableUnits > 0 ? (
                          <p className="text-[11px] font-bold text-[#16A34A] mt-0.5">{availableUnits} available</p>
                        ) : (
                          <p className="text-[11px] font-bold text-[#64748B] mt-0.5">Fully occupied</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] inline-flex items-center justify-center rounded-lg">
                          <MoreVertical className="h-5 w-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl border-[#E2E8F0]">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/properties/${p.id}`)} className="cursor-pointer font-semibold text-[#0F172A]">
                            <Eye className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/properties/${p.id}/edit`)} className="cursor-pointer font-semibold text-[#0F172A]">
                            <Edit className="mr-2 h-4 w-4 text-[#94A3B8]" /> Edit Property
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(p.id)} className="cursor-pointer font-semibold text-red-500 hover:text-red-600 focus:text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredProperties.length === 0 && !loading && (
              <div className="col-span-full text-center py-10 text-[#64748B]">
                No properties found.
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
    <Card className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm font-extrabold text-[#0F172A] leading-tight pr-4">{title}</p>
          <div className={`p-2 rounded-xl ${iconBg} ${iconColor} shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div>
          <h3 className="text-3xl font-black text-[#0F172A] tracking-tight">{value}</h3>
          <p className="text-xs text-[#64748B] mt-1.5 font-semibold">{subtext}</p>
        </div>
      </CardContent>
    </Card>
  );
}
