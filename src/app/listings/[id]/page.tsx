import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Building, MapPin, BedDouble, Bath, Square, ShieldCheck,
  Sparkles, DollarSign, Calendar, ArrowRight, Share2, Heart,
  ImageIcon, ArrowLeft, CheckCircle2, Car, Waves, Wind, Tv,
  ChefHat, Dumbbell, Package, Bell, Eye, Flower2, ParkingCircle,
  Shirt, Lock, Star,
} from "lucide-react";
import Link from "next/link";
import { TourButtonClient } from "./TourButtonClient";
import { GalleryClient } from "./GalleryClient";

// Map amenity keywords to lucide icons
function getAmenityIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("pool"))          return Waves;
  if (n.includes("ocean") || n.includes("view")) return Eye;
  if (n.includes("garage") || n.includes("parking") || n.includes("car")) return Car;
  if (n.includes("gym") || n.includes("fitness")) return Dumbbell;
  if (n.includes("theater") || n.includes("cinema")) return Tv;
  if (n.includes("kitchen") || n.includes("chef")) return ChefHat;
  if (n.includes("air") || n.includes("ac") || n.includes("cooling")) return Wind;
  if (n.includes("garden") || n.includes("lawn")) return Flower2;
  if (n.includes("storage") || n.includes("warehouse")) return Package;
  if (n.includes("concierge") || n.includes("doorman")) return Bell;
  if (n.includes("laundry") || n.includes("washer")) return Shirt;
  if (n.includes("security") || n.includes("gated")) return Lock;
  if (n.includes("balcony") || n.includes("patio") || n.includes("deck")) return Star;
  if (n.includes("parking"))        return ParkingCircle;
  return Sparkles;
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rawUnit = await prisma.unit.findUnique({
    where: { id },
    include: { property: true },
  });

  if (!rawUnit || rawUnit.status === "MAINTENANCE") notFound();

  const unit = JSON.parse(JSON.stringify(rawUnit));

  const isCommercial = unit.property.type === "Commercial";
  const isHouse      = unit.property.type === "House";
  const displayName  = isHouse ? unit.property.name : unit.name;
  const typeLabel    = isHouse ? "House" : isCommercial ? "Commercial" : "Apartment";
  const fullAddress  = `${unit.property.address}, ${unit.property.city}, ${unit.property.state || ""} ${unit.property.zip || ""}`;

  // Gallery images
  const allImages = [
    ...(unit.property.coverPhoto ? [unit.property.coverPhoto] : []),
    ...(unit.property.images || []),
    ...(unit.images || []),
  ];
  let uniqueImages = Array.from(new Set(allImages)) as string[];
  const placeholders = isHouse ? [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80",
  ] : isCommercial ? [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80",
    "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&q=80",
  ] : [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1c2f165a2a?w=800&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
  ];
  while (uniqueImages.length < 5) uniqueImages.push(placeholders[uniqueImages.length]);

  const rent        = Number(unit.rentAmount);
  const deposit     = Number(unit.depositAmt || unit.rentAmount);
  const totalMoveIn = rent + deposit;

  const amenities = Array.from(new Set([
    ...(unit.amenities || []),
    ...(unit.property.amenities || []),
  ])) as string[];

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-slate-900 flex flex-col font-sans pb-28 lg:pb-16">

      {/* ── Sticky Nav ── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between">
        <Link
          href="/listings"
          className="inline-flex items-center gap-1.5 text-slate-600 font-semibold text-sm hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 stroke-[2]" />
          Listings
        </Link>
        <span className="hidden sm:block text-sm font-bold text-slate-800 truncate max-w-xs">
          {displayName}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
            title="Share"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button
            className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
            title="Save"
          >
            <Heart className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full space-y-5">

        {/* ── 1. Title Strip ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-slate-900 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {typeLabel}
              </span>
              {unit.leaseStructure && (
                <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {unit.leaseStructure} Lease
                </span>
              )}
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Available Immediately
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {displayName}
            </h1>
            <p className="text-[13px] text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {fullAddress}
            </p>
          </div>
        </div>

        {/* ── 2. Gallery ── */}
        <GalleryClient images={uniqueImages} title={displayName} />

        {/* ── 3. Stats Grid ── */}
        <div className={`grid gap-3 ${isCommercial ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
          {!isCommercial && (
            <>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                <BedDouble className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xl font-black text-slate-900">{unit.rooms}</p>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  {unit.rooms === 1 ? "Bedroom" : "Bedrooms"}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                <Bath className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xl font-black text-slate-900">{unit.bathrooms || 1}</p>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  {(unit.bathrooms || 1) === 1 ? "Bathroom" : "Bathrooms"}
                </p>
              </div>
            </>
          )}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
            <Square className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
            <p className="text-xl font-black text-slate-900">{unit.sqFootage}</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Sq Ft</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
            <Building className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
            <p className="text-base font-black text-slate-900 leading-tight">{typeLabel}</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Property Type</p>
          </div>
        </div>

        {/* ── 4. Split Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative items-start">

          {/* Left: Detail cards */}
          <div className="lg:col-span-2 space-y-4">

            {/* About */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Building className="h-4 w-4 text-slate-400" />
                <h3 className="text-[14px] font-bold text-slate-800">About this space</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                <p className="text-[13px] text-slate-600 leading-relaxed">
                  {unit.property.description ||
                    "Welcome to your new space! Professionally managed with top-tier amenities, refined craftsmanship, and prompt maintenance support. Designed to maximize natural light and functional space."}
                </p>
                <div className="flex items-center gap-2 text-[12px] text-slate-400 pt-2 border-t border-slate-100">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Professionally managed by <strong className="text-slate-600">{unit.property.name}</strong></span>
                </div>
              </div>
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-400" />
                    <h3 className="text-[14px] font-bold text-slate-800">What this place offers</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {amenities.length} amenities
                  </span>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-2.5">
                    {amenities.map((am) => {
                      const Icon = getAmenityIcon(am);
                      return (
                        <div
                          key={am}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                        >
                          <Icon className="h-4 w-4 text-slate-500 shrink-0" />
                          <span className="text-[12px] font-semibold text-slate-700 truncate">{am}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Lease & Payment Terms */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-slate-400" />
                <h3 className="text-[14px] font-bold text-slate-800">Lease & Payment Terms</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { label: "Monthly Rent",      value: `$${rent.toLocaleString()}`,        icon: DollarSign, accent: false },
                  { label: "Security Deposit",  value: `$${deposit.toLocaleString()}`,     icon: ShieldCheck, accent: false },
                  { label: "Move-in Availability", value: "Immediately",                   icon: Calendar,   accent: true  },
                  { label: "Application Fee",   value: "Free ($0)",                        icon: CheckCircle2, accent: true },
                  { label: "Lease Type",        value: unit.leaseStructure || "Standard",  icon: Building,   accent: false },
                ].map(({ label, value, icon: Icon, accent }) => (
                  <div key={label} className="flex items-center justify-between px-5 py-3.5">
                    <span className="flex items-center gap-2 text-[13px] text-slate-500 font-medium">
                      <Icon className="h-3.5 w-3.5 text-slate-400" />
                      {label}
                    </span>
                    <span className={`text-[13px] font-bold ${accent ? "text-emerald-600" : "text-slate-800"}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Map */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <h3 className="text-[14px] font-bold text-slate-800">Neighborhood Map</h3>
              </div>
              <div className="p-3">
                <div className="w-full h-[280px] rounded-xl overflow-hidden border border-slate-100">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`}
                    allowFullScreen
                  />
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mt-2.5 px-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{fullAddress}</span>
                </p>
              </div>
            </div>

          </div>

          {/* ── Right: Sticky Apply Card ── */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-20">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">

                {/* Price Header */}
                <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">
                      ${rent.toLocaleString()}
                    </span>
                    <span className="text-[13px] text-slate-400 font-medium">/ month</span>
                  </div>
                  <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    Available immediately
                  </p>
                </div>

                {/* Move-In Cost Breakdown */}
                <div className="px-6 py-4 border-b border-slate-100 space-y-2.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Move-In Cost Breakdown
                  </p>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-slate-500 font-medium">First Month Rent</span>
                    <span className="font-bold text-slate-800">${rent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-slate-500 font-medium">Security Deposit</span>
                    <span className="font-bold text-slate-800">${deposit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px] pt-2.5 border-t border-slate-100">
                    <span className="font-bold text-slate-700">Total Due at Move-In</span>
                    <span className="font-black text-slate-900 text-base">${totalMoveIn.toLocaleString()}</span>
                  </div>
                </div>

                {/* Urgency Signal */}
                <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
                  <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    12 people viewed this listing this week
                  </p>
                </div>

                {/* CTAs */}
                <div className="px-6 py-5 space-y-3">
                  <Link href={`/listings?applyUnitId=${unit.id}`} className="block">
                    <Button className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all">
                      Apply Now <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <TourButtonClient unit={unit} />
                </div>

                {/* Trust Signal */}
                <div className="px-6 pb-5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Free to apply • Digital Lease Agreement</span>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Mobile Floating Bar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shadow-2xl">
        <div>
          <div className="text-lg font-black text-slate-900">
            ${rent.toLocaleString()}
            <span className="text-[10px] font-normal text-slate-400 ml-1">/mo</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-bold">No application fee</div>
        </div>
        <div className="flex items-center gap-2">
          <TourButtonClient
            unit={unit}
            className="h-10 px-3.5 rounded-xl font-semibold text-xs text-slate-700 border border-slate-200 bg-white flex items-center gap-1 hover:bg-slate-50 transition-colors"
          />
          <Link href={`/listings?applyUnitId=${unit.id}`}>
            <Button className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5">
              Apply <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

    </div>
  );
}
