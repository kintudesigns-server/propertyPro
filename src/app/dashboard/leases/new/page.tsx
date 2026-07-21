"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Building, User, Calendar, DollarSign, Loader2, Home, Settings, AlertCircle, FileText, CheckCircle2, Mail, Clock, ShieldCheck, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function CreateLeasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramUnitId = searchParams ? searchParams.get("unitId") : null;
  const paramTenantEmail = searchParams ? searchParams.get("tenantEmail") : null;
  const paramAppId = searchParams ? searchParams.get("appId") : null;

  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
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
    renewalNoticeDays: "7",
    earlyTerminationFee: "",
    isProratedRefundAllowed: false,
    moveOutNoticeDays: "30",
  });

  useEffect(() => {
    if (paramAppId) {
      fetch(`/api/applications/${paramAppId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setFormData((prev) => {
              const start = data.moveInDate ? data.moveInDate.split("T")[0] : new Date().toISOString().split("T")[0];
              let end = "";
              if (start && data.leaseDuration) {
                const startDateObj = new Date(start);
                startDateObj.setMonth(startDateObj.getMonth() + Number(data.leaseDuration));
                startDateObj.setDate(startDateObj.getDate() - 1);
                end = startDateObj.toISOString().split("T")[0];
              }
              return {
                ...prev,
                tenantEmail: data.email || prev.tenantEmail,
                unitId: data.unit?.id || prev.unitId,
                startDate: start,
                endDate: end,
                monthlyRent: data.unit?.rentAmount ? data.unit.rentAmount.toString() : prev.monthlyRent,
                securityDeposit: data.unit?.depositAmt ? data.unit.depositAmt.toString() : prev.securityDeposit,
              };
            });

            if (data.unit?.id) {
              fetch("/api/properties")
                .then((res) => res.json())
                .then((propertiesData) => {
                  if (Array.isArray(propertiesData)) {
                    setProperties(propertiesData);
                    const propertyWithUnit = propertiesData.find((p: any) =>
                      p.units && p.units.some((u: any) => u.id === data.unit.id)
                    );
                    if (propertyWithUnit) {
                      setSelectedProperty(propertyWithUnit.id);
                    }
                  }
                });
            }
          }
        });
    }
  }, [paramAppId]);

  useEffect(() => {
    if (paramTenantEmail) {
      setFormData((prev) => ({ ...prev, tenantEmail: paramTenantEmail }));
    }
  }, [paramTenantEmail]);

  useEffect(() => {
    fetch("/api/properties")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProperties(data);
          if (paramUnitId) {
            const propertyWithUnit = data.find((p: any) =>
              p.units && p.units.some((u: any) => u.id === paramUnitId)
            );
            if (propertyWithUnit) {
              setSelectedProperty(propertyWithUnit.id);
            }
          }
        }
      })
      .catch(() => toast.error("Failed to load properties"))
      .finally(() => setHasLoaded(true));
  }, [paramUnitId]);

  const approvedProperties = properties.filter((p) => p.approvalStatus === "APPROVED");

  useEffect(() => {
    if (selectedProperty) {
      fetch(`/api/properties?id=${selectedProperty}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.units)) {
            setUnits(data.units); // Store all units to resolve names properly
            if (formData.unitId || paramUnitId) {
              const targetId = formData.unitId || paramUnitId;
              const matchedUnit = data.units.find((u: any) => u.id === targetId);
              if (matchedUnit) {
                setFormData((prev) => ({
                  ...prev,
                  unitId: targetId as string,
                  monthlyRent: matchedUnit.rentAmount ? matchedUnit.rentAmount.toString() : prev.monthlyRent,
                  securityDeposit: matchedUnit.depositAmt ? matchedUnit.depositAmt.toString() : prev.securityDeposit,
                }));
                setSelectedUnitDetails(matchedUnit);
              }
            }
          }
        });
    } else {
      setUnits([]);
    }
  }, [selectedProperty, paramUnitId]);

  const handleUnitSelect = (unitId: string) => {
    setFormData((prev) => ({ ...prev, unitId }));
    const unit = units.find((u: any) => u.id === unitId);
    if (unit) {
      setSelectedUnitDetails(unit);
      if (unit.rentAmount) {
        setFormData((prev) => ({
          ...prev,
          monthlyRent: unit.rentAmount.toString(),
          securityDeposit: unit.depositAmt ? unit.depositAmt.toString() : "",
        }));
      }
    } else {
      setSelectedUnitDetails(null);
    }
  };

  const handleQuickDuration = (months: number) => {
    if (!formData.startDate) {
      toast.error("Please select a Start Date first");
      return;
    }
    const start = new Date(formData.startDate);
    if (isNaN(start.getTime())) return;
    const end = new Date(start);
    end.setMonth(start.getMonth() + months);
    end.setDate(end.getDate() - 1); // standard cycle adjustment

    const yyyy = end.getFullYear();
    const mm = String(end.getMonth() + 1).padStart(2, "0");
    const dd = String(end.getDate()).padStart(2, "0");
    setFormData((prev) => ({ ...prev, endDate: `${yyyy}-${mm}-${dd}` }));
    toast.success(`Lease duration set to ${months} months`);
  };

  const handleQuickDeposit = (multiplier: number) => {
    const rent = Number(formData.monthlyRent) || 0;
    if (rent <= 0) {
      toast.error("Please enter a Monthly Rent first");
      return;
    }
    setFormData((prev) => ({ ...prev, securityDeposit: (rent * multiplier).toFixed(2) }));
    toast.success(`Security deposit set to ${multiplier}x rent`);
  };

  const getLeaseDurationMonths = () => {
    if (!formData.startDate || !formData.endDate) return null;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = (diffDays / 30.43).toFixed(1);
    return { months, days: diffDays };
  };

  const getProratedRentDetails = () => {
    if (!formData.startDate || !formData.monthlyRent) return null;
    const start = new Date(formData.startDate);
    if (isNaN(start.getTime())) return null;
    const startDay = start.getDate();
    const monthlyRentAmt = Number(formData.monthlyRent) || 0;
    if (startDay === 1 || monthlyRentAmt <= 0) return { amount: monthlyRentAmt, isProrated: false };

    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const daysLived = daysInMonth - startDay + 1;
    const dailyRate = monthlyRentAmt / daysInMonth;
    const proratedAmount = dailyRate * daysLived;

    const monthName = start.toLocaleString("default", { month: "short" });
    return {
      amount: Number(proratedAmount.toFixed(2)),
      isProrated: true,
      daysLived,
      daysInMonth,
      monthName,
    };
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
        body: JSON.stringify({
          ...formData,
          applicationId: paramAppId || undefined,
        }),
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

  const proratedInfo = getProratedRentDetails();
  const durationInfo = getLeaseDurationMonths();
  const selectedPropertyDetails = properties.find((p) => p.id === selectedProperty);

  const securityDepositVal = Number(formData.securityDeposit) || 0;
  const firstPaymentAmount = (proratedInfo?.amount || 0) + securityDepositVal;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-6 pb-20 px-2 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/leases">
            <Button variant="outline" className="h-11 w-11 p-0 rounded-xl border-[#E5E5EA] text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F2F2F7]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black text-[#1D1D1F] tracking-tight flex items-center gap-2">
              Create Lease Agreement
            </h1>
            <p className="text-[#6E6E73] text-base mt-0.5">Configure billing rules, dates, and tenant onboarding.</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-4 py-2 bg-[#EFF6FF] rounded-xl border border-[#BFDBFE] text-[#1E3A8A] font-bold text-sm shadow-xs">
          <ShieldCheck className="h-4.5 w-4.5 text-[#007AFF]" />
          <span>Draft Mode</span>
        </div>
      </div>

      {hasLoaded && approvedProperties.length === 0 && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-amber-100 text-amber-800 rounded-xl shrink-0">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-950 text-base">Property Approval Required</h3>
              <p className="text-amber-800 text-sm mt-0.5 font-semibold">
                You do not have any properties approved by administrative review. Leases can only be created for properties that have been approved.
              </p>
            </div>
          </div>
          <Link href="/dashboard/properties">
            <Button type="button" className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold whitespace-nowrap px-5 py-2 h-11 shrink-0 shadow-sm border-0">
              View Properties
            </Button>
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Property & Tenant */}
          <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-[#F1F5F9] bg-[#F2F2F7]/50 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#007AFF]">
                <Building className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-lg font-bold text-[#1D1D1F]">Property & Tenant Allocation</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Property <span className="text-[#EF4444]">*</span></Label>
                  <Select value={selectedProperty} onValueChange={(v) => { setSelectedProperty(v || ""); setFormData({ ...formData, unitId: "" }); setSelectedUnitDetails(null); }} disabled={properties.length === 0} required>
                    <SelectTrigger className="w-full h-12 rounded-xl bg-slate-50 border-[#E5E5EA] focus:bg-white focus:ring-[#007AFF] font-semibold text-[#1D1D1F] shadow-xs transition-colors pl-10 relative">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                      <SelectValue placeholder={properties.length === 0 && hasLoaded ? "No properties found" : "Select a property"}>
                        {selectedProperty ? (properties.find(p => p.id === selectedProperty)?.name || selectedProperty) : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#E5E5EA] shadow-xl p-1">
                      {properties.map((p) => {
                        const isApproved = p.approvalStatus === "APPROVED";
                        return (
                          <SelectItem key={p.id} value={p.id} disabled={!isApproved} className="rounded-lg py-2 cursor-pointer font-medium text-slate-700">
                            {p.name} {!isApproved ? <span className="text-rose-500 font-semibold ml-1 text-xs">(Unapproved)</span> : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Available Unit <span className="text-[#EF4444]">*</span></Label>
                  <Select value={formData.unitId} onValueChange={(v) => handleUnitSelect(v || "")} disabled={!selectedProperty || units.length === 0} required>
                    <SelectTrigger className="w-full h-12 rounded-xl bg-slate-50 border-[#E5E5EA] focus:bg-white focus:ring-[#007AFF] font-semibold text-[#1D1D1F] shadow-xs transition-colors pl-10 relative">
                      <Home className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                      <SelectValue placeholder={!selectedProperty ? "Select property first" : units.length === 0 ? "No units found" : "Select unit"}>
                        {formData.unitId ? (units.find(u => u.id === formData.unitId)?.name || formData.unitId) : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#E5E5EA] shadow-xl p-1">
                      {units.map((u) => {
                        const isAvailable = u.status === "VACANT" || u.status === "AVAILABLE" || u.id === paramUnitId || u.id === formData.unitId;
                        return (
                          <SelectItem key={u.id} value={u.id} disabled={!isAvailable} className="rounded-lg py-2 cursor-pointer font-medium text-slate-700">
                            {u.name} <span className="text-[#8E8E93] ml-1">(${u.rentAmount || 0}/mo)</span> {!isAvailable ? <span className="text-rose-500 font-semibold ml-1 text-xs">- Occupied</span> : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Tenant Email <span className="text-[#EF4444]">*</span></Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8]" />
                  <Input
                    type="email"
                    required
                    placeholder="tenant@example.com"
                    value={formData.tenantEmail}
                    onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })}
                    className="pl-12 h-12 rounded-xl bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] font-semibold text-[#1D1D1F] shadow-xs"
                  />
                </div>
                <p className="text-xs text-[#6E6E73] font-medium">An invite will be automatically dispatched to this email to sign the digital agreement.</p>
              </div>
            </CardContent>
          </Card>

          {/* Lease Dates */}
          <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-[#F1F5F9] bg-[#F2F2F7]/50 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#007AFF]">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-lg font-bold text-[#1D1D1F]">Lease Duration Rules</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Start Date <span className="text-[#EF4444]">*</span></Label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                    <Input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="pl-12 h-12 rounded-xl bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] font-semibold text-[#1D1D1F] shadow-xs"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-[#475569] uppercase tracking-wide">End Date <span className="text-[#EF4444]">*</span></Label>
                    {formData.startDate && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleQuickDuration(6)} className="text-[10px] font-extrabold text-[#007AFF] hover:underline bg-[#EFF6FF] px-1.5 py-0.5 rounded border border-[#BFDBFE]">6m</button>
                        <button type="button" onClick={() => handleQuickDuration(12)} className="text-[10px] font-extrabold text-[#007AFF] hover:underline bg-[#EFF6FF] px-1.5 py-0.5 rounded border border-[#BFDBFE]">1yr</button>
                        <button type="button" onClick={() => handleQuickDuration(24)} className="text-[10px] font-extrabold text-[#007AFF] hover:underline bg-[#EFF6FF] px-1.5 py-0.5 rounded border border-[#BFDBFE]">2yr</button>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                    <Input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="pl-12 h-12 rounded-xl bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] font-semibold text-[#1D1D1F] shadow-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Terms */}
          <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-[#F1F5F9] bg-[#F2F2F7]/50 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#ECFDF5] flex items-center justify-center text-[#10B981]">
                <DollarSign className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-lg font-bold text-[#1D1D1F]">Financial Billing Rules</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Monthly Rent <span className="text-[#EF4444]">*</span></Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold text-sm">$</div>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={formData.monthlyRent}
                      onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                      className="pl-8 h-12 rounded-xl bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] font-black text-[#1D1D1F] shadow-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Security Deposit</Label>
                    {Number(formData.monthlyRent) > 0 && (
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => handleQuickDeposit(1)} className="text-[10px] font-extrabold text-[#10B981] hover:underline bg-[#E6F4EA] px-1 py-0.5 rounded border border-[#A3E4D7]">1x</button>
                        <button type="button" onClick={() => handleQuickDeposit(1.5)} className="text-[10px] font-extrabold text-[#10B981] hover:underline bg-[#E6F4EA] px-1 py-0.5 rounded border border-[#A3E4D7]">1.5x</button>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold text-sm">$</div>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.securityDeposit}
                      onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                      className="pl-8 h-12 rounded-xl bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] font-bold text-[#1D1D1F] shadow-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Rent Due Day</Label>
                  <Select value={formData.rentDueDay} onValueChange={(v) => setFormData({ ...formData, rentDueDay: v || "1" })}>
                    <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E5E5EA] focus:ring-[#007AFF] font-semibold text-[#1D1D1F] shadow-xs">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#E5E5EA] shadow-lg max-h-[200px]">
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                          {day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"} of the month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Late Fees */}
              <div className="pt-6 border-t border-[#F1F5F9] space-y-5">
                <h3 className="font-bold text-[#1D1D1F] text-sm flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-amber-500" /> Late Fee Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Grace Period</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        placeholder="5"
                        value={formData.gracePeriodDays}
                        onChange={(e) => setFormData({ ...formData, gracePeriodDays: e.target.value })}
                        className="pr-12 h-12 rounded-xl bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] font-semibold text-[#1D1D1F] shadow-xs"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold text-xs">Days</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Fee Value</Label>
                    <div className="relative">
                      {formData.lateFeeType === "FIXED" && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold text-sm">$</div>}
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.lateFeeAmount}
                        onChange={(e) => setFormData({ ...formData, lateFeeAmount: e.target.value })}
                        className={`${formData.lateFeeType === "FIXED" ? "pl-8" : "pr-8"} h-12 rounded-xl bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF] font-semibold text-[#1D1D1F] shadow-xs`}
                      />
                      {formData.lateFeeType === "PERCENTAGE" && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold text-xs">%</div>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Late Fee Type</Label>
                    <Select value={formData.lateFeeType} onValueChange={(v) => setFormData({ ...formData, lateFeeType: v || "FIXED" })}>
                      <SelectTrigger className="w-full h-12 rounded-xl bg-white border-[#E5E5EA] focus:ring-[#007AFF] font-semibold text-[#1D1D1F] shadow-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-[#E5E5EA] shadow-lg">
                        <SelectItem value="FIXED">Fixed Amount</SelectItem>
                        <SelectItem value="PERCENTAGE">% of Monthly Rent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Early Termination Policy Section */}
          <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden hover:border-[#CBD5E1] transition-colors">
            <div className="bg-[#F2F2F7] px-6 py-4 border-b border-[#E5E5EA] flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertCircle className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#1D1D1F] tracking-tight">Termination & Notice Policy</h2>
                <p className="text-xs text-[#6E6E73] font-medium mt-0.5">Define notice periods, penalties and prorated refund rules if tenant breaks lease</p>
              </div>
            </div>
            
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Early Termination Fee</Label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold text-sm">$</div>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.earlyTerminationFee}
                        onChange={(e) => setFormData({ ...formData, earlyTerminationFee: e.target.value })}
                        className="pl-8 h-12 rounded-xl bg-white border-[#E5E5EA] focus-visible:ring-red-500 font-semibold text-[#1D1D1F] shadow-xs"
                      />
                    </div>
                    <p className="text-[10px] text-[#6E6E73] font-medium">Penalty tenant pays to break lease early.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Move-Out Notice Period</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="1"
                        placeholder="30"
                        value={formData.moveOutNoticeDays}
                        onChange={(e) => setFormData({ ...formData, moveOutNoticeDays: e.target.value })}
                        className="pr-16 pl-4 h-12 rounded-xl bg-white border-[#E5E5EA] focus-visible:ring-red-500 font-semibold text-[#1D1D1F] shadow-xs"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold text-sm">Days</div>
                    </div>
                    <p className="text-[10px] text-[#6E6E73] font-medium">Required notice before moving out.</p>
                  </div>

                  <div className="space-y-3 flex flex-col justify-center pt-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-[#475569] uppercase tracking-wide cursor-pointer">Allow Prorated Refund?</Label>
                      <Switch
                        checked={formData.isProratedRefundAllowed}
                        onCheckedChange={(checked) => setFormData({ ...formData, isProratedRefundAllowed: checked })}
                      />
                    </div>
                    <p className="text-[10px] text-[#6E6E73] font-medium leading-relaxed">
                      If turned on, tenant receives a refund for unused days if they move out mid-month. If turned off, prepaid rent is forfeited.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary & Preview Column */}
        <div className="space-y-8">
          {/* Summary Panel */}
          <Card className="bg-gradient-to-br from-[#1D1D1F] to-[#1E293B] border-none shadow-xl rounded-2xl overflow-hidden text-white transition-all duration-300">
            <CardContent className="p-6">
              {formData.unitId ? (
                <div className="space-y-6">
                  {/* Property & Unit Headings */}
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                      <Home className="h-5.5 w-5.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Leasing Location</p>
                      <h3 className="text-base font-black tracking-tight truncate">{selectedUnitDetails?.name || "Selected Unit"}</h3>
                      <p className="text-xs text-[#94A3B8] truncate">{selectedPropertyDetails?.name || ""}</p>
                    </div>
                  </div>

                  {/* Property Details Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Layout</p>
                      <p className="text-sm font-black">{selectedUnitDetails?.rooms || 0} Bed / {selectedUnitDetails?.bathrooms || 0} Bath</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Area Size</p>
                      <p className="text-sm font-black">{selectedUnitDetails?.sqFootage ? `${selectedUnitDetails.sqFootage} sqft` : "N/A"}</p>
                    </div>
                  </div>

                  {/* Lease Timeline Dates */}
                  {formData.startDate && formData.endDate && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-2">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Timeline & Duration</p>
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-white">{new Date(formData.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                          <p className="text-[9px] text-[#94A3B8] uppercase">Move-In</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[#6E6E73]" />
                        <div className="text-right">
                          <p className="font-semibold text-white">{new Date(formData.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                          <p className="text-[9px] text-[#94A3B8] uppercase">Move-Out</p>
                        </div>
                      </div>
                      {durationInfo && (
                        <div className="text-center pt-2 border-t border-white/5">
                          <p className="text-xs font-extrabold text-[#007AFF]">{durationInfo.months} Months ({durationInfo.days} days)</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Move-in Cost Estimation */}
                  <div className="pt-2 space-y-3">
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Estimated Move-In Costs</p>
                    <div className="space-y-2 bg-white/5 p-4 rounded-xl border border-white/5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#94A3B8] font-semibold">Monthly Rent Rate</span>
                        <span className="font-bold text-white">${Number(formData.monthlyRent || 0).toFixed(2)}</span>
                      </div>
                      
                      {proratedInfo?.isProrated && (
                        <div className="flex justify-between text-xs text-[#60A5FA]">
                          <span className="font-semibold">Prorated First Month ({proratedInfo.daysLived} days of {proratedInfo.monthName})</span>
                          <span className="font-bold">${proratedInfo.amount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="text-[#94A3B8] font-semibold">Security Deposit</span>
                        <span className="font-bold text-white">${securityDepositVal.toFixed(2)}</span>
                      </div>
                      
                      <div className="border-t border-white/10 pt-2.5 mt-2 flex justify-between items-baseline">
                        <span className="text-white font-extrabold">Due at Move-In</span>
                        <span className="text-lg font-black text-green-400">${firstPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center text-[#94A3B8]">
                  <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Building className="h-8 w-8 text-white/20" />
                  </div>
                  <h3 className="font-bold text-white mb-1">No Unit Selected</h3>
                  <p className="text-sm font-medium px-4">Select property and unit on the left to preview lease terms and prorated costs.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Automation settings */}
          <Card className="bg-white border-[#E5E5EA] shadow-sm rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-[#F1F5F9] bg-[#F2F2F7]/50 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#F2F2F7] flex items-center justify-center text-[#6E6E73]">
                <Settings className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-lg font-bold text-[#1D1D1F]">Invoice Automation</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-[#1D1D1F] text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#007AFF]" /> Auto-Generate Invoices
                  </h4>
                  <p className="text-xs text-[#6E6E73] font-medium mt-0.5">Generate monthly invoices automatically.</p>
                </div>
                <Switch
                  checked={formData.autoGenerateInvoices}
                  onCheckedChange={(val) => setFormData({ ...formData, autoGenerateInvoices: val })}
                />
              </div>

              <div className="flex items-center justify-between gap-4 pt-4 border-t border-[#F1F5F9]">
                <div>
                  <h4 className="font-bold text-[#1D1D1F] text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#10B981]" /> Auto-Email Invoices
                  </h4>
                  <p className="text-xs text-[#6E6E73] font-medium mt-0.5">Send invoices directly to tenant's email address.</p>
                </div>
                <Switch
                  checked={formData.autoEmailInvoices}
                  onCheckedChange={(val) => setFormData({ ...formData, autoEmailInvoices: val })}
                />
              </div>

              <div className="flex items-center justify-between gap-4 pt-4 border-t border-[#F1F5F9]">
                <div>
                  <h4 className="font-bold text-[#1D1D1F] text-sm flex items-center gap-2">
                    <Calendar className="h-4.5 w-4.5 text-orange-500" /> Renewal Notice Window
                  </h4>
                  <p className="text-xs text-[#6E6E73] font-medium mt-0.5">Days prior to end date to alert renewal.</p>
                </div>
                <div className="w-36">
                  <Select value={formData.renewalNoticeDays} onValueChange={(v) => setFormData({ ...formData, renewalNoticeDays: v || "7" })}>
                    <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 border-[#E5E5EA] focus:bg-white focus:ring-[#007AFF] font-bold text-[#1D1D1F] shadow-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#E5E5EA] shadow-lg">
                      <SelectItem value="7" disabled={durationInfo ? durationInfo.days <= 7 : false}>1 Week Before</SelectItem>
                      <SelectItem value="15" disabled={durationInfo ? durationInfo.days <= 15 : false}>15 Days Before</SelectItem>
                      <SelectItem value="30" disabled={durationInfo ? durationInfo.days <= 30 : false}>1 Month Before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <Button type="submit" disabled={loading || approvedProperties.length === 0} className="w-full h-14 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white font-extrabold text-base shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed">
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {loading ? "Registering Lease..." : "Create Lease Agreement"}
            </Button>
            <Link href="/dashboard/leases">
              <Button type="button" variant="outline" className="w-full h-12 rounded-xl border-[#E5E5EA] text-[#6E6E73] hover:text-[#1D1D1F] font-bold hover:bg-[#F2F2F7]">
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
