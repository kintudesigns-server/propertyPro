"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Calendar, FileText, CheckCircle2, ShieldAlert, Eye, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function InspectorActiveTasksPage() {
  const { status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInspectorRequests = async () => {
    try {
      const res = await fetch("/api/maintenance");
      if (!res.ok) throw new Error("Failed to load requests");
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load assigned inspections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchInspectorRequests();
    }
  }, [status]);

  // Action Modals State
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [actionData, setActionData] = useState<any>({});

  const handleUpdateStatus = async (requestId: string, newStatus: string, payload: any = {}) => {
    toast.info(`Updating ticket...`);
    try {
      const res = await fetch("/api/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId, status: newStatus, ...payload }),
      });

      if (res.ok) {
        toast.success(`Ticket successfully updated!`);
        setActiveModal(null);
        setSelectedTicket(null);
        fetchInspectorRequests();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update ticket");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating ticket.");
    }
  };

  const submitAction = () => {
    if (!selectedTicket) return;
    
    if (activeModal === "SCHEDULE_DIAGNOSIS") {
      handleUpdateStatus(selectedTicket.id, "DIAGNOSIS_SCHEDULED", { diagnosisDate: actionData.date });
    } else if (activeModal === "SUBMIT_ESTIMATE") {
      if (selectedTicket.priority === "EMERGENCY") {
        // Fast track bypasses approval
        handleUpdateStatus(selectedTicket.id, "APPROVED", { 
          estimatedLabor: actionData.labor, 
          estimatedMaterials: actionData.materials,
          inspectorNotes: actionData.notes 
        });
      } else {
        handleUpdateStatus(selectedTicket.id, "PENDING_APPROVAL", { 
          estimatedLabor: actionData.labor, 
          estimatedMaterials: actionData.materials,
          inspectorNotes: actionData.notes 
        });
      }
    } else if (activeModal === "SCHEDULE_REPAIR") {
      handleUpdateStatus(selectedTicket.id, "REPAIR_SCHEDULED", { repairDate: actionData.date });
    } else if (activeModal === "RESOLVE") {
      handleUpdateStatus(selectedTicket.id, "RESOLVED", { 
        finalLabor: actionData.labor, 
        finalMaterials: actionData.materials 
      });
    } else if (activeModal === "QUICK_RESOLVE") {
      handleUpdateStatus(selectedTicket.id, "RESOLVED", { 
        action: "QUICK_RESOLVE",
        finalLabor: actionData.labor, 
        finalMaterials: actionData.materials,
        inspectorNotes: actionData.notes
      });
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3B82F6]"></div>
        <p className="text-slate-400 font-extrabold text-sm tracking-wider uppercase">Loading active tasks...</p>
      </div>
    );
  }

  const activeTasks = requests.filter((r) => !["RESOLVED", "CLOSED"].includes(r.status));

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] w-full pb-10 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#0F172A]">Active Tasks</h1>
          <p className="text-slate-500 font-semibold mt-1">Verify issues, carry out repairs, and mark tasks as resolved.</p>
        </div>
      </div>

      <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {activeTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 font-semibold text-sm">No active tasks assigned to you right now.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-[#E2E8F0]">
                    <TableHead className="text-slate-500 font-bold text-[11px] uppercase tracking-wider h-10 px-6">Ticket Info</TableHead>
                    <TableHead className="text-slate-500 font-bold text-[11px] uppercase tracking-wider h-10">Property & Unit</TableHead>
                    <TableHead className="text-slate-500 font-bold text-[11px] uppercase tracking-wider h-10">Tenant Info</TableHead>
                    <TableHead className="text-slate-500 font-bold text-[11px] uppercase tracking-wider h-10">Priority</TableHead>
                    <TableHead className="text-slate-500 font-bold text-[11px] uppercase tracking-wider h-10">Status</TableHead>
                    <TableHead className="text-right text-slate-500 font-bold text-[11px] uppercase tracking-wider h-10 pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTasks.map((t) => (
                    <TableRow key={t.id} className="border-[#E2E8F0] hover:bg-slate-50/50 transition-colors">
                      <TableCell className="px-6 py-4">
                        <strong className="block font-bold text-[#0F172A]">{t.title}</strong>
                        <span className="text-xs text-slate-500 block max-w-xs truncate mt-0.5">{t.description}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <strong className="block font-bold text-[#0F172A]">{t.unit.property.name}</strong>
                        <span className="text-xs text-slate-500 mt-0.5 block">{t.unit.name} ({t.unit.property.city})</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <strong className="block font-bold text-[#0F172A]">{t.tenant.name}</strong>
                        <span className="text-xs text-slate-500 mt-0.5 block">{t.tenant.phone || "No phone number"}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className={`rounded-full font-bold px-3 py-0.5 text-[10px] uppercase tracking-wider ${
                          t.priority === "HIGH" || t.priority === "EMERGENCY"
                            ? "bg-red-50 text-red-600 border-red-200"
                            : "bg-orange-50 text-orange-600 border-orange-200"
                        }`}>
                          {t.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className={`rounded-full font-bold px-3 py-0.5 text-[10px] uppercase tracking-wider ${
                          t.status === "ASSIGNED" ? "bg-slate-100 text-slate-600 border-slate-200" :
                          t.status === "DIAGNOSIS_SCHEDULED" ? "bg-blue-50 text-blue-600 border-blue-200" :
                          t.status === "PENDING_APPROVAL" ? "bg-amber-50 text-amber-600 border-amber-200" :
                          t.status === "APPROVED" ? "bg-indigo-50 text-indigo-600 border-indigo-200" :
                          t.status === "REPAIR_SCHEDULED" ? "bg-purple-50 text-purple-600 border-purple-200" :
                          "bg-emerald-55 text-emerald-600 border-emerald-200"
                        }`}>
                          {t.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6 py-4">
                        <div className="flex items-center justify-end gap-2.5">
                          <Link href={`/dashboard/maintenance/${t.id}`}>
                            <Button size="icon" variant="outline" className="h-9 w-9 border-slate-200 bg-white rounded-xl" title="View details">
                              <Eye className="h-4.5 w-4.5 text-slate-500" />
                            </Button>
                          </Link>

                          {t.status === "ASSIGNED" && (
                            <div className="flex gap-2">
                              <Button onClick={() => { setSelectedTicket(t); setActionData({}); setActiveModal("SCHEDULE_DIAGNOSIS"); }} className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 px-3.5 rounded-xl text-xs shadow-none">
                                Schedule Visit
                              </Button>
                              <Button onClick={() => { setSelectedTicket(t); setActionData({}); setActiveModal("QUICK_RESOLVE"); }} variant="outline" className="h-9 px-3.5 rounded-xl text-xs font-bold border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                                Quick Resolve
                              </Button>
                            </div>
                          )}
                          {t.status === "DIAGNOSIS_SCHEDULED" && (
                            <Button onClick={() => { setSelectedTicket(t); setActionData({}); setActiveModal("SUBMIT_ESTIMATE"); }} className="bg-orange-600 hover:bg-orange-500 text-white font-bold h-9 px-3.5 rounded-xl text-xs shadow-none">
                              Submit Estimate
                            </Button>
                          )}
                          {t.status === "PENDING_APPROVAL" && (
                            <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl block shrink-0">
                              Awaiting Approval
                            </span>
                          )}
                          {t.status === "APPROVED" && (
                            <div className="flex gap-2">
                              <Button onClick={() => { setSelectedTicket(t); setActionData({}); setActiveModal("SCHEDULE_REPAIR"); }} className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 px-3.5 rounded-xl text-xs shadow-none">
                                Schedule Repair
                              </Button>
                              <Button onClick={() => { setSelectedTicket(t); setActionData({}); setActiveModal("QUICK_RESOLVE"); }} variant="outline" className="h-9 px-3.5 rounded-xl text-xs font-bold border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                                Quick Resolve
                              </Button>
                            </div>
                          )}
                          {t.status === "REPAIR_SCHEDULED" && (
                            <Button onClick={() => { setSelectedTicket(t); setActionData({}); setActiveModal("RESOLVE"); }} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black h-9 px-3.5 rounded-xl text-xs shadow-none">
                              Complete Work
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialogs */}
      <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {activeModal === "SCHEDULE_DIAGNOSIS" && "Schedule Diagnosis Visit"}
              {activeModal === "SUBMIT_ESTIMATE" && "Submit Damage Estimate"}
              {activeModal === "SCHEDULE_REPAIR" && "Schedule Repair Visit"}
              {activeModal === "RESOLVE" && "Complete Work & Final Bill"}
              {activeModal === "QUICK_RESOLVE" && "Quick Resolve Ticket"}
            </DialogTitle>
            <DialogDescription>
              {selectedTicket?.entryPermission ? (
                <span className="text-emerald-600 font-semibold block mt-2">✅ Tenant granted permission to enter if not home.</span>
              ) : (
                <span className="text-red-600 font-semibold block mt-2">⚠️ Tenant MUST be home. Coordinate carefully.</span>
              )}
              {selectedTicket?.preferredTimes && <span className="block mt-1 text-slate-600">Preferred times: {selectedTicket.preferredTimes}</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {(activeModal === "SCHEDULE_DIAGNOSIS" || activeModal === "SCHEDULE_REPAIR") && (
              <div className="space-y-2">
                <Label>Proposed Date & Time</Label>
                <Input type="datetime-local" onChange={(e) => setActionData({...actionData, date: e.target.value})} />
              </div>
            )}
            {(activeModal === "SUBMIT_ESTIMATE" || activeModal === "RESOLVE" || activeModal === "QUICK_RESOLVE") && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Labor Cost ($)</Label>
                    <Input type="number" placeholder="0.00" onChange={(e) => setActionData({...actionData, labor: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Materials Cost ($)</Label>
                    <Input type="number" placeholder="0.00" onChange={(e) => setActionData({...actionData, materials: Number(e.target.value)})} />
                  </div>
                </div>
                {(activeModal === "SUBMIT_ESTIMATE" || activeModal === "QUICK_RESOLVE") && (
                  <div className="space-y-2">
                    <Label>{activeModal === "QUICK_RESOLVE" ? "Resolution Notes" : "Diagnosis Notes"}</Label>
                    <Textarea placeholder="Explain the issue..." onChange={(e) => setActionData({...actionData, notes: e.target.value})} />
                  </div>
                )}
                {activeModal === "SUBMIT_ESTIMATE" && selectedTicket?.priority === "EMERGENCY" && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-3 mt-4">
                    <ShieldAlert className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <p className="text-xs text-red-700 font-medium">This is an EMERGENCY priority ticket. Your estimate will be auto-approved up to the emergency limit so you can fix it immediately.</p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button onClick={submitAction} className="bg-primary text-white">Confirm & Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
