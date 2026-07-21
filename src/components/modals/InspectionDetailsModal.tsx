"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface InspectionDetailsModalProps {
  lease: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InspectionDetailsModal({ lease, open, onOpenChange, onSuccess }: InspectionDetailsModalProps) {
  const [responseNotes, setResponseNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!lease) return null;

  const handleResolveDispute = async () => {
    if (responseNotes.trim().length < 5) {
      toast.error("Please enter a valid response note (minimum 5 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/leases/${lease.id}/dispute-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: responseNotes }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit dispute response");
      }

      toast.success("Dispute response submitted successfully");
      setResponseNotes("");
      onOpenChange(false);
      if (onSuccess) onSuccess();
      else window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-0 text-slate-800 rounded-3xl max-w-lg p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-slate-900">Inspection Details</DialogTitle>
          <DialogDescription className="text-xs font-semibold text-[#8E8E93]">
            Complete details for the walkthrough inspection.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider">Property & Unit</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">{lease.unit?.property?.name} - {lease.unit?.name}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider">Tenant</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">{lease.tenant?.name}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider">Move-Out Date</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {lease.moveOutDate ? new Date(lease.moveOutDate).toLocaleDateString() : "Pending"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider">Inspection Date/Time</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {lease.inspectionDate ? new Date(lease.inspectionDate).toLocaleString() : "TBD"}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider">Assigned Inspector</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {lease.moveOutInspector ? `${lease.moveOutInspector.name} (${lease.moveOutInspector.email})` : "Pending Assignment"}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider">Notes / Instructions</p>
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700 min-h-[80px]">
              {lease.inspectionNotes || "No specific instructions provided."}
            </div>
          </div>

          {lease.moveOutStatus === "TENANT_DISPUTED" && (
            <div className="space-y-3 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
              <p className="text-xs font-bold text-amber-900">Resolve Dispute</p>
              <div className="space-y-1">
                <Label className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wider">Tenant Dispute Reason</Label>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/50 text-xs italic text-slate-700">
                  "{lease.tenantDisputeNote}"
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wider">Your Resolution Note</Label>
                <textarea
                  placeholder="Enter final dispute resolution notes..."
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  className="w-full h-20 p-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none font-semibold text-slate-800"
                />
              </div>
              <Button
                onClick={handleResolveDispute}
                disabled={submitting || responseNotes.trim().length < 5}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold h-9 text-xs rounded-xl transition-colors disabled:opacity-50"
              >
                Submit Response
              </Button>
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full border border-slate-200 rounded-xl h-11 text-xs font-bold text-[#6E6E73] hover:bg-[#F5F5F7]"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
