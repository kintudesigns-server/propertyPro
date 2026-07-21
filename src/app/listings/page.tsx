"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Home,
  MapPin,
  BedDouble,
  Square,
  CheckCircle2,
  Building,
  Building2,
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
  ImageIcon,
  Map as MapIcon,
  Sparkle,
  Briefcase,
  GraduationCap,
  Wallet,
  Lock,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ScheduleTourModal } from "@/components/modals/ScheduleTourModal";

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
    zoningType?: string | null;
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
  const [propertyType, setPropertyType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("featured");

  // Favorites State (Stored in localStorage)
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Hovered Property ID to link map interaction
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);

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

      fetch("/api/users")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Failed to fetch profile");
        })
        .then((profileData) => {
          if (profileData) {
            if (profileData.employmentStatus) setEmploymentStatus(profileData.employmentStatus);
            if (profileData.employer) setEmployerName(profileData.employer);
            if (profileData.position) setJobTitle(profileData.position);
            if (profileData.annualIncome) {
              const monthly = Math.round(Number(profileData.annualIncome) / 12);
              setMonthlyIncome(monthly.toString());
            }
          }
        })
        .catch((err) => console.error("Error loading user profile details:", err));
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
  
  // Guarantor States
  const [hasGuarantor, setHasGuarantor] = useState(false);
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorEmail, setGuarantorEmail] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("");
  const [guarantorIncome, setGuarantorIncome] = useState("");

  const [prevLandlordName, setPrevLandlordName] = useState("");
  const [prevLandlordPhone, setPrevLandlordPhone] = useState("");
  const [prevLandlordEmail, setPrevLandlordEmail] = useState("");
  const [reasonForMoving, setReasonForMoving] = useState("");

  // Emergency Contact States
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [emergencyContactRelation, setEmergencyContactRelation] = useState("");

  // Consent States
  const [backgroundCheckConsent, setBackgroundCheckConsent] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Document States
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [incomeProofDocument, setIncomeProofDocument] = useState<File | null>(null);
  const [guarantorIdDocument, setGuarantorIdDocument] = useState<File | null>(null);
  const [guarantorIncomeProofDocument, setGuarantorIncomeProofDocument] = useState<File | null>(null);
  const [petsCount, setPetsCount] = useState("0");
  const [petDetails, setPetDetails] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [customMake, setCustomMake] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [hasVehicle, setHasVehicle] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (employmentStatus === "STUDENT") {
      setHasGuarantor(true);
    }
  }, [employmentStatus]);

  useEffect(() => {
    if (monthlyIncome && selectedUnit) {
      const ratio = Number(monthlyIncome) / Number(selectedUnit.rentAmount);
      if (ratio < 1.5) {
        setHasGuarantor(true);
      }
    }
  }, [monthlyIncome, selectedUnit]);

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

  // New Tour Overhaul State
  const [tourStep, setTourStep] = useState<"FORM" | "OTP" | "SUCCESS">("FORM");
  const [tourOtpCode, setTourOtpCode] = useState("");
  const [tourHoneypot, setTourHoneypot] = useState("");
  const [tourMessage, setTourMessage] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpDevFallbackCode, setOtpDevFallbackCode] = useState("");

  // Handle countdown for Resend OTP code
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  useEffect(() => {
    if (session?.user) {
      setTourName((session.user as any).name || "");
      setTourEmail((session.user as any).email || "");
      if ((session.user as any).phone) setTourPhone((session.user as any).phone);
    }
  }, [session]);

  // Load listings & favorites
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
    
    // Load favorites from local storage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("propertypro_favorites");
      if (saved) {
        try {
          setFavorites(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
    
    fetchListings();
  }, []);

  // Check URL parameters to auto-open application or tour modal
  useEffect(() => {
    if (units.length > 0 && typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const applyUnitId = searchParams.get('applyUnitId');
      const tourUnitId = searchParams.get('tourUnitId');

      if (applyUnitId && !dialogOpen) {
        const targetUnit = units.find(u => u.id === applyUnitId);
        if (targetUnit) {
          setSelectedUnit(targetUnit);
          setDialogOpen(true);
          window.history.replaceState(null, '', '/listings'); // Clean URL
        }
      }

      if (tourUnitId && !tourDialogOpen) {
        const targetUnit = units.find(u => u.id === tourUnitId);
        if (targetUnit) {
          setSelectedTourUnit(targetUnit);
          setTourDialogOpen(true);
          window.history.replaceState(null, '', '/listings'); // Clean URL
        }
      }
    }
  }, [units]);

  // Favorite toggle handler
  const toggleFavorite = (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated;
    if (favorites.includes(propertyId)) {
      updated = favorites.filter(id => id !== propertyId);
      toast.success("Removed from saved homes");
    } else {
      updated = [...favorites, propertyId];
      toast.success("Saved to your favorites!");
    }
    setFavorites(updated);
    localStorage.setItem("propertypro_favorites", JSON.stringify(updated));
  };

  // Copy share link handler
  const copyShareLink = (unitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/listings/${unitId}`;
      navigator.clipboard.writeText(url);
      toast.success("Property link copied to clipboard!");
    }
  };

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
      const matchesType = propertyType === "all" || u.property.type.toLowerCase() === propertyType.toLowerCase();

      return matchesCity && matchesRent && matchesRooms && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === "rent_asc") return Number(a.rentAmount) - Number(b.rentAmount);
      if (sortBy === "rent_desc") return Number(b.rentAmount) - Number(a.rentAmount);
      if (sortBy === "sqft_desc") return b.sqFootage - a.sqFootage;
      return 0; // Featured
    });

  // Group units by property to avoid flooding the page
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
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupBedrooms, setGroupBedrooms] = useState("all");
  const [groupMaxRentPrice, setGroupMaxRentPrice] = useState("");

  // Clear group filters when selected group changes
  useEffect(() => {
    setGroupSearchQuery("");
    setGroupBedrooms("all");
    setGroupMaxRentPrice("");
  }, [selectedGroup]);

  // Map representation data
  const mapCoordinates: Record<string, { x: number; y: number }> = {
    // Mapping seeded property coordinates dynamically
    "Grand Horizon Towers": { x: 72, y: 38 },
    "Sunset Villa": { x: 38, y: 22 },
    "Downtown Tech Plaza": { x: 50, y: 68 }
  };


  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tourName || !tourEmail || !tourPhone || !tourDate || !selectedTourUnit) {
      toast.error("Please fill in all details.");
      return;
    }

    // Phone validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanPhone = tourPhone.replace(/[\s\-\(\)]/g, "");
    if (!phoneRegex.test(cleanPhone)) {
      toast.error("Please enter a valid phone number (e.g. +15551234567).");
      return;
    }

    setSchedulingTour(true);
    setOtpDevFallbackCode("");

    try {
      const res = await fetch("/api/tours/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: tourEmail,
          propertyId: selectedTourUnit.property.id,
          unitId: selectedTourUnit.id,
          honeypot: tourHoneypot,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Verification code sent to your email!");
        setTourStep("OTP");
        setOtpCooldown(60);
        if (data.otpDevFallback) {
          setOtpDevFallbackCode(data.otpDevFallback);
        }
      } else {
        toast.error(data.error || "Failed to send verification code.");
      }
    } catch (err) {
      toast.error("Error connecting to server. Please try again.");
    } finally {
      setSchedulingTour(false);
    }
  };

  const handleTourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTourUnit) {
      toast.error("No unit selected.");
      return;
    }
    if (!tourOtpCode || tourOtpCode.length < 6) {
      toast.error("Please enter the 6-digit verification code.");
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
          tenantMessage: tourMessage,
          tourType,
          scheduledAt,
          otpCode: tourOtpCode,
        }),
      });

      if (res.ok) {
        toast.success("Verification successful! Tour request submitted.");
        setTourStep("SUCCESS");
      } else {
        const err = await res.json();
        toast.error(err.error || "Verification failed. Please try again.");
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
    if (hasGuarantor) {
      if (!guarantorName || !guarantorEmail || !guarantorPhone || !guarantorIncome) {
        toast.error("Please fill in all guarantor details.");
        return;
      }
    }

    if (!emergencyContactName || !emergencyContactPhone || !emergencyContactRelation) {
      toast.error("Please provide an emergency contact.");
      return;
    }

    if (!backgroundCheckConsent || !agreedToTerms) {
      toast.error("You must agree to the background check and terms to apply.");
      return;
    }

    if (!idDocument || !incomeProofDocument) {
      const docErr = employmentStatus === "STUDENT" 
        ? "Please upload both Government ID and Proof of Student Enrollment to submit your application." 
        : (employmentStatus === "UNEMPLOYED" 
            ? "Please upload both Government ID and Proof of Assets/Bank Statement to submit your application." 
            : "Please upload both Government ID and Proof of Income to submit your application.");
      toast.error(docErr);
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
      let idUrl = "";
      let incomeUrl = "";

      // Upload ID Document
      if (idDocument) {
        const formData = new FormData();
        formData.append("file", idDocument);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          idUrl = url;
        } else {
          toast.error("Failed to upload Government ID.");
          setApplying(false);
          return;
        }
      }

      // Upload Income Proof
      if (incomeProofDocument) {
        const formData = new FormData();
        formData.append("file", incomeProofDocument);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          incomeUrl = url;
        } else {
          toast.error("Failed to upload Proof of Income.");
          setApplying(false);
          return;
        }
      }

      let guarantorIdUrl = "";
      let guarantorIncomeUrl = "";

      if (hasGuarantor && guarantorIdDocument) {
        const formData = new FormData();
        formData.append("file", guarantorIdDocument);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          guarantorIdUrl = url;
        }
      }

      if (hasGuarantor && guarantorIncomeProofDocument) {
        const formData = new FormData();
        formData.append("file", guarantorIncomeProofDocument);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          guarantorIncomeUrl = url;
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
          documents: [idUrl, incomeUrl, guarantorIdUrl, guarantorIncomeUrl].filter(Boolean),
          idDocumentUrl: idUrl,
          incomeProofUrl: incomeUrl,
          leaseDuration,
          moveInDate: moveInDate || null,
          occupantsCount,
          employerName: employmentStatus === "EMPLOYED" ? employerName : (employmentStatus === "STUDENT" ? "Student (Source: " + employerName + ")" : "Unemployed (Source: " + employerName + ")"),
          jobTitle: employmentStatus === "EMPLOYED" ? jobTitle : employmentStatus,
          monthlyIncome: monthlyIncome || null,
          hasGuarantor,
          guarantorName,
          guarantorEmail,
          guarantorPhone,
          guarantorIncome,
          prevLandlordName: prevLandlordName || null,
          prevLandlordPhone: prevLandlordPhone || null,
          prevLandlordEmail: prevLandlordEmail || null,
          reasonForMoving: reasonForMoving || null,
          petsCount,
          petDetails: petDetails || null,
          vehicleInfo: combinedVehicleInfo || null,
          emergencyContactName,
          emergencyContactPhone,
          emergencyContactRelation,
          backgroundCheckConsent,
          agreedToTerms
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
        setHasVehicle(false);
        setHasGuarantor(false);
        setGuarantorName("");
        setGuarantorEmail("");
        setGuarantorPhone("");
        setGuarantorIncome("");
        setEmergencyContactName("");
        setEmergencyContactPhone("");
        setEmergencyContactRelation("");
        setBackgroundCheckConsent(false);
        setAgreedToTerms(false);
        setIdDocument(null);
        setIncomeProofDocument(null);
        setGuarantorIdDocument(null);
        setGuarantorIncomeProofDocument(null);
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
      
      {/* Premium Header Aligned with Landing Page */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-9 w-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-[#0F172A]">PropertyPro</span>
        </Link>
        <Link href={session ? "/dashboard" : "/auth/login"}>
          <Button className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-extrabold px-6 py-2 rounded-xl text-xs transition-colors shadow-sm">
            {session ? "Workspace Dashboard" : "Sign In"}
          </Button>
        </Link>
      </header>

      {/* Hero Header Section */}
      <div className="relative overflow-hidden py-14 px-6 text-center bg-slate-50 border-b border-slate-200/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.06),transparent_50%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto space-y-4">
          <Badge className="bg-blue-50 border border-blue-200/80 text-blue-700 font-extrabold px-3 py-1 rounded-full text-[10px] tracking-wider uppercase shadow-sm">
            <Sparkle className="h-3 w-3 fill-current mr-1 text-blue-600 animate-pulse" /> Verified Listings Only
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[#0F172A] leading-none">
            Discover Verified Rental Homes
          </h1>
          <p className="text-slate-500 text-sm font-semibold max-w-xl mx-auto leading-relaxed">
            Browse active apartments, single-family houses, and commercial spaces listed directly by verified owners.
          </p>
        </div>
      </div>

      {/* Quick Info & Checkout Steps Bar */}
      <div className="max-w-7xl mx-auto px-6 mt-8 w-full">
        <div className="bg-white border border-slate-200/60 rounded-3xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-1 text-left max-w-lg">
            <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              100% Free Application Checkout
            </h3>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              No deposit or application fees required. Once a landlord approves your profile, sign the agreement digitally and make secure bond payouts using Stripe.
            </p>
          </div>
          <div className="flex gap-2 text-center text-[10px] font-bold text-slate-500 bg-slate-50 p-2 rounded-2xl border border-slate-200/40 shrink-0 w-full md:w-auto overflow-x-auto">
            {["1. Apply Free", "2. Approval", "3. Digital Sign", "4. Stripe Bond"].map((step, idx) => (
              <span key={idx} className="bg-white px-3 py-1.5 rounded-lg border border-slate-250/30 whitespace-nowrap shadow-sm">
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Split Layout Container */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full flex flex-col lg:flex-row gap-8">
        
        {/* Left Side: Filter bar + Listings Grid (65% width) */}
        <div className="lg:w-[65%] space-y-6 flex flex-col">
          
          {/* Advanced Filter Toolbar */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by city, property, or unit name..."
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className="pl-10 bg-slate-50/50 border-slate-200 text-slate-800 placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-xl h-11 text-xs font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 md:flex items-center gap-2">
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="bg-slate-50/50 border border-slate-200 text-slate-700 rounded-xl h-11 px-3 text-xs focus:ring-1 focus:ring-blue-500 font-extrabold cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="apartment">Apartments</option>
                  <option value="house">Houses</option>
                  <option value="commercial">Commercial</option>
                </select>
                
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="number"
                    placeholder="Max Rent"
                    value={maxRent}
                    onChange={(e) => setMaxRent(e.target.value)}
                    className="pl-7 bg-slate-50/50 border-slate-200 text-slate-800 placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-xl h-11 text-xs font-semibold w-full md:w-28"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-400">
              <div className="flex gap-4">
                <span>{processedUnits.length} units matching</span>
                <span className="text-slate-350">|</span>
                <select
                  value={minRooms}
                  onChange={(e) => setMinRooms(e.target.value)}
                  className="bg-transparent border-none text-slate-500 hover:text-[#0F172A] font-bold cursor-pointer text-[11px] p-0 focus:ring-0"
                >
                  <option value="all">Any Bedroom Count</option>
                  <option value="1">1+ Bed</option>
                  <option value="2">2+ Beds</option>
                  <option value="3">3+ Beds</option>
                </select>
                <span className="text-slate-350">|</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border-none text-slate-500 hover:text-[#0F172A] font-bold cursor-pointer text-[11px] p-0 focus:ring-0"
                >
                  <option value="featured">Featured First</option>
                  <option value="rent_asc">Rent: Low to High</option>
                  <option value="rent_desc">Rent: High to Low</option>
                  <option value="sqft_desc">Size: Large First</option>
                </select>
              </div>

              {(searchCity || maxRent || minRooms !== "all" || propertyType !== "all") && (
                <button
                  onClick={() => {
                    setSearchCity("");
                    setMaxRent("");
                    setMinRooms("all");
                    setPropertyType("all");
                    setSortBy("featured");
                  }}
                  className="text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                >
                  Clear Filters <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Results Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-80 rounded-3xl bg-white border border-slate-200/80 animate-pulse shadow-sm" />
              ))}
            </div>
          ) : groupedList.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 max-w-md mx-auto shadow-sm w-full">
              <Home className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-extrabold text-[#0F172A] mb-1">No Listings Match</h3>
              <p className="text-xs text-slate-400 font-semibold px-4">Adjust your filters, budget parameters, or try a different city query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {groupedList.map((group: any) => {
                const isMultiUnit = group.units.length > 1;
                const unit = group.units[0];
                const isFav = favorites.includes(group.property.id);

                return (
                  <Card
                    key={group.property.id}
                    onMouseEnter={() => setHoveredPropertyId(group.property.id)}
                    onMouseLeave={() => setHoveredPropertyId(null)}
                    onClick={() => {
                      if (isMultiUnit) {
                        setSelectedGroup(group);
                      } else {
                        window.location.href = `/listings/${unit.id}`;
                      }
                    }}
                    className={`overflow-hidden bg-white border rounded-[2rem] shadow-sm hover:shadow-md hover:border-blue-400 transition-all duration-300 flex flex-col text-left cursor-pointer group ${
                      hoveredPropertyId === group.property.id ? "border-blue-400 scale-[1.01]" : "border-slate-200/70"
                    }`}
                  >
                    {/* Visual Media Cover */}
                    <div className="h-48 overflow-hidden relative bg-slate-100 shrink-0">
                      <img
                        src={group.property.coverPhoto || unit.images?.[0] || "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800"}
                        alt={group.property.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80";
                        }}
                      />
                      
                      {/* Dark gradient shadow */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                      {/* Top Action Buttons (Favorite + Share) */}
                      <div className="absolute top-4 right-4 flex gap-1.5 z-10">
                        <button
                          onClick={(e) => copyShareLink(unit.id, e)}
                          className="h-8 w-8 rounded-full bg-white/90 hover:bg-white text-slate-650 hover:text-blue-600 flex items-center justify-center shadow-sm backdrop-blur-sm transition-all"
                          title="Copy Link"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => toggleFavorite(group.property.id, e)}
                          className="h-8 w-8 rounded-full bg-white/90 hover:bg-white text-slate-650 flex items-center justify-center shadow-sm backdrop-blur-sm transition-all"
                          title="Save Home"
                        >
                          <Heart className={`h-3.5 w-3.5 transition-colors ${isFav ? "fill-rose-500 text-rose-500" : "text-slate-500 hover:text-rose-500"}`} />
                        </button>
                      </div>

                      {/* Property Type Badge */}
                      <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
                        <Badge className={`font-black text-[9px] px-2.5 py-1 border-0 rounded-lg shadow-sm uppercase tracking-wider backdrop-blur-sm ${
                          group.property.type === "House" ? "bg-amber-500/90 text-white" :
                          group.property.type === "Commercial" ? "bg-indigo-500/90 text-white" :
                          "bg-emerald-500/90 text-white"
                        }`}>
                          {group.property.type}
                        </Badge>
                        {group.property.type === "Commercial" && group.property.zoningType && (
                          <Badge className="bg-blue-600/90 text-white border-0 shadow-sm rounded-lg px-2.5 py-1 font-bold text-[9px] uppercase tracking-wider backdrop-blur-sm">
                            Zoning: {group.property.zoningType}
                          </Badge>
                        )}
                      </div>

                      {/* Rent details overlay */}
                      <div className="absolute bottom-4 left-4 text-white">
                        <span className="font-black text-lg drop-shadow-md">
                          {isMultiUnit ? (
                            group.minRent === group.maxRent ? `$${group.minRent.toLocaleString()}` : `$${group.minRent.toLocaleString()} - $${group.maxRent.toLocaleString()}`
                          ) : (
                            `$${Number(unit.rentAmount).toLocaleString()}`
                          )}
                          <span className="text-[10px] text-slate-200 font-semibold">/mo</span>
                        </span>
                      </div>
                    </div>

                    <CardHeader className="pb-2 px-5 pt-4">
                      <div className="flex items-center gap-1 text-[10px] text-blue-600 font-black uppercase tracking-wider">
                        <MapPin className="h-3 w-3" />
                        <span>{group.property.city}, {group.property.country}</span>
                      </div>
                      <CardTitle className="text-base text-[#0F172A] font-extrabold group-hover:text-blue-600 transition-colors line-clamp-1">
                        {group.property.name}
                      </CardTitle>
                      <CardDescription className="text-slate-450 font-semibold truncate text-[11px] flex items-center gap-1">
                        {group.property.address}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pb-3 px-5 flex-1 flex flex-col justify-between">
                      <div className="flex items-center gap-3 text-slate-500 text-xs border-y border-slate-100 py-2.5 font-bold">
                        {group.property.type !== "Commercial" && (
                          <span className="flex items-center gap-1">
                            <BedDouble className="h-4 w-4 text-blue-500" />
                            <strong className="text-[#0F172A]">
                              {isMultiUnit 
                                ? (group.minBeds === group.maxBeds ? group.minBeds : `${group.minBeds}-${group.maxBeds}`) 
                                : unit.rooms}
                            </strong> Beds
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Square className="h-4 w-4 text-blue-500" />
                          <strong className="text-[#0F172A]">
                            {isMultiUnit 
                              ? (group.minSqft === group.maxSqft ? group.minSqft : `${group.minSqft}-${group.maxSqft}`)
                              : unit.sqFootage}
                          </strong> sqft
                        </span>
                      </div>
                      
                      {isMultiUnit && (
                        <div className="mt-2.5 text-[10px] font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg self-start">
                          {group.units.length} Floorplans Available
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="pt-0 p-5 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        onClick={() => {
                          if (isMultiUnit) {
                            setSelectedGroup(group);
                          } else {
                            window.location.href = `/listings/${unit.id}`;
                          }
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl h-10 flex justify-center items-center gap-1.5 transition-colors shadow-none text-xs"
                      >
                        {isMultiUnit ? "Browse Floor Plans" : "Details & Checkout"}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Sticky Premium Interactive Map Visual (35% width) */}
        <div className="hidden lg:block lg:w-[35%]">
          <div className="sticky top-24 bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <span className="text-xs font-black text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                <MapIcon className="h-4 w-4 text-blue-600" /> Interactive Neighborhood Directory
              </span>
              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Los Angeles</span>
            </div>

            {/* Stylized Vector Map representation */}
            <div className="flex-1 bg-[#EBF1F6] rounded-2xl relative overflow-hidden border border-slate-300/80 flex flex-col justify-between shadow-inner">
              
              {/* Styled Mock Water bodies & Parks */}
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-[#C8DFFC]/90 rounded-tl-[180px] pointer-events-none" />
              <div className="absolute top-0 left-0 w-32 h-32 bg-[#C8DFFC]/70 rounded-br-[120px] pointer-events-none" />
              <div className="absolute top-1/4 right-8 w-28 h-20 bg-[#E2F0D9]/80 rounded-[36px] pointer-events-none" />
              
              {/* Styled Roads / Streets */}
              <div className="absolute top-1/2 left-0 w-full h-3.5 bg-white shadow-sm transform -rotate-12 pointer-events-none" />
              <div className="absolute top-0 left-1/4 w-3.5 h-full bg-white shadow-sm transform rotate-45 pointer-events-none" />
              <div className="absolute top-0 right-1/3 w-3 h-full bg-white shadow-sm transform -rotate-12 pointer-events-none" />
              
              {/* Dynamic Coordinate Pins based on database properties */}
              {groupedList.map((group: any) => {
                const coords = mapCoordinates[group.property.name] || { x: 50, y: 50 };
                const isHovered = hoveredPropertyId === group.property.id;
                
                return (
                  <div
                    key={group.property.id}
                    onMouseEnter={() => setHoveredPropertyId(group.property.id)}
                    onMouseLeave={() => setHoveredPropertyId(null)}
                    onClick={() => {
                      if (group.units.length > 1) {
                        setSelectedGroup(group);
                      } else {
                        window.location.href = `/listings/${group.units[0].id}`;
                      }
                    }}
                    style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group/pin"
                  >
                    {/* Ring highlight animation */}
                    <div className={`absolute -inset-2.5 rounded-full transition-all duration-300 ${
                      isHovered ? "bg-blue-500/30 scale-100 animate-ping" : "bg-transparent scale-0"
                    }`} />
                    
                    {/* Hover Card preview tooltip */}
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 border border-slate-800 text-white rounded-xl py-1.5 px-3 whitespace-nowrap shadow-xl transition-all duration-200 pointer-events-none ${
                      isHovered ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-1 scale-95"
                    }`}>
                      <p className="text-[10px] font-black">{group.property.name}</p>
                      <p className="text-[9px] text-blue-400 font-extrabold mt-0.5">${group.minRent.toLocaleString()}+/mo</p>
                    </div>
 
                    {/* Styled pin bubble */}
                    <div className={`px-2.5 py-1 rounded-full font-black text-[9px] shadow-md flex items-center justify-center transition-all ${
                      isHovered 
                        ? "bg-blue-600 text-white border-2 border-white scale-110 shadow-lg shadow-blue-600/30" 
                        : "bg-white text-slate-800 border-2 border-slate-300 hover:border-slate-400"
                    }`}>
                      ${group.minRent >= 1000 ? `${(group.minRent / 1000).toFixed(1)}k` : group.minRent}
                    </div>
                  </div>
                );
              })}
 
              {/* Map Footer Helper */}
              <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 backdrop-blur-md border border-slate-800/80 p-3 rounded-xl z-10 flex items-center gap-3 text-white">
                <div className="h-6 w-6 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 leading-tight">
                  <span className="text-[9px] text-slate-200 font-bold block uppercase tracking-wider">Hover pins to preview</span>
                  <span className="text-[8px] text-slate-400 font-semibold">Properties mapped based on verified street location.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Property Group Dialog */}
      <Dialog open={!!selectedGroup} onOpenChange={(o) => !o && setSelectedGroup(null)}>
        <DialogContent className="bg-[#F8FAFC] border-[#E2E8F0] text-slate-800 rounded-[2rem] max-w-2xl p-0 overflow-hidden shadow-2xl">
          {selectedGroup && (() => {
            const filteredGroupUnits = selectedGroup.units.filter((u: any) => {
              const query = groupSearchQuery.toLowerCase().trim();
              const matchesSearch = query === "" || u.name.toLowerCase().includes(query);
              const matchesBeds = groupBedrooms === "all" || u.rooms === Number(groupBedrooms);
              const matchesRent = groupMaxRentPrice === "" || Number(u.rentAmount) <= Number(groupMaxRentPrice);
              return matchesSearch && matchesBeds && matchesRent;
            });

            return (
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

                {/* Inline Unit Filters inside Dialog */}
                <div className="p-4 bg-slate-50 border-b border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Search unit #..." 
                      className="pl-9 bg-white border-[#E2E8F0] text-xs font-semibold rounded-xl h-9"
                      value={groupSearchQuery}
                      onChange={(e) => setGroupSearchQuery(e.target.value)}
                    />
                  </div>
                  {selectedGroup.property.type !== "Commercial" ? (
                    <select 
                      className="bg-white border border-[#E2E8F0] text-xs font-semibold rounded-xl h-9 px-3 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={groupBedrooms}
                      onChange={(e) => setGroupBedrooms(e.target.value)}
                    >
                      <option value="all">All Beds</option>
                      <option value="1">1 Bed</option>
                      <option value="2">2 Beds</option>
                      <option value="3">3 Beds</option>
                      <option value="4">4+ Beds</option>
                    </select>
                  ) : (
                    <div className="text-xs font-semibold text-slate-400 flex items-center px-2 bg-slate-100/50 rounded-xl border border-dashed border-slate-200">
                      Commercial Units
                    </div>
                  )}
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input 
                      placeholder="Max Rent..." 
                      type="number"
                      className="pl-9 bg-white border-[#E2E8F0] text-xs font-semibold rounded-xl h-9"
                      value={groupMaxRentPrice}
                      onChange={(e) => setGroupMaxRentPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[50vh] space-y-4">
                  {filteredGroupUnits.length > 0 ? (
                    filteredGroupUnits.map((u: any) => (
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
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-400 font-semibold text-sm">
                      No units match your search filters.
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── TOUR SCHEDULING DIALOG ── */}
      <Dialog open={tourDialogOpen} onOpenChange={(open) => {
        setTourDialogOpen(open);
        if (!open) {
          setTourStep("FORM");
          setTourOtpCode("");
          setTourHoneypot("");
          setTourMessage("");
          setOtpDevFallbackCode("");
        }
      }}>
        <DialogContent className="bg-white border-[#E2E8F0] text-slate-800 rounded-[2rem] max-w-md p-6 max-h-[85vh] overflow-y-auto">
          {tourStep === "FORM" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Schedule Visit for {selectedTourUnit?.name}
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">
                  Select a visit type, day, and time. We will notify the landlord of {selectedTourUnit?.property.name}.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSendOtp} className="space-y-4 pt-4">
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
                      <option value="13:30:00">1:35 PM</option>
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

                <div className="space-y-1.5">
                  <Label htmlFor="tourMessage" className="text-xs font-bold text-slate-700">Message to Owner (Optional)</Label>
                  <textarea
                    id="tourMessage"
                    placeholder="Any specific questions or details?"
                    value={tourMessage}
                    onChange={(e) => setTourMessage(e.target.value)}
                    className="w-full bg-slate-50 border-0 text-slate-800 rounded-xl p-3 text-sm focus:ring-blue-500 focus:border-blue-500 font-semibold min-h-[80px] resize-none"
                    maxLength={300}
                  />
                </div>

                {/* Honeypot field for bot spam prevention */}
                <div className="hidden" aria-hidden="true">
                  <input
                    type="text"
                    name="website"
                    value={tourHoneypot}
                    onChange={(e) => setTourHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <Button type="submit" disabled={schedulingTour} className="w-full bg-blue-600 hover:bg-blue-650 text-white font-bold h-11 rounded-xl transition-colors mt-2">
                  {schedulingTour ? "Checking Limits..." : "Next: Verify Email"}
                </Button>
              </form>
            </>
          )}

          {tourStep === "OTP" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  Email Verification Code
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">
                  We sent a 6-digit code to <strong className="text-slate-600">{tourEmail}</strong>. Please enter it below.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleTourSubmit} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="tourOtpCode" className="text-xs font-bold text-slate-700 uppercase tracking-wider block text-center">Enter 6-Digit Code</Label>
                  <Input
                    id="tourOtpCode"
                    maxLength={6}
                    placeholder="000000"
                    value={tourOtpCode}
                    onChange={(e) => setTourOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="bg-slate-50 border-0 text-slate-800 rounded-xl h-12 text-center text-lg font-black tracking-widest"
                    required
                  />
                </div>

                {otpDevFallbackCode && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs font-semibold text-center">
                    [DEV MODE ONLY] Code: <strong className="text-sm font-black">{otpDevFallbackCode}</strong>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Button type="submit" disabled={schedulingTour} className="w-full bg-blue-600 hover:bg-blue-650 text-white font-bold h-11 rounded-xl transition-colors">
                    {schedulingTour ? "Verifying..." : "Confirm & Schedule Tour"}
                  </Button>
                  
                  <div className="text-center">
                    <button
                      type="button"
                      disabled={otpCooldown > 0 || schedulingTour}
                      onClick={() => handleSendOtp()}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:no-underline underline"
                    >
                      {otpCooldown > 0 ? `Resend Code in ${otpCooldown}s` : "Resend Verification Code"}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}

          {tourStep === "SUCCESS" && (
            <div className="text-center space-y-6 py-4">
              <div className="mx-auto h-20 w-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                <CheckCircle2 className="h-10 w-10 animate-bounce" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Tour Requested!</h3>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed px-4">
                  Your request for <strong className="text-slate-600">{selectedTourUnit?.name}</strong> has been successfully submitted. We've sent a confirmation email to <strong className="text-slate-600">{tourEmail}</strong>.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Date:</span>
                  <span className="font-extrabold text-slate-800">
                    {new Date(tourDate).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Time:</span>
                  <span className="font-extrabold text-slate-800">
                    {new Date(`${tourDate}T${tourTime}`).toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Type:</span>
                  <span className="font-extrabold text-slate-800">
                    {tourType === "VIDEO_CALL" ? "Virtual Video Tour" : "In-Person Showing"}
                  </span>
                </div>
              </div>

              <Button 
                onClick={() => {
                  setTourDialogOpen(false);
                  setTourStep("FORM");
                  setTourOtpCode("");
                  setTourHoneypot("");
                  setTourMessage("");
                  setOtpDevFallbackCode("");
                }} 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 rounded-xl"
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── APPLICATION SUBMISSION DIALOG ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setSubmittedAppId(null);
        }
      }}>
        <DialogContent className="bg-white border-0 text-slate-800 !w-screen !h-[100dvh] !max-w-none sm:!max-w-none !rounded-none !p-0 !flex flex-col md:flex-row !top-0 !left-0 !translate-x-0 !translate-y-0 overflow-hidden shadow-none outline-none">
          {submittedAppId ? (
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
              <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-xl max-w-md w-full text-center space-y-6">
                <div className="mx-auto h-20 w-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2 shadow-inner">
                  <CheckCircle2 className="h-10 w-10 text-blue-600 animate-bounce" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Application Received!</h3>
                  <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                    Your application for <strong>{selectedUnit?.name}</strong> has been securely submitted to the landlord for review.
                  </p>
                </div>

                {/* Secure tracking link widget */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3 text-left w-full shadow-sm">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Secure Tracking Link</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Encrypted</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-slate-200 p-2.5 rounded-xl shadow-inner">
                    <span className="text-xs font-semibold text-slate-600 truncate flex-1 pl-1">
                      {typeof window !== "undefined" ? `${window.location.origin}/listings/apply/track?id=${submittedAppId}` : `http://localhost:3000/listings/apply/track?id=${submittedAppId}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/listings/apply/track?id=${submittedAppId}`);
                        toast.success("Tracking link copied to clipboard!");
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 shrink-0 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Bookmark this link to securely track landlord decisions, background check status, and to sign lease drafts.
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <Link href={`/listings/apply/track?id=${submittedAppId}`} className="w-full">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
                      onClick={() => {
                        setDialogOpen(false);
                        setSubmittedAppId(null);
                      }}
                    >
                      Go to Live Tracker
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setDialogOpen(false);
                      setSubmittedAppId(null);
                    }}
                    className="text-slate-500 hover:text-slate-700 font-bold text-sm h-12"
                  >
                    Return to Listings
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Left Sidebar - Context & Stepper (Hidden on mobile) */}
              <div className="hidden md:flex flex-col w-[350px] lg:w-[450px] bg-slate-50 border-r border-slate-200 shrink-0 relative overflow-y-auto overflow-x-hidden">
                {/* Background Image Accent */}
                <div className="absolute top-0 left-0 right-0 h-64 z-0">
                  <img src={selectedUnit?.images?.[0] || selectedUnit?.property?.coverPhoto || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80'} className="w-full h-full object-cover opacity-30" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50"></div>
                </div>
                
                <div className="relative z-10 flex flex-col h-full p-8 lg:p-12">
                  <div className="mb-12">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-2">Apply for<br/>{selectedUnit?.property?.name || 'Property'}</h2>
                    <div className="flex items-center gap-2 text-slate-600 font-bold mb-6">
                      <span className="bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200 text-sm">Unit {selectedUnit?.name}</span>
                      <span className="bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200 text-sm text-blue-700">${Number(selectedUnit?.rentAmount || 0).toLocaleString()}/mo</span>
                    </div>
                  </div>

                  {/* Vertical Stepper */}
                  <div className="flex-1 space-y-8">
                    {[
                      { step: 1, title: "Personal & Preferences", desc: "Basic contact info" },
                      { step: 2, title: "Finances & Guarantor", desc: "Income verification" },
                      { step: 3, title: "History & Contacts", desc: "Previous landlord" },
                      { step: 4, title: "Document Upload", desc: "ID & Proof of Income" },
                      { step: 5, title: "Review & Consent", desc: "Background check authorization" }
                    ].map((s) => (
                      <div key={s.step} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                            formStep > s.step ? 'bg-blue-600 text-white shadow-md' :
                            formStep === s.step ? 'bg-blue-100 text-blue-700 ring-4 ring-blue-50' :
                            'bg-white text-slate-400 border border-slate-200'
                          }`}>
                            {formStep > s.step ? <CheckCircle2 className="h-4 w-4" /> : s.step}
                          </div>
                          {s.step < 5 && <div className={`w-0.5 h-full my-1 rounded-full ${formStep > s.step ? 'bg-blue-600' : 'bg-slate-200'}`}></div>}
                        </div>
                        <div className={`pb-8 ${formStep === s.step ? 'opacity-100' : 'opacity-60'}`}>
                          <h4 className={`text-sm font-extrabold ${formStep === s.step ? 'text-slate-900' : 'text-slate-500'}`}>{s.title}</h4>
                          <p className="text-xs font-semibold text-slate-400 mt-0.5">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto bg-blue-50 rounded-2xl p-4 border border-blue-100 flex gap-3 items-start">
                    <Lock className="h-5 w-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-blue-900">256-bit Encryption</p>
                      <p className="text-[10px] font-semibold text-blue-600 mt-0.5">Your sensitive data is encrypted in transit and at rest.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel - Form */}
              <div className="flex-1 flex flex-col h-full overflow-y-auto bg-white relative">
                <div className="max-w-2xl w-full mx-auto p-6 md:p-12 lg:p-16 flex flex-col min-h-full">
                  
                  {/* Mobile Header (Hidden on Desktop) */}
                  <div className="md:hidden mb-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-black text-slate-900">Apply</h2>
                      <Button variant="ghost" size="icon" onClick={() => setDialogOpen(false)} className="rounded-full bg-slate-50 text-slate-500"><X className="h-5 w-5"/></Button>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Step {formStep} of 5</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${(formStep / 5) * 100}%` }} />
                    </div>
                  </div>
                  
                  {/* Desktop close button */}
                  <div className="hidden md:flex justify-end mb-8">
                    <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold text-sm bg-slate-50 hover:bg-slate-100 rounded-full px-4 h-9">
                      Close
                    </Button>
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
                          min={new Date().toISOString().split('T')[0]}
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
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-black text-slate-900">
                        What is your primary status? <span className="text-red-500">*</span>
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          { id: 'EMPLOYED', label: 'Employed', desc: 'W2 or 1099', icon: <Briefcase className="h-5 w-5"/> },
                          { id: 'STUDENT', label: 'Student', desc: 'Financial Aid / Loans', icon: <GraduationCap className="h-5 w-5"/> },
                          { id: 'UNEMPLOYED', label: 'Other', desc: 'Savings / Benefits', icon: <Wallet className="h-5 w-5"/> }
                        ].map((s) => (
                          <div 
                            key={s.id}
                            onClick={() => {
                              setEmploymentStatus(s.id);
                              setEmployerName("");
                              setJobTitle("");
                            }}
                            className={`flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all ${employmentStatus === s.id ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-slate-100 hover:border-blue-200 bg-white'}`}
                          >
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${employmentStatus === s.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                              {s.icon}
                            </div>
                            <span className={`text-sm font-bold ${employmentStatus === s.id ? 'text-blue-900' : 'text-slate-700'}`}>{s.label}</span>
                            <span className={`text-xs font-semibold mt-0.5 ${employmentStatus === s.id ? 'text-blue-600' : 'text-slate-400'}`}>{s.desc}</span>
                          </div>
                        ))}
                      </div>
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
                          value={employerName}
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
                      {monthlyIncome && selectedUnit && (() => {
                        const ratio = Number(monthlyIncome) / Number(selectedUnit.rentAmount);
                        let alertClass = 'bg-emerald-50 border-emerald-100';
                        let textClass = 'text-emerald-800';
                        let subTextClass = 'text-emerald-600';
                        let icon = <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />;
                        let message = "Strong applicant profile. Meets the standard 2.5x requirement.";

                        if (ratio < 1.5) {
                          alertClass = 'bg-rose-50 border-rose-100';
                          textClass = 'text-rose-800';
                          subTextClass = 'text-rose-600';
                          icon = <Info className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />;
                          message = "Income is severely below requirements. A Guarantor is REQUIRED.";
                        } else if (ratio < 2.5) {
                          alertClass = 'bg-amber-50 border-amber-100';
                          textClass = 'text-amber-800';
                          subTextClass = 'text-amber-700';
                          icon = <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />;
                          message = "Income is below the recommended 2.5x threshold. We strongly suggest adding a Guarantor.";
                        }

                        return (
                          <div className={`mt-2 p-3 rounded-xl border flex items-start gap-2 ${alertClass}`}>
                            {icon}
                            <div>
                              <p className={`text-xs font-bold ${textClass}`}>
                                Income Ratio: {ratio.toFixed(1)}x Rent
                              </p>
                              <p className={`text-[10px] font-semibold mt-0.5 ${subTextClass}`}>
                                {message}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      {(() => {
                        const isStudent = employmentStatus === "STUDENT";
                        const isLowIncome = monthlyIncome && selectedUnit ? (Number(monthlyIncome) / Number(selectedUnit.rentAmount) < 1.5) : false;
                        const isForced = isStudent || isLowIncome;
                        
                        return (
                          <label className={`flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl transition-colors shadow-sm ${isForced ? "opacity-75 cursor-not-allowed" : "cursor-pointer hover:border-blue-200"}`}>
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${hasGuarantor ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Users className="h-5 w-5" />
                              </div>
                              <div>
                                <span className="text-sm font-bold text-slate-800 block">Add a Co-Signer / Guarantor</span>
                                <span className="text-[10px] font-semibold text-slate-500">
                                  {isForced ? (isStudent ? "Required for Student applicants" : "Required due to low income ratio") : "Recommended if income is below 2.5x rent"}
                                </span>
                              </div>
                            </div>
                            <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${hasGuarantor ? 'bg-blue-600' : 'bg-slate-300'}`}>
                              <input
                                type="checkbox"
                                checked={hasGuarantor}
                                disabled={isForced as boolean}
                                onChange={(e) => setHasGuarantor(e.target.checked)}
                                className="sr-only"
                              />
                              <div className={`w-4 h-4 bg-white rounded-full absolute shadow-sm transition-transform ${hasGuarantor ? 'translate-x-6' : 'translate-x-1'}`} />
                            </div>
                          </label>
                        );
                      })()}
                    </div>

                    {hasGuarantor && (
                      <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
                        <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Guarantor Information</p>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Full Name</Label>
                            <Input
                              placeholder="e.g. John Doe Sr."
                              value={guarantorName}
                              onChange={(e) => setGuarantorName(e.target.value)}
                              className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-700">Phone Number</Label>
                              <Input
                                placeholder="(555) 000-0000"
                                value={guarantorPhone}
                                onChange={(e) => setGuarantorPhone(e.target.value)}
                                className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-700">Email Address</Label>
                              <Input
                                placeholder="guarantor@example.com"
                                type="email"
                                value={guarantorEmail}
                                onChange={(e) => setGuarantorEmail(e.target.value)}
                                className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Guarantor Monthly Income ($)</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                              <Input
                                placeholder="10000"
                                type="number"
                                value={guarantorIncome}
                                onChange={(e) => setGuarantorIncome(e.target.value)}
                                className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 pl-7 focus-visible:ring-1 focus-visible:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {formStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-slate-700">
                        Emergency Contact <span className="text-red-500 font-extrabold">*</span>
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                          placeholder="Full Name"
                          value={emergencyContactName}
                          onChange={(e) => setEmergencyContactName(e.target.value)}
                          className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                        />
                        <Input
                          placeholder="Phone Number"
                          value={emergencyContactPhone}
                          onChange={(e) => setEmergencyContactPhone(e.target.value)}
                          className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                        />
                        <Input
                          placeholder="Relationship"
                          value={emergencyContactRelation}
                          onChange={(e) => setEmergencyContactRelation(e.target.value)}
                          className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Previous Landlord Reference</p>
                          <p className="text-[10px] text-blue-600 font-semibold mt-0.5">Applicants with rental history are 40% more likely to be approved.</p>
                        </div>
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
                        <Label className="text-xs font-bold text-slate-700">
                          Number of Pets
                        </Label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setPetsCount(prev => Math.max(0, Number(prev) - 1).toString())}
                            className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                          >
                            <span className="text-lg font-bold">-</span>
                          </button>
                          <div className="flex-1 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-800 shadow-sm">
                            {petsCount}
                          </div>
                          <button
                            type="button"
                            onClick={() => setPetsCount(prev => (Number(prev) + 1).toString())}
                            className="h-11 w-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors"
                          >
                            <span className="text-lg font-bold">+</span>
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="petDetails" className="text-xs font-bold text-slate-700">
                          Pet Details (Breed / Weight) {Number(petsCount) > 0 && <span className="text-red-500 font-extrabold">*</span>}
                        </Label>
                        <Input
                          id="petDetails"
                          placeholder={Number(petsCount) > 0 ? "e.g. Dog: Golden Retriever, 40lbs (Required)" : "Not applicable"}
                          value={petDetails}
                          disabled={Number(petsCount) <= 0}
                          onChange={(e) => setPetDetails(e.target.value)}
                          className="bg-white border border-slate-200 text-slate-800 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-blue-500 focus:bg-white disabled:opacity-50 disabled:bg-slate-50"
                        />
                      </div>
                    </div>


                    <div className="pt-6 border-t border-slate-100">
                      <label className="flex items-center justify-between cursor-pointer p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-200 transition-colors shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${hasVehicle ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H8.3a2 2 0 0 0-1.6.8L4 11l-5.16.86a1 1 0 0 0-.84.99V16h3m10 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0m-6 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0"/></svg>
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-800 block">Do you own a vehicle?</span>
                            <span className="text-[10px] font-semibold text-slate-500">We need this for parking assignments</span>
                          </div>
                        </div>
                        <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${hasVehicle ? 'bg-blue-600' : 'bg-slate-300'}`}>
                          <input
                            type="checkbox"
                            checked={hasVehicle}
                            onChange={(e) => {
                              setHasVehicle(e.target.checked);
                              if (!e.target.checked) {
                                setVehicleMake("");
                                setVehicleModel("");
                                setCustomMake("");
                                setCustomModel("");
                                setVehiclePlate("");
                              }
                            }}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 bg-white rounded-full absolute shadow-sm transition-transform ${hasVehicle ? 'translate-x-6' : 'translate-x-1'}`} />
                        </div>
                      </label>
                    </div>

                    {hasVehicle && (
                      <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
                        <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Vehicle Details</p>
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
                              <option value="">Select Make</option>
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
                    )}
                  </div>
                )}

                {formStep === 4 && (
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>Government ID <span className="text-red-500 font-extrabold">*</span></span>
                        <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full">Required</span>
                      </Label>

                      {idDocument ? (
                        <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-2xl">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-700 truncate max-w-[220px]">{idDocument.name}</p>
                              <p className="text-[10px] font-semibold text-slate-500">{(idDocument.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setIdDocument(null)} className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative group flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl transition-colors">
                          <input
                            type="file" accept=".pdf,image/png,image/jpeg"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              if (file && file.size > 5 * 1024 * 1024) { toast.error("Max size is 5MB."); return; }
                              setIdDocument(file);
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <div className="p-2.5 bg-white rounded-full shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                            <Upload className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-700 text-center">Drag & drop Government ID</p>
                          <p className="text-[10px] text-slate-400 font-semibold text-center">PDF, PNG, JPG (Max 5MB)</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>{employmentStatus === "STUDENT" ? "Proof of Student Enrollment / Student ID" : employmentStatus === "UNEMPLOYED" ? "Proof of Assets / Bank Statement" : "Proof of Income"} <span className="text-red-500 font-extrabold">*</span></span>
                        <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full">Required</span>
                      </Label>

                      {incomeProofDocument ? (
                        <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-2xl">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-700 truncate max-w-[220px]">{incomeProofDocument.name}</p>
                              <p className="text-[10px] font-semibold text-slate-500">{(incomeProofDocument.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setIncomeProofDocument(null)} className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative group flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl transition-colors">
                          <input
                            type="file" accept=".pdf,image/png,image/jpeg"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              if (file && file.size > 5 * 1024 * 1024) { toast.error("Max size is 5MB."); return; }
                              setIncomeProofDocument(file);
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <div className="p-2.5 bg-white rounded-full shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                            <Upload className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-700 text-center">
                            {employmentStatus === "STUDENT" ? "Drag & drop Enrollment Letter or Student ID" : employmentStatus === "UNEMPLOYED" ? "Drag & drop Bank Statement or Asset Proof" : "Drag & drop Pay Stubs or Tax Return"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold text-center">PDF, PNG, JPG (Max 5MB)</p>
                        </div>
                      )}
                    </div>

                    {hasGuarantor && (
                      <div className="pt-6 border-t border-slate-100 space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Users className="h-5 w-5 text-blue-600" />
                          <h4 className="text-sm font-bold text-slate-800">Guarantor Documents</h4>
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                            <span>Guarantor Government ID <span className="text-red-500 font-extrabold">*</span></span>
                            <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full">Required</span>
                          </Label>

                          {guarantorIdDocument ? (
                            <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-2xl">
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                                <div className="truncate">
                                  <p className="text-xs font-bold text-slate-700 truncate max-w-[220px]">{guarantorIdDocument.name}</p>
                                  <p className="text-[10px] font-semibold text-slate-500">{(guarantorIdDocument.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                              </div>
                              <Button type="button" variant="ghost" size="sm" onClick={() => setGuarantorIdDocument(null)} className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="relative group flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl transition-colors">
                              <input
                                type="file" accept=".pdf,image/png,image/jpeg"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  if (file && file.size > 5 * 1024 * 1024) { toast.error("Max size is 5MB."); return; }
                                  setGuarantorIdDocument(file);
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                              <div className="p-2.5 bg-white rounded-full shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                                <Upload className="h-5 w-5" />
                              </div>
                              <p className="text-xs font-bold text-slate-700 text-center">Drag & drop Guarantor's ID</p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                            <span>Guarantor Proof of Income <span className="text-red-500 font-extrabold">*</span></span>
                            <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full">Required</span>
                          </Label>

                          {guarantorIncomeProofDocument ? (
                            <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-2xl">
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                                <div className="truncate">
                                  <p className="text-xs font-bold text-slate-700 truncate max-w-[220px]">{guarantorIncomeProofDocument.name}</p>
                                  <p className="text-[10px] font-semibold text-slate-500">{(guarantorIncomeProofDocument.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                              </div>
                              <Button type="button" variant="ghost" size="sm" onClick={() => setGuarantorIncomeProofDocument(null)} className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="relative group flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl transition-colors">
                              <input
                                type="file" accept=".pdf,image/png,image/jpeg"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  if (file && file.size > 5 * 1024 * 1024) { toast.error("Max size is 5MB."); return; }
                                  setGuarantorIncomeProofDocument(file);
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                              <div className="p-2.5 bg-white rounded-full shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                                <Upload className="h-5 w-5" />
                              </div>
                              <p className="text-xs font-bold text-slate-700 text-center">Drag & drop Guarantor's Pay Stubs</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {formStep === 5 && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-4">
                      <p className="text-xs font-bold text-slate-800">Final Step: Legal Consents</p>
                      
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={backgroundCheckConsent}
                          onChange={(e) => setBackgroundCheckConsent(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800">Background & Credit Check Consent</span>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                            By checking this box, I authorize PropertyPro and the landlord to run a background check, credit check, and verify my income and rental history via third-party services.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800">Terms and Conditions</span>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                            I certify that all information provided is true and correct. I understand that providing false information may result in application denial or lease termination.
                          </p>
                        </div>
                      </label>
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
                  {formStep < 5 && (
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
                          if (hasGuarantor && (!guarantorName || !guarantorEmail || !guarantorPhone || !guarantorIncome)) {
                            toast.error("Please fill in all guarantor details.");
                            return;
                          }
                        } else if (formStep === 3) {
                          if (!emergencyContactName || !emergencyContactPhone || !emergencyContactRelation) {
                            toast.error("Please provide an emergency contact.");
                            return;
                          }
                        } else if (formStep === 4) {
                           if (!idDocument || !incomeProofDocument) {
                            const docErr = employmentStatus === "STUDENT" 
                              ? "Please upload both Government ID and Proof of Student Enrollment to submit your application." 
                              : (employmentStatus === "UNEMPLOYED" 
                                  ? "Please upload both Government ID and Proof of Assets/Bank Statement to submit your application." 
                                  : "Please upload both Government ID and Proof of Income to submit your application.");
                            toast.error(docErr);
                            return;
                          }
                          if (hasGuarantor && (!guarantorIdDocument || !guarantorIncomeProofDocument)) {
                            toast.error("Please upload both Guarantor Government ID and Guarantor Proof of Income.");
                            return;
                          }
                        }
                        setFormStep(formStep + 1);
                      }}
                      className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-xl font-bold shadow-sm hover:shadow-md transition-all shadow-blue-600/20"
                    >
                      Continue
                    </Button>
                  )}
                  {formStep === 5 && (
                    <Button
                      key="btn-submit"
                      type="submit"
                      disabled={applying || !backgroundCheckConsent || !agreedToTerms}
                      className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white h-11 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      {applying ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Application"
                      )}
                    </Button>
                  )}
                </div>
              </form>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {selectedTourUnit && (
        <ScheduleTourModal
          open={tourDialogOpen}
          onOpenChange={setTourDialogOpen}
          unit={selectedTourUnit}
          onSuccess={() => setTourDialogOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-slate-400 text-xs font-bold mt-auto">
        <p>© 2026 PropertyPro. All rights reserved.</p>
      </footer>
    </div>
  );
}
