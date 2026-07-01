"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, MapPin, BedDouble, Square, CheckCircle2, Building, Search, ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface VacantUnit {
  id: string;
  name: string;
  rentAmount: string;
  depositAmt: string;
  rooms: number;
  sqFootage: number;
  amenities: string[];
  property: {
    id: string;
    name: string;
    address: string;
    city: string;
    country: string;
    coverPhoto: string | null;
  };
}

export default function ListingsPage() {
  const [units, setUnits] = useState<VacantUnit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<VacantUnit[]>([]);
  const [searchCity, setSearchCity] = useState("");
  const [loading, setLoading] = useState(true);

  // Application Form State
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [applicantDoc, setApplicantDoc] = useState<File | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<VacantUnit | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [applying, setApplying] = useState(false);

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

  useEffect(() => {
    async function fetchListings() {
      try {
        const res = await fetch("/api/listings");
        if (!res.ok) throw new Error("Failed to load listings");
        const data = await res.json();
        setUnits(data);
        setFilteredUnits(data);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, []);

  useEffect(() => {
    if (searchCity.trim() === "") {
      setFilteredUnits(units);
    } else {
      setFilteredUnits(
        units.filter((u) =>
          u.property.city.toLowerCase().includes(searchCity.toLowerCase())
        )
      );
    }
  }, [searchCity, units]);

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName || !applicantEmail || !applicantPhone || !selectedUnit) {
      toast.error("Please fill in all applicant details.");
      return;
    }

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
        }),
      });

      if (res.ok) {
        toast.success(
          `Application submitted successfully for ${selectedUnit.name}! The landlord will contact you shortly.`
        );
        setDialogOpen(false);
        setApplicantName("");
        setApplicantEmail("");
        setApplicantPhone("");
        setApplicantDoc(null);
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
    <div className="min-h-screen bg-slate-50/50 text-[#111111] flex flex-col font-sans">
      {/* Header - Dribbble Style */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <Building className="h-6 w-6 text-primary" />
          <span>Property<span className="text-[#111111]">Pro</span></span>
        </Link>
        <Link href="/auth/login">
          <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full px-5 py-2 font-bold shadow-sm transition-colors text-xs">
            Sign In
          </Button>
        </Link>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden py-16 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-slate-800">
          Find Your Next Home
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto mb-8 font-extrabold uppercase tracking-wider">
          Browse verified premium rental units listed directly by authorized property owners globally.
        </p>

        {/* Pill Search Bar */}
        <div className="relative max-w-md mx-auto shadow-sm rounded-full overflow-hidden border border-slate-200 bg-white">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by city (e.g. London, Vancouver)..."
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            className="pl-11 pr-24 bg-white border-0 text-slate-800 placeholder-slate-400 focus-visible:ring-0 rounded-full h-12 shadow-none text-sm font-medium"
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-96 rounded-[28px] bg-white animate-pulse border border-slate-100 shadow-sm" />
            ))}
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[28px] border border-dashed border-slate-200 max-w-md mx-auto shadow-sm">
            <Home className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-extrabold mb-1">No Vacancies Found</h3>
            <p className="text-xs text-slate-400 font-semibold">There are currently no vacant units matching your search parameters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredUnits.map((unit) => (
              <Card
                key={unit.id}
                className="overflow-hidden bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col group"
              >
                {/* Cover Image Container */}
                <div className="h-52 overflow-hidden relative bg-slate-100">
                  <img
                    src={unit.property.coverPhoto || "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800"}
                    alt={unit.name}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  <Badge className="absolute top-4 right-4 bg-slate-900 text-white font-extrabold text-xs px-3.5 py-1.5 border-0 rounded-full shadow-sm">
                    ${Number(unit.rentAmount).toLocaleString()} / mo
                  </Badge>
                </div>

                <CardHeader className="pb-3 px-6 pt-5">
                  <div className="flex items-center gap-1 text-[11px] text-primary font-bold mb-1.5 uppercase tracking-wider">
                    <MapPin className="h-3 w-3" />
                    <span>{unit.property.city}, {unit.property.country}</span>
                  </div>
                  <CardTitle className="text-lg text-slate-800 font-extrabold group-hover:text-primary transition-colors">
                    {unit.name}
                  </CardTitle>
                  <CardDescription className="text-slate-400 font-semibold flex items-center gap-1.5 mt-1 text-xs">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    {unit.property.name}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-4 px-6 flex-1">
                  <div className="flex items-center gap-4 text-slate-400 text-xs mb-4 border-y border-slate-100 py-3 font-semibold">
                    <span className="flex items-center gap-1">
                      <BedDouble className="h-4 w-4 text-primary" />
                      <strong className="text-slate-800">{unit.rooms}</strong> Bed
                    </span>
                    <span className="flex items-center gap-1">
                      <Square className="h-4 w-4 text-primary" />
                      <strong className="text-slate-800">{unit.sqFootage}</strong> sq ft
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {unit.amenities.map((am) => (
                      <Badge key={am} variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100 font-bold text-[10px] rounded-full border-0 px-2.5 py-0.5">
                        {am}
                      </Badge>
                    ))}
                  </div>
                </CardContent>

                <CardFooter className="pt-0 p-6 flex gap-2">
                  {/* Schedule Tour */}
                  <Dialog open={tourDialogOpen && selectedTourUnit?.id === unit.id} onOpenChange={(open) => {
                    setTourDialogOpen(open);
                    if (open) setSelectedTourUnit(unit);
                  }}>
                    <DialogTrigger render={<Button variant="outline" className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl h-11 flex justify-center items-center gap-1.5 transition-colors shadow-none text-xs" />}>
                      Schedule Tour
                    </DialogTrigger>
                    <DialogContent className="bg-white border-slate-100 text-slate-800 rounded-[2rem] max-w-md p-6">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          Schedule Visit for {unit.name}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                          Select a visit type, day, and time. We will notify the landlord of {unit.property.name}.
                        </DialogDescription>
                      </DialogHeader>

                      <form onSubmit={handleTourSubmit} className="space-y-4 pt-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="tourType" className="text-xs font-bold text-slate-700">Tour Type</Label>
                          <select
                            id="tourType"
                            value={tourType}
                            onChange={(e) => setTourType(e.target.value)}
                            className="w-full bg-slate-50 border-0 text-slate-800 rounded-xl h-11 px-3 text-sm focus:ring-primary focus:border-primary font-semibold"
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
                              className="w-full bg-slate-50 border-0 text-slate-800 rounded-xl h-11 px-3 text-sm focus:ring-primary focus:border-primary font-semibold"
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

                        <Button type="submit" disabled={schedulingTour} className="w-full bg-primary hover:bg-primary/95 text-white font-bold h-11 rounded-xl transition-colors mt-2">
                          {schedulingTour ? "Scheduling..." : "Request Tour Slot"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Apply Now */}
                  <Dialog open={dialogOpen && selectedUnit?.id === unit.id} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (open) setSelectedUnit(unit);
                  }}>
                    <DialogTrigger render={<Button className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl h-11 flex justify-center items-center gap-1.5 transition-colors shadow-none text-xs" />}>
                      Apply Now
                      <ArrowRight className="h-3 w-3" />
                    </DialogTrigger>
                    <DialogContent className="bg-white border-slate-100 text-slate-800 rounded-[2rem] max-w-md p-6">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                          Apply for {unit.name}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                          Submit your contact information. The landlord of {unit.property.name} will review your application.
                        </DialogDescription>
                      </DialogHeader>

                      <form onSubmit={handleApplySubmit} className="space-y-4 pt-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="name" className="text-xs font-bold text-slate-700">Full Name</Label>
                          <Input
                            id="name"
                            placeholder="John Doe"
                            value={applicantName}
                            onChange={(e) => setApplicantName(e.target.value)}
                            className="bg-slate-50 border-0 text-slate-800 rounded-xl h-11"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="email" className="text-xs font-bold text-slate-700">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="john@example.com"
                            value={applicantEmail}
                            onChange={(e) => setApplicantEmail(e.target.value)}
                            className="bg-slate-50 border-0 text-slate-800 rounded-xl h-11"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="phone" className="text-xs font-bold text-slate-700">Phone Number</Label>
                          <Input
                            id="phone"
                            placeholder="+1 (555) 019-9922"
                            value={applicantPhone}
                            onChange={(e) => setApplicantPhone(e.target.value)}
                            className="bg-slate-50 border-0 text-slate-800 rounded-xl h-11"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="document" className="text-xs font-bold text-slate-700">Supporting Document (ID / Pay Stub)</Label>
                          <Input
                            id="document"
                            type="file"
                            onChange={(e) => setApplicantDoc(e.target.files?.[0] || null)}
                            className="bg-slate-50 border-0 text-slate-800 rounded-xl h-11 file:bg-slate-200 file:border-0 file:rounded-lg file:mr-3 file:px-3 file:py-1 file:text-xs file:font-semibold"
                          />
                        </div>
                        <Button type="submit" disabled={applying} className="w-full bg-primary hover:bg-primary/95 text-white font-bold h-11 rounded-xl transition-colors mt-2">
                          {applying ? "Submitting..." : "Submit Application"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-8 text-center text-slate-400 text-xs font-bold">
        <p>© 2026 PropertyPro. All rights reserved.</p>
      </footer>
    </div>
  );
}
