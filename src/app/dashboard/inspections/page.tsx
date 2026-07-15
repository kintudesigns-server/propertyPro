"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShieldAlert, ArrowRight, User, Home, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { MoreHorizontal } from "lucide-react";

type TabState = "AWAITING_INSPECTION" | "READY_FOR_SETTLEMENT" | "COMPLETED";

export default function InspectionsPage() {
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
        // Filter to only leases in active move-out flow waiting for inspection
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
    fetchLeases();
    fetch("/api/users?role=INSPECTOR")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to load inspectors");
      })
      .then((data) => setInspectors(data))
      .catch((err) => console.error(err));
  }, []);

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

    // Check if deposit due deadline is close (<= 5 days) or passed
    if (lease.depositDueBy) {
      const daysLeft = Math.ceil((new Date(lease.depositDueBy).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 5) return "border-l-4 border-l-red-500";
    }

    const status = lease.moveOutStatus;
    if (["MOVE_OUT_REQUESTED", "OWNER_REVIEWING", "TENANT_DISPUTED", "DISPUTE_FINALIZED", "DEPOSIT_OVERDUE"].includes(status)) {
      return "border-l-4 border-l-amber-500";
    }
    if (status === "INSPECTION_SCHEDULED") {
      return "border-l-4 border-l-blue-500";
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
    // Sort by moveOutRequestDate descending (latest requests first)
    const dateA = a.moveOutRequestDate ? new Date(a.moveOutRequestDate).getTime() : 0;
    const dateB = b.moveOutRequestDate ? new Date(b.moveOutRequestDate).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 relative">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-indigo-500" />
          Turnovers & Inspections
        </h1>
        <p className="text-sm font-semibold text-slate-500 mt-1">
          Manage all upcoming move-outs and schedule walkthrough inspections across your portfolio.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("AWAITING_INSPECTION")}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${activeTab === "AWAITING_INSPECTION" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Awaiting Inspection
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-extrabold">{getTabCount("AWAITING_INSPECTION")}</span>
          </button>
          <button
            onClick={() => setActiveTab("READY_FOR_SETTLEMENT")}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${activeTab === "READY_FOR_SETTLEMENT" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Ready for Settlement
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-extrabold">{getTabCount("READY_FOR_SETTLEMENT")}</span>
          </button>
          <button
            onClick={() => setActiveTab("COMPLETED")}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${activeTab === "COMPLETED" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Completed
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-extrabold">{getTabCount("COMPLETED")}</span>
          </button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by property, unit, or tenant..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 bg-white border-slate-200 rounded-xl font-medium text-sm"
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
        <Card className="p-12 text-center rounded-3xl shadow-sm border-slate-200 bg-white">
          <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No active inspections</h3>
          <p className="text-sm text-slate-500 mt-1 font-medium">There are currently no leases pending a walkthrough inspection.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredLeases.map((lease) => (
            <Card key={lease.id} className={`p-0 overflow-hidden rounded-3xl shadow-sm hover:shadow-md transition-all border-slate-200 bg-white flex flex-col ${getBorderColor(lease)}`}>
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Home className="h-4 w-4 text-indigo-500" />
                    {lease.unit?.property?.name} • {lease.unit?.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-600">{lease.tenant?.name || "Unknown Tenant"}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider ${
                  lease.moveOutStatus === "INSPECTION_SCHEDULED" ? "bg-blue-100 text-blue-700" :
                  lease.moveOutStatus === "MOVE_OUT_REQUESTED" ? "bg-amber-100 text-amber-700" :
                  lease.moveOutStatus === "OWNER_REVIEWING" ? "bg-purple-100 text-purple-700" :
                  lease.moveOutStatus === "INSPECTION_COMPLETED" ? "bg-emerald-100 text-emerald-700" :
                  lease.status === "TERMINATED" ? "bg-slate-100 text-slate-700" :
                  "bg-indigo-100 text-indigo-700"
                }`}>
                  {lease.status === "TERMINATED" ? "Completed" :
                   lease.moveOutStatus === "INSPECTION_SCHEDULED" ? "Scheduled" : 
                   lease.moveOutStatus === "MOVE_OUT_REQUESTED" ? "Awaiting Action" : 
                   lease.moveOutStatus === "OWNER_REVIEWING" ? "Reviewing findings" :
                   lease.moveOutStatus === "INSPECTION_COMPLETED" ? "Awaiting Settlement" :
                   lease.moveOutStatus?.replace(/_/g, " ")}
                </span>
              </div>
              
              <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                <div className="space-y-3">
                  {/* Dynamic Pipeline Info */}
                  {(() => {
                    // Figure out what step we are at
                    if (lease.preliminaryInspectionStatus === "SCHEDULED") {
                      return (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-slate-500 flex items-center gap-2">
                              <Calendar className="h-4 w-4" /> Prelim Date
                            </span>
                            <span className="font-bold text-slate-900">
                              {lease.preliminaryInspectionDate ? new Date(lease.preliminaryInspectionDate).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Pending"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-slate-500 flex items-center gap-2">
                              <User className="h-4 w-4" /> Inspector
                            </span>
                            <span className="font-bold text-indigo-600">
                              {lease.preliminaryInspectorId === "SELF" ? "Me (Self-Inspect)" : lease.preliminaryInspectorId ? inspectors.find(i => i.id === lease.preliminaryInspectorId)?.name || "Assigned" : "Pending Assignment"}
                            </span>
                          </div>
                        </>
                      );
                    } else if (lease.moveOutStatus === "INSPECTION_SCHEDULED") {
                      return (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-slate-500 flex items-center gap-2">
                              <Calendar className="h-4 w-4" /> Final Date
                            </span>
                            <span className="font-bold text-slate-900">
                              {lease.inspectionDate ? new Date(lease.inspectionDate).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Pending"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-slate-500 flex items-center gap-2">
                              <User className="h-4 w-4" /> Inspector
                            </span>
                            <span className="font-bold text-indigo-600">
                              {lease.moveOutInspectorId === "SELF" ? "Me (Self-Inspect)" : lease.moveOutInspectorId ? inspectors.find(i => i.id === lease.moveOutInspectorId)?.name || "Assigned" : "Pending Assignment"}
                            </span>
                          </div>
                        </>
                      );
                    } else {
                      return (
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Move-Out Date
                          </span>
                          <span className="font-bold text-slate-900">
                            {lease.moveOutDate ? new Date(lease.moveOutDate).toLocaleDateString() : "Pending"}
                          </span>
                        </div>
                      );
                    }
                  })()}

                  {/* Legal Return Deadline Countdown Badge */}
                  {lease.depositDueBy && lease.status !== "TERMINATED" && (
                    <div className={`mt-3 p-2.5 rounded-xl flex items-center gap-2 text-xs font-bold ${
                      (() => {
                        const daysLeft = Math.ceil((new Date(lease.depositDueBy).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        return daysLeft <= 5 ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100";
                      })()
                    }`}>
                      <Clock className="h-4 w-4" />
                      <span>
                        {(() => {
                          const daysLeft = Math.ceil((new Date(lease.depositDueBy).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          return daysLeft <= 0 ? "Deposit return deadline is OVERDUE!" : `${daysLeft} days left to legally return deposit`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-4">
                  <Button 
                    onClick={() => router.push(`/dashboard/leases/${lease.id}`)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 rounded-xl shadow-none flex items-center justify-center gap-2"
                  >
                    Manage Turnover Pipeline <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
