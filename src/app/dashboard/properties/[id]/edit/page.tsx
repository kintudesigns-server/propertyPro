"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, UploadCloud, Plus, Trash2, Building, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EditPropertyPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "Apartment",
    status: "AVAILABLE",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    description: "",
    yearBuilt: "",
    coverPhoto: "",
    images: [] as string[],
    amenities: [] as string[],
  });

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
          toast.error("LocationIQ Error: NEXT_PUBLIC_LOCATIONIQ_TOKEN is not configured in .env file.");
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }
        const res = await fetch(`https://api.locationiq.com/v1/autocomplete?key=${token}&q=${encodeURIComponent(value)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(Array.isArray(data) ? data : []);
          setShowSuggestions(true);
        } else if (res.status === 401 || res.status === 403) {
          toast.error("LocationIQ Error: Invalid or unauthorized API key. Check NEXT_PUBLIC_LOCATIONIQ_TOKEN in your .env file.");
          setSuggestions([]);
          setShowSuggestions(false);
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

    const cityVal = addr.city || addr.town || addr.village || addr.suburb || "";
    const stateVal = addr.state || addr.state_district || addr.county || "";
    const zipVal = addr.postcode || "";
    const countryVal = addr.country || "";

    setFormData(prev => ({
      ...prev,
      address: streetAddress,
      city: cityVal,
      state: stateVal,
      zip: zipVal,
      country: countryVal,
    }));

    setSuggestions([]);
    setShowSuggestions(false);
  };

  const [uploadingPropertyImages, setUploadingPropertyImages] = useState(false);

  const handlePropertyImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPropertyImages(true);
    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formDataObj = new FormData();
      formDataObj.append("file", file);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formDataObj,
        });

        if (res.ok) {
          const data = await res.json();
          newUrls.push(data.url);
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      } catch (err) {
        console.error("Upload error:", err);
        toast.error(`Error uploading ${file.name}`);
      }
    }

    if (newUrls.length > 0) {
      setFormData(prev => {
        const updatedImages = [...(prev.images || []), ...newUrls];
        const updatedCover = prev.coverPhoto ? prev.coverPhoto : updatedImages[0];
        return {
          ...prev,
          images: updatedImages,
          coverPhoto: updatedCover,
        };
      });
      toast.success(`${newUrls.length} image(s) uploaded successfully!`);
    }
    setUploadingPropertyImages(false);
  };

  const removePropertyImage = (urlToRemove: string) => {
    setFormData(prev => {
      const updatedImages = (prev.images || []).filter(url => url !== urlToRemove);
      let updatedCover = prev.coverPhoto;
      if (updatedCover === urlToRemove) {
        updatedCover = updatedImages.length > 0 ? updatedImages[0] : "";
      }
      return {
        ...prev,
        images: updatedImages,
        coverPhoto: updatedCover,
      };
    });
  };

  const setCoverPhoto = (url: string) => {
    setFormData(prev => ({ ...prev, coverPhoto: url }));
    toast.success("Cover photo updated!");
  };

  const handleUnitImagesUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    toast.loading("Uploading unit images...", { id: `unit-upload-${index}` });
    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formDataObj = new FormData();
      formDataObj.append("file", file);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formDataObj,
        });

        if (res.ok) {
          const data = await res.json();
          newUrls.push(data.url);
        }
      } catch (err) {
        console.error("Unit upload error:", err);
      }
    }

    if (newUrls.length > 0) {
      const newUnits = [...units];
      const currentImages = newUnits[index].images || [];
      newUnits[index] = {
        ...newUnits[index],
        images: [...currentImages, ...newUrls]
      };
      setUnits(newUnits);
      toast.success(`${newUrls.length} unit image(s) uploaded!`, { id: `unit-upload-${index}` });
    } else {
      toast.dismiss(`unit-upload-${index}`);
    }
  };

  const removeUnitImage = (unitIndex: number, imgUrl: string) => {
    const newUnits = [...units];
    newUnits[unitIndex].images = (newUnits[unitIndex].images || []).filter((url: string) => url !== imgUrl);
    setUnits(newUnits);
  };

  const [customAmenity, setCustomAmenity] = useState("");
  const [units, setUnits] = useState<any[]>([]);

  const predefinedAmenities = [
    "Parking", "In-unit laundry", "Air conditioning", "Central heating",
    "High-speed Wi-Fi", "Furnished", "Hardwood Floors", "Dishwasher",
    "Balcony / Terrace", "Walk-in Closets", "Pet-friendly", "Swimming pool",
    "Fitness Center", "Elevator", "Storage", "Fireplace"
  ];

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await fetch(`/api/properties?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            name: data.name || "",
            type: data.type || "Apartment",
            status: data.status || "AVAILABLE",
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            zip: data.zip || "",
            country: data.country || "",
            description: data.description || "",
            yearBuilt: data.yearBuilt ? String(data.yearBuilt) : "",
            coverPhoto: data.coverPhoto || "",
            images: data.images || [],
            amenities: data.amenities || [],
          });
          
          if (data.units && data.units.length > 0) {
            setUnits(data.units.map((u: any) => ({
              ...u,
              images: u.images || []
            })));
          } else {
            setUnits([{ name: "Unit 1", type: "Apartment", floor: "", rooms: "", bathrooms: "", sqFootage: "", maxOccupants: "2", rentAmount: "", depositAmt: "", status: "VACANT", images: [] }]);
          }
        } else {
          toast.error("Failed to load property");
          router.push("/dashboard/properties");
        }
      } catch (err) {
        toast.error("Error loading property");
      } finally {
        setLoadingData(false);
      }
    };
    if (id) fetchProperty();
  }, [id, router]);

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => {
      const current = prev.amenities || [];
      if (current.includes(amenity)) {
        return { ...prev, amenities: current.filter(a => a !== amenity) };
      } else {
        return { ...prev, amenities: [...current, amenity] };
      }
    });
  };

  const addCustomAmenity = () => {
    if (customAmenity.trim() && !formData.amenities.includes(customAmenity.trim())) {
      setFormData(prev => ({
        ...prev,
        amenities: [...(prev.amenities || []), customAmenity.trim()]
      }));
      setCustomAmenity("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUnitChange = (index: number, field: string, value: string) => {
    const newUnits = [...units];
    newUnits[index] = { ...newUnits[index], [field]: value };
    setUnits(newUnits);
  };
  const addUnit = () => {
    setUnits([...units, { name: `Unit ${units.length + 1}`, type: "Apartment", floor: "", rooms: "", bathrooms: "", sqFootage: "", maxOccupants: "2", rentAmount: "", depositAmt: "", status: "VACANT", images: [] as string[] }]);
  };
  const removeUnit = (index: number) => {
    setUnits(units.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        id,
        ...formData,
        yearBuilt: formData.yearBuilt ? Number(formData.yearBuilt) : null,
        units: units.map(u => ({
          ...u,
          rentAmount: Number(u.rentAmount) || 0,
          rooms: Number(u.rooms) || 0,
          bathrooms: Number(u.bathrooms) || 0,
          maxOccupants: Number(u.maxOccupants) || 1,
          sqFootage: Number(u.sqFootage) || 0,
          depositAmt: Number(u.depositAmt || u.rentAmount || 0),
          floor: u.floor ? Number(u.floor) : null
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
    return <div className="p-10 text-center font-bold text-[#6E6E73]">Loading Property Form...</div>;
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Info */}
        <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E5E5EA] bg-[#F2F2F7]/50">
            <h2 className="font-bold text-[#1D1D1F] text-lg">General Information</h2>
            <p className="text-sm text-[#6E6E73]">Basic details about this property.</p>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1D1D1F]">Property Name <span className="text-red-500">*</span></label>
                <Input required name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Sunset Apartments" className="h-11 rounded-xl bg-white border-[#E5E5EA]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1D1D1F]">Property Type</label>
                <select name="type" value={formData.type} onChange={handleChange} className="w-full h-11 bg-white border border-[#E5E5EA] rounded-xl px-4 text-sm text-[#1D1D1F] outline-none">
                  <option value="Apartment">Apartment Complex</option>
                  <option value="House">Single Family House</option>
                  <option value="Commercial">Commercial Building</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1D1D1F]">Year Built</label>
                <Input name="yearBuilt" type="number" value={formData.yearBuilt} onChange={handleChange} placeholder="e.g. 2015" className="h-11 rounded-xl bg-white border-[#E5E5EA]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1D1D1F]">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full h-11 bg-white border border-[#E5E5EA] rounded-xl px-4 text-sm text-[#1D1D1F] outline-none">
                  <option value="AVAILABLE">Available</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="MAINTENANCE">Under Maintenance</option>
                </select>
              </div>
            </div>

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

        {/* Property Images Upload Area */}
        <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E5E5EA] bg-[#F2F2F7]/50">
            <h2 className="font-bold text-[#1D1D1F] text-lg">Property Images</h2>
            <p className="text-sm text-[#6E6E73]">Upload high-quality images to showcase your property.</p>
          </div>
          <CardContent className="p-6 space-y-6">
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              id="property-images-input" 
              className="hidden" 
              onChange={handlePropertyImagesUpload} 
            />

            <div 
              onClick={() => document.getElementById("property-images-input")?.click()}
              className="border-2 border-dashed border-[#CBD5E1] rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-[#F2F2F7] transition-colors cursor-pointer bg-white"
            >
              <div className="h-16 w-16 bg-[#EFF6FF] text-[#007AFF] rounded-full flex items-center justify-center mb-4">
                {uploadingPropertyImages ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <UploadCloud className="h-8 w-8" />
                )}
              </div>
              <h3 className="text-lg font-bold text-[#1D1D1F]">
                {uploadingPropertyImages ? "Uploading images..." : "Upload property images"}
              </h3>
              <p className="text-sm text-[#6E6E73] mt-1 mb-4">Drag and drop your images here, or click to browse files</p>
              <div className="flex items-center gap-4 text-xs font-semibold text-[#22C55E] mb-6">
                <span>✓ PNG, JPG, WEBP</span>
                <span>✓ Up to 10MB each</span>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                className="h-10 px-6 rounded-full border-[#007AFF] text-[#007AFF] font-bold hover:bg-[#EFF6FF]"
              >
                Choose Files
              </Button>
            </div>

            {/* Preview Grid */}
            {formData.images && formData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {formData.images.map((url) => {
                  const isCover = formData.coverPhoto === url;
                  return (
                    <div key={url} className="group relative aspect-video rounded-xl overflow-hidden border border-[#E5E5EA] shadow-sm bg-slate-100">
                      <img src={url} alt="Property" className="w-full h-full object-cover" />
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCoverPhoto(url); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                            isCover 
                              ? "bg-[#22C55E] text-white" 
                              : "bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]"
                          }`}
                        >
                          {isCover ? "Cover" : "Set Cover"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removePropertyImage(url); }}
                          className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {isCover && (
                        <div className="absolute top-2 left-2 bg-[#22C55E] text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wider">
                          Cover
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Amenities & Features */}
        <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E5E5EA] bg-[#F2F2F7]/50">
            <h2 className="font-bold text-[#1D1D1F] text-lg flex items-center gap-2">
              <div className="bg-[#EFF6FF] text-[#007AFF] p-1.5 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
              </div>
              Amenities & Features
            </h2>
            <p className="text-sm text-[#6E6E73] mt-1">Select the core amenities and features that best describe this property.</p>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {predefinedAmenities.map(amenity => {
                const isSelected = formData.amenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                      isSelected 
                        ? "border-[#007AFF] bg-[#EFF6FF] text-[#1D1D1F]" 
                        : "border-[#E5E5EA] bg-white text-[#6E6E73] hover:border-[#CBD5E1]"
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
                  onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addCustomAmenity(); } }}
                  placeholder="e.g. Rooftop terrace, Smart Home..." 
                  className="h-11 rounded-xl bg-white border-[#E5E5EA] flex-1 max-w-sm" 
                />
                <Button 
                  type="button" 
                  onClick={addCustomAmenity}
                  className="h-11 w-11 p-0 rounded-xl bg-white border border-[#E5E5EA] text-[#007AFF] shadow-sm hover:bg-[#F2F2F7]"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              {formData.amenities.filter(a => !predefinedAmenities.includes(a)).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {formData.amenities.filter(a => !predefinedAmenities.includes(a)).map(amenity => (
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

        {/* Smart Unit Management */}
        <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E5E5EA] bg-[#F2F2F7]/50 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h2 className="font-bold text-[#1D1D1F] text-lg">Smart Unit Management</h2>
              <p className="text-sm text-[#6E6E73]">Manage all units belonging to this property.</p>
            </div>
            <Button type="button" onClick={addUnit} className="bg-[#EFF6FF] text-[#007AFF] hover:bg-[#DBEAFE] h-10 px-4 rounded-xl font-bold shadow-sm flex items-center gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Add Unit
            </Button>
          </div>
          <CardContent className="p-0">
            {units.map((unit, index) => (
              <div key={index} className="p-6 border-b border-[#E5E5EA] last:border-b-0 bg-white hover:bg-[#F2F2F7]/30 transition-colors">
                <div className="flex justify-between items-center mb-5 pb-4 border-b border-[#F1F5F9]">
                  <h3 className="font-bold text-[#1D1D1F] flex items-center gap-2 text-lg">
                    <Building className="h-5 w-5 text-[#007AFF]" /> {unit.name || `Unit ${index + 1}`}
                  </h3>
                  {units.length > 1 && (
                    <button type="button" onClick={() => removeUnit(index)} className="text-[#EF4444] bg-[#FEE2E2] hover:bg-red-200 p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors">
                      <Trash2 className="h-4 w-4" /> Remove Unit
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-[#1D1D1F]">Unit Name / Number <span className="text-red-500">*</span></label>
                    <Input required value={unit.name} onChange={(e) => handleUnitChange(index, "name", e.target.value)} placeholder="e.g. Apt 101" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1D1D1F]">Unit Type</label>
                    <select value={unit.type || "Apartment"} onChange={(e) => handleUnitChange(index, "type", e.target.value)} className="w-full h-10 bg-white border border-[#E5E5EA] rounded-xl px-3 text-sm outline-none">
                      <option value="Apartment">Apartment</option>
                      <option value="Studio">Studio</option>
                      <option value="Commercial">Commercial</option>
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
                    <label className="text-xs font-bold text-[#1D1D1F]">Floor Number</label>
                    <Input type="number" value={unit.floor || ""} onChange={(e) => handleUnitChange(index, "floor", e.target.value)} placeholder="e.g. 1" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1D1D1F]">Bedrooms</label>
                    <Input type="number" value={unit.rooms || ""} onChange={(e) => handleUnitChange(index, "rooms", e.target.value)} placeholder="2" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1D1D1F]">Bathrooms</label>
                    <Input type="number" value={unit.bathrooms || ""} onChange={(e) => handleUnitChange(index, "bathrooms", e.target.value)} placeholder="1" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1D1D1F]">Max Occupants</label>
                    <Input type="number" value={unit.maxOccupants || ""} onChange={(e) => handleUnitChange(index, "maxOccupants", e.target.value)} placeholder="2" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1D1D1F]">Square Footage</label>
                    <Input type="number" value={unit.sqFootage || ""} onChange={(e) => handleUnitChange(index, "sqFootage", e.target.value)} placeholder="800" className="h-10 rounded-xl" />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-[#1D1D1F]">Monthly Rent ($) <span className="text-red-500">*</span></label>
                    <Input required type="number" value={unit.rentAmount || ""} onChange={(e) => handleUnitChange(index, "rentAmount", e.target.value)} placeholder="1500" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-[#1D1D1F]">Security Deposit ($)</label>
                    <Input type="number" value={unit.depositAmt || ""} onChange={(e) => handleUnitChange(index, "depositAmt", e.target.value)} placeholder="1500" className="h-10 rounded-xl" />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="text-xs font-bold text-[#1D1D1F] mb-2 block">Unit Images</label>
                  
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    id={`unit-images-input-${index}`} 
                    className="hidden" 
                    onChange={(e) => handleUnitImagesUpload(index, e)} 
                  />
                  
                  <div 
                    onClick={() => document.getElementById(`unit-images-input-${index}`)?.click()}
                    className="border-2 border-dashed border-[#E5E5EA] rounded-xl p-6 flex flex-col items-center justify-center text-center bg-[#F2F2F7] hover:bg-white transition-colors cursor-pointer"
                  >
                    <div className="h-10 w-10 bg-white shadow-sm border border-[#E5E5EA] text-[#94A3B8] rounded-full flex items-center justify-center mb-3">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-bold text-[#1D1D1F]">Upload photos for {unit.name || `Unit ${index + 1}`}</p>
                    <p className="text-xs text-[#6E6E73] mt-1">PNG, JPG up to 5MB</p>
                  </div>

                  {/* Unit Image Previews */}
                  {unit.images && unit.images.length > 0 && (
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4">
                      {unit.images.map((url: string) => (
                        <div key={url} className="group relative aspect-video rounded-lg overflow-hidden border border-[#E5E5EA] bg-slate-50">
                          <img src={url} alt="Unit" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeUnitImage(index, url); }}
                              className="p-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
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

        {/* Floating Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/80 backdrop-blur-md border-t border-[#E5E5EA] p-4 flex justify-end gap-3 z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
          <Link href={`/dashboard/properties/${id}`}>
            <Button type="button" variant="outline" className="h-11 px-6 rounded-xl font-bold text-[#1D1D1F] border-[#E5E5EA] shadow-sm hover:bg-[#F2F2F7]">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading} className="bg-[#007AFF] hover:bg-[#0062CC] text-white h-11 px-8 rounded-xl font-bold shadow-sm flex items-center gap-2">
            {loading ? "Saving..." : <><Save className="h-4 w-4" /> Save Changes</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
