"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ScheduleInspectionModalProps {
  leaseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  moveOutDate?: string | Date | null;
  defaultType?: "PRELIMINARY" | "FINAL";
}

export function ScheduleInspectionModal({ leaseId, open, onOpenChange, onSuccess, moveOutDate, defaultType = "FINAL" }: ScheduleInspectionModalProps) {
  const [inspectionType, setInspectionType] = useState<"PRELIMINARY" | "FINAL">(defaultType);
  const [inspectionDate, setInspectionDate] = useState("");
  const [inspectionTime, setInspectionTime] = useState("");
  const [selectedInspectorId, setSelectedInspectorId] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [schedulingInspection, setSchedulingInspection] = useState(false);
  const [inspectors, setInspectors] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      setInspectionType(defaultType);
      // Fetch inspectors
      fetch("/api/users?role=INSPECTOR")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setInspectors(data);
        })
        .catch(() => toast.error("Failed to load inspectors"));
    }
  }, [open]);

  const handleScheduleInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchedulingInspection(true);
    try {
      // Combine date and time
      const datetime = new Date(`${inspectionDate}T${inspectionTime}`);
      
      // Validation if moveOutDate is provided
      if (moveOutDate) {
        const moDate = new Date(moveOutDate);
        if (inspectionType === "PRELIMINARY" && datetime >= moDate) {
          throw new Error("Preliminary walkthrough must be scheduled BEFORE the move-out date.");
        }
      }

      const res = await fetch(`/api/leases/${leaseId}/inspection`, {
        method: "PUT", // Wait, let's verify if the route is PUT or POST. Oh, it was PUT/POST depending on scheduling vs completing! Let's check lines 9-10 in route.ts: PUT /api/leases/[id]/inspection — Schedule Inspection.
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspectionDate: datetime.toISOString(),
          moveOutInspectorId: selectedInspectorId || null,
          inspectionNotes,
          inspectionType
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to schedule inspection");
      }
      toast.success("Inspection scheduled successfully");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSchedulingInspection(false);
    }
  };

  // Check if we need to show warning for Final inspection scheduled before move-out date
  const showWarning = () => {
    if (inspectionType === "FINAL" && inspectionDate && moveOutDate) {
      const selected = new Date(`${inspectionDate}T${inspectionTime || "00:00"}`);
      const moDate = new Date(moveOutDate);
      return selected < moDate;
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-0 text-slate-800 rounded-3xl max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-slate-900">Schedule Inspection Walkthrough</DialogTitle>
          <DialogDescription className="text-xs font-semibold text-slate-400">
            Assign an inspector and choose a type and date/time for the walkthrough.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleScheduleInspection} className="space-y-4 mt-4">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inspection Type</Label>
            <select
              value={inspectionType}
              onChange={(e) => setInspectionType(e.target.value as "PRELIMINARY" | "FINAL")}
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 text-sm"
            >
              <option value="FINAL">Final Walkthrough (Legally Binding)</option>
              <option value="PRELIMINARY">Preliminary Walkthrough (Remedy List)</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</Label>
            <Input
              type="date"
              required
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
              className="bg-slate-50 border-slate-200 rounded-xl h-11"
            />
            {showWarning() && (
              <p className="text-[11px] font-semibold text-amber-600 mt-1">
                ⚠️ Warning: Final inspections are legally binding and should occur after the tenant has vacated.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Time</Label>
            <Input
              type="time"
              required
              value={inspectionTime}
              onChange={(e) => setInspectionTime(e.target.value)}
              className="bg-slate-50 border-slate-200 rounded-xl h-11"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign Inspector</Label>
            <select
              value={selectedInspectorId}
              onChange={(e) => setSelectedInspectorId(e.target.value)}
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 text-sm"
            >
              <option value="">Unassigned (Submits to pool)</option>
              <option value="SELF" className="font-bold text-blue-700">Assign to Me (Self-Inspect)</option>
              {inspectors.map((ins: any) => (
                <option key={ins.id} value={ins.id}>
                  {ins.name} ({ins.email})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notes / Instructions</Label>
            <textarea
              placeholder="e.g. Check kitchen cabinets and master bathroom ceiling..."
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 text-sm h-24 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 border border-slate-200 rounded-xl h-11 text-xs font-bold text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={schedulingInspection}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 text-xs font-bold"
            >
              {schedulingInspection ? "Scheduling..." : "Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
