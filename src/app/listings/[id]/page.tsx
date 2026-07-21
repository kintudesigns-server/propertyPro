import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Building, MapPin, BedDouble, Square, ShieldCheck, 
  Sparkles, Info, Users, DollarSign, Calendar, ArrowRight, Share2, Heart,
  ImageIcon, ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { TourButtonClient } from "./TourButtonClient";

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
    <div className="min-h-screen bg-slate-50 pt-20 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <Link href="/listings">
          <Button variant="ghost" className="h-10 px-4 rounded-xl font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors -ml-4 mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to all listings
          </Button>
        </Link>
      </div>

      {/* 1. HERO GALLERY (AIRBNB STYLE) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">{displayName}</h1>
            <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mt-1">
              <MapPin className="h-4 w-4" /> {fullAddress}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full shadow-sm font-bold text-xs"><Share2 className="h-4 w-4 mr-2" /> Share</Button>
            <Button variant="outline" className="rounded-full shadow-sm font-bold text-xs"><Heart className="h-4 w-4 mr-2 text-rose-500" /> Save</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-[400px] md:h-[500px] rounded-3xl overflow-hidden relative">
          {/* Main Hero Image */}
          <div className="md:col-span-2 md:row-span-2 h-full bg-slate-200">
            <img src={uniqueImages[0]} alt="Main" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" />
          </div>
          {/* 4 Grid Images */}
          {uniqueImages.slice(1, 5).map((img, idx) => (
            <div key={idx} className="hidden md:block h-full bg-slate-200">
              <img src={img} alt={`Gallery ${idx+1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" />
            </div>
          ))}
          <Button variant="secondary" className="absolute bottom-4 right-4 rounded-xl shadow-lg font-bold bg-white/90 hover:bg-white text-slate-800 border border-slate-200 backdrop-blur-md">
            <ImageIcon className="h-4 w-4 mr-2" /> Show all photos
          </Button>
        </div>
      </div>

      {/* 2. CONTENT & STICKY SIDEBAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 grid grid-cols-1 lg:grid-cols-3 gap-12 relative">
        
        {/* Left Column (Details) */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Quick Stats */}
          <div className="flex items-center gap-6 pb-8 border-b border-slate-200">
            <div>
              <p className="text-xl font-bold text-slate-800">{isHouse ? "Single Family Home" : isCommercial ? "Commercial Space" : "Apartment"}</p>
              <p className="text-sm font-semibold text-slate-500">Managed by {unit.property.name} Team</p>
            </div>
            <div className="h-12 w-px bg-slate-200 hidden sm:block"></div>
            {!isCommercial && (
              <>
                <div className="flex flex-col items-center">
                  <span className="text-lg font-black text-slate-800">{unit.rooms}</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Beds</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-lg font-black text-slate-800">{unit.bathrooms || 1}</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Baths</span>
                </div>
              </>
            )}
            <div className="flex flex-col items-center">
              <span className="text-lg font-black text-slate-800">{unit.sqFootage}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sq Ft</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2"><Info className="h-5 w-5 text-blue-600"/> About this space</h3>
            <p className="text-slate-600 leading-relaxed text-sm font-medium">
              {unit.property.description || "Welcome to your new space! This property is professionally managed and features top-tier amenities tailored for modern living or business needs. With exceptional attention to detail, you will find everything you need to thrive."}
            </p>
          </div>

          {/* Amenities */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-blue-600"/> What this place offers</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-2">
              {Array.from(new Set([...(unit.amenities || []), ...(unit.property.amenities || [])])).map((am) => (
                <div key={am} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <CheckCircleIcon className="h-4 w-4 text-slate-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{am}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Map Embed */}
          <div className="pt-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><MapPin className="h-5 w-5 text-blue-600"/> Neighborhood Map</h3>
            <div className="w-full h-[400px] rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
              <iframe 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                style={{ border: 0 }} 
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`}
                allowFullScreen
              ></iframe>
            </div>
          </div>

        </div>

        {/* Right Column (Sticky Apply Card) */}
        <div className="lg:col-span-1">
          <div className="sticky top-28">
            <Card className="rounded-[2rem] border border-[#E2E8F0] shadow-xl shadow-blue-900/5 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <span className="text-3xl font-black text-slate-800">${Number(unit.rentAmount).toLocaleString()}</span>
                    <span className="text-sm font-semibold text-slate-500"> / month</span>
                  </div>
                  {(unit as any).leaseStructure && (
                    <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-0 font-bold px-3 py-1">
                      {(unit as any).leaseStructure} Lease
                    </Badge>
                  )}
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-500 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500"/> Security Deposit</span>
                    <span className="text-sm font-bold text-slate-800">${Number(unit.depositAmt || unit.rentAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-500 flex items-center gap-2"><Building className="h-4 w-4 text-blue-500"/> Available</span>
                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Immediately</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Link href={`/listings?applyUnitId=${unit.id}`} className="block">
                    <Button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm flex justify-center items-center gap-2">
                      Apply Now <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <TourButtonClient unit={unit} />
                </div>
                
                <p className="text-[11px] text-center text-slate-400 font-semibold mt-4">
                  You won't be charged anything to apply or tour.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckCircleIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}
