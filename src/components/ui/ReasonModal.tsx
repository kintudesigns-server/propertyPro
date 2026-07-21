"use client";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  placeholder?: string;
  onConfirm: (reason: string) => void | Promise<void>;
}

export function ReasonModal({
  open,
  onOpenChange,
  title,
  description,
  placeholder = "Please enter details...",
  onConfirm
}: ReasonModalProps) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white text-slate-800 rounded-3xl max-w-md p-6 border-0">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-900">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-xs font-semibold text-[#8E8E93] mt-1 leading-relaxed">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
              className="w-full min-h-[100px] p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all resize-none text-slate-800 placeholder:text-[#8E8E93] font-medium"
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 border border-slate-200 hover:bg-[#F5F5F7] rounded-xl h-11 text-xs font-bold text-[#6E6E73]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={reason.trim().length < 5}
              onClick={async () => {
                await onConfirm(reason.trim());
                setReason("");
                onOpenChange(false);
              }}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl h-11 text-xs disabled:opacity-40 transition-colors shadow-sm"
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
