"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Folder, MapPin, Building2, Star, Image as ImageIcon, Plus, Trash2, CheckCircle, X, UploadCloud, ArrowLeft } from "lucide-react";

export interface PropertyFormProps {
  initialData?: any;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}

const PREDEFINED_AMENITIES = [
  "Parking", "In-unit laundry", "Air conditioning", "Central heating",
  "High-speed Wi-Fi", "Furnished", "Hardwood Floors", "Dishwasher",
  "Balcony / Terrace", "Walk-in Closets", "Pet-friendly", "Swimming pool",
  "Fitness Center", "Elevator", "Storage", "Fireplace"
];

export function PropertyForm({ initialData, onSave, onCancel }: PropertyFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "Apartment",
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
    units: [] as any[],
  });

  const [loading, setLoading] = useState(false);
  const [newAmenity, setNewAmenity] = useState("");
  const [newImage, setNewImage] = useState("");

  const [isUploading, setIsUploading] = useState(false);

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => {
      if (prev.amenities.includes(amenity)) {
        return { ...prev, amenities: prev.amenities.filter((a) => a !== amenity) };
      } else {
        return { ...prev, amenities: [...prev.amenities, amenity] };
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    try {
      const files = Array.from(e.target.files);
      const newUrls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          newUrls.push(data.url);
        } else {
          toast.error("Failed to upload an image.");
        }
      }
      if (newUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...newUrls],
          coverPhoto: prev.coverPhoto ? prev.coverPhoto : newUrls[0]
        }));
      }
    } catch (err) {
      toast.error("Upload error occurred.");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        yearBuilt: initialData.yearBuilt || "",
        description: initialData.description || "",
        state: initialData.state || "",
        zip: initialData.zip || "",
        images: initialData.images || [],
        amenities: initialData.amenities || [],
        units: initialData.units || [],
      });
    }
  }, [initialData]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddUnit = () => {
    setFormData((prev) => ({
      ...prev,
      units: [
        ...prev.units,
        {
          id: "", // empty means new
          name: "",
          type: "Studio",
          floor: "",
          rooms: 1,
          bathrooms: 1,
          sqFootage: 0,
          rentAmount: 0,
          depositAmt: 0,
          status: "VACANT",
        },
      ],
    }));
  };

  const handleUnitChange = (index: number, field: string, value: any) => {
    const newUnits = [...formData.units];
    newUnits[index] = { ...newUnits[index], [field]: value };
    setFormData((prev) => ({ ...prev, units: newUnits }));
  };

  const handleRemoveUnit = (index: number) => {
    const newUnits = formData.units.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, units: newUnits }));
  };

  const handleAddAmenity = () => {
    if (newAmenity.trim() && !formData.amenities.includes(newAmenity.trim())) {
      setFormData((prev) => ({ ...prev, amenities: [...prev.amenities, newAmenity.trim()] }));
      setNewAmenity("");
    }
  };

  const handleRemoveAmenity = (amenity: string) => {
    setFormData((prev) => ({ ...prev, amenities: prev.amenities.filter((a) => a !== amenity) }));
  };

  const handleAddImage = () => {
    if (newImage.trim() && !formData.images.includes(newImage.trim())) {
      setFormData((prev) => ({ 
        ...prev, 
        images: [...prev.images, newImage.trim()],
        // automatically set cover photo if it's the first image
        coverPhoto: prev.coverPhoto ? prev.coverPhoto : newImage.trim() 
      }));
      setNewImage("");
    }
  };

  const handleRemoveImage = (img: string) => {
    setFormData((prev) => ({ ...prev, images: prev.images.filter((i) => i !== img) }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  return (
    <form onSubmit={onSubmit} className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={onCancel} className="h-10 w-10 rounded-xl bg-slate-50 text-slate-500 hover:text-slate-900 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-black text-slate-900">{initialData ? "Edit Property" : "Add New Property"}</h2>
            <p className="text-sm text-slate-500 mt-1">Complete the details below to list your property.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl px-6 h-11 font-bold">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 h-11 rounded-xl shadow-md">
            {loading ? "Saving..." : "Save Property"}
          </Button>
        </div>
      </div>

      {/* General Info */}
      <Card className="bg-white border border-slate-100 rounded-[28px] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl"><Folder className="h-5 w-5" /></div>
          <h3 className="text-lg font-bold text-slate-900">General Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase">Property Name *</Label>
            <Input value={formData.name} onChange={(e) => handleChange("name", e.target.value)} required placeholder="e.g. Grand Canary Apartments" className="bg-slate-50 border-slate-200 rounded-xl h-12" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase">Property Type</Label>
            <Select value={formData.type} onValueChange={(v) => handleChange("type", v)}>
              <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-12"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="Apartment">Apartment</SelectItem>
                <SelectItem value="House">House</SelectItem>
                <SelectItem value="Condo">Condo</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase">Status</Label>
            <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
              <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-12"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="SOLD">Sold</SelectItem>
                <SelectItem value="UNDER_MAINTENANCE">Under Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase">Year Built</Label>
            <Input type="number" value={formData.yearBuilt} onChange={(e) => handleChange("yearBuilt", e.target.value)} placeholder="e.g. 2015" className="bg-slate-50 border-slate-200 rounded-xl h-12" />
          </div>
          <div className="col-span-1 md:col-span-2 space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase">Description</Label>
            <textarea value={formData.description} onChange={(e) => handleChange("description", e.target.value)} placeholder="Describe the property..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[100px] resize-none outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm" />
          </div>
        </div>
      </Card>

      {/* Address */}
      <Card className="bg-white border border-slate-100 rounded-[28px] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="bg-red-50 text-red-500 p-2.5 rounded-xl"><MapPin className="h-5 w-5" /></div>
          <h3 className="text-lg font-bold text-slate-900">Address</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2 space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase">Street Address *</Label>
            <Input value={formData.address} onChange={(e) => handleChange("address", e.target.value)} required placeholder="100 Canary Wharf" className="bg-slate-50 border-slate-200 rounded-xl h-12" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase">City *</Label>
            <Input value={formData.city} onChange={(e) => handleChange("city", e.target.value)} required placeholder="London" className="bg-slate-50 border-slate-200 rounded-xl h-12" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase">State / Province</Label>
            <Input value={formData.state} onChange={(e) => handleChange("state", e.target.value)} placeholder="Greater London" className="bg-slate-50 border-slate-200 rounded-xl h-12" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase">ZIP / Postal Code</Label>
            <Input value={formData.zip} onChange={(e) => handleChange("zip", e.target.value)} placeholder="E14 5AB" className="bg-slate-50 border-slate-200 rounded-xl h-12" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase">Country *</Label>
            <Input value={formData.country} onChange={(e) => handleChange("country", e.target.value)} required placeholder="United Kingdom" className="bg-slate-50 border-slate-200 rounded-xl h-12" />
          </div>
        </div>
      </Card>

      {/* Unit Management */}
      <Card className="bg-white border border-slate-100 rounded-[28px] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl"><Building2 className="h-5 w-5" /></div>
            <h3 className="text-lg font-bold text-slate-900">Unit Management</h3>
          </div>
          <Button type="button" onClick={handleAddUnit} className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-full h-9 px-4 text-xs flex items-center gap-1.5 transition-colors">
            <Plus className="h-4 w-4" /> Add Unit
          </Button>
        </div>
        
        {formData.units.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
            <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">No units added yet</p>
            <p className="text-xs text-slate-400 mt-1">Click the Add Unit button above to define units for this property.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {formData.units.map((unit, index) => (
              <div key={index} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative group">
                <button type="button" onClick={() => handleRemoveUnit(index)} className="absolute top-4 right-4 h-8 w-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 shadow-sm transition-all opacity-0 group-hover:opacity-100">
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pr-10">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Unit Name / Number *</Label>
                    <Input value={unit.name} onChange={(e) => handleUnitChange(index, "name", e.target.value)} required className="h-9 bg-white border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Unit Type</Label>
                    <Select value={unit.type || "Studio"} onValueChange={(v) => handleUnitChange(index, "type", v)}>
                      <SelectTrigger className="h-9 bg-white border-slate-200 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Studio">Studio</SelectItem>
                        <SelectItem value="1 Bed">1 Bed</SelectItem>
                        <SelectItem value="2 Bed">2 Bed</SelectItem>
                        <SelectItem value="Penthouse">Penthouse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Rent ($)</Label>
                    <Input type="number" value={unit.rentAmount} onChange={(e) => handleUnitChange(index, "rentAmount", e.target.value)} className="h-9 bg-white border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Deposit ($)</Label>
                    <Input type="number" value={unit.depositAmt} onChange={(e) => handleUnitChange(index, "depositAmt", e.target.value)} className="h-9 bg-white border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Bedrooms</Label>
                    <Input type="number" value={unit.rooms} onChange={(e) => handleUnitChange(index, "rooms", e.target.value)} className="h-9 bg-white border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Bathrooms</Label>
                    <Input type="number" value={unit.bathrooms || ""} onChange={(e) => handleUnitChange(index, "bathrooms", e.target.value)} className="h-9 bg-white border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Sq. Footage</Label>
                    <Input type="number" value={unit.sqFootage} onChange={(e) => handleUnitChange(index, "sqFootage", e.target.value)} className="h-9 bg-white border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Status</Label>
                    <Select value={unit.status || "VACANT"} onValueChange={(v) => handleUnitChange(index, "status", v)}>
                      <SelectTrigger className="h-9 bg-white border-slate-200 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VACANT">Vacant</SelectItem>
                        <SelectItem value="OCCUPIED">Occupied</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Amenities & Media (Vertical Layout like SS) */}
      <Card className="bg-white border border-slate-100 rounded-[28px] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl"><Star className="h-5 w-5" /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Amenities & Features</h3>
            <p className="text-sm text-slate-500 mt-0.5">Select the core amenities and features that best describe this property.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {PREDEFINED_AMENITIES.map((amenity) => {
            const selected = formData.amenities.includes(amenity);
            return (
              <button
                type="button"
                key={amenity}
                onClick={() => toggleAmenity(amenity)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-sm font-medium ${selected ? "border-blue-600 bg-blue-50/50 text-blue-900" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
              >
                <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${selected ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"}`}>
                  {selected && <CheckCircle className="h-2.5 w-2.5 text-white" />}
                </div>
                {amenity}
              </button>
            );
          })}
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <Label className="text-xs font-bold text-slate-700 uppercase mb-2 block">Add custom amenity or feature</Label>
          <div className="flex gap-2">
            <Input value={newAmenity} onChange={(e) => setNewAmenity(e.target.value)} placeholder="e.g., Rooftop terrace, Smart home" className="bg-white border-slate-200 rounded-xl h-11 max-w-sm" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAmenity())} />
            <Button type="button" variant="outline" onClick={handleAddAmenity} className="border-slate-200 text-slate-600 hover:bg-white rounded-xl h-11 px-4">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {formData.amenities.filter(a => !PREDEFINED_AMENITIES.includes(a)).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200">
              {formData.amenities.filter(a => !PREDEFINED_AMENITIES.includes(a)).map((amenity, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm">
                  {amenity}
                  <button type="button" onClick={() => handleRemoveAmenity(amenity)} className="text-slate-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="bg-white border border-slate-100 rounded-[28px] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="bg-green-50 text-green-500 p-2.5 rounded-xl"><ImageIcon className="h-5 w-5" /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Property Images</h3>
            <p className="text-sm text-slate-500 mt-0.5">Upload high-quality images to showcase your property.</p>
          </div>
        </div>
        
        <div className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-3xl p-12 text-center relative hover:bg-blue-50/50 transition-colors">
          <input
            type="file"
            multiple
            accept="image/png, image/jpeg, image/gif"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          <div className="bg-blue-100 text-blue-600 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h4 className="text-lg font-bold text-slate-900 mb-1">Upload property images</h4>
          <p className="text-sm text-slate-500 mb-4">Drag and drop your images here, or click to browse files</p>
          <div className="flex items-center justify-center gap-4 text-xs font-bold text-green-600 mb-6">
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> PNG, JPG, GIF</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Up to 10MB each</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> {formData.images.length}/20 uploaded</span>
          </div>
          <Button type="button" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50 bg-white rounded-xl h-11 px-6 font-bold" disabled={isUploading}>
            <ImageIcon className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : "Choose Files"}
          </Button>
        </div>

        {formData.images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-8">
            {formData.images.map((img, i) => (
              <div key={i} className="aspect-square bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden relative group shadow-sm">
                <img src={img} alt="Property" className="w-full h-full object-cover" onError={(e: any) => (e.currentTarget.src = "")} />
                <button type="button" onClick={() => handleRemoveImage(img)} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </form>
  );
}
