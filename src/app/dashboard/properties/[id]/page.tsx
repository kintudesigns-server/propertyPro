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
  Wrench, Users, Eye, MoreVertical, ImageIcon, Image as ImageIcon2, FileText, Download,
  Shield, Clock
} from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSession } from "next-auth/react";
import { Check, X } from "lucide-react";

import imageCompression from "browser-image-compression";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function PropertyDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Smart Media Uploader State
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("FACADE");
  const [uploadTargetUnit, setUploadTargetUnit] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

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

  useEffect(() => {
    if (id) fetchProperty();
  }, [id, router]);

  if (loading) {
    return <div className="p-10 text-center font-bold text-[#6E6E73]">Loading Property Details...</div>;
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

  const handlePropertyApproval = async (statusText: string, reason?: string) => {
    try {
      const res = await fetch("/api/admin/properties/approval", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: id, status: statusText, rejectionReason: reason }),
      });
      if (res.ok) {
        toast.success(`Property ${statusText.toLowerCase()} successfully`);
        fetchProperty();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update property");
      }
    } catch {
      toast.error("Error updating property.");
    }
  };

  const handleSmartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    // Determine Target
    const isUnit = uploadCategory === "UNIT_INTERIOR" && uploadTargetUnit;
    const targetType = isUnit ? "UNIT" : "PROPERTY";
    const targetId = isUnit ? uploadTargetUnit : property.id;
    
    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      try {
        // 1. Client-side compression
        toast.loading(`Compressing ${file.name}...`, { id: `upload-${i}` });
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
        
        // 2. Upload to Cloudinary
        toast.loading(`Uploading to CDN...`, { id: `upload-${i}` });
        const formData = new FormData();
        formData.append("file", compressedFile);
        
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error("Upload failed");
        
        const { url } = await uploadRes.json();
        
        // Append Category via URL Hash metadata
        const taggedUrl = `${url}#category=${uploadCategory}`;

        // 3. Attach to Property/Unit via PATCH
        const patchRes = await fetch(`/api/properties`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: property.id,
            action: "ADD_MEDIA",
            targetType,
            targetId,
            url: taggedUrl
          })
        });

        if (patchRes.ok) {
          toast.success(`${file.name} uploaded!`, { id: `upload-${i}` });
          successCount++;
        }
      } catch (err: any) {
        toast.error(`Error with ${file.name}: ${err.message}`, { id: `upload-${i}` });
      }
    }
    
    setIsUploading(false);
    if (successCount > 0) {
      setIsUploaderOpen(false);
      fetchProperty(); // Refresh UI
    }
  };
 
  const handleRemoveMedia = async (targetType: "PROPERTY" | "UNIT", targetId: string, url: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    try {
      const res = await fetch(`/api/properties`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: property.id,
          action: "REMOVE_MEDIA",
          targetType,
          targetId,
          url
        })
      });
      if (res.ok) {
        toast.success("Photo deleted successfully");
        fetchProperty();
      } else {
        toast.error("Failed to delete photo");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting photo");
    }
  };

  // Gamification & Alerts
  const missingFacade = property.type === "Commercial" && (!property.images || property.images.length === 0);
  const unitsWithoutPhotos = property.units?.filter((u: any) => !u.images || u.images.length === 0).length || 0;

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-[#E5E5EA] shadow-sm">
        <div className="flex flex-col gap-2">
          <Link href="/dashboard/properties" className="text-sm font-bold text-[#6E6E73] hover:text-[#007AFF] flex items-center gap-2 mb-2 transition-colors w-fit">
            <ArrowLeft className="h-4 w-4" /> Back to Properties
          </Link>
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-3xl font-black text-[#1D1D1F] tracking-tight">{property.name}</h1>
            <div className="flex items-center gap-2">
              {property.status === "AVAILABLE" ? (
                <Badge className="bg-[#DCFCE7] text-[#16A34A] hover:bg-[#DCFCE7] border-0 rounded-lg px-3 py-1 font-bold shadow-sm">{property.status}</Badge>
              ) : property.status === "OCCUPIED" ? (
                <Badge className="bg-[#EFF6FF] text-[#007AFF] hover:bg-[#EFF6FF] border-0 rounded-lg px-3 py-1 font-bold shadow-sm">{property.status}</Badge>
              ) : (
                <Badge className="bg-[#FEE2E2] text-[#EF4444] hover:bg-[#FEE2E2] border-0 rounded-lg px-3 py-1 font-bold shadow-sm">{property.status}</Badge>
              )}
              <Badge className="bg-[#F2F2F7] text-[#475569] border border-[#E5E5EA] rounded-lg px-3 py-1 font-bold shadow-sm flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5" /> {property.type || "Apartment"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-[#6E6E73] mt-2">
            <MapPin className="h-4 w-4" /> {property.city}, {property.country}
          </div>
          
          {property.approvalStatus === "PENDING" && (
            <div className="mt-3 p-3 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-xl text-sm font-bold flex items-center gap-2">
              <Wrench className="h-4 w-4" /> 
              {userRole === "SUPERADMIN" 
                ? "This property is pending your approval to become active on the platform." 
                : "Property Under Review. You cannot add units until an Admin approves it."}
            </div>
          )}
          {property.approvalStatus === "REJECTED" && (
            <div className="mt-3 p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-sm font-bold flex items-center gap-2">
              <Wrench className="h-4 w-4" /> 
              {userRole === "SUPERADMIN"
                ? `Property Rejected. Reason: ${property.rejectionReason || "Not specified"}`
                : `Property Rejected. Reason: ${property.rejectionReason || "Not specified"}`}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0 flex-wrap">
          {userRole === "SUPERADMIN" ? (
             <>
               {property.approvalStatus !== "APPROVED" && (
                 <Button onClick={() => handlePropertyApproval("APPROVED")} className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white shadow-sm rounded-xl h-11 font-bold px-6">
                   <Check className="h-4 w-4 mr-2" /> Approve Property
                 </Button>
               )}
               {property.approvalStatus !== "REJECTED" && (
                 <Button onClick={() => {
                   const reason = prompt("Enter rejection reason:");
                   if (reason !== null) handlePropertyApproval("REJECTED", reason);
                 }} className="flex-1 md:flex-none bg-white text-red-600 border border-red-200 hover:bg-red-50 shadow-sm rounded-xl h-11 font-bold px-6">
                   <X className="h-4 w-4 mr-2" /> Reject
                 </Button>
               )}
             </>
          ) : (
             <>
               {property.type !== "House" && (
                 <Button className="flex-1 md:flex-none bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-sm rounded-xl h-11 font-bold px-6">
                   <Download className="h-4 w-4 mr-2" /> Generate Rent Roll
                 </Button>
               )}
               <Button onClick={() => router.push(`/dashboard/properties/${id}/edit`)} className="flex-1 md:flex-none bg-white text-[#1D1D1F] border border-[#E5E5EA] hover:bg-[#F2F2F7] shadow-sm rounded-xl h-11 font-bold px-6">
                 <Edit className="h-4 w-4 mr-2" /> Edit Property
               </Button>
               <Button onClick={handleDelete} className="flex-1 md:flex-none bg-white text-red-500 border border-red-200 hover:bg-red-50 shadow-sm rounded-xl h-11 font-bold px-6">
                 <Trash2 className="h-4 w-4 mr-2" /> Delete
               </Button>
             </>
          )}
        </div>
      </div>

      {/* Custom Horizontal Tabs */}
      <div className="flex items-center gap-2 bg-[#F2F2F7] p-1.5 rounded-[16px] border border-[#E5E5EA] overflow-x-auto no-scrollbar shadow-sm">
        {["overview", "details", ...(property.type === "House" ? [] : ["units"]), "media", "amenities"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap capitalize flex items-center gap-2 ${
              activeTab === tab 
                ? "bg-gradient-to-b from-[#007AFF] to-[#0062CC] text-white shadow-md shadow-blue-500/20" 
                : "text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-white"
            }`}
          >
            {tab === "units" && property.type === "Commercial" ? "Suites" : tab === "media" ? <><ImageIcon2 className="h-4 w-4" /> Media</> : tab}
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
              {property.type !== "Commercial" && (
                <>
                  <SpecCard title="Total Bedrooms" value={totalBeds} Icon={BedDouble} />
                  <SpecCard title="Total Bathrooms" value={totalBaths} Icon={Bath} />
                </>
              )}
              {property.type === "Commercial" && (
                <>
                  <SpecCard title="Total Suites" value={totalUnits} Icon={Building} />
                  <SpecCard title="Avg Annual $/SqFt" value={`$${ppsqft}`} Icon={DollarSign} />
                </>
              )}
              <SpecCard title="Total Square Ft" value={totalSqFt} Icon={Ruler} />
            </div>

            {/* Middle Section: Occupancy & Location */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Occupancy Card - Adapt for Houses vs Others */}
              <Card className="col-span-1 lg:col-span-2 bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[24px] overflow-hidden flex flex-col justify-between">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
                  <div>
                    <h2 className="font-black text-[#1D1D1F] text-lg">
                      {property.type === "House" ? "Lease & Unit Status" : "Occupancy Overview"}
                    </h2>
                    <p className="text-xs font-semibold text-[#6E6E73] mt-0.5">Real-time unit status</p>
                  </div>
                  {property.type !== "House" && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setActiveTab("units")} className="rounded-lg font-bold border-slate-200 text-slate-700 bg-white hover:bg-[#F5F5F7] shadow-sm h-9">View {property.type === "Commercial" ? "Suites" : "Units"}</Button>
                      <Button size="sm" disabled={property.approvalStatus !== "APPROVED"} onClick={() => router.push(`/dashboard/properties/${id}/edit`)} className="bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-lg font-bold shadow-sm h-9">Add {property.type === "Commercial" ? "Suite" : "Unit"}</Button>
                    </div>
                  )}
                </div>
                <CardContent className="p-6 flex-1 flex flex-col justify-between min-h-[340px]">
                  {property.type === "House" ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
                      <div className={`h-24 w-24 rounded-full flex items-center justify-center mb-4 shadow-sm border-4 ${property.units?.[0]?.status === "OCCUPIED" ? "bg-blue-50 border-blue-100" : "bg-green-50 border-green-100"}`}>
                        {property.units?.[0]?.status === "OCCUPIED" ? <Users className="h-10 w-10 text-blue-600" /> : <CheckCircle2 className="h-10 w-10 text-green-600" />}
                      </div>
                      <h3 className="text-2xl font-black text-[#1D1D1F] mb-1">{property.units?.[0]?.status === "OCCUPIED" ? "Currently Rented" : "Vacant & Ready"}</h3>
                      <p className="text-[#6E6E73] font-semibold text-sm">Rent: ${Number(property.units?.[0]?.rentAmount || 0).toLocaleString()}/mo</p>
                      {property.units?.[0]?.status !== "OCCUPIED" && (
                        <Button onClick={() => router.push(`/dashboard/owner?tab=settings`)} className="mt-6 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl h-11 px-8 shadow-md">Invite Tenant</Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="font-black text-3xl text-[#1D1D1F] tracking-tight">{occupancyRate}%</span>
                          <span className="font-semibold text-[#8E8E93] text-xs uppercase tracking-wider">{occupiedUnits} of {totalUnits} units occupied</span>
                        </div>
                        <div className="w-full h-3 bg-[#F1F5F9] rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-gradient-to-r from-[#007AFF] to-[#0062CC] rounded-full transition-all duration-1000" style={{ width: `${occupancyRate}%` }} />
                        </div>
                      </div>
                      
                      {/* Units Quick View Snapshot */}
                      <div className="my-5 flex-1 border border-slate-100/80 rounded-2xl p-4 bg-slate-50/30">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-[10px] font-black text-[#8E8E93] uppercase tracking-widest">Units Status Snapshot</h4>
                          <button onClick={() => setActiveTab("units")} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer">
                            Manage Units ({totalUnits}) →
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          {!property.units || property.units.length === 0 ? (
                            <p className="text-xs text-[#8E8E93] font-semibold text-center py-6">No units added to this property.</p>
                          ) : (
                            property.units.slice(0, 3).map((u: any) => (
                              <div key={u.id} className="flex justify-between items-center py-2 px-3 bg-white border border-slate-100 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 text-[#8E8E93] shrink-0">
                                    <Home className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-xs font-bold text-slate-800">{property.type === "Commercial" ? "" : "Unit "}{u.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-extrabold text-slate-600">${Number(u.rentAmount || 0).toLocaleString()}/mo</span>
                                  <Badge className={`border-0 rounded-lg px-2 py-0.5 font-bold text-[10px] ${
                                    u.status === "VACANT" 
                                      ? "bg-emerald-50 text-emerald-700" 
                                      : u.status === "OCCUPIED" 
                                      ? "bg-blue-50 text-blue-700" 
                                      : "bg-red-50 text-red-700"
                                  }`}>
                                    {u.status === "VACANT" ? "Available" : u.status}
                                  </Badge>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
 
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-auto">
                        <div className="p-4 bg-[#F0FDF4] rounded-2xl border border-[#bbf7d0] hover:scale-[1.02] transition-transform duration-300">
                          <p className="text-[10px] font-black text-[#16A34A] uppercase tracking-wider mb-1">Available</p>
                          <p className="text-2xl font-black text-[#14532D] leading-none">{vacantUnits}</p>
                        </div>
                        <div className="p-4 bg-[#EFF6FF] rounded-2xl border border-[#bfdbfe] hover:scale-[1.02] transition-transform duration-300">
                          <p className="text-[10px] font-black text-[#007AFF] uppercase tracking-wider mb-1">Occupied</p>
                          <p className="text-2xl font-black text-[#1E3A8A] leading-none">{occupiedUnits}</p>
                        </div>
                        <div className="p-4 bg-[#FFF7ED] rounded-2xl border border-[#fed7aa] hover:scale-[1.02] transition-transform duration-300">
                          <p className="text-[10px] font-black text-[#F97316] uppercase tracking-wider mb-1">Maintenance</p>
                          <p className="text-2xl font-black text-[#7C2D12] leading-none">{maintenanceUnits}</p>
                        </div>
                        <div className="p-4 bg-[#F2F2F7] rounded-2xl border border-[#E5E5EA] hover:scale-[1.02] transition-transform duration-300">
                          <p className="text-[10px] font-black text-[#6E6E73] uppercase tracking-wider mb-1">Total</p>
                          <p className="text-2xl font-black text-[#1D1D1F] leading-none">{totalUnits}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
 
              {/* Location & Financials Column */}
              <div className="col-span-1 space-y-6 flex flex-col justify-between">
                <Card className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[24px] overflow-hidden flex flex-col flex-1">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/20">
                    <h2 className="font-black text-[#1D1D1F] text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#007AFF]" /> Location
                    </h2>
                  </div>
                  <CardContent className="p-5 flex flex-col justify-between flex-1">
                    <div className="w-full h-36 bg-slate-100 rounded-xl mb-4 overflow-hidden border border-slate-100 shadow-inner">
                      <iframe 
                        title="Property Location Map"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(`${property.address || ''} ${property.city || ''} ${property.state || ''}`)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                        width="100%" 
                        height="100%" 
                        frameBorder="0" 
                        style={{ border: 0 }} 
                        allowFullScreen 
                        aria-hidden="false" 
                        tabIndex={0}
                      />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">Street Address</p>
                        <p className="font-extrabold text-[#1D1D1F] text-sm mt-0.5">{property.address || "N/A"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">City</p>
                          <p className="font-extrabold text-[#1D1D1F] text-xs mt-0.5">{property.city}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">State/ZIP</p>
                          <p className="font-extrabold text-[#1D1D1F] text-xs mt-0.5">{property.state} {property.zip}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
 
                <Card className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[24px] overflow-hidden flex flex-col justify-between">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/20">
                    <h2 className="font-black text-[#1D1D1F] text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-[#007AFF]" /> Financial Overview
                    </h2>
                  </div>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-[#F1F5F9]">
                      <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">Monthly Rent Range</span>
                      <span className="font-black text-[#1D1D1F] text-sm">{rentRange}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">Price per Sq. Ft.</span>
                      <span className="font-black text-emerald-600 text-sm">${ppsqft} {property.type === "Commercial" ? "/yr" : "/mo"}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* DETAILS TAB */}
        {activeTab === "details" && (
          <Card className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[24px] overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/20">
              <h2 className="font-black text-[#1D1D1F] text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-500" />
                Property Specifications
              </h2>
            </div>
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Specs List Column (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {[
                    { label: "Property Name", value: property.name, Icon: Building, color: "text-blue-500 bg-blue-50" },
                    { label: "Property Type", value: property.type || "Apartment", Icon: Home, color: "text-violet-500 bg-violet-50" },
                    { label: "Status", value: property.status, Icon: CheckCircle2, color: "text-emerald-500 bg-emerald-50", isBadge: true },
                    { label: "Year Built", value: property.yearBuilt || "Not specified", Icon: Clock, color: "text-amber-500 bg-amber-50" },
                  ].map((spec, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-[#F2F2F7]/60 border border-slate-100/80 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${spec.color}`}>
                          <spec.Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">{spec.label}</span>
                      </div>
                      {spec.isBadge ? (
                        <Badge className={`border-0 rounded-lg px-2.5 py-1 font-bold text-xs ${
                          spec.value === "AVAILABLE" 
                            ? "bg-emerald-50 text-emerald-700" 
                            : spec.value === "OCCUPIED" 
                            ? "bg-blue-50 text-blue-700" 
                            : "bg-red-50 text-red-700"
                        }`}>
                          {spec.value}
                        </Badge>
                      ) : (
                        <span className="font-extrabold text-[#1D1D1F] text-sm">{spec.value}</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Description Column (5 cols) */}
                <div className="lg:col-span-5 flex">
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 flex flex-col justify-between w-full">
                    <div>
                      <h3 className="font-black text-[#1D1D1F] text-sm flex items-center gap-2 mb-3">
                        <FileText className="h-4 w-4 text-indigo-500" />
                        About the Property
                      </h3>
                      <p className="text-xs font-medium text-[#6E6E73] leading-relaxed whitespace-pre-wrap">
                        {property.description || "No description has been provided for this property yet."}
                      </p>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#8E8E93] font-semibold">
                      <span>Property ID</span>
                      <span className="font-mono text-[#6E6E73] select-all">{property.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* UNITS TAB (For Apartments & Commercial) */}
        {activeTab === "units" && property.type !== "House" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-[#1D1D1F]">{property.type === "Commercial" ? "Suites List" : "Units List"}</h2>
                <p className="text-sm font-medium text-[#6E6E73]">Showing {totalUnits} {property.type === "Commercial" ? "suites" : "units"} for {property.name}</p>
              </div>
              <Button disabled={property.approvalStatus !== "APPROVED"} className="bg-[#007AFF] hover:bg-[#0062CC] text-white shadow-sm rounded-xl h-11 font-bold px-6">
                Add {property.type === "Commercial" ? "Suite" : "Unit"}
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {property.units?.map((u: any) => (
                <div key={u.id} className="border border-[#E5E5EA] bg-white rounded-[20px] overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col">
                  <div className="relative h-40 bg-[#F2F2F7] overflow-hidden group-hover:after:absolute group-hover:after:inset-0 group-hover:after:bg-black/10 group-hover:after:transition-all">
                    {u.images && u.images.length > 0 ? (
                      <div className="w-full h-full relative">
                        <img src={u.images[0]} alt={u.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        {u.images.length > 1 && (
                          <Badge className="absolute bottom-2 right-2 bg-black/60 text-white border-0 font-bold text-xs backdrop-blur-md">+{u.images.length - 1} Photos</Badge>
                        )}
                      </div>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[#94A3B8]"><Home className="h-10 w-10 opacity-50" /></div>
                    )}
                    <div className="absolute top-4 left-4 z-10">
                      {u.status === "VACANT" ? (
                        <Badge className="bg-[#DCFCE7] text-[#16A34A] hover:bg-[#DCFCE7] border-0 rounded-full px-3 py-1 font-bold text-xs shadow-sm">Available</Badge>
                      ) : u.status === "OCCUPIED" ? (
                        <Badge className="bg-[#EFF6FF] text-[#007AFF] hover:bg-[#EFF6FF] border-0 rounded-full px-3 py-1 font-bold text-xs shadow-sm">Occupied</Badge>
                      ) : (
                        <Badge className="bg-[#FEE2E2] text-[#EF4444] hover:bg-[#FEE2E2] border-0 rounded-full px-3 py-1 font-bold text-xs shadow-sm">{u.status}</Badge>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 z-10">
                      <button onClick={() => router.push(`/dashboard/properties/${id}/units/${u.id}`)} className="w-10 h-10 bg-white text-[#1D1D1F] rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                        <Eye className="h-5 w-5" />
                      </button>
                      <button onClick={() => router.push(`/dashboard/properties/${id}/edit`)} className="w-10 h-10 bg-white text-[#1D1D1F] rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                        <Edit className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-extrabold text-[#1D1D1F] text-lg">{property.type === "Commercial" ? "" : "Unit "}{u.name}</h3>
                    <p className="text-xs text-[#6E6E73] font-bold uppercase tracking-wider mt-1">{u.type || (property.type === "Commercial" ? "Space" : "Apartment")}</p>
                    
                    <div className="mt-4 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] p-3 flex flex-col gap-2">
                      <div className="flex items-center gap-4 text-[#1D1D1F] font-bold text-sm flex-wrap">
                        {property.type !== "Commercial" && (
                          <>
                            <span className="flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-[#94A3B8]" /> {u.rooms} Beds</span>
                            <span className="flex items-center gap-1.5"><Bath className="h-4 w-4 text-[#94A3B8]" /> {u.bathrooms || 1} Baths</span>
                          </>
                        )}
                        {property.type === "Commercial" && u.leaseStructure && (
                          <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {u.leaseStructure} Lease
                          </Badge>
                        )}
                        <span className="text-xs text-[#6E6E73] font-medium ml-auto">{u.sqFootage} sq ft</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-[#E5E5EA] flex justify-between items-center">
                      <div>
                        <p className="font-extrabold text-[#1D1D1F] text-base">${Number(u.rentAmount).toLocaleString()} <span className="text-xs text-[#6E6E73] font-medium">/mo</span></p>
                        {property.type === "Commercial" && u.sqFootage > 0 && (
                          <p className="text-xs font-bold text-[#8E8E93]">${((Number(u.rentAmount) * 12) / u.sqFootage).toFixed(2)}/sqft/yr</p>
                        )}
                      </div>
                      <Button variant="ghost" className="h-8 w-8 p-0 text-[#94A3B8] hover:text-[#1D1D1F]"><MoreVertical className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
              {totalUnits === 0 && (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-[#E5E5EA] rounded-2xl bg-[#F2F2F7]">
                  <Home className="h-12 w-12 text-[#94A3B8] mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-[#1D1D1F]">No Units Added</h3>
                  <p className="text-sm text-[#6E6E73] mt-1">Get started by creating units for this property.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MEDIA TAB */}
        {activeTab === "media" && (
          <div className="space-y-6">
            
            {/* Gamified Alerts */}
            {missingFacade && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                <Wrench className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-yellow-800">Missing Facade Photos!</h4>
                  <p className="text-sm text-yellow-700 font-medium">Commercial listings with exterior photos receive 40% more inquiries. Upload a photo of the building facade.</p>
                </div>
              </div>
            )}
            {unitsWithoutPhotos > 0 && property.type !== "House" && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                <ImageIcon2 className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-blue-800">Interior Photos Missing</h4>
                  <p className="text-sm text-blue-700 font-medium">{unitsWithoutPhotos} {property.type === "Commercial" ? "suites do" : "units do"} not have interior photos. Tenants rarely apply without seeing the interior layout.</p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-[#1D1D1F]">Property Images</h2>
                <p className="text-sm font-medium text-[#6E6E73]">Showing {property.images?.length || 0} images</p>
              </div>
              <Button onClick={() => setIsUploaderOpen(true)} className="bg-[#007AFF] hover:bg-[#0062CC] text-white shadow-sm rounded-xl h-11 font-bold px-6">
                Add Image
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {property.images?.length > 0 ? (
                property.images.map((img: string, i: number) => (
                  <div key={i} className="aspect-square bg-slate-100 rounded-2xl overflow-hidden relative group border border-[#E5E5EA] shadow-sm">
                    <img src={img} alt={`Property image ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-end justify-end p-3">
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleRemoveMedia("PROPERTY", property.id, img)}
                        className="rounded-xl font-bold shadow-md cursor-pointer"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-[#E5E5EA] rounded-2xl bg-[#F2F2F7]">
                  <ImageIcon2 className="h-12 w-12 text-[#94A3B8] mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-[#1D1D1F]">No Images</h3>
                  <p className="text-sm text-[#6E6E73] mt-1">Upload photos to showcase this property.</p>
                </div>
              )}
            </div>

            {/* Display unit-specific media grouped by unit name to handle high unit counts cleanly */}
            {property.units?.some((u: any) => u.images && u.images.length > 0) && (
              <div className="pt-8 border-t border-slate-100 mt-8 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-[#1D1D1F]">Interior & Unit Photos</h3>
                  <p className="text-xs font-semibold text-[#8E8E93] mt-1">Photos are grouped by individual unit.</p>
                </div>
                
                <div className="space-y-4">
                  {property.units
                    .filter((u: any) => u.images?.length > 0)
                    .map((u: any) => (
                      <div key={u.id} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-extrabold text-sm text-slate-800">
                            Unit {u.name} <span className="text-xs font-semibold text-[#8E8E93]">({u.images.length} photos)</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                          {u.images.map((img: string, i: number) => (
                            <div key={i} className="aspect-square bg-white rounded-xl overflow-hidden relative group border border-slate-200/40 shadow-sm">
                              <img src={img} alt={`Unit ${u.name} image ${i}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  onClick={() => handleRemoveMedia("UNIT", u.id, img)}
                                  className="h-7 px-2.5 rounded-lg font-bold text-[10px] shadow-md cursor-pointer"
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AMENITIES TAB */}
        {activeTab === "amenities" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-[#1D1D1F]">Property Amenities</h2>
                <p className="text-sm font-medium text-[#6E6E73]">Features available at this location</p>
              </div>
              <Button className="bg-[#007AFF] hover:bg-[#0062CC] text-white shadow-sm rounded-xl h-11 font-bold px-6">
                Edit Amenities
              </Button>
            </div>
            
            {property.amenities && property.amenities.length > 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-[#E5E5EA] shadow-sm flex flex-wrap gap-3">
                {property.amenities.map((amenity: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 bg-[#F2F2F7] text-[#1D1D1F] text-sm font-extrabold rounded-xl border border-[#E5E5EA]">
                    <CheckCircle2 className="h-4 w-4 text-[#007AFF]" />
                    {amenity}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-[#E5E5EA] rounded-2xl bg-[#F2F2F7]">
                <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center shadow-sm mb-4">
                  <CheckCircle2 className="h-10 w-10 text-[#CBD5E1]" />
                </div>
                <h3 className="text-xl font-black text-[#1D1D1F]">No Amenities Listed</h3>
                <p className="text-[#6E6E73] mt-2 max-w-sm mx-auto font-medium">No amenities have been added to this property yet. Edit property to add them.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SMART MEDIA UPLOADER MODAL */}
      <Dialog open={isUploaderOpen} onOpenChange={setIsUploaderOpen}>
        <DialogContent className="sm:max-w-md bg-white border-[#E5E5EA] rounded-2xl p-0 overflow-hidden shadow-xl">
          <div className="p-6 border-b border-[#E5E5EA] bg-[#F2F2F7]">
            <DialogTitle className="text-xl font-black text-[#1D1D1F]">Upload Media</DialogTitle>
            <DialogDescription className="font-semibold text-[#6E6E73]">
              Photos will be automatically compressed to optimize load times.
            </DialogDescription>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-[#1D1D1F] block uppercase tracking-wider">What are you uploading?</label>
              <select 
                className="w-full bg-white border border-[#E5E5EA] rounded-xl h-12 px-4 font-semibold text-[#1D1D1F] focus:ring-2 focus:ring-[#007AFF]"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
              >
                {property.type === "Commercial" && (
                  <>
                    <option value="FACADE">Building Facade & Signage</option>
                    <option value="LOADING_DOCK">Loading Docks / Parking</option>
                    <option value="UNIT_INTERIOR">Suite Interior / Floorplan</option>
                  </>
                )}
                {property.type === "House" && (
                  <>
                    <option value="EXTERIOR">House Exterior & Yard</option>
                    <option value="UNIT_INTERIOR">Interior Rooms (Bed/Bath/Kitchen)</option>
                  </>
                )}
                {property.type === "Apartment" && (
                  <>
                    <option value="EXTERIOR">Building Exterior</option>
                    <option value="AMENITIES">Common Amenities (Pool, Gym)</option>
                    <option value="UNIT_INTERIOR">Unit Interior</option>
                  </>
                )}
              </select>
            </div>

            {uploadCategory === "UNIT_INTERIOR" && property.units?.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-bold text-[#1D1D1F] block uppercase tracking-wider">Which {property.type === "Commercial" ? "Suite" : "Unit"}?</label>
                <select 
                  className="w-full bg-white border border-[#E5E5EA] rounded-xl h-12 px-4 font-semibold text-[#1D1D1F] focus:ring-2 focus:ring-[#007AFF]"
                  value={uploadTargetUnit}
                  onChange={(e) => setUploadTargetUnit(e.target.value)}
                >
                  <option value="" disabled>Select {property.type === "Commercial" ? "Suite" : "Unit"}...</option>
                  {property.units.map((u: any) => (
                    <option key={u.id} value={u.id}>{property.type === "Commercial" ? "Suite" : "Unit"} {u.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-4">
              <Button 
                onClick={() => document.getElementById("smart-upload-input")?.click()}
                disabled={isUploading || (uploadCategory === "UNIT_INTERIOR" && !uploadTargetUnit)}
                className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white shadow-md rounded-xl h-12 font-bold text-base"
              >
                {isUploading ? "Compressing & Uploading..." : "Select Photos"}
              </Button>
              <input 
                id="smart-upload-input" 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                onChange={handleSmartUpload} 
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SpecCard({ title, value, Icon }: any) {
  return (
    <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-3 bg-[#F2F2F7] text-[#007AFF] rounded-xl shrink-0">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider mb-1">{title}</p>
          <p className="font-extrabold text-[#1D1D1F] text-lg leading-tight truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
