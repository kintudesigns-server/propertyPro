"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, UploadCloud, Plus, Trash2, Building, ImageIcon, Loader2, Layers, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import EmbeddedSubscribeModal from "@/components/subscription/EmbeddedSubscribeModal";

// Helper for generic debouncing
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitModalMessage, setLimitModalMessage] = useState("");
  const [limitModalType, setLimitModalType] = useState<"limit" | "subscription">("limit");
  
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

  const [units, setUnits] = useState<any[]>([{ name: "Unit 1", type: "Apartment", floor: "", rooms: "", bathrooms: "", sqFootage: "", maxOccupants: "2", rentAmount: "", depositAmt: "", status: "VACANT", leaseStructure: "NNN", camCharges: "", images: [] as string[] }]);
  
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

  // Check subscription status on mount
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const userRes = await fetch("/api/users");
        if (userRes.ok) {
          const userData = await userRes.json();
          const status = userData.subscriptionStatus?.toLowerCase();
          if (!status || status !== "active") {
            setLimitModalType("subscription");
            setLimitModalMessage("You need an active subscription to list properties. Choose a plan below to get started.");
            setLimitModalOpen(true);
          }
        }
      } catch (e) {
        console.error("Subscription check failed:", e);
      }
    };
    checkSubscription();
  }, []);

  // Draft detection
  useEffect(() => {
    const draft = localStorage.getItem("propertyPro_draft");
    if (draft && !draftRestored) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.formData?.name || parsed.formData?.address) {
          setHasDraft(true);
        }
      } catch(e) {}
    }
  }, []);

  const restoreDraft = () => {
    const draft = localStorage.getItem("propertyPro_draft");
    if (draft) {
      const parsed = JSON.parse(draft);
      if (parsed.formData) setFormData(parsed.formData);
      if (parsed.units) setUnits(parsed.units);
      toast.success("Draft restored successfully!");
    }
    setHasDraft(false);
    setDraftRestored(true);
  };

  const discardDraft = () => {
    localStorage.removeItem("propertyPro_draft");
    setHasDraft(false);
    setDraftRestored(true);
  };

  // Auto-Save Draft
  const debouncedFormData = useDebounce(formData, 3000);
  const debouncedUnits = useDebounce(units, 3000);

  useEffect(() => {
    // Only auto-save if they've either restored/discarded the draft (hasDraft is false)
    // or if they never had a draft in the first place.
    if (!hasDraft) {
       // Only save if they've started typing something meaningful
       if (debouncedFormData.name || debouncedFormData.address || debouncedFormData.images?.length > 0) {
          localStorage.setItem("propertyPro_draft", JSON.stringify({ formData: debouncedFormData, units: debouncedUnits }));
       }
    }
  }, [debouncedFormData, debouncedUnits, draftRestored, hasDraft]);

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

  // Image uploads omitted for brevity, kept exactly as they were in original file
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
  const setCoverPhoto = (url: string) => { setFormData(prev => ({ ...prev, coverPhoto: url })); toast.success("Cover updated!"); };

  const handleUnitImagesUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>, category: string = "UNIT_INTERIOR") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    toast.loading("Uploading...", { id: `unit-${index}` });
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = new FormData(); f.append("file", files[i]);
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
      const formDataObj = new FormData(); formDataObj.append("file", files[i]);
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
        depositAmt: bulkDeposit || bulkRent, // Smart default match
        status: "VACANT",
        leaseStructure: formData.type === "Commercial" ? bulkLeaseStructure : undefined,
        camCharges: (formData.type === "Commercial" && bulkLeaseStructure === "NNN") ? bulkCam : undefined,
        images: bulkImages.length > 0 ? [...bulkImages] : ((bulkCloneImages && units[0]?.images) ? [...units[0].images] : [])
      });
    }
    
    // Check if we just have 1 empty default unit, replace it
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
    setLoading(true);

    try {
      let finalUnits = units;

      if (formData.type === "House") {
        // Silently map the top level fields into a single "Main House" unit
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
        // Commercial payload mapping
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

      const payload = {
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        localStorage.removeItem("propertyPro_draft"); // Cleanup Draft
        toast.success("Property created successfully!");
        router.push("/dashboard/properties");
      } else {
        const err = await res.json();
        if (err.error === "LIMIT_REACHED") {
          setLimitModalType("limit");
          setLimitModalMessage(err.message || "You have reached your tier unit limit.");
          setLimitModalOpen(true);
        } else if (res.status === 403 && (err.code === "NO_SUBSCRIPTION" || err.error?.toLowerCase().includes("subscription"))) {
          // Save draft to sessionStorage so it survives the checkout redirect
          sessionStorage.setItem("pp_pending_property_draft", JSON.stringify(payload));
          setLimitModalType("subscription");
          setLimitModalMessage("A subscription is required to list properties. Your details have been saved — choose a plan and your property will be created automatically after checkout.");
          setLimitModalOpen(true);
        } else {
          toast.error(err.error || "Failed to create property");
        }
      }
    } catch (err) {
      toast.error("An error occurred while creating the property.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto pt-6 space-y-6 pb-24 px-2 sm:px-0">
      
      {/* Draft Banner */}
      {hasDraft && !draftRestored && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm mb-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="font-bold text-amber-900 text-sm">Unsaved Draft Found</p>
              <p className="text-xs text-amber-700">We found an unsaved property from a previous session.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={discardDraft} variant="ghost" className="h-8 text-xs font-bold text-amber-700 hover:bg-amber-100 hover:text-amber-900">Discard</Button>
            <Button onClick={restoreDraft} className="h-8 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm">Restore Draft</Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/properties">
          <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl bg-white border border-[#E2E8F0] shadow-sm text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Add Property</h1>
          <p className="text-[#64748B] text-sm font-medium mt-1">Create a new property and manage its units.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* General Info */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-[#0F172A] text-lg">General Information</h2>
              <p className="text-sm text-[#64748B]">Basic details about this property.</p>
            </div>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Property Type</label>
                <select name="type" value={formData.type} onChange={handleChange} className="w-full h-11 bg-slate-50 border border-[#E2E8F0] rounded-xl px-4 text-sm font-bold text-[#0F172A] outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer">
                  <option value="Apartment">Apartment Complex</option>
                  <option value="House">Single Family House</option>
                  <option value="Commercial">Commercial Building</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Property Name <span className="text-red-500">*</span></label>
                <Input required name="name" value={formData.name} onChange={handleChange} placeholder={formData.type === "House" ? "e.g. 123 Sunset Villa" : "e.g. Grand Horizon Towers"} className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Year Built (Optional)</label>
                <Input name="yearBuilt" type="number" value={formData.yearBuilt} onChange={handleChange} placeholder="e.g. 2015" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
              
              {formData.type === "Commercial" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#0F172A]">Zoning Type (Optional)</label>
                    <div className="flex gap-2">
                      <select name="zoningType" value={formData.zoningType} onChange={handleChange} className="flex-1 h-11 bg-white border border-[#E2E8F0] rounded-xl px-4 text-sm font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer">
                        <option value="">Select a zoning type...</option>
                        <option value="Retail & Commercial">Retail & Commercial (Shops, Restaurants)</option>
                        <option value="Light Industrial">Light Industrial (Warehouse, Auto)</option>
                        <option value="Heavy Industrial">Heavy Industrial (Manufacturing)</option>
                        <option value="Office / Professional">Office / Professional</option>
                        <option value="Mixed-Use">Mixed-Use (Retail & Residential)</option>
                        <option value="Other">Other (Custom Code)</option>
                      </select>
                      {formData.zoningType === "Other" && (
                        <Input value={customZoning} onChange={(e) => setCustomZoning(e.target.value)} placeholder="e.g. C-1" className="w-1/3 h-11 rounded-xl bg-white border-[#E2E8F0]" />
                      )}
                    </div>
                    <p className="text-[10px] text-[#64748B] font-medium leading-tight">Indicates what types of businesses are legally permitted to operate here.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#0F172A]">Total Parking Spaces (Optional)</label>
                    <Input name="parkingSpaces" type="number" value={formData.parkingSpaces} onChange={handleChange} placeholder="e.g. 50" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
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
                    <label className="text-xs font-bold text-[#0F172A]">Monthly Rent ($) <span className="text-red-500">*</span></label>
                    <Input required name="houseRent" type="number" value={formData.houseRent} onChange={handleChange} placeholder="2500" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-[#0F172A]">Security Deposit ($)</label>
                    <Input name="houseDeposit" type="number" value={formData.houseDeposit} onChange={handleChange} placeholder="2500" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A]">Bedrooms <span className="text-red-500">*</span></label>
                    <Input required name="houseRooms" type="number" value={formData.houseRooms} onChange={handleChange} placeholder="3" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A]">Bathrooms <span className="text-red-500">*</span></label>
                    <Input required name="houseBaths" type="number" value={formData.houseBaths} onChange={handleChange} placeholder="2" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A]">Sq Footage <span className="text-red-500">*</span></label>
                    <Input required name="houseSqft" type="number" value={formData.houseSqft} onChange={handleChange} placeholder="2000" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A]">Max Occupants</label>
                    <Input name="houseOccupants" type="number" value={formData.houseOccupants} onChange={handleChange} placeholder="5" className="h-11 rounded-xl" />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0F172A]">Description</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                rows={4}
                placeholder="Write a detailed description of the property..." 
                className="w-full bg-white border border-[#E2E8F0] rounded-xl p-4 text-sm text-[#0F172A] outline-none focus:ring-2 focus:ring-[#3B82F6] resize-y" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50">
            <h2 className="font-bold text-[#0F172A] text-lg">Address Information</h2>
            <p className="text-sm text-[#64748B]">Where is this property located?</p>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2 relative" onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}>
              <label className="text-sm font-bold text-[#0F172A]">Street Address <span className="text-red-500">*</span></label>
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
                  className="h-11 rounded-xl bg-white border-[#E2E8F0] pr-10" 
                />
                {searchingAddress && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#94A3B8]" />
                  </div>
                )}
              </div>
              
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                  {suggestions.map((s, index) => (
                    <button
                      key={`${s.place_id}-${index}`}
                      type="button"
                      onMouseDown={() => selectSuggestion(s)}
                      onClick={() => selectSuggestion(s)}
                      className="w-full text-left px-4 py-3 hover:bg-[#F8FAFC] transition-colors border-b border-[#F1F5F9] last:border-b-0 flex flex-col gap-0.5"
                    >
                      <span className="font-semibold text-sm text-[#0F172A]">{s.display_name}</span>
                      {s.address && (
                        <span className="text-xs text-[#64748B]">
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
                <label className="text-sm font-bold text-[#0F172A]">City <span className="text-red-500">*</span></label>
                <Input required name="city" value={formData.city} onChange={handleChange} placeholder="e.g. London" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">State / Province</label>
                <Input name="state" value={formData.state} onChange={handleChange} placeholder="e.g. NY" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">ZIP / Postal Code</label>
                <Input name="zip" value={formData.zip} onChange={handleChange} placeholder="e.g. 10001" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Country <span className="text-red-500">*</span></label>
                <Input required name="country" value={formData.country} onChange={handleChange} placeholder="e.g. UK" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Images Upload Area */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50">
            <h2 className="font-bold text-[#0F172A] text-lg">Property Images</h2>
            <p className="text-sm text-[#64748B]">Categorize and upload high-quality images to showcase your property.</p>
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
                          : "border-[#CBD5E1] bg-white hover:bg-[#F8FAFC]"
                        }`}
                      >
                        {uploadingPropertyImages ? (
                          <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6] mb-3" />
                        ) : hasImages ? (
                          <div className="h-10 w-10 bg-[#22C55E] text-white rounded-full flex items-center justify-center mb-3">
                            <span className="font-bold text-lg">✓</span>
                          </div>
                        ) : (
                          <UploadCloud className="h-8 w-8 text-[#94A3B8] mb-3" />
                        )}
                        <h3 className={`text-sm font-bold ${hasImages ? "text-[#166534]" : "text-[#0F172A]"}`}>
                          {cat.label}
                        </h3>
                        {!hasImages && <p className="text-xs text-[#64748B] mt-1">Click to upload</p>}
                        
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
                    <div key={url} className="group relative aspect-video rounded-xl overflow-hidden border border-[#E2E8F0] shadow-sm bg-slate-100">
                      <img src={url} alt="Property" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setCoverPhoto(url); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${isCover ? "bg-[#22C55E] text-white" : "bg-white text-[#0F172A] hover:bg-slate-50"}`}>{isCover ? "Cover" : "Set Cover"}</button>
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
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50">
            <h2 className="font-bold text-[#0F172A] text-lg flex items-center gap-2">
              <div className="bg-[#EFF6FF] text-[#3B82F6] p-1.5 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
              </div>
              {formData.type === "Commercial" ? "Commercial Features" : "Amenities & Features"}
            </h2>
            <p className="text-sm text-[#64748B] mt-1">Select the core amenities that best describe this property.</p>
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
                      isSelected ? "border-[#3B82F6] bg-[#EFF6FF] text-[#0F172A]" : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? "border-[#3B82F6]" : "border-[#CBD5E1]"}`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />}
                    </div>
                    {amenity}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 p-5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <label className="text-sm font-bold text-[#0F172A] mb-2 block">Add custom amenity or feature</label>
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
                  className="h-11 rounded-xl bg-white border-[#E2E8F0] flex-1 max-w-sm" 
                />
                <Button 
                  type="button" 
                  onClick={() => {
                    if (customAmenity.trim() && !formData.amenities.includes(customAmenity.trim())) {
                      setFormData(p => ({ ...p, amenities: [...p.amenities, customAmenity.trim()] }));
                      setCustomAmenity("");
                    }
                  }}
                  className="h-11 w-11 p-0 rounded-xl bg-white border border-[#E2E8F0] text-[#3B82F6] shadow-sm hover:bg-[#F8FAFC]"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              {formData.amenities.filter(a => !getPredefinedAmenities().includes(a)).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {formData.amenities.filter(a => !getPredefinedAmenities().includes(a)).map(amenity => (
                    <div key={amenity} className="flex items-center gap-2 px-3 py-1.5 bg-[#EFF6FF] text-[#3B82F6] text-sm font-semibold rounded-lg">
                      {amenity}
                      <button type="button" onClick={() => toggleAmenity(amenity)} className="text-[#3B82F6] hover:text-[#1D4ED8]">
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* HIDE Smart Unit Management if Single Family House */}
        {formData.type !== "House" && (
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h2 className="font-bold text-[#0F172A] text-lg">
                  {formData.type === "Commercial" ? "Suite Management" : "Smart Unit Management"}
                </h2>
                <p className="text-sm text-[#64748B]">Add the initial {formData.type === "Commercial" ? "suites" : "units"} for this property.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {formData.type !== "House" && (
                  <Button type="button" onClick={() => setBulkDialogOpen(true)} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 h-10 px-4 rounded-xl font-bold shadow-sm flex items-center gap-2 border border-emerald-200">
                    <Layers className="h-4 w-4" /> Bulk Add {formData.type === "Commercial" ? "Suites" : "Units"}
                  </Button>
                )}
                <Button type="button" onClick={addUnit} className="bg-[#EFF6FF] text-[#3B82F6] hover:bg-[#DBEAFE] h-10 px-4 rounded-xl font-bold shadow-sm flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add {formData.type === "Commercial" ? "Suite" : "Unit"}
                </Button>
              </div>
            </div>
            <CardContent className="p-0">
              {units.map((unit, index) => (
                <div key={index} className="p-6 border-b border-[#E2E8F0] last:border-b-0 bg-white hover:bg-[#F8FAFC]/30 transition-colors">
                  <div className="flex justify-between items-center mb-5 pb-4 border-b border-[#F1F5F9]">
                    <h3 className="font-bold text-[#0F172A] flex items-center gap-2 text-lg">
                      <Building className="h-5 w-5 text-[#3B82F6]" /> {unit.name || (formData.type === "Commercial" ? `Suite ${index + 1}` : `Unit ${index + 1}`)}
                    </h3>
                    {units.length > 1 && (
                      <button type="button" onClick={() => removeUnit(index)} className="text-[#EF4444] bg-[#FEE2E2] hover:bg-red-200 p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors">
                        <Trash2 className="h-4 w-4" /> Remove {formData.type === "Commercial" ? "Suite" : "Unit"}
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-[#0F172A]">{formData.type === "Commercial" ? "Suite Name / Number" : "Unit Name / Number"} <span className="text-red-500">*</span></label>
                      <Input required value={unit.name} onChange={(e) => handleUnitChange(index, "name", e.target.value)} placeholder={formData.type === "Commercial" ? "e.g. Suite 200" : "e.g. Apt 101"} className="h-10 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0F172A]">Type</label>
                      <select value={unit.type || (formData.type === "Commercial" ? "Retail" : "Apartment")} onChange={(e) => handleUnitChange(index, "type", e.target.value)} className="w-full h-10 bg-white border border-[#E2E8F0] rounded-xl px-3 text-sm outline-none">
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
                          </>
                        )}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0F172A]">Status</label>
                      <select value={unit.status || "VACANT"} onChange={(e) => handleUnitChange(index, "status", e.target.value)} className="w-full h-10 bg-white border border-[#E2E8F0] rounded-xl px-3 text-sm outline-none">
                        <option value="VACANT">Vacant</option>
                        <option value="OCCUPIED">Occupied</option>
                        <option value="MAINTENANCE">Maintenance</option>
                      </select>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0F172A]">Floor</label>
                      <Input type="number" value={unit.floor} onChange={(e) => handleUnitChange(index, "floor", e.target.value)} placeholder="e.g. 1" className="h-10 rounded-xl" />
                    </div>
                    
                    {formData.type !== "Commercial" && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[#0F172A]">Bedrooms <span className="text-red-500">*</span></label>
                          <Input required type="number" value={unit.rooms} onChange={(e) => handleUnitChange(index, "rooms", e.target.value)} placeholder="2" className="h-10 rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[#0F172A]">Bathrooms <span className="text-red-500">*</span></label>
                          <Input required type="number" value={unit.bathrooms} onChange={(e) => handleUnitChange(index, "bathrooms", e.target.value)} placeholder="1" className="h-10 rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[#0F172A]">Max Occupants</label>
                          <Input type="number" value={unit.maxOccupants} onChange={(e) => handleUnitChange(index, "maxOccupants", e.target.value)} placeholder="2" className="h-10 rounded-xl" />
                        </div>
                      </>
                    )}

                    {formData.type === "Commercial" && (
                      <>
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-xs font-bold text-[#0F172A]">Lease Structure <span className="text-red-500">*</span></label>
                          <select value={unit.leaseStructure || "NNN"} onChange={(e) => handleUnitChange(index, "leaseStructure", e.target.value)} className="w-full h-10 bg-white border border-[#E2E8F0] rounded-xl px-3 text-sm outline-none font-semibold text-blue-600">
                            <option value="NNN">Triple Net (NNN)</option>
                            <option value="Gross">Full Service Gross</option>
                          </select>
                        </div>
                        {unit.leaseStructure === "NNN" && (
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-[#0F172A]">Est. Monthly CAM ($)</label>
                            <Input type="number" value={unit.camCharges} onChange={(e) => handleUnitChange(index, "camCharges", e.target.value)} placeholder="500" className="h-10 rounded-xl" />
                          </div>
                        )}
                      </>
                    )}

                    <div className={`space-y-1.5 ${formData.type === "Commercial" && unit.leaseStructure === "NNN" ? "md:col-span-4" : (formData.type === "Commercial" ? "md:col-span-2" : "")}`}>
                      <label className="text-xs font-bold text-[#0F172A]">Square Footage <span className="text-red-500">*</span></label>
                      <Input required type="number" value={unit.sqFootage} onChange={(e) => handleUnitChange(index, "sqFootage", e.target.value)} placeholder="800" className="h-10 rounded-xl" />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-[#0F172A]">Monthly Rent ($) <span className="text-red-500">*</span></label>
                      <Input required type="number" value={unit.rentAmount} onChange={(e) => handleUnitChange(index, "rentAmount", e.target.value)} placeholder="1500" className="h-10 rounded-xl" />
                      {formData.type === "Commercial" && unit.rentAmount && unit.sqFootage && (
                        <p className="text-[10px] font-semibold text-blue-600 mt-1 pl-1">
                          (${( (Number(unit.rentAmount) * 12) / Number(unit.sqFootage) ).toFixed(2)} / sqft / yr)
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-[#0F172A]">Security Deposit ($)</label>
                      <Input type="number" value={unit.depositAmt} onChange={(e) => handleUnitChange(index, "depositAmt", e.target.value)} placeholder="1500" className="h-10 rounded-xl" />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="text-sm font-bold text-[#0F172A] mb-2 block">{formData.type === "Commercial" ? "Suite" : "Unit"} Images</label>
                    <p className="text-xs text-[#64748B] mb-4">Upload layout and interior photos for this specific unit.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                          const catImages = (unit.images || []).filter((url: string) => url.includes(`#category=${cat.id}`));
                          const hasImages = catImages.length > 0;

                          return (
                            <div key={cat.id} className="relative">
                              <input 
                                type="file" 
                                multiple 
                                accept="image/*" 
                                id={`unit-images-input-${index}-${cat.id}`} 
                                className="hidden" 
                                onChange={(e) => handleUnitImagesUpload(index, e, cat.id)} 
                              />
                              <div 
                                onClick={() => document.getElementById(`unit-images-input-${index}-${cat.id}`)?.click()}
                                className={`h-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                                  hasImages 
                                  ? "border-[#3B82F6] bg-[#EFF6FF] hover:bg-[#DBEAFE]" 
                                  : "border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white"
                                }`}
                              >
                                {hasImages ? (
                                  <div className="h-10 w-10 bg-[#3B82F6] text-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                                    <span className="font-bold text-lg">✓</span>
                                  </div>
                                ) : (
                                  <div className="h-10 w-10 bg-white shadow-sm border border-[#E2E8F0] text-[#94A3B8] rounded-full flex items-center justify-center mb-3">
                                    <ImageIcon className="h-5 w-5" />
                                  </div>
                                )}
                                <h3 className={`text-sm font-bold ${hasImages ? "text-[#1E40AF]" : "text-[#0F172A]"}`}>
                                  {cat.label}
                                </h3>
                                {!hasImages && <p className="text-xs text-[#64748B] mt-1">Click to upload</p>}
                                
                                {hasImages && (
                                  <div className="flex gap-1 mt-3">
                                    {catImages.slice(0, 3).map((url: string, i: number) => (
                                      <div key={i} className="h-8 w-8 rounded-md overflow-hidden border border-[#3B82F6]/30 bg-white group relative">
                                        <img src={url} className="h-full w-full object-cover" alt="" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" onClick={(e) => { e.stopPropagation(); removeUnitImage(index, url); }}>
                                          <Trash2 className="h-3 w-3 text-white" />
                                        </div>
                                      </div>
                                    ))}
                                    {catImages.length > 3 && (
                                      <div className="h-8 w-8 rounded-md bg-[#3B82F6]/20 text-[#1E40AF] flex items-center justify-center text-[10px] font-bold">
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

                    {/* Uncategorized / Legacy Images Fallback */}
                    {unit.images && unit.images.filter((url: string) => !url.includes("#category=")).length > 0 && (
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4 pt-4 border-t border-[#E2E8F0]">
                        {unit.images.filter((url: string) => !url.includes("#category=")).map((url: string) => (
                          <div key={url} className="group relative aspect-video rounded-lg overflow-hidden border border-[#E2E8F0] bg-slate-50">
                            <img src={url} alt="Unit" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button type="button" onClick={(e) => { e.stopPropagation(); removeUnitImage(index, url); }} className="p-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"><Trash2 className="h-3 w-3" /></button>
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

        {/* Floating Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/80 backdrop-blur-md border-t border-[#E2E8F0] p-4 flex justify-end gap-3 z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
          <Link href="/dashboard/properties">
            <Button type="button" variant="outline" className="h-11 px-6 rounded-xl font-bold text-[#0F172A] border-[#E2E8F0] shadow-sm hover:bg-[#F8FAFC]">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading} className="bg-[#3B82F6] hover:bg-[#2563EB] text-white h-11 px-8 rounded-xl font-bold shadow-sm flex items-center gap-2">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {loading ? "Saving..." : "Create Property"}
          </Button>
        </div>
      </form>

      {/* Embedded Subscribe Modal */}
      {limitModalType === "subscription" ? (
        <EmbeddedSubscribeModal
          open={limitModalOpen}
          onOpenChange={setLimitModalOpen}
          pricingTiers={[]}
          title="One Step Away from Listing!"
          contextMessage={limitModalMessage}
          onSuccess={async () => {
            setLimitModalOpen(false);
            toast.success("Subscription activated! Saving your property...", { duration: 4000 });
            // Try to auto-submit the form if there's data
            const draft = sessionStorage.getItem("pp_pending_property_draft");
            if (draft) {
              try {
                const draftData = JSON.parse(draft);
                sessionStorage.removeItem("pp_pending_property_draft");
                const res = await fetch("/api/properties", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(draftData),
                });
                if (res.ok) {
                  toast.success(`🎉 Property "${draftData.name || "New Property"}" created successfully!`, { duration: 5000 });
                  router.push("/dashboard/properties");
                } else {
                  toast.info("Property data saved. You can now create your property.");
                }
              } catch {
                toast.info("Subscription active! You can now create your property.");
              }
            } else {
              toast.success("Subscription active! You can now add your property.");
            }
          }}
        />
      ) : (
        // Plan limit modal (user has subscription but hit unit cap)
        <Dialog open={limitModalOpen} onOpenChange={setLimitModalOpen}>
          <DialogContent className="sm:max-w-md p-8 bg-white rounded-3xl border-0 shadow-2xl">
            <DialogHeader>
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Layers className="h-8 w-8" />
              </div>
              <DialogTitle className="text-center text-xl font-black text-slate-900 tracking-tight">Plan Limit Reached</DialogTitle>
            </DialogHeader>
            <div className="text-center text-slate-600 font-medium my-4">{limitModalMessage}</div>
            <DialogFooter className="flex-col sm:flex-col gap-3 mt-2 border-t border-slate-100 pt-4">
              <Button
                onClick={() => setLimitModalType("subscription")}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md"
              >
                Upgrade Plan
              </Button>
              <Button onClick={() => setLimitModalOpen(false)} variant="ghost" className="w-full h-12 rounded-xl font-bold text-slate-500">
                Continue Editing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-md bg-white border-[#E2E8F0] rounded-3xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2"><Layers className="h-5 w-5 text-emerald-500"/> Bulk Generate Units</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0F172A]">Quantity to Create</label>
                <Input type="number" value={bulkQty} onChange={(e) => setBulkQty(e.target.value)} placeholder="10" className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0F172A]">Starting Number</label>
                <Input type="number" value={bulkStartNum} onChange={(e) => setBulkStartNum(e.target.value)} placeholder="101" className="h-10 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0F172A]">Prefix (Optional)</label>
                <Input value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value)} placeholder="e.g. Apt " className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0F172A]">Floor Assignment</label>
                <Input type="number" value={bulkFloor} onChange={(e) => setBulkFloor(e.target.value)} placeholder="e.g. 1" className="h-10 rounded-xl" />
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Base Template Settings</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                
                {formData.type !== "Commercial" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0F172A]">Bedrooms</label>
                      <Input type="number" value={bulkBeds} onChange={(e) => setBulkBeds(e.target.value)} placeholder="2" className="h-10 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0F172A]">Bathrooms</label>
                      <Input type="number" value={bulkBaths} onChange={(e) => setBulkBaths(e.target.value)} placeholder="1" className="h-10 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0F172A]">Max Occupants</label>
                      <Input type="number" value={bulkMaxOccupants} onChange={(e) => setBulkMaxOccupants(e.target.value)} placeholder="2" className="h-10 rounded-xl" />
                    </div>
                  </>
                )}

                {formData.type === "Commercial" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0F172A]">Lease Structure</label>
                      <select value={bulkLeaseStructure} onChange={(e) => setBulkLeaseStructure(e.target.value)} className="w-full h-10 bg-white border border-[#E2E8F0] rounded-xl px-3 text-sm outline-none font-semibold text-blue-600">
                        <option value="NNN">Triple Net (NNN)</option>
                        <option value="Gross">Full Service Gross</option>
                      </select>
                    </div>
                    {bulkLeaseStructure === "NNN" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#0F172A]">Monthly CAM ($)</label>
                        <Input type="number" value={bulkCam} onChange={(e) => setBulkCam(e.target.value)} placeholder="500" className="h-10 rounded-xl" />
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A]">Sq Footage</label>
                  <Input type="number" value={bulkSqft} onChange={(e) => setBulkSqft(e.target.value)} placeholder="800" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A]">Default Rent</label>
                  <Input type="number" value={bulkRent} onChange={(e) => setBulkRent(e.target.value)} placeholder="1500" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A]">Sec. Deposit</label>
                  <Input type="number" value={bulkDeposit} onChange={(e) => setBulkDeposit(e.target.value)} placeholder={bulkRent || "1500"} className="h-10 rounded-xl" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Unit Photos (Applies to all generated units)</p>
              
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
                            ? "border-[#3B82F6] bg-[#EFF6FF] hover:bg-[#DBEAFE]" 
                            : "border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white"
                          }`}
                        >
                          {uploadingBulkImages ? (
                             <Loader2 className="h-5 w-5 animate-spin text-[#3B82F6] mb-1" />
                          ) : hasImages ? (
                            <div className="h-6 w-6 bg-[#3B82F6] text-white rounded-full flex items-center justify-center mb-1 shadow-sm">
                              <span className="font-bold text-xs">✓</span>
                            </div>
                          ) : (
                            <div className="h-6 w-6 bg-white shadow-sm border border-[#E2E8F0] text-[#94A3B8] rounded-full flex items-center justify-center mb-1">
                              <ImageIcon className="h-3 w-3" />
                            </div>
                          )}
                          <h3 className={`text-xs font-bold ${hasImages ? "text-[#1E40AF]" : "text-[#0F172A]"}`}>
                            {cat.label}
                          </h3>
                          
                          {hasImages && (
                            <div className="flex gap-1 mt-2">
                              {catImages.slice(0, 3).map((url, i) => (
                                <div key={i} className="h-6 w-6 rounded-md overflow-hidden border border-[#3B82F6]/30 bg-white group relative">
                                  <img src={url} className="h-full w-full object-cover" alt="" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" onClick={(e) => { e.stopPropagation(); removeBulkImage(url); }}>
                                    <Trash2 className="h-2 w-2 text-white" />
                                  </div>
                                </div>
                              ))}
                              {catImages.length > 3 && (
                                <div className="h-6 w-6 rounded-md bg-[#3B82F6]/20 text-[#1E40AF] flex items-center justify-center text-[8px] font-bold">
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
                    className="w-4 h-4 rounded text-[#0F172A] focus:ring-[#0F172A] border-gray-300 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="clone-images" className="text-xs font-bold text-[#0F172A] cursor-pointer">Or fallback to clone from Unit 1</label>
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
          </div>
          <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 rounded-b-3xl">
            <Button variant="ghost" onClick={() => setBulkDialogOpen(false)} className="h-10 font-bold rounded-xl text-slate-500">Cancel</Button>
            <Button onClick={handleBulkGenerate} className="bg-[#0F172A] hover:bg-[#1E293B] text-white h-10 font-bold rounded-xl px-6">Generate {bulkQty} Units</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function XIcon(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
  );
}
