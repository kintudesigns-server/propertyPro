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
}

export function TourButtonClient({ unit }: TourButtonClientProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full h-12 rounded-xl font-bold text-slate-700 border-[#E2E8F0] hover:bg-slate-50 flex justify-center items-center gap-2"
      >
        <Calendar className="h-4 w-4" /> Schedule a Tour
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
