import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building, MapPin, BedDouble, Square, ShieldCheck, 
  Sparkles, Info, Users, DollarSign, Calendar, ArrowRight, Share2, Heart,
  ImageIcon, ArrowLeft, CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { TourButtonClient } from "./TourButtonClient";
import { GalleryClient } from "./GalleryClient";

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rawUnit = await prisma.unit.findUnique({
    where: { id: id },
    include: { property: true }
  });

  if (!rawUnit || rawUnit.status === "MAINTENANCE") {
    notFound();
  }

  const unit = JSON.parse(JSON.stringify(rawUnit));

  const isCommercial = unit.property.type === "Commercial";
  const isHouse = unit.property.type === "House";
  const displayName = isHouse ? unit.property.name : unit.name;
  const fullAddress = `${unit.property.address}, ${unit.property.city}, ${unit.property.state || ''} ${unit.property.zip || ''}`;

  // Combine cover photo, property images, and unit images, ensuring cover is first.
  const allImages = [
    ...(unit.property.coverPhoto ? [unit.property.coverPhoto] : []),
    ...(unit.property.images || []),
    ...(unit.images || [])
  ];
  // Deduplicate URLs
  let uniqueImages = Array.from(new Set(allImages));
  
  // Smart placeholders based on property type to ensure the 5-grid looks beautiful
  const placeholders = isHouse ? [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80"
  ] : isCommercial ? [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80",
    "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&q=80"
  ] : [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1c2f165a2a?w=800&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80"
  ];

  while (uniqueImages.length < 5) {
    uniqueImages.push(placeholders[uniqueImages.length]);
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1D1D1F] flex flex-col font-sans selection:bg-[#007AFF]/20 pb-28 lg:pb-16">
      
      {/* 1. STICKY TRANSLUCENT NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/75 backdrop-blur-xl border-b border-black/10 px-4 sm:px-8 py-3 flex items-center justify-between transition-all">
        <Link href="/listings" className="inline-flex items-center text-[#007AFF] font-semibold text-sm hover:opacity-80 transition-opacity">
          <ArrowLeft className="h-4 w-4 mr-1 stroke-[2.5]" />
          <span>Listings</span>
        </Link>

        <div className="hidden sm:block font-bold text-xs text-[#1D1D1F] truncate max-w-xs">
          {displayName}
        </div>

        <div className="flex items-center gap-2">
          <button
            className="h-8 w-8 rounded-full bg-[#E5E5EA] hover:bg-[#D1D1D6] text-[#1D1D1F] flex items-center justify-center transition-colors"
            title="Share"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            className="h-8 w-8 rounded-full bg-[#E5E5EA] hover:bg-[#D1D1D6] text-[#1D1D1F] flex items-center justify-center transition-colors"
            title="Save"
          >
            <Heart className="h-4 w-4 text-[#FF2D55]" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full space-y-6">
        
        {/* 2. TITLE & HEADER HERO BLOCK */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#007AFF]/10 text-[#007AFF] px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {isHouse ? "House" : isCommercial ? "Commercial" : "Apartment"}
              </span>
              {unit.leaseStructure && (
                <span className="bg-emerald-500/10 text-emerald-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {unit.leaseStructure} Lease
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D1D1F] tracking-tight">{displayName}</h1>
            <p className="text-xs sm:text-sm text-[#8E8E93] font-normal flex items-center gap-1.5 mt-1">
              <MapPin className="h-3.5 w-3.5 text-[#007AFF] shrink-0" /> {fullAddress}
            </p>
          </div>

          {/* Price Tag Header Display */}
          <div className="sm:text-right shrink-0">
            <div className="text-2xl sm:text-3xl font-black text-[#1D1D1F]">
              ${Number(unit.rentAmount).toLocaleString()}
              <span className="text-xs font-normal text-[#8E8E93]"> / mo</span>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center sm:justify-end gap-1 mt-0.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Deposit: ${Number(unit.depositAmt || unit.rentAmount).toLocaleString()}
            </div>
          </div>
        </div>

        {/* 3. HERO GALLERY (Client interactive component) */}
        <GalleryClient images={uniqueImages} title={displayName} />

        {/* 4. QUICK STATS SCROLLABLE PILL ROW */}
        <div className="flex items-center gap-2.5 overflow-x-auto py-1 text-xs font-semibold no-scrollbar">
          <div className="bg-white border border-black/5 px-4 py-2 rounded-full shadow-sm flex items-center gap-2 shrink-0">
            <Building className="h-4 w-4 text-[#007AFF]" />
            <span>{isHouse ? "Single Family Home" : isCommercial ? "Commercial Space" : "Apartment"}</span>
          </div>
          {!isCommercial && (
            <>
              <div className="bg-white border border-black/5 px-4 py-2 rounded-full shadow-sm flex items-center gap-2 shrink-0">
                <BedDouble className="h-4 w-4 text-[#007AFF]" />
                <span>{unit.rooms} {unit.rooms === 1 ? "Bedroom" : "Bedrooms"}</span>
              </div>
              <div className="bg-white border border-black/5 px-4 py-2 rounded-full shadow-sm flex items-center gap-2 shrink-0">
                <Users className="h-4 w-4 text-[#007AFF]" />
                <span>{unit.bathrooms || 1} Bathrooms</span>
              </div>
            </>
          )}
          <div className="bg-white border border-black/5 px-4 py-2 rounded-full shadow-sm flex items-center gap-2 shrink-0">
            <Square className="h-4 w-4 text-[#007AFF]" />
            <span>{unit.sqFootage} sq ft</span>
          </div>
          <div className="bg-white border border-black/5 px-4 py-2 rounded-full shadow-sm flex items-center gap-2 shrink-0 text-emerald-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Available Immediately</span>
          </div>
        </div>

        {/* 5. SPLIT CONTENT (Left Detail Grouped Cards / Right Sticky Apply Card) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative items-start">
          
          {/* Left 2 Columns: Inset Grouped Cards */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* About Section Inset Card */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider ml-1">About this space</span>
              <div className="bg-white rounded-[22px] border border-black/5 p-5 shadow-sm space-y-2">
                <p className="text-xs sm:text-sm text-[#3C3C43] leading-relaxed font-normal">
                  {unit.property.description || "Welcome to your new space! Professionally managed with top-tier amenities, refined craftsmanship, and prompt maintenance support. Designed to maximize natural light and functional space."}
                </p>
                <div className="pt-2 border-t border-black/5 flex items-center gap-2 text-xs text-[#8E8E93]">
                  <ShieldCheck className="h-4 w-4 text-[#007AFF]" />
                  <span>Managed directly by {unit.property.name} team</span>
                </div>
              </div>
            </div>

            {/* Amenities Section Inset Grouped Table Rows */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider ml-1">What this place offers</span>
              <div className="bg-white rounded-[22px] border border-black/5 overflow-hidden shadow-sm">
                {Array.from(new Set([...(unit.amenities || []), ...(unit.property.amenities || [])])).map((am, idx, arr) => (
                  <div
                    key={am}
                    className={`flex items-center justify-between py-3.5 px-5 text-xs font-medium ${
                      idx !== arr.length - 1 ? "border-b border-black/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF] shrink-0">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[#1D1D1F] font-semibold">{am}</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-[#34C759]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Lease Details Inset Card */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider ml-1">Lease & Payment Terms</span>
              <div className="bg-white rounded-[22px] border border-black/5 overflow-hidden shadow-sm">
                <div className="flex justify-between items-center py-3.5 px-5 border-b border-black/5 text-xs">
                  <span className="text-[#8E8E93] font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#007AFF]" /> Monthly Rent
                  </span>
                  <span className="font-bold text-[#1D1D1F]">${Number(unit.rentAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3.5 px-5 border-b border-black/5 text-xs">
                  <span className="text-[#8E8E93] font-medium flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#34C759]" /> Security Deposit
                  </span>
                  <span className="font-bold text-[#1D1D1F]">${Number(unit.depositAmt || unit.rentAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3.5 px-5 border-b border-black/5 text-xs">
                  <span className="text-[#8E8E93] font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#007AFF]" /> Move-in Availability
                  </span>
                  <span className="font-bold text-[#34C759]">Immediate</span>
                </div>
                <div className="flex justify-between items-center py-3.5 px-5 text-xs">
                  <span className="text-[#8E8E93] font-medium flex items-center gap-2">
                    <Building className="h-4 w-4 text-[#007AFF]" /> Application Fee
                  </span>
                  <span className="font-bold text-[#34C759]">Free ($0)</span>
                </div>
              </div>
            </div>

            {/* Location Map Section */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider ml-1">Neighborhood Map</span>
              <div className="bg-white rounded-[22px] border border-black/5 overflow-hidden shadow-sm p-2">
                <div className="w-full h-[320px] rounded-[18px] overflow-hidden border border-black/5">
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
                <div className="p-3 flex items-center gap-2 text-xs text-[#8E8E93] font-medium">
                  <MapPin className="h-4 w-4 text-[#007AFF] shrink-0" />
                  <span className="truncate">{fullAddress}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right 1 Column: Sticky Desktop Apply Card */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-20">
              <div className="bg-white rounded-[22px] border border-black/5 p-6 shadow-lg space-y-5">
                <div>
                  <span className="text-3xl font-black text-[#1D1D1F]">
                    ${Number(unit.rentAmount).toLocaleString()}
                  </span>
                  <span className="text-xs text-[#8E8E93] font-medium"> / month</span>
                </div>

                <div className="space-y-3 pt-2 border-t border-black/5 text-xs text-[#8E8E93]">
                  <div className="flex justify-between items-center py-1">
                    <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#34C759]" /> Deposit</span>
                    <span className="font-bold text-[#1D1D1F]">${Number(unit.depositAmt || unit.rentAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-[#007AFF]" /> Available</span>
                    <span className="font-bold text-[#34C759]">Immediately</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Link href={`/listings?applyUnitId=${unit.id}`} className="block">
                    <Button className="w-full h-12 rounded-full bg-[#007AFF] hover:bg-[#0066CC] text-white font-semibold text-xs transition-all shadow-md shadow-[#007AFF]/25 flex items-center justify-center gap-2 active:scale-98">
                      Apply Now <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <TourButtonClient unit={unit} />
                </div>

                <div className="pt-3 border-t border-black/5 flex items-center justify-center gap-2 text-[11px] text-[#8E8E93]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#34C759]" />
                  <span>Free to apply &bull; Digital Lease Agreement</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 6. MOBILE FLOATING BOTTOM ACTION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-black/10 px-4 py-3 pb-safe shadow-2xl flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-black text-[#1D1D1F]">
            ${Number(unit.rentAmount).toLocaleString()}
            <span className="text-[10px] font-normal text-[#8E8E93]">/mo</span>
          </div>
          <div className="text-[9px] text-[#34C759] font-bold">No application fee</div>
        </div>
        <div className="flex items-center gap-2">
          <TourButtonClient
            unit={unit}
            className="h-10 px-3.5 rounded-full font-semibold text-xs text-[#007AFF] border border-[#007AFF] bg-[#007AFF]/5 flex items-center gap-1"
          />
          <Link href={`/listings?applyUnitId=${unit.id}`}>
            <Button className="h-10 px-4 rounded-full bg-[#007AFF] hover:bg-[#0066CC] text-white font-semibold text-xs shadow-md shadow-[#007AFF]/20 flex items-center gap-1 active:scale-95">
              Apply <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

    </div>
  );
}
