"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, UploadCloud, Plus, Trash2, Building, ImageIcon } from "lucide-react";
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
    amenities: [] as string[],
  });

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
            amenities: data.amenities || [],
          });
          
          if (data.units && data.units.length > 0) {
            setUnits(data.units);
          } else {
            setUnits([{ name: "Unit 1", type: "Apartment", floor: "", rooms: "", bathrooms: "", sqFootage: "", rentAmount: "", depositAmt: "", status: "VACANT" }]);
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
    setUnits([...units, { name: `Unit ${units.length + 1}`, type: "Apartment", floor: "", rooms: "", bathrooms: "", sqFootage: "", rentAmount: "", depositAmt: "", status: "VACANT" }]);
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
    return <div className="p-10 text-center font-bold text-[#64748B]">Loading Property Form...</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto pt-6 space-y-6 pb-24 px-2 sm:px-0">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/dashboard/properties/${id}`}>
          <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl bg-white border border-[#E2E8F0] shadow-sm text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Edit Property</h1>
          <p className="text-[#64748B] text-sm font-medium mt-1">Update your property details and unit information.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Info */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50">
            <h2 className="font-bold text-[#0F172A] text-lg">General Information</h2>
            <p className="text-sm text-[#64748B]">Basic details about this property.</p>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Property Name <span className="text-red-500">*</span></label>
                <Input required name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Sunset Apartments" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Property Type</label>
                <select name="type" value={formData.type} onChange={handleChange} className="w-full h-11 bg-white border border-[#E2E8F0] rounded-xl px-4 text-sm text-[#0F172A] outline-none">
                  <option value="Apartment">Apartment Complex</option>
                  <option value="House">Single Family House</option>
                  <option value="Commercial">Commercial Building</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Year Built</label>
                <Input name="yearBuilt" type="number" value={formData.yearBuilt} onChange={handleChange} placeholder="e.g. 2015" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full h-11 bg-white border border-[#E2E8F0] rounded-xl px-4 text-sm text-[#0F172A] outline-none">
                  <option value="AVAILABLE">Available</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="MAINTENANCE">Under Maintenance</option>
                </select>
              </div>
            </div>

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
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0F172A]">Street Address <span className="text-red-500">*</span></label>
              <Input required name="address" value={formData.address} onChange={handleChange} placeholder="123 Main St" className="h-11 rounded-xl bg-white border-[#E2E8F0]" />
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
            <p className="text-sm text-[#64748B]">Upload high-quality images to showcase your property.</p>
          </div>
          <CardContent className="p-6">
            <div className="border-2 border-dashed border-[#CBD5E1] rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-[#F8FAFC] transition-colors cursor-pointer bg-white">
              <div className="h-16 w-16 bg-[#EFF6FF] text-[#3B82F6] rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A]">Upload property images</h3>
              <p className="text-sm text-[#64748B] mt-1 mb-4">Drag and drop your images here, or click to browse files</p>
              <div className="flex items-center gap-4 text-xs font-semibold text-[#22C55E] mb-6">
                <span className="flex items-center gap-1">✓ PNG, JPG, WEBP</span>
                <span className="flex items-center gap-1">✓ Up to 10MB each</span>
              </div>
              <Button type="button" variant="outline" className="h-10 px-6 rounded-full border-[#3B82F6] text-[#3B82F6] font-bold hover:bg-[#EFF6FF]">
                Choose Files
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Amenities & Features */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50">
            <h2 className="font-bold text-[#0F172A] text-lg flex items-center gap-2">
              <div className="bg-[#EFF6FF] text-[#3B82F6] p-1.5 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
              </div>
              Amenities & Features
            </h2>
            <p className="text-sm text-[#64748B] mt-1">Select the core amenities and features that best describe this property.</p>
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
                        ? "border-[#3B82F6] bg-[#EFF6FF] text-[#0F172A]" 
                        : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#CBD5E1]"
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
                  onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addCustomAmenity(); } }}
                  placeholder="e.g. Rooftop terrace, Smart Home..." 
                  className="h-11 rounded-xl bg-white border-[#E2E8F0] flex-1 max-w-sm" 
                />
                <Button 
                  type="button" 
                  onClick={addCustomAmenity}
                  className="h-11 w-11 p-0 rounded-xl bg-white border border-[#E2E8F0] text-[#3B82F6] shadow-sm hover:bg-[#F8FAFC]"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              {formData.amenities.filter(a => !predefinedAmenities.includes(a)).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {formData.amenities.filter(a => !predefinedAmenities.includes(a)).map(amenity => (
                    <div key={amenity} className="flex items-center gap-2 px-3 py-1.5 bg-[#EFF6FF] text-[#3B82F6] text-sm font-semibold rounded-lg">
                      {amenity}
                      <button type="button" onClick={() => toggleAmenity(amenity)} className="text-[#3B82F6] hover:text-[#1D4ED8]">
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
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h2 className="font-bold text-[#0F172A] text-lg">Smart Unit Management</h2>
              <p className="text-sm text-[#64748B]">Manage all units belonging to this property.</p>
            </div>
            <Button type="button" onClick={addUnit} className="bg-[#EFF6FF] text-[#3B82F6] hover:bg-[#DBEAFE] h-10 px-4 rounded-xl font-bold shadow-sm flex items-center gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Add Unit
            </Button>
          </div>
          <CardContent className="p-0">
            {units.map((unit, index) => (
              <div key={index} className="p-6 border-b border-[#E2E8F0] last:border-b-0 bg-white hover:bg-[#F8FAFC]/30 transition-colors">
                <div className="flex justify-between items-center mb-5 pb-4 border-b border-[#F1F5F9]">
                  <h3 className="font-bold text-[#0F172A] flex items-center gap-2 text-lg">
                    <Building className="h-5 w-5 text-[#3B82F6]" /> {unit.name || `Unit ${index + 1}`}
                  </h3>
                  {units.length > 1 && (
                    <button type="button" onClick={() => removeUnit(index)} className="text-[#EF4444] bg-[#FEE2E2] hover:bg-red-200 p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors">
                      <Trash2 className="h-4 w-4" /> Remove Unit
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-[#0F172A]">Unit Name / Number <span className="text-red-500">*</span></label>
                    <Input required value={unit.name} onChange={(e) => handleUnitChange(index, "name", e.target.value)} placeholder="e.g. Apt 101" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A]">Unit Type</label>
                    <select value={unit.type || "Apartment"} onChange={(e) => handleUnitChange(index, "type", e.target.value)} className="w-full h-10 bg-white border border-[#E2E8F0] rounded-xl px-3 text-sm outline-none">
                      <option value="Apartment">Apartment</option>
                      <option value="Studio">Studio</option>
                      <option value="Commercial">Commercial</option>
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
                    <label className="text-xs font-bold text-[#0F172A]">Floor Number</label>
                    <Input type="number" value={unit.floor || ""} onChange={(e) => handleUnitChange(index, "floor", e.target.value)} placeholder="e.g. 1" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A]">Bedrooms</label>
                    <Input required type="number" value={unit.rooms || ""} onChange={(e) => handleUnitChange(index, "rooms", e.target.value)} placeholder="2" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A]">Bathrooms</label>
                    <Input required type="number" value={unit.bathrooms || ""} onChange={(e) => handleUnitChange(index, "bathrooms", e.target.value)} placeholder="1" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A]">Square Footage</label>
                    <Input required type="number" value={unit.sqFootage || ""} onChange={(e) => handleUnitChange(index, "sqFootage", e.target.value)} placeholder="800" className="h-10 rounded-xl" />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-[#0F172A]">Monthly Rent ($) <span className="text-red-500">*</span></label>
                    <Input required type="number" value={unit.rentAmount || ""} onChange={(e) => handleUnitChange(index, "rentAmount", e.target.value)} placeholder="1500" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-[#0F172A]">Security Deposit ($)</label>
                    <Input type="number" value={unit.depositAmt || ""} onChange={(e) => handleUnitChange(index, "depositAmt", e.target.value)} placeholder="1500" className="h-10 rounded-xl" />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="text-xs font-bold text-[#0F172A] mb-2 block">Unit Images</label>
                  <div className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-6 flex flex-col items-center justify-center text-center bg-[#F8FAFC] hover:bg-white transition-colors cursor-pointer">
                    <div className="h-10 w-10 bg-white shadow-sm border border-[#E2E8F0] text-[#94A3B8] rounded-full flex items-center justify-center mb-3">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-bold text-[#0F172A]">Upload photos for {unit.name || `Unit ${index + 1}`}</p>
                    <p className="text-xs text-[#64748B] mt-1">PNG, JPG up to 5MB</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Floating Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/80 backdrop-blur-md border-t border-[#E2E8F0] p-4 flex justify-end gap-3 z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
          <Link href={`/dashboard/properties/${id}`}>
            <Button type="button" variant="outline" className="h-11 px-6 rounded-xl font-bold text-[#0F172A] border-[#E2E8F0] shadow-sm hover:bg-[#F8FAFC]">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading} className="bg-[#3B82F6] hover:bg-[#2563EB] text-white h-11 px-8 rounded-xl font-bold shadow-sm flex items-center gap-2">
            {loading ? "Saving..." : <><Save className="h-4 w-4" /> Save Changes</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
