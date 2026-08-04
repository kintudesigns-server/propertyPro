"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, Edit, Building, BedDouble, Bath, 
  Ruler, Home, MapPin, DollarSign, CheckCircle2, 
  Users, Key, FileText, UploadCloud
} from "lucide-react";
import { toast } from "sonner";

export default function UnitDetailsPage() {
  const { id, unitId } = useParams();
  const router = useRouter();
  const [unit, setUnit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchUnit = async () => {
      try {
        const res = await fetch(`/api/units?id=${unitId}`);
        if (res.ok) {
          const data = await res.json();
          setUnit(data);
        } else {
          toast.error("Unit not found");
          router.push(`/dashboard/properties/${id}`);
        }
      } catch (err) {
        toast.error("Error loading unit details");
      } finally {
        setLoading(false);
      }
    };
    if (unitId) fetchUnit();
  }, [unitId, id, router]);

  if (loading) {
    return <div className="p-10 text-center font-extrabold text-xs text-slate-500 font-sans">Loading Unit Details...</div>;
  }
  if (!unit) return null;

  const property = unit.property || {};
  const activeLease = unit.leases?.find((l: any) => l.status === "ACTIVE");

  return (
    <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6 font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex flex-col gap-1.5">
          <Link href={`/dashboard/properties/${id}`} className="text-xs font-extrabold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors w-fit">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Property
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{unit.name}</h1>
            <div className="flex items-center gap-1.5">
              {unit.status === "VACANT" ? (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">Available</span>
              ) : unit.status === "OCCUPIED" ? (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">Occupied</span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">{unit.status}</span>
              )}
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-black text-[10px] uppercase tracking-wider shadow-2xs flex items-center gap-1">
                <Home className="h-3 w-3" /> {unit.type || "Apartment"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
            <Building className="h-3.5 w-3.5 text-slate-400" /> Belongs to <Link href={`/dashboard/properties/${id}`} className="text-slate-900 font-extrabold hover:underline">{property.name}</Link>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
          <Button onClick={() => router.push(`/dashboard/properties/${id}/edit`)} className="flex-1 md:flex-none bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-2xs rounded-xl h-9 font-black text-xs px-4 cursor-pointer">
            <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit Unit
          </Button>
        </div>
      </div>

      {/* Horizontal Tabs Navigation */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shadow-2xs w-fit overflow-x-auto no-scrollbar">
        {["overview", "lease", "images", "amenities"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-xl font-extrabold text-xs transition-all capitalize cursor-pointer ${
              activeTab === tab 
                ? "bg-slate-900 text-white shadow-2xs" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab === "lease" ? "Lease & Tenant" : tab}
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
              <SpecCard title="Rent Amount" value={`$${Number(unit.rentAmount).toFixed(2)}`} subtext="per month" Icon={DollarSign} />
              <SpecCard title="Bedrooms" value={unit.rooms} Icon={BedDouble} />
              <SpecCard title="Bathrooms" value={unit.bathrooms || 1} Icon={Bath} />
              <SpecCard title="Square Footage" value={`${unit.sqFootage} sqft`} Icon={Ruler} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Unit Info Card */}
              <Card className="col-span-1 lg:col-span-2 bg-white border border-slate-200 rounded-3xl shadow-xs">
                <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="font-black text-slate-900 text-base tracking-tight">Unit Specifications</h2>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                        <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Unit Name/Number</div>
                        <div className="font-black text-slate-900 text-xs">{unit.name}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                        <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Unit Type</div>
                        <div className="font-black text-slate-900 text-xs">{unit.type || "Apartment"}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                        <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Floor Level</div>
                        <div className="font-black text-slate-900 text-xs">{unit.floor || "1"}</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                        <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Deposit Required</div>
                        <div className="font-black text-slate-900 text-xs">${Number(unit.depositAmt).toFixed(2)}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                        <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Current Status</div>
                        <div className="font-black text-slate-900 text-xs">{unit.status}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Status / Parent Property Card */}
              <div className="col-span-1 space-y-6">
                <Card className="bg-white border border-slate-200 rounded-3xl shadow-xs">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="font-black text-slate-900 text-sm flex items-center gap-2 tracking-tight">
                      <MapPin className="h-4 w-4 text-slate-700" /> Parent Property
                    </h2>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-black text-slate-900 text-base mb-1 tracking-tight">{property.name}</h3>
                    <p className="text-xs font-semibold text-slate-500 mb-4">{property.address}, {property.city}, {property.country}</p>
                    <Link href={`/dashboard/properties/${id}`}>
                      <Button className="w-full font-black text-xs h-9 bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs cursor-pointer">View Property</Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* LEASE & TENANT TAB */}
        {activeTab === "lease" && (
          <div className="space-y-6">
            {activeLease ? (
              <Card className="bg-white border border-slate-200 rounded-3xl shadow-xs">
                <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <div>
                    <h2 className="font-black text-slate-900 text-base tracking-tight flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-700" /> Active Lease Information
                    </h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">Active</span>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Tenant Details</h3>
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-center font-black text-base shadow-2xs">
                          {activeLease.tenant?.name?.charAt(0) || "T"}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-xs">{activeLease.tenant?.name}</p>
                          <p className="text-xs text-slate-500 font-semibold">{activeLease.tenant?.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Lease Terms</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Start Date</p>
                          <p className="font-black text-slate-900 text-xs mt-0.5">{new Date(activeLease.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">End Date</p>
                          <p className="font-black text-slate-900 text-xs mt-0.5">{new Date(activeLease.endDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Rent Amount</p>
                          <p className="font-black text-slate-900 text-xs mt-0.5">${Number(activeLease.rentAmount).toFixed(2)}/mo</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                <div className="w-16 h-16 bg-white border border-slate-200 rounded-full mx-auto flex items-center justify-center shadow-2xs mb-3">
                  <Key className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-base font-black text-slate-900">No Active Lease</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1 max-w-sm mx-auto">This unit is currently vacant. There are no active leases or tenants assigned to it.</p>
                <Button className="mt-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl h-9 px-4 shadow-xs cursor-pointer">
                  Create Lease
                </Button>
              </div>
            )}
          </div>
        )}

        {/* IMAGES TAB */}
        {activeTab === "images" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Unit Images</h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Showing {unit.images?.length || 0} images for this unit.</p>
              </div>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-xs rounded-xl h-9 px-4 cursor-pointer">
                Add Image
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {unit.images?.length > 0 ? (
                unit.images.map((img: string, i: number) => (
                  <div key={i} className="aspect-square bg-slate-100 rounded-2xl overflow-hidden relative group border border-slate-200 shadow-2xs">
                    <img src={img} alt={`Unit image ${i}`} className="w-full h-full object-cover" />
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                  <UploadCloud className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                  <h3 className="text-base font-black text-slate-900">No Images</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Upload interior photos for this specific unit.</p>
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
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Unit Amenities</h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Features available inside this specific unit.</p>
              </div>
            </div>
            
            {unit.amenities && unit.amenities.length > 0 ? (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap gap-2.5">
                {unit.amenities.map((amenity: string, i: number) => (
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
                <p className="text-xs text-slate-500 font-semibold mt-0.5">No amenities have been specified for this unit yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SpecCard({ title, value, subtext, Icon }: any) {
  return (
    <div className="bg-white border border-slate-200 shadow-xs rounded-3xl p-5 flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-3">
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pr-4">{title}</p>
        <div className="p-2.5 bg-slate-100 text-slate-800 border border-slate-200/80 rounded-2xl shrink-0">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className="font-black text-slate-900 text-2xl leading-tight truncate">{value}</p>
        {subtext && <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}
