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

export default function InspectorInspectionsPage() {
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

  if (loading || status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-slate-400 font-extrabold text-sm tracking-wider uppercase">Loading inspections...</p>
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
    <div className="flex flex-col gap-8 max-w-[1200px] w-full pb-10 pt-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[#0F172A]">Move-Out Walkthroughs</h1>
        <p className="text-slate-500 font-semibold mt-1">
          Perform scheduled inspections and keep track of your completed walkthrough reports.
        </p>
      </div>

      <Tabs defaultValue="scheduled" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl mb-6">
          <TabsTrigger value="scheduled" className="rounded-lg font-bold text-sm">
            Scheduled ({scheduledWalkthroughs.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg font-bold text-sm">
            Completed ({completedWalkthroughs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="space-y-4 outline-none">
          {scheduledWalkthroughs.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 shadow-none py-12 rounded-2xl">
              <CardContent className="text-center space-y-2">
                <Calendar className="h-10 w-10 text-slate-400 mx-auto" />
                <h3 className="font-bold text-[#0F172A] text-lg">No Scheduled Walkthroughs</h3>
                <p className="text-slate-500 text-sm font-semibold max-w-sm mx-auto">
                  You don't have any pending walkthrough inspections assigned to you at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledWalkthroughs.map((w: any, idx: number) => (
                <Card key={idx} className="border-[#E2E8F0] shadow-sm rounded-2xl hover:border-indigo-100 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={w.walkthroughType === "PRELIMINARY" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}>
                        {w.walkthroughType} WALKTHROUGH
                      </Badge>
                      <span className="text-xs text-slate-400 font-bold">{w.statusLabel}</span>
                    </div>
                    <CardTitle className="text-lg font-black text-[#0F172A]">
                      {w.unit?.property?.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 font-semibold text-slate-500">
                      <MapPin className="h-3.5 w-3.5" /> Unit {w.unit?.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Tenant</p>
                        <p className="font-extrabold text-[#0F172A]">{w.tenant?.name || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Target Date</p>
                        <p className="font-extrabold text-[#0F172A]">{w.date ? new Date(w.date).toLocaleDateString() : "N/A"}</p>
                      </div>
                    </div>
                    <Link href={`/dashboard/inspector/inspections/${w.id}?type=${w.walkthroughType}`}>
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl h-11 shadow-sm gap-2">
                        <ClipboardCheck className="h-4 w-4" /> Conduct Walkthrough
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 outline-none">
          {completedWalkthroughs.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 shadow-none py-12 rounded-2xl">
              <CardContent className="text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-slate-400 mx-auto" />
                <h3 className="font-bold text-[#0F172A] text-lg">No Completed Walkthroughs</h3>
                <p className="text-slate-500 text-sm font-semibold max-w-sm mx-auto">
                  Walkthrough inspections you complete will be cataloged here for your records.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedWalkthroughs.map((w: any, idx: number) => (
                <Card key={idx} className="border-[#E2E8F0] shadow-sm rounded-2xl bg-slate-50/30">
                  <CardHeader className="pb-3 border-b border-slate-100 bg-white rounded-t-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={w.walkthroughType === "PRELIMINARY" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>
                        {w.walkthroughType} - COMPLETED
                      </Badge>
                      {w.signedAt && (
                        <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Signed off
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-lg font-black text-[#0F172A]">
                      {w.unit?.property?.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 font-semibold text-slate-500">
                      <MapPin className="h-3.5 w-3.5" /> Unit {w.unit?.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                      <div>
                        <span className="text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Tenant</span>
                        <span className="font-extrabold text-[#0F172A]">{w.tenant?.name || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Deductions Logged</span>
                        <span className="font-extrabold text-red-600">{w.deductionsCount} items</span>
                      </div>
                    </div>
                    
                    {w.notes && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                        <strong className="block text-slate-400 font-bold uppercase tracking-wider mb-1">Notes Summary</strong>
                        <p className="text-slate-700 font-medium line-clamp-2">{w.notes}</p>
                      </div>
                    )}

                    {w.signedAt && (
                      <div className="text-[11px] text-slate-400 font-medium pb-2">
                        Signed off on: <strong>{new Date(w.signedAt).toLocaleString()}</strong>
                      </div>
                    )}

                    <Button
                      onClick={() => setSelectedLeaseForDetails(w)}
                      className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl h-10 text-xs shadow-none mt-2 flex items-center justify-center gap-2"
                    >
                      <Eye className="h-4 w-4" /> View Report
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedLeaseForDetails} onOpenChange={(open) => !open && setSelectedLeaseForDetails(null)}>
        <DialogContent className="bg-white border-0 text-slate-800 rounded-3xl max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-indigo-900">
              <ClipboardCheck className="h-5 w-5 text-indigo-600" /> 
              {selectedLeaseForDetails?.walkthroughType} Walkthrough Report
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Completed walkthrough details for Unit {selectedLeaseForDetails?.unit?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* General Notes */}
            {selectedLeaseForDetails?.notes && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Inspector Notes</p>
                <p className="text-sm font-semibold text-slate-700">{selectedLeaseForDetails.notes}</p>
              </div>
            )}

            {/* Logged items */}
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Flagged Issues ({selectedLeaseForDetails?.deductionsCount || 0})</p>
              {(() => {
                const targetDeductions = selectedLeaseForDetails?.walkthroughType === "PRELIMINARY" 
                  ? selectedLeaseForDetails?.preliminaryDeductions 
                  : selectedLeaseForDetails?.deductions;

                if (Array.isArray(targetDeductions) && targetDeductions.length > 0) {
                  return targetDeductions.map((d: any, idx: number) => (
                    <div key={idx} className="flex gap-3 items-start p-3 bg-slate-50/50 border border-slate-200 rounded-2xl">
                      <div className="bg-amber-100 text-amber-600 h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <AlertCircle className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm">{d.description}</p>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Category: {d.category}</p>
                        {d.photoUrl && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-slate-100 max-w-[150px]">
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
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="font-bold text-sm">No issues were flagged during this walkthrough!</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
