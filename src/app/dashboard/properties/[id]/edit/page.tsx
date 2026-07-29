"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, UploadCloud, Plus, Trash2, Building, ImageIcon, Loader2, Layers, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import EmbeddedSubscribeModal from "@/components/subscription/EmbeddedSubscribeModal";
import PlanUpgradeModal from "@/components/subscription/PlanUpgradeModal";
import PausedAccountGate from "@/components/subscription/PausedAccountGate";

const waitForTierUpdate = async (newTierId: string, maxMs = 12000) => {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const res = await fetch("/api/users");
    if (!res.ok) break;
    const data = await res.json();
    if (data.pricingTier?.id === newTierId) return data;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
};

export default function EditPropertyPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Limits & Subscription
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitModalMessage, setLimitModalMessage] = useState("");
  const [limitModalType, setLimitModalType] = useState<"limit" | "subscription">("limit");
  const [pricingTier, setPricingTier] = useState<any>(null);
  const [pricingTiers, setPricingTiers] = useState<any[]>([]);
  const [showUpgradeLimitModal, setShowUpgradeLimitModal] = useState(false);
  const [requestedUnitsForUpgrade, setRequestedUnitsForUpgrade] = useState<number>(0);
  const [isPausedAccount, setIsPausedAccount] = useState(false);
  const [pausedPlanName, setPausedPlanName] = useState<string | null>(null);
  const [blockNewUnits, setBlockNewUnits] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    name: "",
    type: "Apartment", // Apartment, House, Commercial
    status: "AVAILABLE",
    yearBuilt: "",
    description: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    coverPhoto: "",
    images: [] as string[],
    amenities: [] as string[],
    // House specific flat fields
    houseRent: "",
    houseDeposit: "",
    houseRooms: "",
    houseBaths: "",
    houseSqft: "",
    houseOccupants: "1",
    // Commercial specific top-level fields
    zoningType: "",
    parkingSpaces: ""
  });

  const [units, setUnits] = useState<any[]>([]);

  // Track manual deposit overrides so we don't clobber them with rent mirroring
  const [depositEditedMap, setDepositEditedMap] = useState<Record<number, boolean>>({});
  const [houseDepositEdited, setHouseDepositEdited] = useState(false);
  const [customZoning, setCustomZoning] = useState("");

  // Bulk Generator State
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkQty, setBulkQty] = useState("10");
  const [bulkPrefix, setBulkPrefix] = useState("Apt ");
  const [bulkStartNum, setBulkStartNum] = useState("101");
  const [bulkFloor, setBulkFloor] = useState("");
  const [bulkMaxOccupants, setBulkMaxOccupants] = useState("2");
  const [bulkRent, setBulkRent] = useState("1500");
  const [bulkDeposit, setBulkDeposit] = useState("");
  const [bulkBeds, setBulkBeds] = useState("2");
  const [bulkBaths, setBulkBaths] = useState("1");
  const [bulkSqft, setBulkSqft] = useState("800");
  const [bulkLeaseStructure, setBulkLeaseStructure] = useState("NNN");
  const [bulkCam, setBulkCam] = useState("");
  const [bulkCloneImages, setBulkCloneImages] = useState(true);
  const [bulkImages, setBulkImages] = useState<string[]>([]);
  const [uploadingBulkImages, setUploadingBulkImages] = useState(false);

  const handleUpgradeSuccess = async (newTierId: string) => {
    setLimitModalOpen(false);
    setShowUpgradeLimitModal(false);

    toast.loading("Verifying your subscription upgrade...", { id: "verify-upgrade" });

    const updated = await waitForTierUpdate(newTierId);
    if (!updated) {
      toast.warning("Plan upgraded, but details are still syncing. Please refresh in a moment.", { id: "verify-upgrade", duration: 8000 });
      return;
    }

    setPricingTier(updated.pricingTier || null);
    toast.success("Subscription upgraded successfully!", { id: "verify-upgrade", duration: 5000 });
  };

  // Fetch subscription, limits, and property data on mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        // Fetch User and limits
        const userRes = await fetch("/api/users");
        if (userRes.ok) {
          const userData = await userRes.json();
          setPricingTier(userData.pricingTier || null);
        }

        // Fetch pricing tiers for upgrade modal
        const tiersRes = await fetch("/api/pricing-tiers");
        if (tiersRes.ok) {
          const tiersData = await tiersRes.json();
          setPricingTiers(tiersData.filter((t: any) => t.isActive && !t.isCustom));
        }

        // Query rules API
        const rulesRes = await fetch("/api/subscription/rules");
        if (rulesRes.ok) {
          const rules = await rulesRes.json();
          if (rules.isPaused && rules.blockNewUnits) {
            setIsPausedAccount(true);
            setPausedPlanName(rules.planName || null);
            setBlockNewUnits(true);
          }
        }

        // Fetch Property details
        const propertyRes = await fetch(`/api/properties?id=${id}`);
        if (!propertyRes.ok) throw new Error("Property not found");
        const propertyData = await propertyRes.json();

        // Extract zoning type custom other check
        let isZoningCustom = false;
        const predefinedZonings = [
          "Retail & Commercial",
          "Light Industrial",
          "Heavy Industrial",
          "Office / Professional",
          "Mixed-Use",
          ""
        ];
        if (propertyData.zoningType && !predefinedZonings.includes(propertyData.zoningType)) {
          isZoningCustom = true;
        }

        // Load units first unit mapping for House spec
        const loadedUnits = propertyData.units || [];
        const isHouse = propertyData.type === "House";
        const firstUnit = loadedUnits[0] || {};

        setFormData({
          name: propertyData.name || "",
          type: propertyData.type || "Apartment",
          status: propertyData.status || "AVAILABLE",
          yearBuilt: propertyData.yearBuilt ? String(propertyData.yearBuilt) : "",
          description: propertyData.description || "",
          address: propertyData.address || "",
          city: propertyData.city || "",
          state: propertyData.state || "",
          zip: propertyData.zip || "",
          country: propertyData.country || "",
          coverPhoto: propertyData.coverPhoto || "",
          images: propertyData.images || [],
          amenities: propertyData.amenities || [],
          houseRent: isHouse ? String(firstUnit.rentAmount || "") : "",
          houseDeposit: isHouse ? String(firstUnit.depositAmt || "") : "",
          houseRooms: isHouse ? String(firstUnit.rooms || "") : "",
          houseBaths: isHouse ? String(firstUnit.bathrooms || "") : "",
          houseSqft: isHouse ? String(firstUnit.sqFootage || "") : "",
          houseOccupants: isHouse ? String(firstUnit.maxOccupants || "1") : "1",
          zoningType: isZoningCustom ? "Other" : (propertyData.zoningType || ""),
          parkingSpaces: propertyData.parkingSpaces ? String(propertyData.parkingSpaces) : ""
        });

        if (isZoningCustom) {
          setCustomZoning(propertyData.zoningType);
        }

        if (loadedUnits.length > 0) {
          setUnits(loadedUnits.map((u: any) => ({
            ...u,
            floor: u.floor ? String(u.floor) : "",
            rooms: u.rooms ? String(u.rooms) : "",
            bathrooms: u.bathrooms ? String(u.bathrooms) : "",
            sqFootage: u.sqFootage ? String(u.sqFootage) : "",
            maxOccupants: u.maxOccupants ? String(u.maxOccupants) : "1",
            rentAmount: u.rentAmount ? String(u.rentAmount) : "",
            depositAmt: u.depositAmt ? String(u.depositAmt) : "",
            images: u.images || []
          })));
        } else {
          setUnits([{ name: "Unit 1", type: "Apartment", floor: "", rooms: "", bathrooms: "", sqFootage: "", maxOccupants: "2", rentAmount: "", depositAmt: "", status: "VACANT", leaseStructure: "NNN", camCharges: "", images: [] as string[] }]);
        }

      } catch (err) {
        toast.error("Error loading property data");
        router.push("/dashboard/properties");
      } finally {
        setLoadingData(false);
      }
    };
    if (id) loadAllData();
  }, [id, router]);

  // Autocomplete Suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);

  const handleAddressChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, address: value }));

    if (value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if ((window as any).addressTimeout) {
      clearTimeout((window as any).addressTimeout);
    }

    (window as any).addressTimeout = setTimeout(async () => {
      try {
        setSearchingAddress(true);
        const token = process.env.NEXT_PUBLIC_LOCATIONIQ_TOKEN || "";
        if (!token) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }
        const res = await fetch(`https://api.locationiq.com/v1/autocomplete?key=${token}&q=${encodeURIComponent(value)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(Array.isArray(data) ? data : []);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("LocationIQ Error:", err);
      } finally {
        setSearchingAddress(false);
      }
    }, 400);
  };

  const selectSuggestion = (s: any) => {
    const addr = s.address || {};
    let streetAddress = "";
    if (addr.house_number && addr.road) {
      streetAddress = `${addr.house_number} ${addr.road}`;
    } else if (addr.road) {
      streetAddress = addr.road;
    } else {
      streetAddress = addr.name || s.display_name.split(",")[0] || "";
    }
    setFormData(prev => ({
      ...prev,
      address: streetAddress,
      city: addr.city || addr.town || addr.village || addr.suburb || "",
      state: addr.state || addr.state_district || addr.county || "",
      zip: addr.postcode || "",
      country: addr.country || "",
    }));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Image Upload handlers
  const [uploadingPropertyImages, setUploadingPropertyImages] = useState(false);
  const handlePropertyImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: string = "") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPropertyImages(true);
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const formDataObj = new FormData();
      formDataObj.append("file", files[i]);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formDataObj });
        if (res.ok) {
          const data = await res.json();
          const finalUrl = category ? `${data.url}#category=${category}` : data.url;
          newUrls.push(finalUrl);
        }
      } catch (err) {}
    }
    if (newUrls.length > 0) {
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...newUrls],
        coverPhoto: prev.coverPhoto ? prev.coverPhoto : newUrls[0]
      }));
      toast.success(`${newUrls.length} image(s) uploaded!`);
    }
    setUploadingPropertyImages(false);
  };

  const removePropertyImage = (url: string) => {
    setFormData(prev => {
      const updated = prev.images.filter(u => u !== url);
      return { ...prev, images: updated, coverPhoto: prev.coverPhoto === url ? (updated[0] || "") : prev.coverPhoto };
    });
  };

  const setCoverPhoto = (url: string) => {
    setFormData(prev => ({ ...prev, coverPhoto: url }));
    toast.success("Cover updated!");
  };

  const handleUnitImagesUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>, category: string = "UNIT_INTERIOR") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    toast.loading("Uploading...", { id: `unit-${index}` });
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = new FormData();
      f.append("file", files[i]);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: f });
        if (res.ok) {
          const data = await res.json();
          newUrls.push(`${data.url}#category=${category}`);
        }
      } catch (err) {}
    }
    if (newUrls.length > 0) {
      const newUnits = [...units];
      newUnits[index].images = [...(newUnits[index].images || []), ...newUrls];
      setUnits(newUnits);
      toast.success("Uploaded!", { id: `unit-${index}` });
    }
  };

  const removeUnitImage = (index: number, url: string) => {
    const newUnits = [...units];
    newUnits[index].images = newUnits[index].images.filter((u: string) => u !== url);
    setUnits(newUnits);
  };

  // Amenities logic
  const [customAmenity, setCustomAmenity] = useState("");
  const getPredefinedAmenities = () => {
    if (formData.type === "Commercial") {
      return ["Loading Dock", "High-Speed Fiber", "Customer Parking", "Heavy Power", "Break Room", "Freight Elevator", "Security System", "ADA Compliant"];
    } else if (formData.type === "Apartment") {
      return ["Elevator", "On-site management", "Shared laundry", "Gate code access", "Fitness Center", "Swimming pool", "Parking garage", "Package locker"];
    } else {
      return ["Garage", "In-unit laundry", "Air conditioning", "Central heating", "Private backyard", "Hardwood Floors", "Dishwasher", "Pet-friendly"];
    }
  };

  const toggleAmenity = (am: string) => {
    setFormData(prev => {
      if (prev.amenities.includes(am)) return { ...prev, amenities: prev.amenities.filter(a => a !== am) };
      return { ...prev, amenities: [...prev.amenities, am] };
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      let newData = { ...prev, [name]: value };
      
      // Smart Defaults for House
      if (name === "houseRent" && !houseDepositEdited) {
        newData.houseDeposit = value;
      }
      if (name === "houseDeposit") {
        setHouseDepositEdited(true);
      }

      return newData;
    });
  };

  const handleUnitChange = (index: number, field: string, value: string) => {
    const newUnits = [...units];
    newUnits[index] = { ...newUnits[index], [field]: value };
    
    // Smart Defaults for Units
    if (field === "rentAmount" && !depositEditedMap[index]) {
      newUnits[index].depositAmt = value;
    }
    if (field === "depositAmt") {
      setDepositEditedMap(prev => ({...prev, [index]: true}));
    }
    
    setUnits(newUnits);
  };

  const addUnit = () => setUnits([...units, { name: formData.type === "Commercial" ? `Suite ${units.length + 1}` : `Unit ${units.length + 1}`, type: formData.type === "Commercial" ? "Commercial" : "Apartment", floor: "", rooms: "", bathrooms: "", sqFootage: "", maxOccupants: "2", rentAmount: "", depositAmt: "", status: "VACANT", images: [] as string[] }]);
  const removeUnit = (index: number) => setUnits(units.filter((_, i) => i !== index));

  const handleBulkImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingBulkImages(true);
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const formDataObj = new FormData();
      formDataObj.append("file", files[i]);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formDataObj });
        if (res.ok) {
          const data = await res.json();
          newUrls.push(`${data.url}#category=${category}`);
        }
      } catch (err) {}
    }
    setBulkImages(prev => [...prev, ...newUrls]);
    setUploadingBulkImages(false);
  };
  
  const removeBulkImage = (url: string) => {
    setBulkImages(prev => prev.filter(u => u !== url));
  };

  const handleBulkGenerate = () => {
    const qty = Number(bulkQty);
    const start = Number(bulkStartNum);
    if (qty <= 0 || qty > 100) return toast.error("Quantity must be between 1 and 100.");
    
    const newGeneratedUnits = [];
    for(let i=0; i<qty; i++) {
      newGeneratedUnits.push({
        name: `${bulkPrefix}${start + i}`,
        type: formData.type === "Commercial" ? "Commercial" : "Apartment",
        floor: bulkFloor,
        rooms: bulkBeds,
        bathrooms: bulkBaths,
        sqFootage: bulkSqft,
        maxOccupants: formData.type === "Commercial" ? "0" : bulkMaxOccupants,
        rentAmount: bulkRent,
        depositAmt: bulkDeposit || bulkRent, 
        status: "VACANT",
        leaseStructure: formData.type === "Commercial" ? bulkLeaseStructure : undefined,
        camCharges: (formData.type === "Commercial" && bulkLeaseStructure === "NNN") ? bulkCam : undefined,
        images: bulkImages.length > 0 ? [...bulkImages] : ((bulkCloneImages && units[0]?.images) ? [...units[0].images] : [])
      });
    }
    
    if (units.length === 1 && !units[0].rentAmount && !units[0].sqFootage) {
      setUnits(newGeneratedUnits);
    } else {
      setUnits([...units, ...newGeneratedUnits]);
    }
    
    setBulkDialogOpen(false);
    toast.success(`Successfully generated ${qty} units!`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (blockNewUnits) {
      toast.error("Your subscription is paused. Reactivate your subscription to edit or add properties.");
      return;
    }

    setLoading(true);

    try {
      let finalUnits = units;

      if (formData.type === "House") {
        finalUnits = [{
          name: "Main House",
          type: "House",
          floor: "1",
          rooms: formData.houseRooms || "0",
          bathrooms: formData.houseBaths || "0",
          sqFootage: formData.houseSqft || "0",
          maxOccupants: formData.houseOccupants || "1",
          rentAmount: formData.houseRent || "0",
          depositAmt: formData.houseDeposit || "0",
          status: "VACANT",
          images: formData.images || []
        }];
      } else if (formData.type === "Commercial") {
        finalUnits = units.map(u => {
          const leaseType = u.leaseStructure || "NNN";
          const unitAmenities = u.amenities || [];
          return {
            ...u,
            rooms: "0",
            bathrooms: "0",
            maxOccupants: "0",
            leaseStructure: leaseType,
            camCharges: (leaseType === "NNN" && u.camCharges) ? Number(u.camCharges) : null,
            amenities: unitAmenities
          };
        });
      }

      // Check unit limit before submitting edit (if they added extra units)
      const requestedCount = finalUnits.length;
      const maxUnits = pricingTier?.maxUnits ?? 0;
      
      if (maxUnits > 0 && requestedCount > maxUnits) {
        // Query database to see count of other properties' units
        const countRes = await fetch(`/api/units?countOnly=true&excludePropertyId=${id}`);
        const countData = countRes.ok ? await countRes.json() : { count: 0 };
        const otherUnitsCount = countData.count ?? 0;

        if (otherUnitsCount + requestedCount > maxUnits) {
          setRequestedUnitsForUpgrade(otherUnitsCount + requestedCount);
          setShowUpgradeLimitModal(true);
          setLoading(false);
          return;
        }
      }

      const payload = {
        id,
        ...formData,
        zoningType: formData.zoningType === "Other" ? customZoning : formData.zoningType,
        yearBuilt: formData.yearBuilt ? Number(formData.yearBuilt) : null,
        parkingSpaces: formData.parkingSpaces ? Number(formData.parkingSpaces) : null,
        units: finalUnits.map(u => ({
          ...u,
          rentAmount: Number(u.rentAmount) || 0,
          rooms: Number(u.rooms) || 0,
          bathrooms: Number(u.bathrooms) || 0,
          maxOccupants: Number(u.maxOccupants) || 1,
          sqFootage: Number(u.sqFootage) || 0,
          depositAmt: Number(u.depositAmt || u.rentAmount || 0),
          floor: u.floor ? Number(u.floor) : null,
          camCharges: u.camCharges ? Number(u.camCharges) : null
        }))
      };

      const res = await fetch("/api/properties", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Property updated successfully!");
        router.push(`/dashboard/properties/${id}`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update property");
      }
    } catch (err) {
      toast.error("An error occurred while updating the property.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div className="p-10 text-center font-bold text-[#6E6E73]">Loading Property Details...</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto pt-6 space-y-6 pb-24 px-2 sm:px-0">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/dashboard/properties/${id}`}>
          <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl bg-white border border-[#E5E5EA] shadow-sm text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F2F2F7]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#1D1D1F] tracking-tight">Edit Property</h1>
          <p className="text-[#6E6E73] text-sm font-medium mt-1">Update your property details and unit information.</p>
        </div>
      </div>

      <PausedAccountGate
        isLocked={blockNewUnits}
        planName={pausedPlanName}
        reason="Editing Properties"
        allowedActions={[
          "Your existing listings, units, and active leases remain <strong>completely active</strong>.",
          "Rent collections and lease transactions will continue processing as normal.",
          "Creating new property listings or editing unit spaces is locked until you resume your plan."
        ]}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Information */}
          <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#E5E5EA] bg-[#F2F2F7]/50 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-[#1D1D1F] text-lg">General Information</h2>
                <p className="text-sm text-[#6E6E73]">Basic details about this property.</p>
              </div>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#1D1D1F]">Property Type</label>
                  <select name="type" value={formData.type} onChange={handleChange} className="w-full h-11 bg-slate-50 border border-[#E5E5EA] rounded-xl px-4 text-sm font-bold text-[#1D1D1F] outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer">
                    <option value="Apartment">Apartment Complex</option>
                    <option value="House">Single Family House</option>
                    <option value="Commercial">Commercial Building</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#1D1D1F]">Property Name <span className="text-red-500">*</span></label>
                  <Input required name="name" value={formData.name} onChange={handleChange} placeholder={formData.type === "House" ? "e.g. 123 Sunset Villa" : "e.g. Grand Horizon Towers"} className="h-11 rounded-xl bg-white border-[#E5E5EA]" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#1D1D1F]">Year Built (Optional)</label>
                  <Input name="yearBuilt" type="number" value={formData.yearBuilt} onChange={handleChange} placeholder="e.g. 2015" className="h-11 rounded-xl bg-white border-[#E5E5EA]" />
                </div>
                
                {formData.type === "Commercial" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#1D1D1F]">Zoning Type (Optional)</label>
                      <div className="flex gap-2">
                        <select name="zoningType" value={formData.zoningType} onChange={handleChange} className="flex-1 h-11 bg-white border border-[#E5E5EA] rounded-xl px-4 text-sm font-semibold text-[#1D1D1F] outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer">
                          <option value="">Select a zoning type...</option>
                          <option value="Retail & Commercial">Retail & Commercial (Shops, Restaurants)</option>
                          <option value="Light Industrial">Light Industrial (Warehouse, Auto)</option>
                          <option value="Heavy Industrial">Heavy Industrial (Manufacturing)</option>
                          <option value="Office / Professional">Office / Professional</option>
                          <option value="Mixed-Use">Mixed-Use (Retail & Residential)</option>
                          <option value="Other">Other (Custom Code)</option>
                        </select>
                        {formData.zoningType === "Other" && (
                          <Input value={customZoning} onChange={(e) => setCustomZoning(e.target.value)} placeholder="e.g. C-1" className="w-1/3 h-11 rounded-xl bg-white border-[#E5E5EA]" />
                        )}
                      </div>
                      <p className="text-[10px] text-[#6E6E73] font-medium leading-tight">Indicates what types of businesses are legally permitted to operate here.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#1D1D1F]">Total Parking Spaces (Optional)</label>
                      <Input name="parkingSpaces" type="number" value={formData.parkingSpaces} onChange={handleChange} placeholder="e.g. 50" className="h-11 rounded-xl bg-white border-[#E5E5EA]" />
                    </div>
                  </>
                )}
              </div>

              {/* IF SINGLE FAMILY HOUSE: ABSORB UNIT FIELDS HERE */}
              {formData.type === "House" && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Building className="h-4 w-4 text-blue-600"/> House Specifications</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-[#1D1D1F]">Monthly Rent ($) <span className="text-red-500">*</span></label>
                      <Input required name="houseRent" type="number" value={formData.houseRent} onChange={handleChange} placeholder="2500" className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-[#1D1D1F]">Security Deposit ($)</label>
                      <Input name="houseDeposit" type="number" value={formData.houseDeposit} onChange={handleChange} placeholder="2500" className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1D1D1F]">Bedrooms <span className="text-red-500">*</span></label>
                      <Input required name="houseRooms" type="number" value={formData.houseRooms} onChange={handleChange} placeholder="3" className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1D1D1F]">Bathrooms <span className="text-red-500">*</span></label>
                      <Input required name="houseBaths" type="number" value={formData.houseBaths} onChange={handleChange} placeholder="2" className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1D1D1F]">Sq Footage <span className="text-red-500">*</span></label>
                      <Input required name="houseSqft" type="number" value={formData.houseSqft} onChange={handleChange} placeholder="2000" className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1D1D1F]">Max Occupants</label>
                      <Input name="houseOccupants" type="number" value={formData.houseOccupants} onChange={handleChange} placeholder="5" className="h-11 rounded-xl" />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1D1D1F]">Description</label>
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange} 
                  rows={4}
                  placeholder="Write a detailed description of the property..." 
                  className="w-full bg-white border border-[#E5E5EA] rounded-xl p-4 text-sm text-[#1D1D1F] outline-none focus:ring-2 focus:ring-[#007AFF] resize-y" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#E5E5EA] bg-[#F2F2F7]/50">
              <h2 className="font-bold text-[#1D1D1F] text-lg">Address Information</h2>
              <p className="text-sm text-[#6E6E73]">Where is this property located?</p>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2 relative" onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}>
                <label className="text-sm font-bold text-[#1D1D1F]">Street Address <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Input 
                    required 
                    name="address" 
                    value={formData.address} 
                    onChange={handleAddressChange} 
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    placeholder="123 Main St" 
                    className="h-11 rounded-xl bg-white border-[#E5E5EA] pr-10" 
                  />
                  {searchingAddress && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#94A3B8]" />
                    </div>
                  )}
                </div>
                
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E5E5EA] rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                    {suggestions.map((s, index) => (
                      <button
                        key={`${s.place_id}-${index}`}
                        type="button"
                        onMouseDown={() => selectSuggestion(s)}
                        onClick={() => selectSuggestion(s)}
                        className="w-full text-left px-4 py-3 hover:bg-[#F2F2F7] transition-colors border-b border-[#F1F5F9] last:border-b-0 flex flex-col gap-0.5"
                      >
                        <span className="font-semibold text-sm text-[#1D1D1F]">{s.display_name}</span>
                        {s.address && (
                          <span className="text-xs text-[#6E6E73]">
                            {[
                              s.address.city || s.address.town || s.address.village || s.address.suburb,
                              s.address.state,
                              s.address.country
                            ].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#1D1D1F]">City <span className="text-red-500">*</span></label>
                  <Input required name="city" value={formData.city} onChange={handleChange} placeholder="e.g. London" className="h-11 rounded-xl bg-white border-[#E5E5EA]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#1D1D1F]">State / Province</label>
                  <Input name="state" value={formData.state} onChange={handleChange} placeholder="e.g. NY" className="h-11 rounded-xl bg-white border-[#E5E5EA]" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#1D1D1F]">ZIP / Postal Code</label>
                  <Input name="zip" value={formData.zip} onChange={handleChange} placeholder="e.g. 10001" className="h-11 rounded-xl bg-white border-[#E5E5EA]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#1D1D1F]">Country <span className="text-red-500">*</span></label>
                  <Input required name="country" value={formData.country} onChange={handleChange} placeholder="e.g. UK" className="h-11 rounded-xl bg-white border-[#E5E5EA]" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property Images */}
          <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#E5E5EA] bg-[#F2F2F7]/50">
              <h2 className="font-bold text-[#1D1D1F] text-lg">Property Images</h2>
              <p className="text-sm text-[#6E6E73]">Categorize and upload high-quality images to showcase your property.</p>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {(() => {
                  let categories = [];
                  if (formData.type === "House") {
                    categories = [
                      { id: "EXTERIOR", label: "Exterior & Yard" },
                      { id: "LIVING", label: "Kitchen & Living" },
                      { id: "BED_BATH", label: "Bed & Bathrooms" }
                    ];
                  } else if (formData.type === "Apartment") {
                    categories = [
                      { id: "EXTERIOR", label: "Building Exterior" },
                      { id: "AMENITIES", label: "Common Amenities" }
                    ];
                  } else {
                    categories = [
                      { id: "FACADE", label: "Facade & Signage" },
                      { id: "LOADING_DOCK", label: "Loading Docks" },
                      { id: "PARKING", label: "Customer Parking" }
                    ];
                  }

                  return categories.map((cat) => {
                    const catImages = formData.images.filter(url => url.includes(`#category=${cat.id}`));
                    const hasImages = catImages.length > 0;

                    return (
                      <div key={cat.id} className="relative">
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*" 
                          id={`upload-${cat.id}`} 
                          className="hidden" 
                          onChange={(e) => handlePropertyImagesUpload(e, cat.id)} 
                        />
                        <div 
                          onClick={() => document.getElementById(`upload-${cat.id}`)?.click()}
                          className={`h-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                            hasImages 
                            ? "border-[#22C55E] bg-[#F0FDF4] hover:bg-[#DCFCE7]" 
                            : "border-[#CBD5E1] bg-white hover:bg-[#F2F2F7]"
                          }`}
                        >
                          {uploadingPropertyImages ? (
                            <Loader2 className="h-8 w-8 animate-spin text-[#007AFF] mb-3" />
                          ) : hasImages ? (
                            <div className="h-10 w-10 bg-[#22C55E] text-white rounded-full flex items-center justify-center mb-3">
                              <span className="font-bold text-lg">✓</span>
                            </div>
                          ) : (
                            <UploadCloud className="h-8 w-8 text-[#94A3B8] mb-3" />
                          )}
                          <h3 className={`text-sm font-bold ${hasImages ? "text-[#166534]" : "text-[#1D1D1F]"}`}>
                            {cat.label}
                          </h3>
                          {!hasImages && <p className="text-xs text-[#6E6E73] mt-1">Click to upload</p>}
                          
                          {hasImages && (
                            <div className="flex gap-1 mt-3">
                              {catImages.slice(0, 3).map((url, i) => (
                                <div key={i} className="h-8 w-8 rounded-md overflow-hidden border border-[#22C55E]/50">
                                  <img src={url} className="h-full w-full object-cover" alt="" />
                                </div>
                              ))}
                              {catImages.length > 3 && (
                                <div className="h-8 w-8 rounded-md bg-[#22C55E]/20 text-[#166534] flex items-center justify-center text-[10px] font-bold">
                                  +{catImages.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {formData.images && formData.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  {formData.images.map((url) => {
                    const isCover = formData.coverPhoto === url;
                    return (
                      <div key={url} className="group relative aspect-video rounded-xl overflow-hidden border border-[#E5E5EA] shadow-sm bg-slate-100">
                        <img src={url} alt="Property" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button type="button" onClick={(e) => { e.stopPropagation(); setCoverPhoto(url); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${isCover ? "bg-[#22C55E] text-white" : "bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]"}`}>{isCover ? "Cover" : "Set Cover"}</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); removePropertyImage(url); }} className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"><Trash2 className="h-4 w-4" /></button>
                        </div>
                        {isCover && <div className="absolute top-2 left-2 bg-[#22C55E] text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wider">Cover</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dynamic Amenities */}
          <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#E5E5EA] bg-[#F2F2F7]/50">
              <h2 className="font-bold text-[#1D1D1F] text-lg flex items-center gap-2">
                <div className="bg-[#EFF6FF] text-[#007AFF] p-1.5 rounded-full">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                </div>
                {formData.type === "Commercial" ? "Commercial Features" : "Amenities & Features"}
              </h2>
              <p className="text-sm text-[#6E6E73] mt-1">Select the core amenities that best describe this property.</p>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {getPredefinedAmenities().map(amenity => {
                  const isSelected = formData.amenities.includes(amenity);
                  return (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                        isSelected ? "border-[#007AFF] bg-[#EFF6FF] text-[#1D1D1F]" : "border-[#E5E5EA] bg-white text-[#6E6E73] hover:border-[#CBD5E1]"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? "border-[#007AFF]" : "border-[#CBD5E1]"}`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-[#007AFF]" />}
                      </div>
                      {amenity}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 p-5 bg-[#F2F2F7] rounded-xl border border-[#E5E5EA]">
                <label className="text-sm font-bold text-[#1D1D1F] mb-2 block">Add custom amenity or feature</label>
                <div className="flex gap-3">
                  <Input 
                    value={customAmenity}
                    onChange={(e) => setCustomAmenity(e.target.value)}
                    onKeyDown={(e) => { 
                      if(e.key === 'Enter') { 
                        e.preventDefault(); 
                        if (customAmenity.trim() && !formData.amenities.includes(customAmenity.trim())) {
                          setFormData(p => ({ ...p, amenities: [...p.amenities, customAmenity.trim()] }));
                          setCustomAmenity("");
                        }
                      } 
                    }}
                    placeholder="e.g. Smart Home, Security Guard..." 
                    className="h-11 rounded-xl bg-white border-[#E5E5EA] flex-1 max-w-sm" 
                  />
                  <Button 
                    type="button" 
                    onClick={() => {
                      if (customAmenity.trim() && !formData.amenities.includes(customAmenity.trim())) {
                        setFormData(p => ({ ...p, amenities: [...p.amenities, customAmenity.trim()] }));
                        setCustomAmenity("");
                      }
                    }}
                    className="h-11 w-11 p-0 rounded-xl bg-white border border-[#E5E5EA] text-[#007AFF] shadow-sm hover:bg-[#F2F2F7]"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                {formData.amenities.filter(a => !getPredefinedAmenities().includes(a)).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {formData.amenities.filter(a => !getPredefinedAmenities().includes(a)).map(amenity => (
                      <div key={amenity} className="flex items-center gap-2 px-3 py-1.5 bg-[#EFF6FF] text-[#007AFF] text-sm font-semibold rounded-lg">
                        {amenity}
                        <button type="button" onClick={() => toggleAmenity(amenity)} className="text-[#007AFF] hover:text-[#1D4ED8]">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Smart Unit Management (HIDDEN if House) */}
          {formData.type !== "House" && (
            <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-[#E5E5EA] bg-[#F2F2F7]/50 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                  <h2 className="font-bold text-[#1D1D1F] text-lg">
                    {formData.type === "Commercial" ? "Suite Management" : "Smart Unit Management"}
                  </h2>
                  <p className="text-sm text-[#6E6E73]">Manage the {formData.type === "Commercial" ? "suites" : "units"} for this property.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button type="button" onClick={() => setBulkDialogOpen(true)} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 h-10 px-4 rounded-xl font-bold shadow-sm flex items-center gap-2 border border-emerald-200">
                    <Layers className="h-4 w-4" /> Bulk Add {formData.type === "Commercial" ? "Suites" : "Units"}
                  </Button>
                  <Button type="button" onClick={addUnit} className="bg-[#EFF6FF] text-[#007AFF] hover:bg-[#DBEAFE] h-10 px-4 rounded-xl font-bold shadow-sm flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add {formData.type === "Commercial" ? "Suite" : "Unit"}
                  </Button>
                </div>
              </div>
              <CardContent className="p-0">
                {units.map((unit, index) => (
                  <div key={index} className="p-6 border-b border-[#E5E5EA] last:border-b-0 bg-white hover:bg-[#F2F2F7]/30 transition-colors">
                    <div className="flex justify-between items-center mb-5 pb-4 border-b border-[#F1F5F9]">
                      <h3 className="font-bold text-[#1D1D1F] flex items-center gap-2 text-lg">
                        <Building className="h-5 w-5 text-[#007AFF]" /> {unit.name || (formData.type === "Commercial" ? `Suite ${index + 1}` : `Unit ${index + 1}`)}
                      </h3>
                      {units.length > 1 && (
                        <button type="button" onClick={() => removeUnit(index)} className="text-[#EF4444] bg-[#FEE2E2] hover:bg-red-200 p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors">
                          <Trash2 className="h-4 w-4" /> Remove {formData.type === "Commercial" ? "Suite" : "Unit"}
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-[#1D1D1F]">{formData.type === "Commercial" ? "Suite Name / Number" : "Unit Name / Number"} <span className="text-red-500">*</span></label>
                        <Input required value={unit.name} onChange={(e) => handleUnitChange(index, "name", e.target.value)} placeholder={formData.type === "Commercial" ? "e.g. Suite 200" : "e.g. Apt 101"} className="h-10 rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#1D1D1F]">Type</label>
                        <select value={unit.type || (formData.type === "Commercial" ? "Retail" : "Apartment")} onChange={(e) => handleUnitChange(index, "type", e.target.value)} className="w-full h-10 bg-white border border-[#E5E5EA] rounded-xl px-3 text-sm outline-none">
                          {formData.type === "Commercial" ? (
                            <>
                              <option value="Retail">Retail</option>
                              <option value="Office">Office</option>
                              <option value="Industrial">Industrial</option>
                              <option value="Medical">Medical</option>
                            </>
                          ) : (
                            <>
                              <option value="Apartment">Apartment</option>
                              <option value="Studio">Studio</option>
                              <option value="Townhouse">Townhouse</option>
                              <option value="Loft">Loft</option>
                            </>
                          )}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#1D1D1F]">Status</label>
                        <select value={unit.status || "VACANT"} onChange={(e) => handleUnitChange(index, "status", e.target.value)} className="w-full h-10 bg-white border border-[#E5E5EA] rounded-xl px-3 text-sm outline-none">
                          <option value="VACANT">Vacant</option>
                          <option value="OCCUPIED">Occupied</option>
                          <option value="MAINTENANCE">Maintenance</option>
                        </select>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#1D1D1F]">Floor</label>
                        <Input type="number" value={unit.floor} onChange={(e) => handleUnitChange(index, "floor", e.target.value)} placeholder="1" className="h-10 rounded-xl" />
                      </div>
                      
                      {formData.type !== "Commercial" ? (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#1D1D1F]">Bedrooms</label>
                            <Input type="number" value={unit.rooms} onChange={(e) => handleUnitChange(index, "rooms", e.target.value)} placeholder="2" className="h-10 rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#1D1D1F]">Bathrooms</label>
                            <Input type="number" value={unit.bathrooms} onChange={(e) => handleUnitChange(index, "bathrooms", e.target.value)} placeholder="1" className="h-10 rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#1D1D1F]">Max Occupants</label>
                            <Input type="number" value={unit.maxOccupants} onChange={(e) => handleUnitChange(index, "maxOccupants", e.target.value)} placeholder="2" className="h-10 rounded-xl" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#1D1D1F]">Lease Structure</label>
                            <select value={unit.leaseStructure || "NNN"} onChange={(e) => handleUnitChange(index, "leaseStructure", e.target.value)} className="w-full h-10 bg-white border border-[#E5E5EA] rounded-xl px-3 text-sm outline-none font-semibold text-blue-600">
                              <option value="NNN">Triple Net (NNN)</option>
                              <option value="Gross">Full Service Gross</option>
                            </select>
                          </div>
                          {unit.leaseStructure !== "Gross" && (
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-[#1D1D1F]">Monthly CAM ($)</label>
                              <Input type="number" value={unit.camCharges || ""} onChange={(e) => handleUnitChange(index, "camCharges", e.target.value)} placeholder="250" className="h-10 rounded-xl" />
                            </div>
                          )}
                          <div className="md:col-span-1" />
                        </>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#1D1D1F]">Sq Footage</label>
                        <Input type="number" value={unit.sqFootage} onChange={(e) => handleUnitChange(index, "sqFootage", e.target.value)} placeholder="800" className="h-10 rounded-xl" />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-[#1D1D1F]">Monthly Rent ($) <span className="text-red-500">*</span></label>
                        <Input required type="number" value={unit.rentAmount} onChange={(e) => handleUnitChange(index, "rentAmount", e.target.value)} placeholder="1500" className="h-10 rounded-xl" />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-[#1D1D1F]">Security Deposit ($)</label>
                        <Input type="number" value={unit.depositAmt} onChange={(e) => handleUnitChange(index, "depositAmt", e.target.value)} placeholder="1500" className="h-10 rounded-xl" />
                      </div>
                    </div>

                    <div className="mt-6">
                      <label className="text-xs font-bold text-[#1D1D1F] mb-2 block">Unit Photos</label>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        id={`unit-upload-${index}`} 
                        className="hidden" 
                        onChange={(e) => handleUnitImagesUpload(index, e)} 
                      />
                      <div 
                        onClick={() => document.getElementById(`unit-upload-${index}`)?.click()}
                        className="border-2 border-dashed border-[#CBD5E1] rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-[#F2F2F7]/50 cursor-pointer"
                      >
                        <div className="h-10 w-10 bg-white shadow-sm border border-[#E5E5EA] text-[#94A3B8] rounded-full flex items-center justify-center mb-3">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-bold text-[#1D1D1F]">Upload photos for {unit.name || `Unit ${index + 1}`}</p>
                        <p className="text-xs text-[#6E6E73] mt-1">PNG, JPG up to 5MB</p>
                      </div>

                      {unit.images && unit.images.length > 0 && (
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4">
                          {unit.images.map((url: string) => (
                            <div key={url} className="group relative aspect-video rounded-lg overflow-hidden border border-[#E5E5EA] bg-slate-50">
                              <img src={url} alt="Unit" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeUnitImage(index, url); }}
                                  className="p-1 rounded-md bg-red-500 text-white hover:bg-red-650 shadow-sm"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Floating Actions Bar */}
          <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/85 backdrop-blur-md border-t border-[#E5E5EA] p-4 flex justify-end gap-3 z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
            <Link href={`/dashboard/properties/${id}`}>
              <Button type="button" variant="outline" className="h-11 px-6 rounded-xl font-bold text-[#1D1D1F] border-[#E5E5EA] shadow-sm hover:bg-[#F2F2F7]">Cancel</Button>
            </Link>
            <Button type="submit" disabled={loading} className="bg-[#007AFF] hover:bg-[#0062CC] text-white h-11 px-8 rounded-xl font-bold shadow-sm flex items-center gap-2">
              {loading ? "Saving..." : <><Save className="h-4 w-4" /> Save Changes</>}
            </Button>
          </div>
        </form>
      </PausedAccountGate>

      {/* Embedded Subscribe Modal */}
      {limitModalType === "subscription" ? (
        <EmbeddedSubscribeModal
          open={limitModalOpen}
          onOpenChange={setLimitModalOpen}
          pricingTiers={pricingTiers}
          currentTierId={pricingTier?.id}
          currentTierPrice={pricingTier?.price ? Number(pricingTier.price) : 0}
          title="One Step Away from Listing!"
          contextMessage={limitModalMessage}
          required={false}
          onSuccess={(newTierId) => handleUpgradeSuccess(newTierId)}
        />
      ) : null}

      {/* Plan Upgrade Modal (when hitting unit limits) */}
      <PlanUpgradeModal
        open={showUpgradeLimitModal}
        onOpenChange={setShowUpgradeLimitModal}
        pricingTiers={pricingTiers}
        currentTier={pricingTier}
        requestedUnits={requestedUnitsForUpgrade}
        onSuccess={(newTierId) => handleUpgradeSuccess(newTierId)}
      />

      {/* Bulk Unit Generator Modal Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-xl bg-white rounded-3xl p-0 border border-[#E5E5EA] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 shrink-0">
            <DialogTitle className="text-xl font-black text-[#1D1D1F] flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              Bulk Generate {formData.type === "Commercial" ? "Suites" : "Units"}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1D1D1F]">How many?</label>
                <Input type="number" value={bulkQty} onChange={(e) => setBulkQty(e.target.value)} placeholder="10" className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1D1D1F]">Prefix</label>
                <Input value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value)} placeholder="Apt " className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1D1D1F]">Start Number</label>
                <Input type="number" value={bulkStartNum} onChange={(e) => setBulkStartNum(e.target.value)} placeholder="101" className="h-10 rounded-xl" />
              </div>
            </div>

            <div className="bg-[#F2F2F7] rounded-2xl p-5 border border-slate-200 space-y-4">
              <p className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">Specifications for all new units</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1D1D1F]">Floor (Optional)</label>
                  <Input value={bulkFloor} onChange={(e) => setBulkFloor(e.target.value)} placeholder="e.g. 1" className="h-10 rounded-xl" />
                </div>

                {formData.type !== "Commercial" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1D1D1F]">Bedrooms</label>
                      <Input type="number" value={bulkBeds} onChange={(e) => setBulkBeds(e.target.value)} placeholder="2" className="h-10 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1D1D1F]">Bathrooms</label>
                      <Input type="number" value={bulkBaths} onChange={(e) => setBulkBaths(e.target.value)} placeholder="1" className="h-10 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1D1D1F]">Max Occupants</label>
                      <Input type="number" value={bulkMaxOccupants} onChange={(e) => setBulkMaxOccupants(e.target.value)} placeholder="2" className="h-10 rounded-xl" />
                    </div>
                  </>
                )}

                {formData.type === "Commercial" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1D1D1F]">Lease Structure</label>
                      <select value={bulkLeaseStructure} onChange={(e) => setBulkLeaseStructure(e.target.value)} className="w-full h-10 bg-white border border-[#E5E5EA] rounded-xl px-3 text-sm outline-none font-semibold text-blue-600">
                        <option value="NNN">Triple Net (NNN)</option>
                        <option value="Gross">Full Service Gross</option>
                      </select>
                    </div>
                    {bulkLeaseStructure === "NNN" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#1D1D1F]">Monthly CAM ($)</label>
                        <Input type="number" value={bulkCam} onChange={(e) => setBulkCam(e.target.value)} placeholder="500" className="h-10 rounded-xl" />
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1D1D1F]">Sq Footage</label>
                  <Input type="number" value={bulkSqft} onChange={(e) => setBulkSqft(e.target.value)} placeholder="800" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1D1D1F]">Default Rent</label>
                  <Input type="number" value={bulkRent} onChange={(e) => setBulkRent(e.target.value)} placeholder="1500" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1D1D1F]">Sec. Deposit</label>
                  <Input type="number" value={bulkDeposit} onChange={(e) => setBulkDeposit(e.target.value)} placeholder={bulkRent || "1500"} className="h-10 rounded-xl" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-[#8E8E93] mb-2 uppercase tracking-wider">Unit Photos (Applies to all generated units)</p>
              
              <div className="grid grid-cols-2 gap-3">
                {(() => {
                  let categories = [];
                  if (formData.type === "Apartment") {
                    categories = [
                      { id: "LIVING_AREA", label: "Living Area" },
                      { id: "KITCHEN", label: "Kitchen Area" },
                      { id: "BATHROOM", label: "Bathroom(s)" },
                      { id: "BEDROOM", label: "Bedroom(s)" }
                    ];
                  } else {
                    categories = [
                      { id: "FLOORPLAN", label: "Floorplan" },
                      { id: "INTERIOR", label: "Interior Space" }
                    ];
                  }

                  return categories.map((cat) => {
                    const catImages = bulkImages.filter(url => url.includes(`#category=${cat.id}`));
                    const hasImages = catImages.length > 0;

                    return (
                      <div key={cat.id} className="relative">
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*" 
                          id={`bulk-upload-${cat.id}`}
                          className="hidden" 
                          onChange={(e) => handleBulkImagesUpload(e, cat.id)} 
                        />
                        <div 
                          onClick={() => document.getElementById(`bulk-upload-${cat.id}`)?.click()}
                          className={`h-full border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                            hasImages 
                            ? "border-[#007AFF] bg-[#EFF6FF] hover:bg-[#DBEAFE]" 
                            : "border-[#E5E5EA] bg-[#F2F2F7] hover:bg-white"
                          }`}
                        >
                          {uploadingBulkImages ? (
                             <Loader2 className="h-5 w-5 animate-spin text-[#007AFF] mb-1" />
                          ) : hasImages ? (
                            <div className="h-6 w-6 bg-[#007AFF] text-white rounded-full flex items-center justify-center mb-1 shadow-sm">
                              <span className="font-bold text-xs">✓</span>
                            </div>
                          ) : (
                            <div className="h-6 w-6 bg-white shadow-sm border border-[#E5E5EA] text-[#94A3B8] rounded-full flex items-center justify-center mb-1">
                              <ImageIcon className="h-3 w-3" />
                            </div>
                          )}
                          <h3 className={`text-xs font-bold ${hasImages ? "text-[#004C99]" : "text-[#1D1D1F]"}`}>
                            {cat.label}
                          </h3>
                          
                          {hasImages && (
                            <div className="flex gap-1 mt-2">
                              {catImages.slice(0, 3).map((url, i) => (
                                <div key={i} className="h-6 w-6 rounded-md overflow-hidden border border-[#007AFF]/30 bg-white group relative">
                                  <img src={url} className="h-full w-full object-cover" alt="" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" onClick={(e) => { e.stopPropagation(); removeBulkImage(url); }}>
                                    <Trash2 className="h-2 w-2 text-white" />
                                  </div>
                                </div>
                              ))}
                              {catImages.length > 3 && (
                                <div className="h-6 w-6 rounded-md bg-[#007AFF]/20 text-[#004C99] flex items-center justify-center text-[8px] font-bold">
                                  +{catImages.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              
              {bulkImages.length === 0 && (
                <div className="mt-3 flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                  <input 
                    type="checkbox" 
                    id="clone-images" 
                    checked={bulkCloneImages} 
                    onChange={(e) => setBulkCloneImages(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1D1D1F] focus:ring-[#1D1D1F] border-gray-300 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="clone-images" className="text-xs font-bold text-[#1D1D1F] cursor-pointer">Or fallback to clone from Unit 1</label>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <p className="text-xs font-medium text-blue-600 flex items-center gap-2 bg-blue-50 p-2.5 rounded-xl w-full">
                <span className="font-bold text-blue-700">Preview:</span> 
                {Number(bulkQty) > 0 && bulkStartNum ? (
                  `Generates "${bulkPrefix}${bulkStartNum}" to "${bulkPrefix}${Number(bulkStartNum) + Number(bulkQty) - 1}"`
                ) : "Enter a valid quantity and start number"}
              </p>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 rounded-b-3xl">
            <Button variant="ghost" onClick={() => setBulkDialogOpen(false)} className="h-10 font-bold rounded-xl text-[#6E6E73]">Cancel</Button>
            <Button onClick={handleBulkGenerate} className="bg-[#1D1D1F] hover:bg-[#1E293B] text-white h-10 font-bold rounded-xl px-6">Generate {bulkQty} Units</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
