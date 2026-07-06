"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Home,
  MapPin,
  BedDouble,
  Square,
  CheckCircle2,
  Building,
  Search,
  ArrowRight,
  Calendar,
  Sparkles,
  Heart,
  Share2,
  DollarSign,
  Clock,
  ShieldCheck,
  Check,
  FileText,
  X,
  Info,
  Upload,
  Trash2,
  Users,
  ImageIcon
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface VacantUnit {
  id: string;
  name: string;
  rentAmount: string;
  depositAmt: string;
  rooms: number;
  sqFootage: number;
  maxOccupants?: number;
  leaseStructure?: string | null;
  amenities: string[];
  images: string[];
  property: {
    id: string;
    name: string;
    address: string;
    city: string;
    country: string;
    coverPhoto: string | null;
    amenities: string[];
    type: string;
  };
}

const CAR_MAKES = [
  "Acura", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler", "Dodge", "Ford", "GMC",
  "Honda", "Hyundai", "Infiniti", "Jeep", "Kia", "Lexus", "Lincoln", "Mazda", "Mercedes-Benz",
  "Nissan", "Porsche", "Ram", "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo", "Other"
];

export default function ListingsPage() {
  const { data: session } = useSession();
  const [units, setUnits] = useState<VacantUnit[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchCity, setSearchCity] = useState("");
  const [maxRent, setMaxRent] = useState<string>("");
  const [minRooms, setMinRooms] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("featured");

  // Favorites State (Stored locally or in-memory)
  const [favorites, setFavorites] = useState<string[]>([]);

  // Detailed View State
  const [selectedDetailUnit, setSelectedDetailUnit] = useState<VacantUnit | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Application Form State
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [applicantDoc, setApplicantDoc] = useState<File | null>(null);

  // Set initial state when session loads
  useEffect(() => {
    if (session?.user) {
      setApplicantName((session.user as any).name || "");
      setApplicantEmail((session.user as any).email || "");
      if ((session.user as any).phone) setApplicantPhone((session.user as any).phone);
    }
  }, [session]);
  const [selectedUnit, setSelectedUnit] = useState<VacantUnit | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);

  // Expanded Screening & Multi-Step States
  const [formStep, setFormStep] = useState(1);
  const [leaseDuration, setLeaseDuration] = useState("12");
  const [moveInDate, setMoveInDate] = useState("");
  const [occupantsCount, setOccupantsCount] = useState("1");
  const [employerName, setEmployerName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("EMPLOYED");
  const [prevLandlordName, setPrevLandlordName] = useState("");
  const [prevLandlordPhone, setPrevLandlordPhone] = useState("");
  const [prevLandlordEmail, setPrevLandlordEmail] = useState("");
  const [reasonForMoving, setReasonForMoving] = useState("");
  const [petsCount, setPetsCount] = useState("0");
  const [petDetails, setPetDetails] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [customMake, setCustomMake] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState<boolean>(false);

  useEffect(() => {
    setVehicleModel("");
    setCustomMake("");
    setCustomModel("");
    setModels([]);

    if (!vehicleMake || vehicleMake === "Other") {
      return;
    }

    const fetchModels = async () => {
      setModelsLoading(true);
      try {
        const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(vehicleMake)}?format=json`);
        if (!res.ok) throw new Error("Failed to fetch models");
        const data = await res.json();
        const modelNames: string[] = (data.Results || [])
          .map((m: { Model_Name?: string }) => m.Model_Name?.trim())
          .filter((name: string) => !!name);
        const uniqueSortedModels = Array.from(new Set(modelNames)).sort((a, b) => a.localeCompare(b));
        setModels(uniqueSortedModels);
      } catch (err) {
        console.error("Error fetching vehicle models:", err);
      } finally {
        setModelsLoading(false);
      }
    };

    fetchModels();
  }, [vehicleMake]);

  // Tour Scheduling State
  const [tourDialogOpen, setTourDialogOpen] = useState(false);
  const [selectedTourUnit, setSelectedTourUnit] = useState<VacantUnit | null>(null);
  const [tourName, setTourName] = useState("");
  const [tourEmail, setTourEmail] = useState("");
  const [tourPhone, setTourPhone] = useState("");
  const [tourType, setTourType] = useState("IN_PERSON");
  const [tourDate, setTourDate] = useState("");
  const [tourTime, setTourTime] = useState("09:00:00");
  const [schedulingTour, setSchedulingTour] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setTourName((session.user as any).name || "");
      setTourEmail((session.user as any).email || "");
      if ((session.user as any).phone) setTourPhone((session.user as any).phone);
    }
  }, [session]);

  // Load listings
  useEffect(() => {
    async function fetchListings() {
      try {
        const res = await fetch("/api/listings");
        if (!res.ok) throw new Error("Failed to load listings");
        const data = await res.json();
        setUnits(data);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, []);

  // Filter & Sort Logic
  const processedUnits = [...units]
    .filter((u) => {
      const query = searchCity.toLowerCase().trim();
      const matchesCity =
        query === "" ||
        u.property.city.toLowerCase().includes(query) ||
        u.property.name.toLowerCase().includes(query) ||
        u.name.toLowerCase().includes(query);

      const matchesRent = maxRent === "" || Number(u.rentAmount) <= Number(maxRent);
      const matchesRooms = minRooms === "all" || u.rooms >= Number(minRooms);

      return matchesCity && matchesRent && matchesRooms;
    })
    .sort((a, b) => {
      if (sortBy === "rent_asc") return Number(a.rentAmount) - Number(b.rentAmount);
      if (sortBy === "rent_desc") return Number(b.rentAmount) - Number(a.rentAmount);
      if (sortBy === "sqft_desc") return b.sqFootage - a.sqFootage;
      return 0; // Featured
    });

  // Group units by property to avoid flooding the page with 50 identical apartment cards
  const groupedProperties = [...processedUnits].reduce((acc, unit) => {
    const pid = unit.property.id;
    if (!acc[pid]) {
      acc[pid] = {
        property: unit.property,
        units: [],
        minRent: Infinity, maxRent: 0,
        minBeds: Infinity, maxBeds: 0,
        minSqft: Infinity, maxSqft: 0
      };
    }
    const group = acc[pid];
    group.units.push(unit);
    
    const rent = Number(unit.rentAmount);
    if (rent < group.minRent) group.minRent = rent;
    if (rent > group.maxRent) group.maxRent = rent;
    
    const beds = unit.rooms || 0;
    if (beds < group.minBeds) group.minBeds = beds;
    if (beds > group.maxBeds) group.maxBeds = beds;

    const sqft = unit.sqFootage || 0;
    if (sqft < group.minSqft) group.minSqft = sqft;
    if (sqft > group.maxSqft) group.maxSqft = sqft;

    return acc;
  }, {} as Record<string, any>);

  const groupedList = Object.values(groupedProperties);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  // Handlers
  const handleTourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourName || !tourEmail || !tourPhone || !tourDate || !selectedTourUnit) {
      toast.error("Please fill in all details.");
      return;
    }

    setSchedulingTour(true);
    try {
      const scheduledAt = `${tourDate}T${tourTime}`;
      const res = await fetch("/api/tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedTourUnit.property.id,
          unitId: selectedTourUnit.id,
          tenantName: tourName,
          tenantEmail: tourEmail,
          tenantPhone: tourPhone,
          tourType,
          scheduledAt,
        }),
      });

      if (res.ok) {
        toast.success(
          `Tour requested successfully for ${selectedTourUnit.name}! The landlord will confirm your slot.`
        );
        setTourDialogOpen(false);
        setTourName("");
        setTourEmail("");
        setTourPhone("");
        setTourDate("");
        setTourTime("09:00:00");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to schedule tour.");
      }
    } catch (err) {
      toast.error("Error scheduling tour.");
    } finally {
      setSchedulingTour(false);
    }
  };
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName || !applicantEmail || !applicantPhone || !selectedUnit) {
      toast.error("Please fill in all applicant details.");
      return;
    }
    if (employmentStatus === "EMPLOYED" && (!employerName || !jobTitle)) {
      toast.error("Please provide your employer name and job title.");
      return;
    }
    if (employmentStatus !== "EMPLOYED" && !employerName) {
      toast.error("Please provide your primary source of income.");
      return;
    }
    if (!monthlyIncome) {
      toast.error("Please provide your monthly income.");
      return;
    }
    if (!applicantDoc) {
      toast.error("Please upload a supporting document (ID or pay stub) to submit your application.");
      return;
    }

    if (Number(petsCount) > 0 && !petDetails.trim()) {
      toast.error("Please provide details (breed, weight) for your pet(s).");
      return;
    }

    if (vehicleMake) {
      if (vehicleMake === "Other") {
        if (!customMake.trim() || !customModel.trim()) {
          toast.error("Please specify your custom vehicle Make and Model.");
          return;
        }
      } else {
        if (!vehicleModel) {
          toast.error("Please select a vehicle model.");
          return;
        }
      }
    }

    const finalMake = vehicleMake === "Other" ? customMake.trim() : vehicleMake;
    const finalModel = vehicleMake === "Other" ? customModel.trim() : vehicleModel;
    const combinedVehicleInfo = finalMake ? `${finalMake} ${finalModel} ${vehiclePlate.trim() ? `(Plate: ${vehiclePlate.trim()})` : ""}`.trim() : "";

    setApplying(true);
    try {
      let documentUrls: string[] = [];
      if (applicantDoc) {
        const formData = new FormData();
        formData.append("file", applicantDoc);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          documentUrls.push(url);
        } else {
          toast.error("Failed to upload document. Proceeding without it.");
        }
      }

        const res = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unitId: selectedUnit.id,
            name: applicantName,
            email: applicantEmail,
            phone: applicantPhone,
            documents: documentUrls,
            leaseDuration,
            moveInDate: moveInDate || null,
            occupantsCount,
            employerName: employmentStatus === "EMPLOYED" ? employerName : (employmentStatus === "STUDENT" ? "Student (Source: " + employerName + ")" : "Unemployed (Source: " + employerName + ")"),
            jobTitle: employmentStatus === "EMPLOYED" ? jobTitle : employmentStatus,
            monthlyIncome: monthlyIncome || null,
          prevLandlordName: prevLandlordName || null,
          prevLandlordPhone: prevLandlordPhone || null,
          prevLandlordEmail: prevLandlordEmail || null,
          reasonForMoving: reasonForMoving || null,
          petsCount,
          petDetails: petDetails || null,
          vehicleInfo: combinedVehicleInfo || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmittedAppId(data.id);
        toast.success("Application submitted successfully!");
        setApplicantName("");
        setApplicantEmail("");
        setApplicantPhone("");
        setApplicantDoc(null);
        setLeaseDuration("12");
        setMoveInDate("");
        setOccupantsCount("1");
        setEmployerName("");
        setJobTitle("");
        setMonthlyIncome("");
        setEmploymentStatus("EMPLOYED");
        setPrevLandlordName("");
        setPrevLandlordPhone("");
        setPrevLandlordEmail("");
        setReasonForMoving("");
        setPetsCount("0");
        setPetDetails("");
        setVehicleInfo("");
        setVehicleMake("");
        setVehicleModel("");
        setCustomMake("");
        setCustomModel("");
        setVehiclePlate("");
        setFormStep(1);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit application.");
      }
    } catch (err) {
      toast.error("Error submitting application.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-black text-xl text-blue-600">
          <Building className="h-6 w-6 text-blue-600" />
          <span>Property<span className="text-[#0F172A]">Pro</span></span>
        </Link>
        <Link href={session ? "/dashboard" : "/auth/login"}>
          <Button variant="outline" className="border-[#E2E8F0] text-slate-700 hover:bg-slate-50 rounded-full px-5 py-2 font-bold shadow-sm transition-colors text-xs">
            {session ? "Dashboard" : "Sign In"}
          </Button>
        </Link>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden py-16 px-6 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/40 via-transparent to-transparent pointer-events-none" />
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3 text-slate-800">
          Find Your Next Home
        </h1>
        <p className="text-xs text-slate-400 max-w-xl mx-auto mb-8 font-extrabold uppercase tracking-wider">
          Browse verified premium rental units listed directly by authorized property owners.
        </p>
      </div>

      {/* Terms & Onboarding Explanation Banner */}
      <div className="max-w-7xl mx-auto px-6 mb-8 w-full">
        <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-100 rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-left">
            <Badge className="bg-blue-100 text-blue-700 font-extrabold hover:bg-blue-100 border-0 rounded-full text-[10px] tracking-wider uppercase mb-1">
              Frictionless Onboarding
            </Badge>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Platform Terms & Checkout Process
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed font-semibold">
              Applying is always 100% free. Once approved, you sign the lease contract online and secure the property by depositing the bond via Stripe.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto shrink-0">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm mb-2">1</div>
              <span className="text-[11px] font-extrabold text-slate-700">Apply Free</span>
              <span className="text-[9px] text-slate-400 font-semibold mt-0.5">Submit profile</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm mb-2">2</div>
              <span className="text-[11px] font-extrabold text-slate-700">Get Approved</span>
              <span className="text-[9px] text-slate-400 font-semibold mt-0.5">Owner review</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="h-8 w-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-black text-sm mb-2">3</div>
              <span className="text-[11px] font-extrabold text-slate-700">Sign Online</span>
              <span className="text-[9px] text-slate-400 font-semibold mt-0.5">Digital contract</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm mb-2">4</div>
              <span className="text-[11px] font-extrabold text-slate-700">Pay Bond</span>
              <span className="text-[9px] text-slate-400 font-semibold mt-0.5">Secure with Stripe</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-4 w-full">
        {/* Filters and Search Bar Container */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 mb-8 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by city, property name or unit type..."
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                className="pl-11 bg-slate-50 border-0 text-slate-800 placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-2xl h-12 text-sm font-medium"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-44">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="number"
                  placeholder="Max rent..."
                  value={maxRent}
                  onChange={(e) => setMaxRent(e.target.value)}
                  className="pl-8 bg-slate-50 border-0 text-slate-800 placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-2xl h-12 text-sm font-semibold"
                />
              </div>
              <select
                value={minRooms}
                onChange={(e) => setMinRooms(e.target.value)}
                className="w-full md:w-36 bg-slate-50 border-0 text-slate-700 rounded-2xl h-12 px-3 text-sm focus:ring-1 focus:ring-blue-500 font-semibold cursor-pointer"
              >
                <option value="all">Any Beds</option>
                <option value="1">1+ Bed</option>
                <option value="2">2+ Beds</option>
                <option value="3">3+ Beds</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full md:w-44 bg-slate-50 border-0 text-slate-700 rounded-2xl h-12 px-3 text-sm focus:ring-1 focus:ring-blue-500 font-semibold cursor-pointer col-span-2 sm:col-span-1"
              >
                <option value="featured">Sort: Featured</option>
                <option value="rent_asc">Rent: Low to High</option>
                <option value="rent_desc">Rent: High to Low</option>
                <option value="sqft_desc">Size: Large to Small</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
            <span>Showing {processedUnits.length} verified listings</span>
            {(searchCity || maxRent || minRooms !== "all") && (
              <button
                onClick={() => {
                  setSearchCity("");
                  setMaxRent("");
                  setMinRooms("all");
                  setSortBy("featured");
                }}
                className="text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Listings Display */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-[26rem] rounded-[2rem] bg-white animate-pulse border border-[#E2E8F0] shadow-sm" />
            ))}
          </div>
        ) : groupedList.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-[#E2E8F0] max-w-md mx-auto shadow-sm">
            <Home className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-extrabold mb-1">No Listings Found</h3>
            <p className="text-xs text-slate-400 font-semibold">Try modifying your search query or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {groupedList.map((group: any) => {
              const isMultiUnit = group.units.length > 1;
              const unit = group.units[0]; // fallback for single unit
              
              return (
              <div 
                key={group.property.id} 
                className="block group"
                onClick={() => {
                  if (isMultiUnit) {
                    setSelectedGroup(group);
                  } else {
                    window.location.href = `/listings/${unit.id}`;
                  }
                }}
              >
                <Card
                  className="overflow-hidden bg-white border border-[#E2E8F0] rounded-[2rem] shadow-sm hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 flex flex-col text-left cursor-pointer h-full"
                >
                {/* Cover Image Container */}
                <div className="h-56 overflow-hidden relative bg-slate-100">
                  <img
                    src={group.property.coverPhoto || unit.images?.[0] || "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800"}
                    alt={group.property.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                  {/* Floating Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                    <Badge className={`font-extrabold text-[10px] px-2.5 py-1 border-0 rounded-full shadow-sm flex items-center gap-1 backdrop-blur-sm ${
                      group.property.type === "House" ? "bg-amber-500/90 text-white" :
                      group.property.type === "Commercial" ? "bg-indigo-500/90 text-white" :
                      "bg-emerald-500/90 text-white"
                    }`}>
                      {group.property.type === "House" && <Home className="h-3.5 w-3.5" />}
                      {group.property.type === "Commercial" && <Building className="h-3.5 w-3.5" />}
                      {group.property.type === "Apartment" && <Building className="h-3.5 w-3.5" />}
                      {group.property.type === "House" ? "Single Family Home" :
                       group.property.type === "Commercial" ? "Commercial Space" : "Apartment Complex"}
                    </Badge>
                  </div>

                  {/* Rent badge overlay */}
                  <div className="absolute bottom-4 left-4 flex flex-col gap-1">
                    <span className="text-white font-black text-xl drop-shadow-md">
                      {isMultiUnit ? (
                        group.minRent === group.maxRent ? `$${group.minRent.toLocaleString()}` : `$${group.minRent.toLocaleString()} - $${group.maxRent.toLocaleString()}`
                      ) : (
                        `$${Number(unit.rentAmount).toLocaleString()}`
                      )}
                      <span className="text-xs font-bold text-slate-200"> / month</span>
                    </span>
                  </div>
                </div>

                <CardHeader className="pb-3 px-6 pt-5">
                  <div className="flex items-center gap-1 text-[11px] text-blue-600 font-bold mb-1.5 uppercase tracking-wider">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{group.property.city}, {group.property.country}</span>
                  </div>
                  <CardTitle className="text-lg text-slate-800 font-extrabold group-hover:text-blue-600 transition-colors">
                    {group.property.name}
                  </CardTitle>
                  <CardDescription className="text-slate-400 font-semibold flex items-center gap-1.5 mt-1 text-xs">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    {group.property.address}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-4 px-6 flex-1">
                  <div className="flex items-center gap-4 text-slate-400 text-xs mb-4 border-y border-slate-100 py-3 font-semibold">
                    {group.property.type !== "Commercial" && (
                      <span className="flex items-center gap-1">
                        <BedDouble className="h-4 w-4 text-blue-600" />
                        <strong className="text-slate-800">
                          {isMultiUnit 
                            ? (group.minBeds === group.maxBeds ? group.minBeds : `${group.minBeds}-${group.maxBeds}`) 
                            : unit.rooms}
                        </strong> Beds
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Square className="h-4 w-4 text-blue-600" />
                      <strong className="text-slate-800">
                        {isMultiUnit 
                          ? (group.minSqft === group.maxSqft ? group.minSqft : `${group.minSqft}-${group.maxSqft}`)
                          : unit.sqFootage}
                      </strong> sq ft
                    </span>
                  </div>
                  
                  {isMultiUnit && (
                     <div className="bg-blue-50 text-blue-700 font-bold text-xs px-3 py-2 rounded-lg inline-block mb-2">
                       {group.units.length} Units Available Now
                     </div>
                  )}
                </CardContent>

                <CardFooter className="pt-0 p-6 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    onClick={() => {
                      if (isMultiUnit) {
                        setSelectedGroup(group);
                      } else {
                        window.location.href = `/listings/${unit.id}`;
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-11 flex justify-center items-center gap-1.5 transition-colors shadow-none text-xs"
                  >
                    {isMultiUnit ? "View Floor Plans & Units" : "View Details & Apply"}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </CardFooter>
              </Card>
              </div>
            )})}
          </div>
        )}
      </main>

      {/* Property Group Dialog */}
      <Dialog open={!!selectedGroup} onOpenChange={(o) => !o && setSelectedGroup(null)}>
        <DialogContent className="bg-[#F8FAFC] border-[#E2E8F0] text-slate-800 rounded-[2rem] max-w-2xl p-0 overflow-hidden shadow-2xl">
          {selectedGroup && (
            <>
              <div className="bg-white p-6 border-b border-[#E2E8F0] flex justify-between items-start">
                <div>
                  <DialogTitle className="text-2xl font-black">{selectedGroup.property.name}</DialogTitle>
                  <DialogDescription className="text-slate-500 font-semibold mt-1">
                    Select an available unit below to view full details and apply.
                  </DialogDescription>
                </div>
                <Badge className="bg-blue-100 text-blue-700 border-0 rounded-lg font-bold">
                  {selectedGroup.units.length} Available
                </Badge>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
                {selectedGroup.units.map((u: any) => (
                  <div key={u.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex justify-between items-center hover:border-blue-300 transition-colors shadow-sm">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-lg">
                        {selectedGroup.property.type === "Commercial" ? "Suite " : "Unit "}{u.name}
                      </h4>
                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 mt-1">
                        {selectedGroup.property.type !== "Commercial" && (
                          <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {u.rooms} Bed</span>
                        )}
                        <span className="flex items-center gap-1"><Square className="h-3 w-3" /> {u.sqFootage} sqft</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <span className="font-black text-blue-600 text-xl">${Number(u.rentAmount).toLocaleString()}</span>
                      <Button onClick={() => window.location.href = `/listings/${u.id}`} className="bg-slate-900 hover:bg-slate-800 text-white h-8 rounded-lg text-xs font-bold px-4">
                        View Unit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>



      {/* ── TOUR SCHEDULING DIALOG ── */}
      <Dialog open={tourDialogOpen} onOpenChange={setTourDialogOpen}>
        <DialogContent className="bg-white border-[#E2E8F0] text-slate-800 rounded-[2rem] max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Schedule Visit for {selectedTourUnit?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Select a visit type, day, and time. We will notify the landlord of {selectedTourUnit?.property.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTourSubmit} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="tourType" className="text-xs font-bold text-slate-700">Tour Type</Label>
              <select
                id="tourType"
                value={tourType}
                onChange={(e) => setTourType(e.target.value)}
                className="w-full bg-slate-50 border-0 text-slate-800 rounded-xl h-11 px-3 text-sm focus:ring-blue-500 focus:border-blue-500 font-semibold"
              >
                <option value="IN_PERSON">In-Person Guided Tour</option>
                <option value="VIDEO_CALL">Virtual Video Tour</option>
                <option value="SELF_GUIDED">Self-Guided Tour (Smart Lock)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tourDate" className="text-xs font-bold text-slate-700">Date</Label>
                <Input
                  id="tourDate"
                  type="date"
                  required
                  value={tourDate}
                  onChange={(e) => setTourDate(e.target.value)}
                  className="bg-slate-50 border-0 text-slate-800 rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tourTime" className="text-xs font-bold text-slate-700">Time Slot</Label>
                <select
                  id="tourTime"
                  value={tourTime}
                  onChange={(e) => setTourTime(e.target.value)}
                  className="w-full bg-slate-50 border-0 text-slate-800 rounded-xl h-11 px-3 text-sm focus:ring-blue-500 focus:border-blue-500 font-semibold"
                >
                  <option value="09:00:00">9:00 AM</option>
                  <option value="10:30:00">10:30 AM</option>
                  <option value="12:00:00">12:00 PM</option>
                  <option value="13:30:00">1:30 PM</option>
                  <option value="15:00:00">3:00 PM</option>
                  <option value="16:30:00">4:30 PM</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tourName" className="text-xs font-bold text-slate-700">Your Full Name</Label>
              <Input
                id="tourName"
                placeholder="Jane Smith"
                value={tourName}
                onChange={(e) => setTourName(e.target.value)}
                className="bg-slate-50 border-0 text-slate-800 rounded-xl h-11"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tourEmail" className="text-xs font-bold text-slate-700">Email Address</Label>
              <Input
                id="tourEmail"
                type="email"
                placeholder="jane@example.com"
                value={tourEmail}
                onChange={(e) => setTourEmail(e.target.value)}
                className="bg-slate-50 border-0 text-slate-800 rounded-xl h-11"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tourPhone" className="text-xs font-bold text-slate-700">Phone Number (SMS OTP Verification)</Label>
              <Input
                id="tourPhone"
                placeholder="+1 (555) 123-4567"
                value={tourPhone}
                onChange={(e) => setTourPhone(e.target.value)}
                className="bg-slate-50 border-0 text-slate-800 rounded-xl h-11"
                required
              />
            </div>

            <Button type="submit" disabled={schedulingTour} className="w-full bg-blue-600 hover:bg-blue-600/90 text-white font-bold h-11 rounded-xl transition-colors mt-2">
              {schedulingTour ? "Scheduling..." : "Request Tour Slot"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── APPLICATION SUBMISSION DIALOG ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setSubmittedAppId(null);
        }
      }}>
        <DialogContent className="bg-white border-[#E2E8F0] text-slate-800 rounded-[2rem] max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          {submittedAppId ? (
            <div className="space-y-6 py-4 text-center w-full max-w-full overflow-hidden">
              <div className="mx-auto h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="h-10 w-10 text-blue-600 animate-bounce" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Application Submitted!</h3>
                <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed px-4">
                  Your application for {selectedUnit?.name} is successfully received and under landlord review.
                </p>
              </div>

              {/* Secure tracking link widget */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2 text-left w-full min-w-0">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Guest Tracking Link</span>
                  <span className="text-blue-600 font-bold">Secure</span>
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-100 p-2 rounded-xl min-w-0">
                  <span className="text-[11px] font-semibold text-slate-600 truncate flex-1 min-w-0">
                    {typeof window !== "undefined" ? `${window.location.origin}/listings/apply/track?id=${submittedAppId}` : `http://localhost:3000/listings/apply/track?id=${submittedAppId}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/listings/apply/track?id=${submittedAppId}`);
                      toast.success("Tracking link copied to clipboard!");
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 shrink-0 transition-colors cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                  * Bookmark this link to view landlord decisions, sign lease drafts, and secure the property. We've also logged a confirmation request details.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Link href={`/listings/apply/track?id=${submittedAppId}`} className="w-full">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-600/90 text-white font-bold h-11 rounded-xl transition-colors flex items-center justify-center gap-2 text-xs"
                    onClick={() => {
                      setDialogOpen(false);
                      setSubmittedAppId(null);
                    }}
                  >
                    Go to Live Status Tracker
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setDialogOpen(false);
                    setSubmittedAppId(null);
                  }}
                  className="text-slate-400 hover:text-slate-500 font-bold text-xs"
                >
                  Close Window
                </Button>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  Apply for {selectedUnit?.name}
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs font-semibold">
                  Complete the 3-step screening form. The landlord of {selectedUnit?.property.name} will review your application.
                </DialogDescription>
              </DialogHeader>

              {/* Step indicator */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mt-4 mb-3">
                <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest">
                  Step {formStep} of 3
                </span>
                <span className="text-xs text-slate-500 font-bold">
                  {formStep === 1 && "Personal & Preferences"}
                  {formStep === 2 && "Finances & Verification"}
                  {formStep === 3 && "References & Compliance"}
                </span>
              </div>
              
              {/* Simple progress bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full mb-6 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${(formStep / 3) * 100}%` }}
                />
              </div>

              <form onSubmit={handleApplySubmit} className="space-y-4 text-left">
                {formStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-bold text-slate-700">
                        Full Name <span className="text-red-500 font-extrabold">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={applicantName}
                        onChange={(e) => setApplicantName(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-bold text-slate-700">
                          Email Address <span className="text-red-500 font-extrabold">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={applicantEmail}
                          onChange={(e) => setApplicantEmail(e.target.value)}
                          className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs font-bold text-slate-700">
                          Phone Number <span className="text-red-500 font-extrabold">*</span>
                        </Label>
                        <Input
                          id="phone"
                          placeholder="+1 (555) 019-9922"
                          value={applicantPhone}
                          onChange={(e) => setApplicantPhone(e.target.value)}
                          className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="leaseDuration" className="text-xs font-bold text-slate-700">
                          Lease Duration (Months) <span className="text-red-500 font-extrabold">*</span>
                        </Label>
                        <select
                          id="leaseDuration"
                          value={leaseDuration}
                          onChange={(e) => setLeaseDuration(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl h-11 px-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="1">1 Month (Short Term)</option>
                          <option value="2">2 Months</option>
                          <option value="3">3 Months</option>
                          <option value="4">4 Months</option>
                          <option value="5">5 Months</option>
                          <option value="6">6 Months</option>
                          <option value="7">7 Months</option>
                          <option value="8">8 Months</option>
                          <option value="9">9 Months</option>
                          <option value="10">10 Months</option>
                          <option value="11">11 Months</option>
                          <option value="12">12 Months (Standard)</option>
                          <option value="13">13 Months</option>
                          <option value="14">14 Months</option>
                          <option value="15">15 Months</option>
                          <option value="16">16 Months</option>
                          <option value="17">17 Months</option>
                          <option value="18">18 Months</option>
                          <option value="19">19 Months</option>
                          <option value="20">20 Months</option>
                          <option value="21">21 Months</option>
                          <option value="22">22 Months</option>
                          <option value="23">23 Months</option>
                          <option value="24">24 Months (Long Term)</option>
                        </select>
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="moveInDate" className="text-xs font-bold text-slate-700">
                          Preferred Move-In Date <span className="text-red-500 font-extrabold">*</span>
                        </Label>
                        <Input
                          id="moveInDate"
                          type="date"
                          value={moveInDate}
                          onChange={(e) => setMoveInDate(e.target.value)}
                          className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 text-xs focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="occupantsCount" className="text-xs font-bold text-slate-700">
                        Total Number of Occupants <span className="text-red-500 font-extrabold">*</span>
                      </Label>
                      <Input
                        id="occupantsCount"
                        type="number"
                        min="1"
                        max={selectedUnit?.maxOccupants || 10}
                        value={occupantsCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          const max = selectedUnit?.maxOccupants || 10;
                          if (val > max) {
                            setOccupantsCount(max.toString());
                            toast.error(`Maximum occupants for this unit is ${max}`);
                          } else {
                            setOccupantsCount(e.target.value);
                          }
                        }}
                        className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                        required
                      />
                    </div>
                  </div>
                )}

                {formStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="employmentStatus" className="text-xs font-bold text-slate-700">
                        Current Status <span className="text-red-500 font-extrabold">*</span>
                      </Label>
                      <select
                        id="employmentStatus"
                        value={employmentStatus}
                        onChange={(e) => {
                          setEmploymentStatus(e.target.value);
                          setEmployerName("");
                          setJobTitle("");
                        }}
                        className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl h-11 px-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="EMPLOYED">Employed / Self-Employed</option>
                        <option value="STUDENT">Student</option>
                        <option value="UNEMPLOYED">Unemployed / Other</option>
                      </select>
                    </div>

                    {employmentStatus === "EMPLOYED" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="employerName" className="text-xs font-bold text-slate-700">
                            Employer / Business Name <span className="text-red-500 font-extrabold">*</span>
                          </Label>
                          <Input
                            id="employerName"
                            placeholder="Acme Corp"
                            value={employerName}
                            onChange={(e) => setEmployerName(e.target.value)}
                            className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="jobTitle" className="text-xs font-bold text-slate-700">
                            Job Title <span className="text-red-500 font-extrabold">*</span>
                          </Label>
                          <Input
                            id="jobTitle"
                            placeholder="Software Engineer"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label htmlFor="sourceOfIncome" className="text-xs font-bold text-slate-700">
                          Primary Source of Income / Support <span className="text-red-500 font-extrabold">*</span>
                        </Label>
                        <Input
                          id="sourceOfIncome"
                          placeholder={employmentStatus === "STUDENT" ? "e.g., Financial Aid, Parents, Scholarships" : "e.g., Savings, Trust, Guarantor"}
                          value={employerName} // Reusing employerName for the source
                          onChange={(e) => setEmployerName(e.target.value)}
                          className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                          required
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="monthlyIncome" className="text-xs font-bold text-slate-700">
                        Monthly Gross Income / Allowance ($) <span className="text-red-500 font-extrabold">*</span>
                      </Label>
                      <Input
                        id="monthlyIncome"
                        type="number"
                        placeholder="5000"
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                        required
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>Supporting Document (ID / Pay Stub) <span className="text-red-500 font-extrabold">*</span></span>
                        <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full">Required</span>
                      </Label>

                      {applicantDoc ? (
                        <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-2xl">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-700 truncate max-w-[220px]">{applicantDoc.name}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">{(applicantDoc.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setApplicantDoc(null)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative group border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 transition-all flex flex-col items-center justify-center gap-1.5 bg-slate-50/50 cursor-pointer">
                          <input
                            id="document"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              if (file && file.size > 5 * 1024 * 1024) {
                                toast.error("File is too large. Max size is 5MB.");
                                return;
                              }
                              setApplicantDoc(file);
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <div className="p-2.5 bg-white rounded-full shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                            <Upload className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-700 text-center">Drag & drop or click to upload</p>
                          <p className="text-[10px] text-slate-400 font-semibold text-center">Supported formats: PDF, PNG, JPG (Max 5MB)</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {formStep === 3 && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Previous Landlord Reference</p>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider bg-slate-200/50 px-2 py-0.5 rounded-md">Optional</span>
                      </div>
                      <div className="space-y-2.5">
                        <Input
                          placeholder="Landlord Name"
                          value={prevLandlordName}
                          onChange={(e) => setPrevLandlordName(e.target.value)}
                          className="bg-white border border-slate-200 text-slate-800 rounded-xl h-10 text-xs focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Phone Number"
                            value={prevLandlordPhone}
                            onChange={(e) => setPrevLandlordPhone(e.target.value)}
                            className="bg-white border border-slate-200 text-slate-800 rounded-xl h-10 text-xs focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                          />
                          <Input
                            placeholder="Email Address"
                            type="email"
                            value={prevLandlordEmail}
                            onChange={(e) => setPrevLandlordEmail(e.target.value)}
                            className="bg-white border border-slate-200 text-slate-800 rounded-xl h-10 text-xs focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                          />
                        </div>
                        <Input
                          placeholder="Reason for Moving"
                          value={reasonForMoving}
                          onChange={(e) => setReasonForMoving(e.target.value)}
                          className="bg-white border border-slate-200 text-slate-800 rounded-xl h-10 text-xs focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="petsCount" className="text-xs font-bold text-slate-700">
                          Number of Pets
                        </Label>
                        <Input
                          id="petsCount"
                          type="number"
                          min="0"
                          value={petsCount}
                          onChange={(e) => setPetsCount(e.target.value)}
                          className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="petDetails" className="text-xs font-bold text-slate-700">
                          Pet Details (Breed / Weight) {Number(petsCount) > 0 && <span className="text-red-500 font-extrabold">*</span>}
                        </Label>
                        <Input
                          id="petDetails"
                          placeholder={Number(petsCount) > 0 ? "e.g. Golden Retriever, 40lbs (Required)" : "e.g. Golden Retriever, 40lbs"}
                          value={petDetails}
                          disabled={Number(petsCount) <= 0}
                          onChange={(e) => setPetDetails(e.target.value)}
                          className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-slate-700">
                        Vehicle Information
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="vehicleMake" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Make
                          </Label>
                          <select
                            id="vehicleMake"
                            value={vehicleMake}
                            onChange={(e) => {
                              setVehicleMake(e.target.value);
                              setVehicleModel("");
                              setCustomMake("");
                              setCustomModel("");
                            }}
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl h-11 px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                          >
                            <option value="">No Vehicle</option>
                            {CAR_MAKES.map((make) => (
                              <option key={make} value={make}>{make}</option>
                            ))}
                          </select>
                        </div>

                        {vehicleMake && vehicleMake !== "Other" && (
                          <div className="space-y-1.5">
                            <Label htmlFor="vehicleModel" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Model
                            </Label>
                            <select
                              id="vehicleModel"
                              value={vehicleModel}
                              onChange={(e) => {
                                setVehicleModel(e.target.value);
                                setCustomModel("");
                              }}
                              disabled={modelsLoading}
                              className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl h-11 px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                            >
                              {modelsLoading ? (
                                <option value="">Loading models...</option>
                              ) : (
                                <>
                                  <option value="">Select Model</option>
                                  {models.map((model) => (
                                    <option key={model} value={model}>{model}</option>
                                  ))}
                                </>
                              )}
                            </select>
                          </div>
                        )}

                        {vehicleMake && (
                          <div className="space-y-1.5">
                            <Label htmlFor="vehiclePlate" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              License Plate
                            </Label>
                            <Input
                              id="vehiclePlate"
                              placeholder="e.g. ABC-123"
                              value={vehiclePlate}
                              onChange={(e) => setVehiclePlate(e.target.value)}
                              className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                            />
                          </div>
                        )}
                      </div>

                      {vehicleMake === "Other" && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1.5">
                            <Label htmlFor="customMake" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Custom Make Name
                            </Label>
                            <Input
                              id="customMake"
                              placeholder="e.g. Kia"
                              value={customMake}
                              onChange={(e) => setCustomMake(e.target.value)}
                              className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="customModel" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Custom Model Name
                            </Label>
                            <Input
                              id="customModel"
                              placeholder="e.g. Telluride"
                              value={customModel}
                              onChange={(e) => setCustomModel(e.target.value)}
                              className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bottom Navigation Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-6">
                  {formStep > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setFormStep(formStep - 1)}
                      className="flex-1 font-bold text-slate-500 hover:text-slate-800 h-11 rounded-xl transition-all"
                    >
                      Back
                    </Button>
                  )}
                  {formStep < 3 && (
                    <Button
                      key="btn-continue"
                      type="button"
                      onClick={() => {
                        if (formStep === 1) {
                          if (!applicantName || !applicantEmail || !applicantPhone || !moveInDate || !occupantsCount) {
                            toast.error("Please fill all required details before proceeding.");
                            return;
                          }
                          const max = selectedUnit?.maxOccupants || 10;
                          if (parseInt(occupantsCount) > max) {
                            toast.error(`This unit only allows a maximum of ${max} occupants.`);
                            return;
                          }
                        } else if (formStep === 2) {
                          if (employmentStatus === "EMPLOYED" && (!employerName || !jobTitle)) {
                            toast.error("Please provide your employer name and job title.");
                            return;
                          }
                          if (employmentStatus !== "EMPLOYED" && !employerName) {
                            toast.error("Please provide your primary source of income/support.");
                            return;
                          }
                          if (!monthlyIncome) {
                            toast.error("Please provide your monthly income/allowance.");
                            return;
                          }
                          if (!applicantDoc) {
                            toast.error("Please upload a supporting document to verify your application.");
                            return;
                          }
                        }
                        setFormStep(formStep + 1);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-600/90 text-white font-bold h-11 rounded-xl transition-all"
                    >
                      Continue
                    </Button>
                  )}
                  {formStep === 3 && (
                    <Button
                      key="btn-submit"
                      type="submit"
                      disabled={applying}
                      className="flex-1 bg-blue-600 hover:bg-blue-600/90 text-white font-bold h-11 rounded-xl transition-all"
                    >
                      {applying ? "Submitting Application..." : "Submit Application"}
                    </Button>
                  )}
                </div>
              </form>
            </>
          )}
      </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E2E8F0] py-8 text-center text-slate-400 text-xs font-bold mt-auto">
        <p>© 2026 PropertyPro. All rights reserved.</p>
      </footer>
    </div>
  );
}
