"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

interface BypassConfirmationModalProps {
  leaseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BypassConfirmationModal({ leaseId, open, onOpenChange, onSuccess }: BypassConfirmationModalProps) {
  const [bypassReason, setBypassReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (bypassReason.trim().length < 5) {
      toast.error("Please enter a valid reason of at least 5 characters.");
      return;
    }
    if (!acknowledged) {
      toast.error("You must acknowledge the legal implications.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/leases/${leaseId}/bypass-inspection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bypassReason,
          acknowledged,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to bypass inspection");
      }

      toast.success("Walkthrough inspection bypassed successfully.");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-0 text-slate-800 rounded-3xl max-w-md p-6">
        <DialogHeader className="space-y-3">
          <div className="h-12 w-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-black text-slate-900 leading-tight">
            Confirm Bypass Inspection
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-[#8E8E93] leading-relaxed">
            Bypassing the walkthrough inspection creates a legal gap if the tenant disputes their refund. Please provide a reason to confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="bypassReason" className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">
              Reason for Bypassing <span className="text-red-500 font-extrabold">*</span>
            </Label>
            <textarea
              id="bypassReason"
              placeholder="e.g. Unit was recently renovated and inspected, tenant is highly trusted, or no tenant walkthrough required."
              value={bypassReason}
              onChange={(e) => setBypassReason(e.target.value)}
              className="w-full min-h-[90px] p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all resize-none text-slate-800 placeholder:text-[#8E8E93] font-medium"
            />
          </div>

          <div className="flex items-start gap-3 bg-amber-50/50 border border-amber-100 p-3.5 rounded-xl">
            <input
              id="legal-ack"
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500 cursor-pointer"
            />
            <Label htmlFor="legal-ack" className="text-xs text-amber-800 font-semibold leading-relaxed cursor-pointer select-none">
              I acknowledge that bypassing the walkthrough inspection means settling the deposit without an official inspection report, and I accept any associated legal risks.
            </Label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 font-bold text-[#6E6E73] hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || bypassReason.trim().length < 5 || !acknowledged}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl h-11 transition-colors disabled:opacity-50"
            >
              {submitting ? "Processing..." : "Confirm Bypass"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
