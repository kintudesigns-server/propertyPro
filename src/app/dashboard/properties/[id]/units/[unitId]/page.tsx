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
    return <div className="p-10 text-center font-bold text-[#64748B]">Loading Unit Details...</div>;
  }
  if (!unit) return null;

  const property = unit.property || {};
  const activeLease = unit.leases?.find((l: any) => l.status === "ACTIVE");

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div className="flex flex-col gap-2">
          <Link href={`/dashboard/properties/${id}`} className="text-sm font-bold text-[#64748B] hover:text-[#3B82F6] flex items-center gap-2 mb-2 transition-colors w-fit">
            <ArrowLeft className="h-4 w-4" /> Back to Property
          </Link>
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">{unit.name}</h1>
            <div className="flex items-center gap-2">
              {unit.status === "VACANT" ? (
                <Badge className="bg-[#DCFCE7] text-[#16A34A] hover:bg-[#DCFCE7] border-0 rounded-lg px-3 py-1 font-bold shadow-sm">Available</Badge>
              ) : unit.status === "OCCUPIED" ? (
                <Badge className="bg-[#EFF6FF] text-[#3B82F6] hover:bg-[#EFF6FF] border-0 rounded-lg px-3 py-1 font-bold shadow-sm">Occupied</Badge>
              ) : (
                <Badge className="bg-[#FEE2E2] text-[#EF4444] hover:bg-[#FEE2E2] border-0 rounded-lg px-3 py-1 font-bold shadow-sm">{unit.status}</Badge>
              )}
              <Badge className="bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0] rounded-lg px-3 py-1 font-bold shadow-sm flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5" /> {unit.type || "Apartment"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]">
            <Building className="h-4 w-4" /> Belongs to <Link href={`/dashboard/properties/${id}`} className="text-[#3B82F6] hover:underline">{property.name}</Link>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          <Button onClick={() => router.push(`/dashboard/properties/${id}/edit`)} className="flex-1 md:flex-none bg-white text-[#0F172A] border border-[#E2E8F0] hover:bg-[#F8FAFC] shadow-sm rounded-xl h-11 font-bold px-6">
            <Edit className="h-4 w-4 mr-2" /> Edit Unit
          </Button>
        </div>
      </div>

      {/* Custom Horizontal Tabs */}
      <div className="flex items-center gap-2 bg-[#F8FAFC] p-1.5 rounded-[16px] border border-[#E2E8F0] overflow-x-auto no-scrollbar shadow-sm">
        {["overview", "lease", "images", "amenities"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap capitalize ${
              activeTab === tab 
                ? "bg-gradient-to-b from-[#3B82F6] to-[#2563EB] text-white shadow-md shadow-blue-500/20" 
                : "text-[#64748B] hover:text-[#0F172A] hover:bg-white"
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
              <Card className="col-span-1 lg:col-span-2 bg-white border-[#E2E8F0] rounded-2xl shadow-sm">
                <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50">
                  <h2 className="font-bold text-[#0F172A] text-lg">Unit Specifications</h2>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
                        <div className="text-sm font-bold text-[#64748B]">Unit Name/Number</div>
                        <div className="font-semibold text-[#0F172A]">{unit.name}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
                        <div className="text-sm font-bold text-[#64748B]">Unit Type</div>
                        <div className="font-semibold text-[#0F172A]">{unit.type || "Apartment"}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
                        <div className="text-sm font-bold text-[#64748B]">Floor Level</div>
                        <div className="font-semibold text-[#0F172A]">{unit.floor || "1"}</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
                        <div className="text-sm font-bold text-[#64748B]">Deposit Required</div>
                        <div className="font-semibold text-[#0F172A]">${Number(unit.depositAmt).toFixed(2)}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
                        <div className="text-sm font-bold text-[#64748B]">Current Status</div>
                        <div className="font-semibold text-[#0F172A]">{unit.status}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Status / Parent Property Card */}
              <div className="col-span-1 space-y-6">
                <Card className="bg-white border-[#E2E8F0] rounded-2xl shadow-sm">
                  <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]/50">
                    <h2 className="font-bold text-[#0F172A] text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#3B82F6]" /> Parent Property
                    </h2>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-extrabold text-[#0F172A] text-lg mb-2">{property.name}</h3>
                    <p className="text-sm text-[#475569] mb-4">{property.address}, {property.city}, {property.country}</p>
                    <Link href={`/dashboard/properties/${id}`}>
                      <Button variant="outline" className="w-full font-bold border-[#E2E8F0]">View Property</Button>
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
              <Card className="bg-white border-[#E2E8F0] rounded-2xl shadow-sm">
                <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex justify-between items-center">
                  <div>
                    <h2 className="font-bold text-[#0F172A] text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[#3B82F6]" /> Active Lease Information
                    </h2>
                  </div>
                  <Badge className="bg-[#DCFCE7] text-[#16A34A] hover:bg-[#DCFCE7] border-0">Active</Badge>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-sm font-black text-[#94A3B8] uppercase tracking-wider mb-4">Tenant Details</h3>
                      <div className="flex items-center gap-4 border-b border-[#F1F5F9] pb-4">
                        <div className="w-12 h-12 rounded-full bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center font-black text-xl">
                          {activeLease.tenant?.name?.charAt(0) || "T"}
                        </div>
                        <div>
                          <p className="font-bold text-[#0F172A]">{activeLease.tenant?.name}</p>
                          <p className="text-sm text-[#64748B]">{activeLease.tenant?.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-sm font-black text-[#94A3B8] uppercase tracking-wider mb-4">Lease Terms</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-bold text-[#64748B]">Start Date</p>
                          <p className="font-semibold text-[#0F172A]">{new Date(activeLease.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#64748B]">End Date</p>
                          <p className="font-semibold text-[#0F172A]">{new Date(activeLease.endDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#64748B]">Rent Amount</p>
                          <p className="font-semibold text-[#0F172A]">${Number(activeLease.rentAmount).toFixed(2)}/mo</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-[#E2E8F0] rounded-2xl bg-[#F8FAFC]">
                <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center shadow-sm mb-4">
                  <Key className="h-10 w-10 text-[#CBD5E1]" />
                </div>
                <h3 className="text-xl font-black text-[#0F172A]">No Active Lease</h3>
                <p className="text-[#64748B] mt-2 max-w-sm mx-auto font-medium">This unit is currently vacant. There are no active leases or tenants assigned to it.</p>
                <Button className="mt-6 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold rounded-xl h-11 px-6">
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
                <h2 className="text-xl font-bold text-[#0F172A]">Unit Images</h2>
                <p className="text-sm font-medium text-[#64748B]">Showing {unit.images?.length || 0} images for this unit.</p>
              </div>
              <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm rounded-xl h-11 font-bold px-6">
                Add Image
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {unit.images?.length > 0 ? (
                unit.images.map((img: string, i: number) => (
                  <div key={i} className="aspect-square bg-slate-100 rounded-2xl overflow-hidden relative group border border-[#E2E8F0]">
                    <img src={img} alt={`Unit image ${i}`} className="w-full h-full object-cover" />
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-[#E2E8F0] rounded-2xl bg-[#F8FAFC]">
                  <UploadCloud className="h-12 w-12 text-[#94A3B8] mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-[#0F172A]">No Images</h3>
                  <p className="text-sm text-[#64748B] mt-1">Upload interior photos for this specific unit.</p>
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
                <h2 className="text-xl font-bold text-[#0F172A]">Unit Amenities</h2>
                <p className="text-sm font-medium text-[#64748B]">Features available inside this specific unit.</p>
              </div>
            </div>
            
            {unit.amenities && unit.amenities.length > 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-wrap gap-3">
                {unit.amenities.map((amenity: string, i: number) => (
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
                <p className="text-[#64748B] mt-2 max-w-sm mx-auto font-medium">No amenities have been specific for this unit. Edit the unit to add them.</p>
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
    <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-4">
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider pr-4">{title}</p>
          <div className="p-2.5 bg-[#F8FAFC] text-[#3B82F6] rounded-xl shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div>
          <p className="font-extrabold text-[#0F172A] text-2xl leading-tight truncate">{value}</p>
          {subtext && <p className="text-xs text-[#64748B] mt-1 font-medium">{subtext}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
