"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Building, Home, Settings, AlertCircle, FileText, Mail, Clock, ShieldCheck, ChevronRight, Calendar, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PausedAccountGate from "@/components/subscription/PausedAccountGate";

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

  const [isPausedAccount, setIsPausedAccount] = useState(false);
  const [pausedPlanName, setPausedPlanName] = useState<string | null>(null);
  const [blockNewUnits, setBlockNewUnits] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const userRes = await fetch("/api/users");
        if (userRes.ok) {
          const userData = await userRes.json();
          const rulesRes = await fetch("/api/subscription/rules");
          if (rulesRes.ok) {
            const rules = await rulesRes.json();
            if (rules.isPaused && rules.blockNewUnits) {
              setIsPausedAccount(true);
              setPausedPlanName(userData.pricingTier?.name || null);
              setBlockNewUnits(true);
            }
          }
        }
      } catch (err) {
        console.error("Subscription check failed on leases page:", err);
      }
    };
    checkSubscription();
  }, []);

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
            setUnits(data.units);
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
    end.setDate(end.getDate() - 1);

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
    <div className="max-w-7xl mx-auto space-y-8 pt-4 pb-20 px-2 sm:px-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/leases">
            <Button variant="outline" className="h-8 w-8 p-0 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer flex items-center justify-center">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">
              Create Lease Agreement
            </h1>
            <p className="text-[#6E6E73] text-xs font-normal mt-0.5">Configure billing rules, dates, and tenant onboarding.</p>
          </div>
        </div>
        <div className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />
          <span>Draft Mode</span>
        </div>
      </div>

      {hasLoaded && approvedProperties.length === 0 && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-amber-100 text-amber-900 rounded-2xl shrink-0">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-950 text-base">Property Approval Required</h3>
              <p className="text-amber-800 text-xs mt-0.5 font-normal leading-relaxed">
                You do not have any properties approved by administrative review. Leases can only be created for properties that have been approved.
              </p>
            </div>
          </div>
          <Link href="/dashboard/properties">
            <Button type="button" className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 rounded-xl shadow-xs border-none cursor-pointer shrink-0">
              View Properties
            </Button>
          </Link>
        </div>
      )}

      <PausedAccountGate
        isLocked={blockNewUnits}
        planName={pausedPlanName}
        reason="Lease creation"
        allowedActions={[
          "Your existing leases and active contracts remain <strong>safe and fully functional.</strong>",
          "You can view files, send notifications, and handle maintenance on active leases.",
          "Drafting or signing new lease agreements is restricted until subscription reactivation."
        ]}
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Property & Tenant */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
                <Building className="h-4 w-4 text-slate-700" />
              </div>
              <h2 className="text-base font-semibold text-[#1D1D1F] tracking-tight">Property & Tenant Allocation</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-[#6E6E73]">Property <span className="text-rose-500">*</span></Label>
                  <Select value={selectedProperty} onValueChange={(v) => { setSelectedProperty(v || ""); setFormData({ ...formData, unitId: "" }); setSelectedUnitDetails(null); }} disabled={properties.length === 0} required>
                    <SelectTrigger className="w-full h-9 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <SelectValue placeholder={properties.length === 0 && hasLoaded ? "No properties found" : "Select a property"}>
                        {selectedProperty ? (properties.find(p => p.id === selectedProperty)?.name || selectedProperty) : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border border-slate-200 shadow-xl p-1">
                      {properties.map((p) => {
                        const isApproved = p.approvalStatus === "APPROVED";
                        return (
                          <SelectItem key={p.id} value={p.id} disabled={!isApproved} className="rounded-xl py-2 cursor-pointer font-medium text-xs text-[#1D1D1F]">
                            {p.name} {!isApproved ? <span className="text-rose-500 font-normal ml-1 text-xs">(Unapproved)</span> : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-[#6E6E73]">Available Unit <span className="text-rose-500">*</span></Label>
                  <Select value={formData.unitId} onValueChange={(v) => handleUnitSelect(v || "")} disabled={!selectedProperty || units.length === 0} required>
                    <SelectTrigger className="w-full h-9 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all relative">
                      <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <SelectValue placeholder={!selectedProperty ? "Select property first" : units.length === 0 ? "No units found" : "Select unit"}>
                        {formData.unitId ? (units.find(u => u.id === formData.unitId)?.name || formData.unitId) : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border border-slate-200 shadow-xl p-1">
                      {units.map((u) => {
                        const isAvailable = u.status === "VACANT" || u.status === "AVAILABLE" || u.id === paramUnitId || u.id === formData.unitId;
                        return (
                          <SelectItem key={u.id} value={u.id} disabled={!isAvailable} className="rounded-xl py-2 cursor-pointer font-medium text-xs text-[#1D1D1F]">
                            {u.name} <span className="text-[#6E6E73] ml-1">(${u.rentAmount || 0}/mo)</span> {!isAvailable ? <span className="text-rose-500 font-normal ml-1 text-xs">- Occupied</span> : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-normal text-[#6E6E73]">Tenant Email <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    required
                    placeholder="tenant@example.com"
                    value={formData.tenantEmail}
                    onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all"
                  />
                </div>
                <p className="text-xs text-[#6E6E73] font-normal">An invite will be automatically dispatched to this email to sign the digital agreement.</p>
              </div>
            </CardContent>
          </Card>

          {/* Lease Dates */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden font-sans">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
                <Calendar className="h-4 w-4 text-slate-700" />
              </div>
              <h2 className="text-base font-semibold text-[#1D1D1F] tracking-tight">Lease Duration Rules</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-[#6E6E73]">Start Date <span className="text-rose-500">*</span></Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-normal text-[#6E6E73]">End Date <span className="text-rose-500">*</span></Label>
                    {formData.startDate && (
                      <div className="flex gap-1">
                        <button type="button" onClick={() => handleQuickDuration(6)} className="text-[10px] font-medium text-[#1D1D1F] hover:bg-slate-100 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs cursor-pointer">6m</button>
                        <button type="button" onClick={() => handleQuickDuration(12)} className="text-[10px] font-medium text-[#1D1D1F] hover:bg-slate-100 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs cursor-pointer">1yr</button>
                        <button type="button" onClick={() => handleQuickDuration(24)} className="text-[10px] font-medium text-[#1D1D1F] hover:bg-slate-100 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs cursor-pointer">2yr</button>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Terms */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden font-sans">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
                <DollarSign className="h-4 w-4 text-slate-700" />
              </div>
              <h2 className="text-base font-semibold text-[#1D1D1F] tracking-tight">Financial Billing Rules</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-[#6E6E73]">Monthly Rent <span className="text-rose-500">*</span></Label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">$</div>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={formData.monthlyRent}
                      onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white pl-7 pr-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-normal text-[#6E6E73]">Security Deposit</Label>
                    {Number(formData.monthlyRent) > 0 && (
                      <div className="flex gap-1">
                        <button type="button" onClick={() => handleQuickDeposit(1)} className="text-[10px] font-medium text-[#1D1D1F] hover:bg-slate-100 bg-white px-1.5 py-0.5 rounded-md border border-slate-200 shadow-2xs cursor-pointer">1x</button>
                        <button type="button" onClick={() => handleQuickDeposit(1.5)} className="text-[10px] font-medium text-[#1D1D1F] hover:bg-slate-100 bg-white px-1.5 py-0.5 rounded-md border border-slate-200 shadow-2xs cursor-pointer">1.5x</button>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">$</div>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.securityDeposit}
                      onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white pl-7 pr-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-[#6E6E73]">Rent Due Day</Label>
                  <Select value={formData.rentDueDay} onValueChange={(v) => setFormData({ ...formData, rentDueDay: v || "1" })}>
                    <SelectTrigger className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border border-slate-200 shadow-lg max-h-[200px]">
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()} className="rounded-xl py-2 cursor-pointer font-medium text-xs text-[#1D1D1F]">
                          {day}
                          {day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"} of the month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Late Fees */}
              <div className="pt-5 border-t border-slate-100 space-y-4">
                <h3 className="text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-slate-700" /> Late Fee Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-[#6E6E73]">Grace Period</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        placeholder="5"
                        value={formData.gracePeriodDays}
                        onChange={(e) => setFormData({ ...formData, gracePeriodDays: e.target.value })}
                        className="w-full h-9 rounded-xl border border-slate-200 bg-white pl-3.5 pr-12 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all"
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-normal text-xs">Days</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-[#6E6E73]">Fee Value</Label>
                    <div className="relative">
                      {formData.lateFeeType === "FIXED" && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">$</div>}
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.lateFeeAmount}
                        onChange={(e) => setFormData({ ...formData, lateFeeAmount: e.target.value })}
                        className={`w-full h-9 rounded-xl border border-slate-200 bg-white ${formData.lateFeeType === "FIXED" ? "pl-7 pr-3.5" : "pl-3.5 pr-8"} text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all`}
                      />
                      {formData.lateFeeType === "PERCENTAGE" && <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-normal text-xs">%</div>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-[#6E6E73]">Late Fee Type</Label>
                    <Select value={formData.lateFeeType} onValueChange={(v) => setFormData({ ...formData, lateFeeType: v || "FIXED" })}>
                      <SelectTrigger className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border border-slate-200 shadow-lg">
                        <SelectItem value="FIXED" className="rounded-xl py-2 cursor-pointer font-medium text-xs text-[#1D1D1F]">Fixed Amount</SelectItem>
                        <SelectItem value="PERCENTAGE" className="rounded-xl py-2 cursor-pointer font-medium text-xs text-[#1D1D1F]">% of Monthly Rent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Early Termination Policy Section */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden font-sans">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
                <AlertCircle className="h-4 w-4 text-slate-700" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#1D1D1F] tracking-tight">Termination & Notice Policy</h2>
                <p className="text-xs text-[#6E6E73] font-normal mt-0.5">Define notice periods, penalties and prorated refund rules if tenant breaks lease</p>
              </div>
            </div>
            
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-[#6E6E73]">Early Termination Fee</Label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">$</div>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.earlyTerminationFee}
                        onChange={(e) => setFormData({ ...formData, earlyTerminationFee: e.target.value })}
                        className="w-full h-9 rounded-xl border border-slate-200 bg-white pl-7 pr-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all"
                      />
                    </div>
                    <p className="text-xs text-[#6E6E73] font-normal">Penalty tenant pays to break lease early.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-[#6E6E73]">Move-Out Notice Period</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="1"
                        placeholder="30"
                        value={formData.moveOutNoticeDays}
                        onChange={(e) => setFormData({ ...formData, moveOutNoticeDays: e.target.value })}
                        className="w-full h-9 rounded-xl border border-slate-200 bg-white pl-3.5 pr-14 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all"
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-normal text-xs">Days</div>
                    </div>
                    <p className="text-xs text-[#6E6E73] font-normal">Required notice before moving out.</p>
                  </div>

                  <div className="space-y-2 flex flex-col justify-center pt-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-normal text-[#1D1D1F] cursor-pointer">Allow Prorated Refund?</Label>
                      <Switch
                        checked={formData.isProratedRefundAllowed}
                        onCheckedChange={(checked) => setFormData({ ...formData, isProratedRefundAllowed: checked })}
                      />
                    </div>
                    <p className="text-xs text-[#6E6E73] font-normal leading-relaxed">
                      If turned on, tenant receives a refund for unused days if they move out mid-month. If turned off, prepaid rent is forfeited.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary & Preview Column */}
        <div className="space-y-8 font-sans">
          {/* Summary Panel with Property Image Background Header */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden transition-all duration-300">
            {formData.unitId ? (
              <div>
                {/* Property Cover Image Header */}
                <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                  <img
                    src={selectedPropertyDetails?.coverPhoto || selectedUnitDetails?.images?.[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80'}
                    alt={selectedPropertyDetails?.name || "Property"}
                    className="w-full h-full object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  <div className="absolute bottom-4 left-5 right-5 text-white">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20">
                      {selectedUnitDetails?.name || "Selected Unit"}
                    </span>
                    <h3 className="text-lg font-semibold tracking-tight text-white mt-1.5 truncate">
                      {selectedPropertyDetails?.name || "Property"}
                    </h3>
                    <p className="text-xs text-slate-300 font-normal truncate">{selectedPropertyDetails?.address || ""}</p>
                  </div>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Layout & Sqft Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80">
                      <p className="text-[10px] font-normal text-[#6E6E73] uppercase tracking-wider mb-1">Layout</p>
                      <p className="text-xs font-semibold text-[#1D1D1F]">{selectedUnitDetails?.rooms || 0} Bed / {selectedUnitDetails?.bathrooms || 0} Bath</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80">
                      <p className="text-[10px] font-normal text-[#6E6E73] uppercase tracking-wider mb-1">Area Size</p>
                      <p className="text-xs font-semibold text-[#1D1D1F]">{selectedUnitDetails?.sqFootage ? `${selectedUnitDetails.sqFootage} sqft` : "N/A"}</p>
                    </div>
                  </div>

                  {/* Lease Timeline Dates */}
                  {formData.startDate && formData.endDate && (
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                      <p className="text-[10px] font-normal text-[#6E6E73] uppercase tracking-wider">Timeline & Duration</p>
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-[#1D1D1F]">{new Date(formData.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                          <p className="text-[9px] text-[#6E6E73] uppercase font-normal">Move-In</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                        <div className="text-right">
                          <p className="font-semibold text-[#1D1D1F]">{new Date(formData.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                          <p className="text-[9px] text-[#6E6E73] uppercase font-normal">Move-Out</p>
                        </div>
                      </div>
                      {durationInfo && (
                        <div className="text-center pt-2 border-t border-slate-200/80">
                          <p className="text-xs font-semibold text-[#1D1D1F]">{durationInfo.months} Months ({durationInfo.days} days)</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Move-in Cost Estimation */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-normal text-[#6E6E73] uppercase tracking-wider">Estimated Move-In Costs</p>
                    <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#6E6E73] font-normal">Monthly Rent Rate</span>
                        <span className="font-semibold text-[#1D1D1F]">${Number(formData.monthlyRent || 0).toFixed(2)}</span>
                      </div>
                      
                      {proratedInfo?.isProrated && (
                        <div className="flex justify-between text-xs text-slate-700">
                          <span className="font-normal text-[#6E6E73]">Prorated First Month ({proratedInfo.daysLived} days)</span>
                          <span className="font-semibold text-[#1D1D1F]">${proratedInfo.amount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="text-[#6E6E73] font-normal">Security Deposit</span>
                        <span className="font-semibold text-[#1D1D1F]">${securityDepositVal.toFixed(2)}</span>
                      </div>
                      
                      <div className="border-t border-slate-200/80 pt-2.5 mt-2 flex justify-between items-baseline">
                        <span className="text-[#1D1D1F] font-semibold text-xs">Due at Move-In</span>
                        <span className="text-lg font-semibold text-[#1D1D1F] tracking-tight">${firstPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </div>
            ) : (
              <CardContent className="p-8">
                <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400">
                  <div className="h-10 w-10 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs mb-2">
                    <Building className="h-4 w-4 text-slate-600" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight mb-1">No Unit Selected</h3>
                  <p className="text-xs font-normal px-2 text-[#6E6E73] leading-relaxed">Select property and unit on the left to preview lease terms and prorated costs with image backdrop.</p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Automation settings */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
                <Settings className="h-4 w-4 text-slate-700" />
              </div>
              <h2 className="text-base font-semibold text-[#1D1D1F] tracking-tight">Invoice Automation</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-slate-700" /> Auto-Generate Invoices
                  </h4>
                  <p className="text-xs text-[#6E6E73] font-normal mt-0.5">Generate monthly invoices automatically.</p>
                </div>
                <Switch
                  checked={formData.autoGenerateInvoices}
                  onCheckedChange={(val) => setFormData({ ...formData, autoGenerateInvoices: val })}
                />
              </div>

              <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <div>
                  <h4 className="text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-700" /> Auto-Email Invoices
                  </h4>
                  <p className="text-xs text-[#6E6E73] font-normal mt-0.5">Send invoices directly to tenant's email address.</p>
                </div>
                <Switch
                  checked={formData.autoEmailInvoices}
                  onCheckedChange={(val) => setFormData({ ...formData, autoEmailInvoices: val })}
                />
              </div>

              <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <div>
                  <h4 className="text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-700" /> Renewal Notice Window
                  </h4>
                  <p className="text-xs text-[#6E6E73] font-normal mt-0.5">Days prior to end date to alert renewal.</p>
                </div>
                <div className="w-36">
                  <Select value={formData.renewalNoticeDays} onValueChange={(v) => setFormData({ ...formData, renewalNoticeDays: v || "7" })}>
                    <SelectTrigger className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border border-slate-200 shadow-lg">
                      <SelectItem value="7" disabled={durationInfo ? durationInfo.days <= 7 : false} className="rounded-xl py-2 cursor-pointer font-medium text-xs text-[#1D1D1F]">1 Week Before</SelectItem>
                      <SelectItem value="15" disabled={durationInfo ? durationInfo.days <= 15 : false} className="rounded-xl py-2 cursor-pointer font-medium text-xs text-[#1D1D1F]">15 Days Before</SelectItem>
                      <SelectItem value="30" disabled={durationInfo ? durationInfo.days <= 30 : false} className="rounded-xl py-2 cursor-pointer font-medium text-xs text-[#1D1D1F]">1 Month Before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <Button type="submit" disabled={loading || approvedProperties.length === 0} className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 rounded-xl shadow-xs border-none cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Registering Lease..." : "Create Lease Agreement"}
            </Button>
            <Link href="/dashboard/leases">
              <button type="button" className="w-full h-9 border border-slate-200 bg-white text-[#1D1D1F] hover:bg-slate-50 font-medium text-xs px-4 rounded-xl shadow-2xs cursor-pointer flex items-center justify-center">
                Cancel
              </button>
            </Link>
          </div>
        </div>
      </form>
      </PausedAccountGate>
    </div>
  );
}

