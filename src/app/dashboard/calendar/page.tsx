"use client";

import React from "react";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureBlockedOverlay } from "@/components/subscription/FeatureBlockedBanner";

export default function CalendarPage() {
  const featureAccess = useFeatureAccess("view_calendar");
  const isBlocked = !featureAccess.loading && !featureAccess.allowed;

  return (
    <div className="relative">
      {isBlocked && (
        <FeatureBlockedOverlay
          featureLabel={featureAccess.featureLabel || "Activity Calendar"}
          reason={featureAccess.reason}
          adminNote={featureAccess.adminNote}
          expiresAt={featureAccess.expiresAt}
        />
      )}
      <div className={isBlocked ? "pointer-events-none select-none blur-[2.5px] opacity-70" : ""}>
        <div className="max-w-7xl mx-auto w-full">
          <CalendarGrid />
        </div>
      </div>
    </div>
  );
}
