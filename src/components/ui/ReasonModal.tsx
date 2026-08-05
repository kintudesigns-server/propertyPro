"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  actionSummary?: string;
  placeholder?: string;
  confirmLabel?: string;
  confirmVariant?: "primary" | "destructive" | "warning";
  minLength?: number;
  isLoading?: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
}

export function ReasonModal({
  open,
  onOpenChange,
  title,
  description,
  actionSummary,
  placeholder = "Please enter administrative reason...",
  confirmLabel = "Confirm Action",
  confirmVariant = "primary",
  minLength = 10,
  isLoading = false,
  onConfirm
}: ReasonModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    if (reason.trim().length < minLength) return;
    try {
      await onConfirm(reason.trim());
      setReason("");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    }
  };

  const getVariantStyles = () => {
    switch (confirmVariant) {
      case "destructive":
        return "bg-rose-600 hover:bg-rose-700 text-white border-none";
      case "warning":
        return "bg-amber-600 hover:bg-amber-700 text-white border-none";
      case "primary":
      default:
        return "bg-slate-900 hover:bg-slate-800 text-white border-none";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!isLoading) {
        onOpenChange(val);
        if (!val) setReason("");
      }
    }}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 md:p-8 font-sans border border-slate-200 bg-white shadow-2xs">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-semibold text-[#1D1D1F] tracking-tight">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-xs font-normal text-[#6E6E73] leading-relaxed">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {actionSummary && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 mt-3 text-xs font-sans shadow-2xs">
            <span className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider block mb-1">Target Action Preview</span>
            <p className="text-xs font-semibold text-[#1D1D1F]">{actionSummary}</p>
          </div>
        )}

        <div className="space-y-4 mt-3 font-sans">
          <div className="space-y-1.5">
            <label className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider">
              Reason * (Min. {minLength} characters)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
              disabled={isLoading}
              rows={3}
              className="w-full min-h-[90px] rounded-xl border border-slate-200 bg-white p-3 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all resize-none font-sans"
            />
            {reason.trim().length > 0 && reason.trim().length < minLength && (
              <p className="text-xs font-normal text-rose-600">
                Please enter at least {minLength - reason.trim().length} more characters.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1 font-sans">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => {
                setReason("");
                onOpenChange(false);
              }}
              className="h-9 border border-slate-200 bg-white text-[#1D1D1F] hover:bg-slate-50 font-medium text-xs rounded-xl shadow-2xs cursor-pointer px-4 flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={reason.trim().length < minLength || isLoading}
              onClick={handleConfirm}
              className={`h-9 font-medium text-xs rounded-xl shadow-xs cursor-pointer px-4 flex-1 flex items-center justify-center gap-2 ${getVariantStyles()}`}
            >
              {isLoading && <Loader2 size={14} className="animate-spin text-white" />}
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
