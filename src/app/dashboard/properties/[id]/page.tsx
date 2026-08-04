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
    return <div className="p-10 text-center font-extrabold text-xs text-slate-500 font-sans">Loading Property Details...</div>;
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
    
    const isUnit = uploadCategory === "UNIT_INTERIOR" && uploadTargetUnit;
    const targetType = isUnit ? "UNIT" : "PROPERTY";
    const targetId = isUnit ? uploadTargetUnit : property.id;
    
    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      try {
        toast.loading(`Compressing ${file.name}...`, { id: `upload-${i}` });
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
        
        toast.loading(`Uploading to CDN...`, { id: `upload-${i}` });
        const formData = new FormData();
        formData.append("file", compressedFile);
        
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error("Upload failed");
        
        const { url } = await uploadRes.json();
        const taggedUrl = `${url}#category=${uploadCategory}`;

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
      fetchProperty();
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

  const missingFacade = property.type === "Commercial" && (!property.images || property.images.length === 0);
  const unitsWithoutPhotos = property.units?.filter((u: any) => !u.images || u.images.length === 0).length || 0;

  return (
    <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6 font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex flex-col gap-1.5">
          <Link href="/dashboard/properties" className="text-xs font-extrabold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors w-fit">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Properties
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{property.name}</h1>
            <div className="flex items-center gap-1.5">
              {property.status === "AVAILABLE" ? (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">{property.status}</span>
              ) : property.status === "OCCUPIED" ? (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">{property.status}</span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">{property.status}</span>
              )}
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-black text-[10px] uppercase tracking-wider shadow-2xs flex items-center gap-1">
                <Building className="h-3 w-3" /> {property.type || "Apartment"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
            <MapPin className="h-3.5 w-3.5 text-slate-400" /> {property.city}, {property.country}
          </div>
          
          {property.approvalStatus === "PENDING" && (
            <div className="mt-2 p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-2xs">
              <Wrench className="h-4 w-4 text-amber-600" /> 
              {userRole === "SUPERADMIN" 
                ? "This property is pending your approval to become active on the platform." 
                : "Property Under Review. You cannot add units until an Admin approves it."}
            </div>
          )}
          {property.approvalStatus === "REJECTED" && (
            <div className="mt-2 p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-2xs">
              <Wrench className="h-4 w-4 text-rose-600" /> 
              {`Property Rejected. Reason: ${property.rejectionReason || "Not specified"}`}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 flex-wrap">
          {userRole === "SUPERADMIN" ? (
             <>
               {property.approvalStatus !== "APPROVED" && (
                 <Button onClick={() => handlePropertyApproval("APPROVED")} className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs rounded-xl h-9 font-black text-xs px-4 cursor-pointer">
                   <Check className="h-3.5 w-3.5 mr-1.5" /> Approve Property
                 </Button>
               )}
               {property.approvalStatus !== "REJECTED" && (
                 <Button onClick={() => {
                   const reason = prompt("Enter rejection reason:");
                   if (reason !== null) handlePropertyApproval("REJECTED", reason);
                 }} className="flex-1 md:flex-none bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 shadow-2xs rounded-xl h-9 font-black text-xs px-4 cursor-pointer">
                   <X className="h-3.5 w-3.5 mr-1.5" /> Reject
                 </Button>
               )}
             </>
          ) : (
             <>
               {property.type !== "House" && (
                 <Button className="flex-1 md:flex-none bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 shadow-2xs rounded-xl h-9 font-black text-xs px-4 cursor-pointer">
                   <Download className="h-3.5 w-3.5 mr-1.5" /> Generate Rent Roll
                 </Button>
               )}
               <Button onClick={() => router.push(`/dashboard/properties/${id}/edit`)} className="flex-1 md:flex-none bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-2xs rounded-xl h-9 font-black text-xs px-4 cursor-pointer">
                 <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit Property
               </Button>
               <Button onClick={handleDelete} className="flex-1 md:flex-none bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 shadow-2xs rounded-xl h-9 font-black text-xs px-4 cursor-pointer">
                 <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
               </Button>
             </>
          )}
        </div>
      </div>

      {/* Horizontal Tabs Navigation */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shadow-2xs w-fit overflow-x-auto no-scrollbar">
        {["overview", "details", ...(property.type === "House" ? [] : ["units"]), "media", "amenities"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-xl font-extrabold text-xs transition-all capitalize cursor-pointer flex items-center gap-1.5 ${
              activeTab === tab 
                ? "bg-slate-900 text-white shadow-2xs" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab === "units" && property.type === "Commercial" ? "Suites" : tab === "media" ? <><ImageIcon2 className="h-3.5 w-3.5" /> Media</> : tab}
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
              
              {/* Occupancy Card */}
              <Card className="col-span-1 lg:col-span-2 bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden flex flex-col justify-between">
                <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h2 className="font-black text-slate-900 text-base tracking-tight">
                      {property.type === "House" ? "Lease & Unit Status" : "Occupancy Overview"}
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Real-time unit status</p>
                  </div>
                  {property.type !== "House" && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setActiveTab("units")} className="rounded-xl font-black text-xs border-slate-200 text-slate-900 bg-white hover:bg-slate-50 shadow-2xs h-8">View {property.type === "Commercial" ? "Suites" : "Units"}</Button>
                      <Button size="sm" disabled={property.approvalStatus !== "APPROVED"} onClick={() => router.push(`/dashboard/properties/${id}/edit`)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs shadow-2xs h-8">Add {property.type === "Commercial" ? "Suite" : "Unit"}</Button>
                    </div>
                  )}
                </div>
                <CardContent className="p-6 flex-1 flex flex-col justify-between min-h-[340px]">
                  {property.type === "House" ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
                      <div className={`h-20 w-20 rounded-full flex items-center justify-center mb-4 shadow-2xs border-4 ${property.units?.[0]?.status === "OCCUPIED" ? "bg-slate-100 border-slate-200 text-slate-900" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                        {property.units?.[0]?.status === "OCCUPIED" ? <Users className="h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mb-0.5">{property.units?.[0]?.status === "OCCUPIED" ? "Currently Rented" : "Vacant & Ready"}</h3>
                      <p className="text-slate-500 font-semibold text-xs">Rent: ${Number(property.units?.[0]?.rentAmount || 0).toLocaleString()}/mo</p>
                      {property.units?.[0]?.status !== "OCCUPIED" && (
                        <Button onClick={() => router.push(`/dashboard/tenants/new`)} className="mt-6 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl h-10 px-6 shadow-xs cursor-pointer">Invite Tenant</Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="font-black text-3xl text-slate-900 tracking-tight">{occupancyRate}%</span>
                          <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider">{occupiedUnits} of {totalUnits} units occupied</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-900 rounded-full transition-all duration-1000" style={{ width: `${occupancyRate}%` }} />
                        </div>
                      </div>
                      
                      {/* Units Quick View Snapshot */}
                      <div className="my-5 flex-1 border border-slate-200/80 rounded-2xl p-4 bg-slate-50/50">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Units Status Snapshot</h4>
                          <button onClick={() => setActiveTab("units")} className="text-xs font-extrabold text-slate-900 hover:text-slate-700 transition-colors cursor-pointer">
                            Manage Units ({totalUnits}) →
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          {!property.units || property.units.length === 0 ? (
                            <p className="text-xs text-slate-500 font-semibold text-center py-6">No units added to this property.</p>
                          ) : (
                            property.units.slice(0, 3).map((u: any) => (
                              <div key={u.id} className="flex justify-between items-center py-2 px-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200 text-slate-400 shrink-0">
                                    <Home className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-xs font-black text-slate-900">{property.type === "Commercial" ? "" : "Unit "}{u.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-black text-slate-900">${Number(u.rentAmount || 0).toLocaleString()}/mo</span>
                                  <span className={`px-2 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wider shadow-2xs ${
                                    u.status === "VACANT" 
                                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                                      : u.status === "OCCUPIED" 
                                      ? "bg-slate-100 text-slate-800 border border-slate-200" 
                                      : "bg-rose-50 text-rose-800 border border-rose-200"
                                  }`}>
                                    {u.status === "VACANT" ? "Available" : u.status}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
 
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-auto">
                        <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                          <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider mb-0.5">Available</p>
                          <p className="text-2xl font-black text-emerald-950 leading-none">{vacantUnits}</p>
                        </div>
                        <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200">
                          <p className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-0.5">Occupied</p>
                          <p className="text-2xl font-black text-slate-900 leading-none">{occupiedUnits}</p>
                        </div>
                        <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200">
                          <p className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider mb-0.5">Maintenance</p>
                          <p className="text-2xl font-black text-amber-950 leading-none">{maintenanceUnits}</p>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-0.5">Total</p>
                          <p className="text-2xl font-black text-slate-900 leading-none">{totalUnits}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
 
              {/* Location & Financials Column */}
              <div className="col-span-1 space-y-6 flex flex-col justify-between">
                <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden flex flex-col flex-1">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="font-black text-slate-900 text-sm flex items-center gap-2 tracking-tight">
                      <MapPin className="h-4 w-4 text-slate-700" /> Location
                    </h2>
                  </div>
                  <CardContent className="p-5 flex flex-col justify-between flex-1">
                    <div className="w-full h-36 bg-slate-100 rounded-2xl mb-4 overflow-hidden border border-slate-200 shadow-2xs">
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
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Street Address</p>
                        <p className="font-black text-slate-900 text-xs mt-0.5">{property.address || "N/A"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">City</p>
                          <p className="font-extrabold text-slate-900 text-xs mt-0.5">{property.city}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">State/ZIP</p>
                          <p className="font-extrabold text-slate-900 text-xs mt-0.5">{property.state} {property.zip}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
 
                <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden flex flex-col justify-between">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="font-black text-slate-900 text-sm flex items-center gap-2 tracking-tight">
                      <DollarSign className="h-4 w-4 text-slate-700" /> Financial Overview
                    </h2>
                  </div>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Monthly Rent Range</span>
                      <span className="font-black text-slate-900 text-xs">{rentRange}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Price per Sq. Ft.</span>
                      <span className="font-black text-emerald-700 text-xs">${ppsqft} {property.type === "Commercial" ? "/yr" : "/mo"}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* DETAILS TAB */}
        {activeTab === "details" && (
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-black text-slate-900 text-base tracking-tight flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-700" />
                Property Specifications
              </h2>
            </div>
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-3">
                  {[
                    { label: "Property Name", value: property.name, Icon: Building, color: "text-slate-700 bg-slate-100" },
                    { label: "Property Type", value: property.type || "Apartment", Icon: Home, color: "text-slate-700 bg-slate-100" },
                    { label: "Status", value: property.status, Icon: CheckCircle2, color: "text-emerald-700 bg-emerald-50", isBadge: true },
                    { label: "Year Built", value: property.yearBuilt || "Not specified", Icon: Clock, color: "text-slate-700 bg-slate-100" },
                  ].map((spec, i) => (
                    <div key={i} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${spec.color}`}>
                          <spec.Icon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{spec.label}</span>
                      </div>
                      {spec.isBadge ? (
                        <span className={`px-2.5 py-0.5 rounded-md font-black text-[10px] uppercase tracking-wider shadow-2xs ${
                          spec.value === "AVAILABLE" 
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                            : spec.value === "OCCUPIED" 
                            ? "bg-slate-100 text-slate-800 border border-slate-200" 
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                        }`}>
                          {spec.value}
                        </span>
                      ) : (
                        <span className="font-black text-slate-900 text-xs">{spec.value}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="lg:col-span-5 flex">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between w-full shadow-2xs">
                    <div>
                      <h3 className="font-black text-slate-900 text-xs flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-slate-700" />
                        About the Property
                      </h3>
                      <p className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {property.description || "No description has been provided for this property yet."}
                      </p>
                    </div>
                    
                    <div className="mt-6 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                      <span>Property ID</span>
                      <span className="font-mono text-slate-900 font-black select-all">{property.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* UNITS TAB */}
        {activeTab === "units" && property.type !== "House" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{property.type === "Commercial" ? "Suites List" : "Units List"}</h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Showing {totalUnits} {property.type === "Commercial" ? "suites" : "units"} for {property.name}</p>
              </div>
              <Button disabled={property.approvalStatus !== "APPROVED"} className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-xs rounded-xl h-9 px-4 cursor-pointer">
                Add {property.type === "Commercial" ? "Suite" : "Unit"}
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {property.units?.map((u: any) => (
                <div key={u.id} className="border border-slate-200 bg-white rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 group flex flex-col">
                  <div className="relative h-40 bg-slate-100 overflow-hidden">
                    {u.images && u.images.length > 0 ? (
                      <div className="w-full h-full relative">
                        <img src={u.images[0]} alt={u.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        {u.images.length > 1 && (
                          <span className="absolute bottom-2 right-2 bg-black/60 text-white font-black text-[10px] px-2 py-0.5 rounded-md backdrop-blur-md">+{u.images.length - 1} Photos</span>
                        )}
                      </div>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-400"><Home className="h-8 w-8 opacity-50" /></div>
                    )}
                    <div className="absolute top-3 left-3 z-10">
                      {u.status === "VACANT" ? (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">Available</span>
                      ) : u.status === "OCCUPIED" ? (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">Occupied</span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">{u.status}</span>
                      )}
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-black text-slate-900 text-base tracking-tight">{property.type === "Commercial" ? "" : "Unit "}{u.name}</h3>
                      <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mt-0.5">{u.type || (property.type === "Commercial" ? "Space" : "Apartment")}</p>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                      <div>
                        <p className="font-black text-slate-900 text-sm">${Number(u.rentAmount).toLocaleString()} <span className="text-[10px] text-slate-500 font-semibold">/mo</span></p>
                      </div>
                      <Button onClick={() => router.push(`/dashboard/properties/${id}/units/${u.id}`)} className="h-8 px-3 rounded-xl bg-slate-900 text-white font-black text-xs shadow-2xs hover:bg-slate-800 cursor-pointer">
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MEDIA TAB */}
        {activeTab === "media" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Property Images</h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Showing {property.images?.length || 0} images</p>
              </div>
              <Button onClick={() => setIsUploaderOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-xs rounded-xl h-9 px-4 cursor-pointer">
                Add Image
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {property.images?.length > 0 ? (
                property.images.map((img: string, i: number) => (
                  <div key={i} className="aspect-square bg-slate-100 rounded-2xl overflow-hidden relative group border border-slate-200 shadow-2xs">
                    <img src={img} alt={`Property image ${i}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3">
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleRemoveMedia("PROPERTY", property.id, img)}
                        className="rounded-xl font-black text-xs shadow-2xs cursor-pointer"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                  <ImageIcon2 className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                  <h3 className="text-base font-black text-slate-900">No Images</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Upload photos to showcase this property.</p>
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
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Property Amenities</h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Features available at this location</p>
              </div>
              <Button onClick={() => router.push(`/dashboard/properties/${id}/edit`)} className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-xs rounded-xl h-9 px-4 cursor-pointer">
                Edit Amenities
              </Button>
            </div>
            
            {property.amenities && property.amenities.length > 0 ? (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap gap-2.5">
                {property.amenities.map((amenity: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 text-slate-900 text-xs font-extrabold rounded-xl border border-slate-200 shadow-2xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {amenity}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                <CheckCircle2 className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <h3 className="text-base font-black text-slate-900">No Amenities Listed</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">No amenities have been added to this property yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SMART MEDIA UPLOADER MODAL */}
      <Dialog open={isUploaderOpen} onOpenChange={setIsUploaderOpen}>
        <DialogContent className="sm:max-w-md bg-white border-slate-200 rounded-3xl p-0 overflow-hidden shadow-2xl font-sans">
          <div className="p-6 border-b border-slate-100 bg-slate-50/70">
            <DialogTitle className="text-lg font-black text-slate-900 tracking-tight">Upload Media</DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-500 mt-0.5">
              Photos will be automatically compressed to optimize load times.
            </DialogDescription>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-900 block uppercase tracking-wider">What are you uploading?</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl h-10 px-3.5 text-xs font-semibold text-slate-900 outline-none shadow-2xs"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
              >
                {property.type === "Commercial" && (
                  <>
                    <option value="FACADE">Building Facade &amp; Signage</option>
                    <option value="LOADING_DOCK">Loading Docks / Parking</option>
                    <option value="UNIT_INTERIOR">Suite Interior / Floorplan</option>
                  </>
                )}
                {property.type === "House" && (
                  <>
                    <option value="EXTERIOR">House Exterior &amp; Yard</option>
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
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-900 block uppercase tracking-wider">Which {property.type === "Commercial" ? "Suite" : "Unit"}?</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl h-10 px-3.5 text-xs font-semibold text-slate-900 outline-none shadow-2xs"
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
                className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-xs rounded-xl h-10 font-black text-xs cursor-pointer"
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
    <div className="bg-white border border-slate-200 shadow-xs rounded-3xl p-5 flex items-center gap-4">
      <div className="p-3 bg-slate-100 text-slate-800 rounded-2xl shrink-0 border border-slate-200">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">{title}</p>
        <p className="font-black text-slate-900 text-lg leading-tight truncate">{value}</p>
      </div>
    </div>
  );
}
