"use client";
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "destructive" | "default";
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  confirmVariant = "destructive",
  onConfirm
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white text-slate-800 rounded-3xl max-w-sm p-6 border-0">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-900">{title}</DialogTitle>
          <DialogDescription className="text-sm font-semibold text-slate-500 mt-1 leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 mt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1 border border-slate-200 hover:bg-slate-50 rounded-xl h-11 text-xs font-bold text-slate-500"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={async () => {
              await onConfirm();
              onOpenChange(false);
            }}
            className={`flex-1 rounded-xl h-11 text-xs font-bold text-white shadow-sm transition-colors ${
              confirmVariant === "destructive"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
