"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, ClipboardCheck, CheckCircle2, User, MapPin, Eye, ArrowRight, Camera, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureBlockedOverlay } from "@/components/subscription/FeatureBlockedBanner";

export default function InspectorInspectionsPage() {
  const featureAccess = useFeatureAccess("submit_reports");
  const { data: session, status } = useSession();
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeaseForDetails, setSelectedLeaseForDetails] = useState<any>(null);

  const fetchLeases = async () => {
    try {
      const res = await fetch("/api/leases");
      if (!res.ok) throw new Error("Failed to fetch inspections.");
      const data = await res.json();
      setLeases(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load inspections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchLeases();
    }
  }, [status]);

  if (featureAccess.loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
        <p className="text-slate-500 font-extrabold text-sm tracking-wider uppercase">Verifying report permissions...</p>
      </div>
    );
  }

  const isBlocked = !featureAccess.allowed;

  if (loading || status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
        <p className="text-slate-500 font-extrabold text-sm tracking-wider uppercase">Loading inspections...</p>
      </div>
    );
  }

  const userId = (session?.user as any)?.id;

  // Filter scheduled walkthroughs
  const scheduledWalkthroughs = leases.flatMap((lease) => {
    const list = [];
    // Check preliminary
    if (
      lease.preliminaryInspectorId === userId &&
      lease.preliminaryInspectionStatus === "SCHEDULED"
    ) {
      list.push({
        ...lease,
        walkthroughType: "PRELIMINARY",
        date: lease.preliminaryInspectionDate,
        statusLabel: "Preliminary Walkthrough Scheduled",
      });
    }
    // Check final
    if (
      lease.moveOutInspectorId === userId &&
      lease.moveOutStatus === "INSPECTION_SCHEDULED"
    ) {
      list.push({
        ...lease,
        walkthroughType: "FINAL",
        date: lease.inspectionDate, // Use actual scheduled inspection date/time
        statusLabel: "Final Walkthrough Scheduled",
      });
    }
    return list;
  });

  // Filter completed walkthroughs
  const completedWalkthroughs = leases.flatMap((lease) => {
    const list = [];
    // Check preliminary completed
    if (
      lease.preliminaryInspectorId === userId &&
      lease.preliminaryInspectionStatus === "COMPLETED"
    ) {
      list.push({
        ...lease,
        walkthroughType: "PRELIMINARY",
        date: lease.preliminaryInspectionDate,
        notes: lease.preliminaryInspectionNotes,
        signedAt: lease.preliminaryInspectorSignedAt,
        deductionsCount: lease.preliminaryDeductions ? (lease.preliminaryDeductions as any[]).length : 0,
        statusLabel: "Preliminary Walkthrough Completed",
      });
    }
    // Check final completed
    if (
      lease.moveOutInspectorId === userId &&
      ["OWNER_REVIEWING", "INSPECTION_COMPLETED", "COMPLETED", "FINALIZED"].includes(lease.moveOutStatus)
    ) {
      list.push({
        ...lease,
        walkthroughType: "FINAL",
        date: lease.inspectionDate,
        notes: lease.inspectionNotes,
        signedAt: lease.inspectorSignedAt,
        deductionsCount: lease.deductions ? (lease.deductions as any[]).length : 0,
        statusLabel: "Final Walkthrough Completed",
      });
    }
    return list;
  });

  return (
    <div className="relative">
      {isBlocked && (
        <FeatureBlockedOverlay
          featureLabel={featureAccess.featureLabel || "Submit Inspection Reports"}
          reason={featureAccess.reason}
          adminNote={featureAccess.adminNote}
          expiresAt={featureAccess.expiresAt}
        />
      )}
      <div className={isBlocked ? "pointer-events-none select-none blur-[2.5px] opacity-70" : ""}>
      <div className="flex flex-col gap-6 max-w-[1200px] w-full pb-16 pt-4 font-sans">
      <div>
        <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">Move-Out Walkthroughs</h1>
        <p className="text-xs font-normal text-[#6E6E73] mt-0.5">
          Perform scheduled inspections and keep track of your completed walkthrough reports.
        </p>
      </div>

      <Tabs defaultValue="scheduled" className="w-full font-sans">
        <TabsList className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs w-fit mb-6">
          <TabsTrigger value="scheduled" className="px-3 py-1.5 rounded-lg text-xs font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-2xs text-[#6E6E73] cursor-pointer transition-all">
            Scheduled ({scheduledWalkthroughs.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="px-3 py-1.5 rounded-lg text-xs font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-2xs text-[#6E6E73] cursor-pointer transition-all">
            Completed ({completedWalkthroughs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="space-y-4 outline-none">
          {scheduledWalkthroughs.length === 0 ? (
            <div className="text-center bg-white border border-slate-200 rounded-3xl py-24 shadow-2xs font-sans">
              <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-700 shadow-2xs">
                <Calendar className="h-4 w-4 text-slate-500" />
              </div>
              <h3 className="text-xs font-semibold text-[#1D1D1F] mb-1">No Scheduled Walkthroughs</h3>
              <p className="text-xs font-normal text-[#6E6E73] max-w-sm mx-auto">
                You don't have any pending walkthrough inspections assigned to you at the moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledWalkthroughs.map((w: any, idx: number) => (
                <div key={idx} className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 space-y-4 font-sans hover:border-slate-300 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border shadow-2xs ${w.walkthroughType === "PRELIMINARY" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>
                        {w.walkthroughType} WALKTHROUGH
                      </span>
                      <span className="text-xs font-normal text-[#6E6E73]">{w.statusLabel}</span>
                    </div>
                    <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight">
                      {w.unit?.property?.name}
                    </h3>
                    <p className="text-xs font-normal text-[#6E6E73] flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" /> Unit {w.unit?.name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-sans shadow-2xs">
                    <div>
                      <p className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider mb-0.5">Tenant</p>
                      <p className="text-xs font-semibold text-[#1D1D1F]">{w.tenant?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider mb-0.5">Target Date</p>
                      <p className="text-xs font-semibold text-[#1D1D1F]">{w.date ? new Date(w.date).toLocaleDateString() : "N/A"}</p>
                    </div>
                  </div>

                  <Link href={`/dashboard/inspector/inspections/${w.id}?type=${w.walkthroughType}`} className="block">
                    <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl h-9 shadow-xs border-none cursor-pointer flex items-center justify-center gap-2">
                      <ClipboardCheck className="h-4 w-4" /> Conduct Walkthrough
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 outline-none">
          {completedWalkthroughs.length === 0 ? (
            <div className="text-center bg-white border border-slate-200 rounded-3xl py-24 shadow-2xs font-sans">
              <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-700 shadow-2xs">
                <CheckCircle2 className="h-4 w-4 text-slate-500" />
              </div>
              <h3 className="text-xs font-semibold text-[#1D1D1F] mb-1">No Completed Walkthroughs</h3>
              <p className="text-xs font-normal text-[#6E6E73] max-w-sm mx-auto">
                Walkthrough inspections you complete will be cataloged here for your records.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedWalkthroughs.map((w: any, idx: number) => (
                <div key={idx} className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 space-y-4 font-sans hover:border-slate-300 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border shadow-2xs ${w.walkthroughType === "PRELIMINARY" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                        {w.walkthroughType} - COMPLETED
                      </span>
                      {w.signedAt && (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Signed off
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight">
                      {w.unit?.property?.name}
                    </h3>
                    <p className="text-xs font-normal text-[#6E6E73] flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" /> Unit {w.unit?.name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-sans shadow-2xs">
                    <div>
                      <span className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block mb-0.5">Tenant</span>
                      <span className="text-xs font-semibold text-[#1D1D1F]">{w.tenant?.name || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block mb-0.5">Deductions Logged</span>
                      <span className="text-xs font-semibold text-rose-600">{w.deductionsCount} items</span>
                    </div>
                  </div>
                  
                  {w.notes && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-sans shadow-2xs">
                      <strong className="block text-xs font-normal text-[#6E6E73] uppercase tracking-wider mb-1">Notes Summary</strong>
                      <p className="text-xs font-normal text-[#1D1D1F] line-clamp-2">{w.notes}</p>
                    </div>
                  )}

                  {w.signedAt && (
                    <div className="text-xs font-normal text-[#6E6E73]">
                      Signed off on: <strong className="font-semibold text-[#1D1D1F]">{new Date(w.signedAt).toLocaleString()}</strong>
                    </div>
                  )}

                  <Button
                    onClick={() => setSelectedLeaseForDetails(w)}
                    className="w-full border border-slate-200 bg-white text-[#1D1D1F] hover:bg-slate-50 font-medium text-xs rounded-xl h-9 shadow-2xs cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    <Eye className="h-4 w-4 text-slate-500" /> View Report
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedLeaseForDetails} onOpenChange={(open) => !open && setSelectedLeaseForDetails(null)}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 md:p-8 font-sans border border-slate-200 bg-white shadow-2xs">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-semibold text-[#1D1D1F] tracking-tight flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-slate-700" /> 
              {selectedLeaseForDetails?.walkthroughType} Walkthrough Report
            </DialogTitle>
            <DialogDescription className="text-xs font-normal text-[#6E6E73]">
              Completed walkthrough details for Unit {selectedLeaseForDetails?.unit?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 max-h-[60vh] overflow-y-auto pr-1 font-sans">
            {/* General Notes */}
            {selectedLeaseForDetails?.notes && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
                <p className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider mb-1">Inspector Notes</p>
                <p className="text-xs font-normal text-[#1D1D1F]">{selectedLeaseForDetails.notes}</p>
              </div>
            )}

            {/* Logged items */}
            <div className="space-y-3">
              <p className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider">Flagged Issues ({selectedLeaseForDetails?.deductionsCount || 0})</p>
              {(() => {
                const targetDeductions = selectedLeaseForDetails?.walkthroughType === "PRELIMINARY" 
                  ? selectedLeaseForDetails?.preliminaryDeductions 
                  : selectedLeaseForDetails?.deductions;

                if (Array.isArray(targetDeductions) && targetDeductions.length > 0) {
                  return targetDeductions.map((d: any, idx: number) => (
                    <div key={idx} className="flex gap-3 items-start p-3.5 bg-slate-50 border border-slate-200 rounded-2xl shadow-2xs">
                      <div className="h-8 w-8 bg-white border border-slate-200/80 rounded-xl flex items-center justify-center text-amber-600 shadow-2xs shrink-0 mt-0.5">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1D1D1F]">{d.description}</p>
                        <p className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider mt-1">Category: {d.category}</p>
                        {d.photoUrl && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 max-w-[150px] shadow-2xs">
                            <img 
                              src={d.photoUrl} 
                              alt="Damage evidence" 
                              className="w-full h-24 object-cover cursor-zoom-in"
                              onClick={() => window.open(d.photoUrl, '_blank')}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ));
                }

                return (
                  <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-xs font-semibold">No issues were flagged during this walkthrough!</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </div>
    </div>
  );
}

