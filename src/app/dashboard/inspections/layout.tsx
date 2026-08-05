"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import ModuleLockedBanner from "@/components/subscription/ModuleLockedBanner";

export default function InspectionsLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { allowed, loading, source, reason } = useModuleAccess("inspections");

  const isOwner = (session?.user as any)?.role === "OWNER";

  if (isOwner && loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Verifying module access...</p>
      </div>
    );
  }

  if (isOwner && !allowed) {
    return <ModuleLockedBanner module="inspections" source={source} reason={reason}>{children}</ModuleLockedBanner>;
  }

  return <>{children}</>;
}
