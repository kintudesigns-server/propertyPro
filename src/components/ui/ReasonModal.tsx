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
        return "bg-rose-600 hover:bg-rose-700 text-white";
      case "warning":
        return "bg-amber-50 hover:bg-amber-600 text-white";
      case "primary":
      default:
        return "bg-blue-600 hover:bg-blue-700 text-white";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!isLoading) {
        onOpenChange(val);
        if (!val) setReason("");
      }
    }}>
      <DialogContent className="bg-white text-slate-800 rounded-3xl max-w-md p-6 border-0">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-900">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-xs font-semibold text-[#8E8E93] mt-1 leading-relaxed">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {actionSummary && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 mt-3 text-xs font-semibold text-slate-700 leading-normal">
            <span className="text-[#8E8E93] uppercase font-bold text-[9px] block mb-1">Target Action Preview</span>
            {actionSummary}
          </div>
        )}

        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#8E8E93]">
              Reason * (Min. {minLength} characters)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
              disabled={isLoading}
              rows={3}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all resize-none text-slate-800 placeholder:text-[#8E8E93] font-semibold"
            />
            {reason.trim().length > 0 && reason.trim().length < minLength && (
              <p className="text-[10px] text-rose-500 font-bold">
                Please enter at least {minLength - reason.trim().length} more characters.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              disabled={isLoading}
              onClick={() => {
                setReason("");
                onOpenChange(false);
              }}
              className="flex-1 border border-slate-200 hover:bg-[#F5F5F7] rounded-xl h-11 text-xs font-bold text-[#6E6E73] disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={reason.trim().length < minLength || isLoading}
              onClick={handleConfirm}
              className={`flex-1 font-bold rounded-xl h-11 text-xs disabled:opacity-40 transition-colors shadow-sm flex items-center justify-center gap-1.5 ${getVariantStyles()}`}
            >
              {isLoading && <Loader2 size={14} className="animate-spin" />}
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
