"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, Edit, Trash2, Building, BedDouble, Bath, 
  Ruler, Home, MapPin, DollarSign, CheckCircle2, 
  Wrench, Users, Eye, MoreVertical
} from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function PropertyDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await fetch(`/api/properties?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          setProperty(data);
        } else {
          toast.error("Property not found");
          router.push("/dashboard/properties");
        }
      } catch (err) {
        toast.error("Error loading property");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProperty();
  }, [id, router]);

  if (loading) {
    return <div className="p-10 text-center font-bold text-[#64748B]">Loading Property Details...</div>;
  }
  if (!property) return null;

  // Derived metrics
  const totalUnits = property.units?.length || 0;
  const vacantUnits = property.units?.filter((u: any) => u.status === "VACANT").length || 0;
  const occupiedUnits = property.units?.filter((u: any) => u.status === "OCCUPIED").length || 0;
  const maintenanceUnits = property.units?.filter((u: any) => u.status === "MAINTENANCE").length || 0;
  
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  
  let totalBeds = 0;
  let totalBaths = 0;
  let totalSqFt = 0;
  let minRent = Infinity;
  let maxRent = 0;

  property.units?.forEach((u: any) => {
    totalBeds += u.rooms || 0;
    totalBaths += u.bathrooms || 1;
    totalSqFt += u.sqFootage || 0;
    const rent = Number(u.rentAmount || 0);
    if (rent < minRent) minRent = rent;
    if (rent > maxRent) maxRent = rent;
  });

  const rentRange = totalUnits > 0 && minRent !== Infinity ? `$${minRent} - $${maxRent}` : "N/A";
  const ppsqft = (totalSqFt > 0 && minRent !== Infinity) ? (minRent / (totalSqFt / totalUnits)).toFixed(2) : "0.00";

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this property?")) return;
    try {
      const res = await fetch(`/api/properties?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Property deleted");
        router.push("/dashboard/properties");
      }
    } catch {
      toast.error("Error deleting property");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div className="flex flex-col gap-2">
          <Link href="/dashboard/properties" className="text-sm font-bold text-[#64748B] hover:text-[#3B82F6] flex items-center gap-2 mb-2 transition-colors w-fit">
            <ArrowLeft className="h-4 w-4" /> Back to Properties
          </Link>
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">{property.name}</h1>
            <div className="flex items-center gap-2">
              {property.status === "AVAILABLE" ? (
                <Badge className="bg-[#DCFCE7] text-[#16A34A] hover:bg-[#DCFCE7] border-0 rounded-lg px-3 py-1 font-bold shadow-sm">{property.status}</Badge>
              ) : property.status === "OCCUPIED" ? (
                <Badge className="bg-[#EFF6FF] text-[#3B82F6] hover:bg-[#EFF6FF] border-0 rounded-lg px-3 py-1 font-bold shadow-sm">{property.status}</Badge>
              ) : (
                <Badge className="bg-[#FEE2E2] text-[#EF4444] hover:bg-[#FEE2E2] border-0 rounded-lg px-3 py-1 font-bold shadow-sm">{property.status}</Badge>
              )}
              <Badge className="bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0] rounded-lg px-3 py-1 font-bold shadow-sm flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5" /> {property.type || "Apartment"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-[#64748B]">
            <MapPin className="h-4 w-4" /> {property.city}, {property.country}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          <Button onClick={() => router.push(`/dashboard/properties/${id}/edit`)} className="flex-1 md:flex-none bg-white text-[#0F172A] border border-[#E2E8F0] hover:bg-[#F8FAFC] shadow-sm rounded-xl h-11 font-bold px-6">
            <Edit className="h-4 w-4 mr-2" /> Edit Property
          </Button>
          <Button onClick={handleDelete} className="flex-1 md:flex-none bg-white text-red-500 border border-red-200 hover:bg-red-50 shadow-sm rounded-xl h-11 font-bold px-6">
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      {/* Custom Horizontal Tabs */}
      <div className="flex items-center gap-2 bg-[#F8FAFC] p-1.5 rounded-[16px] border border-[#E2E8F0] overflow-x-auto no-scrollbar shadow-sm">
        {["overview", "details", "units", "images", "amenities"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap capitalize ${
              activeTab === tab 
                ? "bg-gradient-to-b from-[#3B82F6] to-[#2563EB] text-white shadow-md shadow-blue-500/20" 
                : "text-[#64748B] hover:text-[#0F172A] hover:bg-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB CONTENTS */}
      <div className="min-h-[400px]">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top Specs Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SpecCard title="Property Type" value={property.type || "Apartment"} Icon={Building} />
              <SpecCard title="Total Bedrooms" value={totalBeds} Icon={BedDouble} />
              <SpecCard title="Total Bathrooms" value={totalBaths} Icon={Bath} />
              <SpecCard title="Total Square Ft" value={totalSqFt} Icon={Ruler} />
            </div>

            {/* Middle Section: Occupancy & Location */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Occupancy Card */}
              <Card className="col-span-1 lg:col-span-2 bg-white border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]/50">
                  <div>
                    <h2 className="font-bold text-[#0F172A] text-lg">Occupancy Overview</h2>
                    <p className="text-xs font-semibold text-[#64748B]">Real-time unit status</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("units")} className="rounded-lg font-bold border-[#E2E8F0] shadow-sm">View All Units</Button>
                    <Button size="sm" className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg font-bold shadow-sm">Add Unit</Button>
                  </div>
                </div>
                <CardContent className="p-6">
                  {/* Progress Bar */}
                  <div className="mb-8">
                    <div className="flex justify-between items-end mb-2">
                      <span className="font-extrabold text-3xl text-[#0F172A]">{occupancyRate}%</span>
                      <span className="font-bold text-[#64748B] text-sm">{occupiedUnits} of {totalUnits} units occupied</span>
                    </div>
                    <div className="w-full h-3 bg-[#F1F5F9] rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-gradient-to-r from-[#3B82F6] to-[#2563EB] rounded-full transition-all duration-1000" style={{ width: `${occupancyRate}%` }} />
                    </div>
                  </div>
                  
                  {/* Status Counts */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-[#F0FDF4] rounded-2xl border border-[#bbf7d0]">
                      <p className="text-xs font-extrabold text-[#16A34A] uppercase tracking-wider mb-1">Available</p>
                      <p className="text-2xl font-black text-[#14532D]">{vacantUnits}</p>
                    </div>
                    <div className="p-4 bg-[#EFF6FF] rounded-2xl border border-[#bfdbfe]">
                      <p className="text-xs font-extrabold text-[#3B82F6] uppercase tracking-wider mb-1">Occupied</p>
                      <p className="text-2xl font-black text-[#1E3A8A]">{occupiedUnits}</p>
                    </div>
                    <div className="p-4 bg-[#FFF7ED] rounded-2xl border border-[#fed7aa]">
                      <p className="text-xs font-extrabold text-[#F97316] uppercase tracking-wider mb-1">Maintenance</p>
                      <p className="text-2xl font-black text-[#7C2D12]">{maintenanceUnits}</p>
                    </div>
                    <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                      <p className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider mb-1">Total</p>
                      <p className="text-2xl font-black text-[#0F172A]">{totalUnits}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location & Financials Column */}
              <div className="col-span-1 space-y-6">
                <Card className="bg-white border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]/50">
                    <h2 className="font-bold text-[#0F172A] text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#3B82F6]" /> Location
                    </h2>
                  </div>
                  <CardContent className="p-5">
                    <div className="w-full h-32 bg-slate-200 rounded-xl mb-4 overflow-hidden relative">
                      <img src="https://maps.googleapis.com/maps/api/staticmap?center=London&zoom=13&size=400x200&maptype=roadmap&key=fake" alt="Map" className="w-full h-full object-cover blur-[2px]" />
                      <div className="absolute inset-0 flex items-center justify-center font-bold text-white bg-black/20">Map View (Demo)</div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-bold text-[#94A3B8] uppercase">Street Address</p>
                        <p className="font-semibold text-[#0F172A]">{property.address || "N/A"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs font-bold text-[#94A3B8] uppercase">City</p>
                          <p className="font-semibold text-[#0F172A]">{property.city}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#94A3B8] uppercase">State/ZIP</p>
                          <p className="font-semibold text-[#0F172A]">{property.state} {property.zip}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]/50">
                    <h2 className="font-bold text-[#0F172A] text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-[#3B82F6]" /> Financial Overview
                    </h2>
                  </div>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-[#F1F5F9]">
                      <span className="text-sm font-bold text-[#64748B]">Monthly Rent Range</span>
                      <span className="font-extrabold text-[#0F172A]">{rentRange}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-[#F1F5F9]">
                      <span className="text-sm font-bold text-[#64748B]">Price per Sq. Ft.</span>
                      <span className="font-extrabold text-[#0F172A]">${ppsqft}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* DETAILS TAB */}
        {activeTab === "details" && (
          <Card className="bg-white border-[#E2E8F0] rounded-2xl shadow-sm">
            <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50">
              <h2 className="font-bold text-[#0F172A] text-lg">Property Specifications</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 border-b border-[#F1F5F9] pb-4">
                    <div className="col-span-1 text-sm font-bold text-[#64748B]">Property Name</div>
                    <div className="col-span-2 font-semibold text-[#0F172A]">{property.name}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b border-[#F1F5F9] pb-4">
                    <div className="col-span-1 text-sm font-bold text-[#64748B]">Property Type</div>
                    <div className="col-span-2 font-semibold text-[#0F172A]">{property.type || "Apartment"}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b border-[#F1F5F9] pb-4">
                    <div className="col-span-1 text-sm font-bold text-[#64748B]">Status</div>
                    <div className="col-span-2 font-semibold text-[#0F172A]">{property.status}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b border-[#F1F5F9] pb-4">
                    <div className="col-span-1 text-sm font-bold text-[#64748B]">Year Built</div>
                    <div className="col-span-2 font-semibold text-[#0F172A]">{property.yearBuilt || "Not specified"}</div>
                  </div>
                </div>
                <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-[#E2E8F0]">
                  <h3 className="font-bold text-[#0F172A] mb-2">Description</h3>
                  <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">
                    {property.description || "No description has been provided for this property yet."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* UNITS TAB */}
        {activeTab === "units" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-[#0F172A]">Units List</h2>
                <p className="text-sm font-medium text-[#64748B]">Showing {totalUnits} units for {property.name}</p>
              </div>
              <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm rounded-xl h-11 font-bold px-6">
                Add Unit
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {property.units?.map((u: any) => (
                <div key={u.id} className="border border-[#E2E8F0] bg-white rounded-[20px] overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col">
                  <div className="relative h-40 bg-[#F8FAFC] overflow-hidden">
                    {u.images && u.images.length > 0 ? (
                      <img src={u.images[0]} alt={u.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[#94A3B8]"><Home className="h-10 w-10 opacity-50" /></div>
                    )}
                    <div className="absolute top-4 left-4">
                      {u.status === "VACANT" ? (
                        <Badge className="bg-[#DCFCE7] text-[#16A34A] hover:bg-[#DCFCE7] border-0 rounded-full px-3 py-1 font-bold text-xs shadow-sm">Available</Badge>
                      ) : u.status === "OCCUPIED" ? (
                        <Badge className="bg-[#EFF6FF] text-[#3B82F6] hover:bg-[#EFF6FF] border-0 rounded-full px-3 py-1 font-bold text-xs shadow-sm">Occupied</Badge>
                      ) : (
                        <Badge className="bg-[#FEE2E2] text-[#EF4444] hover:bg-[#FEE2E2] border-0 rounded-full px-3 py-1 font-bold text-xs shadow-sm">{u.status}</Badge>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                      <button onClick={() => router.push(`/dashboard/properties/${id}/units/${u.id}`)} className="w-10 h-10 bg-white text-[#0F172A] rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                        <Eye className="h-5 w-5" />
                      </button>
                      <button onClick={() => router.push(`/dashboard/properties/${id}/edit`)} className="w-10 h-10 bg-white text-[#0F172A] rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                        <Edit className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-extrabold text-[#0F172A] text-lg">Unit {u.name}</h3>
                    <p className="text-xs text-[#64748B] font-bold uppercase tracking-wider mt-1">{u.type || "Apartment"} • Floor {u.floor || 1}</p>
                    
                    <div className="mt-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] p-3 flex flex-col gap-2">
                      <div className="flex items-center gap-4 text-[#0F172A] font-bold text-sm">
                        <span className="flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-[#94A3B8]" /> {u.rooms} Beds</span>
                        <span className="flex items-center gap-1.5"><Bath className="h-4 w-4 text-[#94A3B8]" /> {u.bathrooms || 1} Baths</span>
                      </div>
                      <span className="text-xs text-[#64748B] font-medium">Size: {u.sqFootage} sq ft</span>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex justify-between items-center">
                      <p className="font-extrabold text-[#0F172A] text-base">${Number(u.rentAmount).toFixed(2)} <span className="text-xs text-[#64748B] font-medium">/mo</span></p>
                      <Button variant="ghost" className="h-8 w-8 p-0 text-[#94A3B8] hover:text-[#0F172A]"><MoreVertical className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
              {totalUnits === 0 && (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-[#E2E8F0] rounded-2xl bg-[#F8FAFC]">
                  <Home className="h-12 w-12 text-[#94A3B8] mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-[#0F172A]">No Units Added</h3>
                  <p className="text-sm text-[#64748B] mt-1">Get started by creating units for this property.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* IMAGES TAB */}
        {activeTab === "images" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-[#0F172A]">Property Images</h2>
                <p className="text-sm font-medium text-[#64748B]">Showing {property.images?.length || 0} images</p>
              </div>
              <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm rounded-xl h-11 font-bold px-6">
                Add Image
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {property.images?.length > 0 ? (
                property.images.map((img: string, i: number) => (
                  <div key={i} className="aspect-square bg-slate-100 rounded-2xl overflow-hidden relative group border border-[#E2E8F0]">
                    <img src={img} alt={`Property image ${i}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button variant="destructive" size="sm" className="rounded-xl font-bold">Remove</Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-[#E2E8F0] rounded-2xl bg-[#F8FAFC]">
                  <h3 className="text-lg font-bold text-[#0F172A]">No Images</h3>
                  <p className="text-sm text-[#64748B] mt-1">Upload photos to showcase this property.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AMENITIES TAB */}
        {activeTab === "amenities" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-[#0F172A]">Property Amenities</h2>
                <p className="text-sm font-medium text-[#64748B]">Features available at this location</p>
              </div>
              <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm rounded-xl h-11 font-bold px-6">
                Edit Amenities
              </Button>
            </div>
            
            {property.amenities && property.amenities.length > 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-wrap gap-3">
                {property.amenities.map((amenity: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 bg-[#F8FAFC] text-[#0F172A] text-sm font-extrabold rounded-xl border border-[#E2E8F0]">
                    <CheckCircle2 className="h-4 w-4 text-[#3B82F6]" />
                    {amenity}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-[#E2E8F0] rounded-2xl bg-[#F8FAFC]">
                <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center shadow-sm mb-4">
                  <CheckCircle2 className="h-10 w-10 text-[#CBD5E1]" />
                </div>
                <h3 className="text-xl font-black text-[#0F172A]">No Amenities Listed</h3>
                <p className="text-[#64748B] mt-2 max-w-sm mx-auto font-medium">No amenities have been added to this property yet. Edit property to add them.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SpecCard({ title, value, Icon }: any) {
  return (
    <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-3 bg-[#F8FAFC] text-[#3B82F6] rounded-xl shrink-0">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">{title}</p>
          <p className="font-extrabold text-[#0F172A] text-lg leading-tight truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
