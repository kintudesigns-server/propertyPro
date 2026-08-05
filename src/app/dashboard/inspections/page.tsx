"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShieldAlert, ArrowRight, User, Home, Calendar, Clock, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useModuleAccess } from "@/hooks/useModuleAccess";

type TabState = "AWAITING_INSPECTION" | "READY_FOR_SETTLEMENT" | "COMPLETED";

export default function InspectionsPage() {
  const { allowed, loading: checkingAccess } = useModuleAccess("inspections");
  const router = useRouter();

  const [leases, setLeases] = useState<any[]>([]);
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabState>("AWAITING_INSPECTION");

  const fetchLeases = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leases");
      const data = await res.json();
      if (Array.isArray(data)) {
        const moveOutLeases = data.filter(lease => 
          lease.status === "NOTICE_GIVEN" || 
          lease.status === "TERMINATED" || 
          ["MOVE_OUT_REQUESTED", "INSPECTION_SCHEDULED", "OWNER_REVIEWING", "INSPECTION_COMPLETED", "TENANT_ACCEPTED", "TENANT_DISPUTED", "DISPUTE_FINALIZED", "DEPOSIT_OVERDUE"].includes(lease.moveOutStatus)
        );
        setLeases(moveOutLeases);
      }
    } catch (err) {
      toast.error("Failed to load inspections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) {
      fetchLeases();
      fetch("/api/users?role=INSPECTOR")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Failed to load inspectors");
        })
        .then((data) => setInspectors(data))
        .catch((err) => console.error(err));
    }
  }, [allowed]);

  const getTabCount = (tab: TabState) => {
    return leases.filter(lease => {
      const status = lease.moveOutStatus;
      const isTerminated = lease.status === "TERMINATED";
      if (tab === "AWAITING_INSPECTION") {
        return !isTerminated && ["MOVE_OUT_REQUESTED", "INSPECTION_SCHEDULED", "OWNER_REVIEWING"].includes(status);
      } else if (tab === "READY_FOR_SETTLEMENT") {
        return !isTerminated && ["INSPECTION_COMPLETED", "TENANT_ACCEPTED", "TENANT_DISPUTED", "DISPUTE_FINALIZED", "DEPOSIT_OVERDUE"].includes(status);
      } else if (tab === "COMPLETED") {
        return isTerminated;
      }
      return false;
    }).length;
  };

  const getBorderColor = (lease: any) => {
    const isTerminated = lease.status === "TERMINATED";
    if (isTerminated) return "border-l-4 border-l-slate-300";

    if (lease.depositDueBy) {
      const daysLeft = Math.ceil((new Date(lease.depositDueBy).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 5) return "border-l-4 border-l-rose-500";
    }

    const status = lease.moveOutStatus;
    if (["MOVE_OUT_REQUESTED", "OWNER_REVIEWING", "TENANT_DISPUTED", "DISPUTE_FINALIZED", "DEPOSIT_OVERDUE"].includes(status)) {
      return "border-l-4 border-l-amber-500";
    }
    if (status === "INSPECTION_SCHEDULED") {
      return "border-l-4 border-l-slate-900";
    }
    if (["INSPECTION_COMPLETED", "TENANT_ACCEPTED"].includes(status)) {
      return "border-l-4 border-l-emerald-500";
    }
    return "border-l-4 border-l-slate-300";
  };

  const filteredLeases = leases.filter(lease => {
    const term = search.toLowerCase();
    const propertyName = lease.unit?.property?.name?.toLowerCase() || "";
    const unitName = lease.unit?.name?.toLowerCase() || "";
    const tenantName = lease.tenant?.name?.toLowerCase() || "";
    const matchesSearch = propertyName.includes(term) || unitName.includes(term) || tenantName.includes(term);

    const status = lease.moveOutStatus;
    const isTerminated = lease.status === "TERMINATED";
    
    if (activeTab === "AWAITING_INSPECTION") {
      return matchesSearch && !isTerminated && ["MOVE_OUT_REQUESTED", "INSPECTION_SCHEDULED", "OWNER_REVIEWING"].includes(status);
    } else if (activeTab === "READY_FOR_SETTLEMENT") {
      return matchesSearch && !isTerminated && ["INSPECTION_COMPLETED", "TENANT_ACCEPTED", "TENANT_DISPUTED", "DISPUTE_FINALIZED", "DEPOSIT_OVERDUE"].includes(status);
    } else if (activeTab === "COMPLETED") {
      return matchesSearch && isTerminated;
    }
    return false;
  }).sort((a, b) => {
    const dateA = a.moveOutRequestDate ? new Date(a.moveOutRequestDate).getTime() : 0;
    const dateB = b.moveOutRequestDate ? new Date(b.moveOutRequestDate).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6 font-sans">
      {/* Page Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
        <div className="h-10 w-10 bg-slate-100 text-slate-800 border border-slate-200/80 rounded-xl flex items-center justify-center shrink-0">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Turnovers & Inspections</h1>
          <p className="text-xs text-[#6E6E73] font-normal mt-0.5">Manage all upcoming move-outs and schedule walkthrough inspections across your portfolio.</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl w-fit border border-slate-200/30">
          <button
            onClick={() => setActiveTab("AWAITING_INSPECTION")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === "AWAITING_INSPECTION" ? "bg-white text-[#1D1D1F] shadow-2xs" : "text-[#6E6E73] hover:text-[#1D1D1F]"}`}
          >
            Awaiting Inspection
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${activeTab === "AWAITING_INSPECTION" ? "bg-slate-100 text-[#1D1D1F]" : "bg-slate-200/60 text-[#6E6E73]"}`}>{getTabCount("AWAITING_INSPECTION")}</span>
          </button>
          <button
            onClick={() => setActiveTab("READY_FOR_SETTLEMENT")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === "READY_FOR_SETTLEMENT" ? "bg-white text-[#1D1D1F] shadow-2xs" : "text-[#6E6E73] hover:text-[#1D1D1F]"}`}
          >
            Ready for Settlement
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${activeTab === "READY_FOR_SETTLEMENT" ? "bg-slate-100 text-[#1D1D1F]" : "bg-slate-200/60 text-[#6E6E73]"}`}>{getTabCount("READY_FOR_SETTLEMENT")}</span>
          </button>
          <button
            onClick={() => setActiveTab("COMPLETED")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === "COMPLETED" ? "bg-white text-[#1D1D1F] shadow-2xs" : "text-[#6E6E73] hover:text-[#1D1D1F]"}`}
          >
            Completed
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${activeTab === "COMPLETED" ? "bg-slate-100 text-[#1D1D1F]" : "bg-slate-200/60 text-[#6E6E73]"}`}>{getTabCount("COMPLETED")}</span>
          </button>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by property, unit, or tenant..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9 bg-white border-slate-200 rounded-xl font-normal text-xs text-[#1D1D1F] focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 shadow-2xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-48 animate-pulse bg-slate-50 border-slate-100 rounded-3xl" />
          ))}
        </div>
      ) : filteredLeases.length === 0 ? (
        <Card className="p-16 text-center rounded-3xl shadow-xs border-slate-200 bg-white">
          <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-200">
            <ClipboardCheck className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-[#1D1D1F]">No active inspections</h3>
          <p className="text-xs text-[#6E6E73] mt-1 font-normal">There are currently no leases pending a walkthrough inspection in this section.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredLeases.map((lease) => {
            const propertyImg = lease.unit?.property?.coverPhoto || lease.unit?.property?.images?.[0] || lease.unit?.images?.[0] || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80";

            return (
              <Card key={lease.id} className={`p-0 overflow-hidden rounded-3xl shadow-xs hover:shadow-md transition-all border border-slate-200 bg-white flex flex-col ${getBorderColor(lease)}`}>
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-12 w-12 rounded-2xl overflow-hidden bg-slate-200 border border-slate-200/80 shrink-0 shadow-2xs">
                      <img
                        src={propertyImg}
                        alt={lease.unit?.property?.name || "Property photo"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight flex items-center gap-1.5 truncate">
                        {lease.unit?.property?.name} • {lease.unit?.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <p className="text-xs font-normal text-[#6E6E73] truncate">{lease.tenant?.name || "Unknown Tenant"}</p>
                      </div>
                    </div>
                  </div>
                  <span className={`shrink-0 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-md border shadow-2xs ${
                    lease.moveOutStatus === "INSPECTION_SCHEDULED" ? "bg-slate-100 text-slate-800 border-slate-200" :
                    lease.moveOutStatus === "MOVE_OUT_REQUESTED" ? "bg-amber-50 text-amber-800 border-amber-200" :
                    lease.moveOutStatus === "OWNER_REVIEWING" ? "bg-slate-100 text-slate-800 border-slate-200" :
                    lease.moveOutStatus === "INSPECTION_COMPLETED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    lease.status === "TERMINATED" ? "bg-slate-100 text-slate-500 border-slate-200" :
                    "bg-slate-100 text-slate-800 border-slate-200"
                  }`}>
                    {lease.status === "TERMINATED" ? "Completed" :
                     lease.moveOutStatus === "INSPECTION_SCHEDULED" ? "Scheduled" : 
                     lease.moveOutStatus === "MOVE_OUT_REQUESTED" ? "Awaiting Action" : 
                     lease.moveOutStatus === "OWNER_REVIEWING" ? "Reviewing findings" :
                     lease.moveOutStatus === "INSPECTION_COMPLETED" ? "Awaiting Settlement" :
                     lease.moveOutStatus?.replace(/_/g, " ")}
                  </span>
                </div>
              
              <div className="p-5 flex-1 flex flex-col justify-between gap-5">
                <div className="space-y-3">
                  {/* Dynamic Pipeline Info */}
                  {(() => {
                    if (lease.preliminaryInspectionStatus === "SCHEDULED") {
                      return (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-normal text-[#6E6E73] flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" /> Prelim Date
                            </span>
                            <span className="font-semibold text-[#1D1D1F]">
                              {lease.preliminaryInspectionDate ? new Date(lease.preliminaryInspectionDate).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Pending"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-normal text-[#6E6E73] flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-slate-400" /> Inspector
                            </span>
                            <span className="font-semibold text-[#1D1D1F]">
                              {lease.preliminaryInspectorId === "SELF" ? "Me (Self-Inspect)" : lease.preliminaryInspectorId ? inspectors.find(i => i.id === lease.preliminaryInspectorId)?.name || "Assigned" : "Pending Assignment"}
                            </span>
                          </div>
                        </>
                      );
                    } else if (lease.moveOutStatus === "INSPECTION_SCHEDULED") {
                      return (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-normal text-[#6E6E73] flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" /> Final Date
                            </span>
                            <span className="font-semibold text-[#1D1D1F]">
                              {lease.inspectionDate ? new Date(lease.inspectionDate).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Pending"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-normal text-[#6E6E73] flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-slate-400" /> Inspector
                            </span>
                            <span className="font-semibold text-[#1D1D1F]">
                              {lease.moveOutInspectorId === "SELF" ? "Me (Self-Inspect)" : lease.moveOutInspectorId ? inspectors.find(i => i.id === lease.moveOutInspectorId)?.name || "Assigned" : "Pending Assignment"}
                            </span>
                          </div>
                        </>
                      );
                    } else {
                      return (
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-normal text-[#6E6E73] flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" /> Move-Out Date
                          </span>
                          <span className="font-semibold text-[#1D1D1F]">
                            {lease.moveOutDate ? new Date(lease.moveOutDate).toLocaleDateString() : "Pending"}
                          </span>
                        </div>
                      );
                    }
                  })()}

                  {/* Legal Return Deadline Countdown Badge */}
                  {lease.depositDueBy && lease.status !== "TERMINATED" && (
                    <div className={`mt-3 p-3 rounded-2xl flex items-center gap-2 text-xs font-normal ${
                      (() => {
                        const daysLeft = Math.ceil((new Date(lease.depositDueBy).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        return daysLeft <= 5 ? "bg-rose-50 text-rose-700 border border-rose-200/80" : "bg-amber-50 text-amber-900 border border-amber-200/80";
                      })()
                    }`}>
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>
                        {(() => {
                          const daysLeft = Math.ceil((new Date(lease.depositDueBy).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          return daysLeft <= 0 ? "Deposit return deadline is OVERDUE!" : `${daysLeft} days left to legally return deposit`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-2">
                  <Button 
                    onClick={() => router.push(`/dashboard/leases/${lease.id}`)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-9 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer border-none"
                  >
                    Manage Turnover Pipeline <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
        </div>
      )}
    </div>
  );
}
