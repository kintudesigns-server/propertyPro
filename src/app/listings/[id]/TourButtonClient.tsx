"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { ScheduleTourModal } from "@/components/modals/ScheduleTourModal";

interface TourButtonClientProps {
  unit: {
    id: string;
    name: string;
    property: {
      id: string;
      name: string;
      address: string;
      city?: string;
      state?: string;
    };
  };
  className?: string;
  variant?: "outline" | "default" | "secondary";
}

export function TourButtonClient({ unit, className, variant = "outline" }: TourButtonClientProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        onClick={() => setOpen(true)}
        className={className || "w-full h-12 rounded-full font-semibold text-xs text-[#007AFF] border border-[#007AFF] bg-[#007AFF]/5 hover:bg-[#007AFF]/10 flex justify-center items-center gap-2 transition-all active:scale-98"}
      >
        <Calendar className="h-4 w-4 text-[#007AFF]" /> Schedule a Tour
      </Button>

      <ScheduleTourModal
        open={open}
        onOpenChange={setOpen}
        unit={unit}
        onSuccess={() => setOpen(false)}
      />
    </>
  );
}
