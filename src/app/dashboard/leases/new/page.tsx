"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building, User, Calendar, DollarSign, Loader2, Home, Settings, AlertCircle, FileText, CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CreateLeasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnitDetails, setSelectedUnitDetails] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    unitId: "",
    tenantEmail: "",
    startDate: "",
    endDate: "",
    monthlyRent: "",
    rentDueDay: "1",
    securityDeposit: "",
    lateFeeAmount: "",
    gracePeriodDays: "5",
    lateFeeType: "FIXED",
    autoGenerateInvoices: true,
    autoEmailInvoices: false,
  });

  useEffect(() => {
    fetch("/api/properties")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProperties(data);
      })
      .catch(() => toast.error("Failed to load properties"));
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      fetch(`/api/properties?id=${selectedProperty}`)
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.units)) {
            setUnits(data.units.filter((u: any) => u.status === "VACANT" || u.status === "AVAILABLE"));
          }
        });
    } else {
      setUnits([]);
    }
  }, [selectedProperty]);

  const handleUnitSelect = (unitId: string) => {
    setFormData({ ...formData, unitId });
    const unit = units.find((u: any) => u.id === unitId);
    if (unit) {
      setSelectedUnitDetails(unit);
      if (unit.rentAmount) {
        setFormData(prev => ({ 
          ...prev, 
          monthlyRent: unit.rentAmount.toString(),
          securityDeposit: unit.depositAmt ? unit.depositAmt.toString() : ""
        }));
      }
    } else {
      setSelectedUnitDetails(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unitId || !formData.tenantEmail || !formData.startDate || !formData.endDate || !formData.monthlyRent) {
      toast.error("Please fill all required fields");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/leases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        toast.success("Lease created successfully");
        router.push("/dashboard/leases");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create lease");
      }
    } catch (err) {
      toast.error("An error occurred while creating lease");
    } finally {
      setLoading(false);
    }
  };

  const Switch = ({ checked, onChange }: { checked: boolean, onChange: (c: boolean) => void }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 ${checked ? 'bg-[#3B82F6]' : 'bg-[#E2E8F0]'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );

  return (
    <div className="w-full max-w-5xl mx-auto pt-6 space-y-6 pb-20 px-4 sm:px-0">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/leases">
            <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-[28px] font-black text-[#0F172A] tracking-tight">Create New Lease</h1>
            <p className="text-[#64748B] text-sm font-medium mt-0.5">Configure lease terms, late fees, and automated billing.</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#EFF6FF] rounded-xl border border-[#BFDBFE]">
          <CheckCircle2 className="h-5 w-5 text-[#3B82F6]" />
          <span className="text-sm font-bold text-[#1E3A8A]">Draft Mode</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Form Columns */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Property & Tenant */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#F1F5F9] bg-[#FAFAFA] flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6]">
                <Building className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-[#0F172A]">Property & Tenant</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Property <span className="text-[#EF4444]">*</span></Label>
                  <Select value={selectedProperty} onValueChange={(v) => { setSelectedProperty(v || ""); setFormData({...formData, unitId: ""}); setSelectedUnitDetails(null); }} required>
                    <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm">
                      <SelectValue placeholder="Select a property">
                        {selectedProperty ? properties.find(p => p.id === selectedProperty)?.name : "Select a property"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#E2E8F0] shadow-lg">
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Available Unit <span className="text-[#EF4444]">*</span></Label>
                  <Select value={formData.unitId} onValueChange={(v) => handleUnitSelect(v || "")} disabled={!selectedProperty || units.length === 0} required>
                    <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm">
                      <SelectValue placeholder={!selectedProperty ? "Select property first" : units.length === 0 ? "No available units" : "Select unit"}>
                        {formData.unitId ? units.find(u => u.id === formData.unitId)?.name : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#E2E8F0] shadow-lg">
                      {units.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name} (Beds: {u.rooms})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Tenant Email <span className="text-[#EF4444]">*</span></Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8]" />
                  <Input 
                    type="email"
                    required
                    placeholder="tenant@example.com"
                    value={formData.tenantEmail}
                    onChange={(e) => setFormData({...formData, tenantEmail: e.target.value})}
                    className="pl-12 h-12 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm"
                  />
                </div>
                <p className="text-[12px] text-[#64748B] font-medium mt-1">An invite will be automatically sent to this email to sign the lease digitally.</p>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Lease Terms */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#F1F5F9] bg-[#FAFAFA] flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6]">
                <Calendar className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-[#0F172A]">Lease Dates</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Start Date <span className="text-[#EF4444]">*</span></Label>
                  <Input 
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="h-12 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">End Date <span className="text-[#EF4444]">*</span></Label>
                  <Input 
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="h-12 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Financial Terms */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#F1F5F9] bg-[#FAFAFA] flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#ECFDF5] flex items-center justify-center text-[#10B981]">
                <DollarSign className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-[#0F172A]">Financial Terms</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Monthly Rent <span className="text-[#EF4444]">*</span></Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold">$</div>
                    <Input 
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={formData.monthlyRent}
                      onChange={(e) => setFormData({...formData, monthlyRent: e.target.value})}
                      className="pl-8 h-12 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-black text-[#0F172A] shadow-sm"
                    />
                  </div>
                </div>
                
                <div className="space-y-2.5">
                  <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Security Deposit</Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold">$</div>
                    <Input 
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.securityDeposit}
                      onChange={(e) => setFormData({...formData, securityDeposit: e.target.value})}
                      className="pl-8 h-12 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-black text-[#0F172A] shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Rent Due Day</Label>
                  <Select value={formData.rentDueDay} onValueChange={(v) => setFormData({...formData, rentDueDay: v || "1"})}>
                    <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#E2E8F0] shadow-lg max-h-[200px]">
                      {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of the month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Late Fees */}
              <div className="pt-6 border-t border-[#F1F5F9] space-y-6">
                <h3 className="font-bold text-[#0F172A] text-base">Late Fee Rules</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Grace Period</Label>
                    <div className="relative">
                      <Input 
                        type="number"
                        min="0"
                        placeholder="5"
                        value={formData.gracePeriodDays}
                        onChange={(e) => setFormData({...formData, gracePeriodDays: e.target.value})}
                        className="pr-12 h-12 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold text-sm">Days</div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Fee Amount</Label>
                    <div className="relative">
                       {formData.lateFeeType === "FIXED" && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold">$</div>}
                       <Input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.lateFeeAmount}
                        onChange={(e) => setFormData({...formData, lateFeeAmount: e.target.value})}
                        className={`${formData.lateFeeType === "FIXED" ? "pl-8" : "pr-8"} h-12 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm`}
                      />
                      {formData.lateFeeType === "PERCENTAGE" && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold">%</div>}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Fee Type</Label>
                    <Select value={formData.lateFeeType} onValueChange={(v) => setFormData({...formData, lateFeeType: v || "FIXED"})}>
                      <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A] shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-[#E2E8F0] shadow-lg">
                        <SelectItem value="FIXED">Fixed Amount</SelectItem>
                        <SelectItem value="PERCENTAGE">% of Rent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar Columns */}
        <div className="space-y-8">
          
          {/* Unit Details Slide-In/Sticky Card */}
          <Card className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border-none shadow-xl rounded-[24px] overflow-hidden text-white transition-all duration-300">
            <CardContent className="p-6">
              {selectedUnitDetails ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                      <Home className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider">Selected Unit</p>
                      <h3 className="text-lg font-black tracking-tight">{selectedUnitDetails.name}</h3>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Bedrooms</p>
                      <p className="text-xl font-black">{selectedUnitDetails.rooms || 0}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Bathrooms</p>
                      <p className="text-xl font-black">{selectedUnitDetails.bathrooms || 0}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 col-span-2">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Square Footage</p>
                      <p className="text-xl font-black">{selectedUnitDetails.sqFootage ? `${selectedUnitDetails.sqFootage} sq ft` : "N/A"}</p>
                    </div>
                  </div>

                  {selectedUnitDetails.amenities && selectedUnitDetails.amenities.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Amenities</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedUnitDetails.amenities.slice(0, 4).map((a: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30 text-[11px] font-bold rounded-md">
                            {a}
                          </span>
                        ))}
                        {selectedUnitDetails.amenities.length > 4 && (
                          <span className="px-2 py-1 bg-white/5 text-[#94A3B8] border border-white/10 text-[11px] font-bold rounded-md">
                            +{selectedUnitDetails.amenities.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center text-[#94A3B8]">
                  <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Building className="h-8 w-8 text-white/20" />
                  </div>
                  <h3 className="font-bold text-white mb-1">No Unit Selected</h3>
                  <p className="text-sm font-medium">Select a property and unit to view details here.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Automation Settings */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#F1F5F9] bg-[#FAFAFA] flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center text-[#4B5563]">
                <Settings className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-[#0F172A]">Automation</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[#0F172A] text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#3B82F6]" /> Auto-Generate Invoices
                  </h4>
                  <p className="text-[12px] text-[#64748B] font-medium mt-1">Automatically create rent invoices each month.</p>
                </div>
                <Switch 
                  checked={formData.autoGenerateInvoices} 
                  onChange={(val) => setFormData({...formData, autoGenerateInvoices: val})} 
                />
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-[#F1F5F9]">
                <div>
                  <h4 className="font-bold text-[#0F172A] text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#10B981]" /> Auto-Email Invoices
                  </h4>
                  <p className="text-[12px] text-[#64748B] font-medium mt-1">Send invoices directly to tenant's email.</p>
                </div>
                <Switch 
                  checked={formData.autoEmailInvoices} 
                  onChange={(val) => setFormData({...formData, autoEmailInvoices: val})} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <Button type="submit" disabled={loading} className="w-full h-14 rounded-[16px] bg-[#3B82F6] hover:bg-[#2563EB] text-white font-black text-base shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]">
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {loading ? "Creating Lease..." : "Create Lease Agreement"}
            </Button>
            <Link href="/dashboard/leases">
              <Button type="button" variant="outline" className="w-full h-12 rounded-[16px] border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] font-bold hover:bg-[#F8FAFC]">
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
