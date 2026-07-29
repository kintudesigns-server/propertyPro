"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import ModuleLockedBanner from "@/components/subscription/ModuleLockedBanner";

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isOwner = (session?.user as any)?.role === "OWNER";

  // Determine sub-module key based on path
  let moduleKey: "accounting" | "invoices" | "wallet" | "transactions" = "accounting";
  let moduleName = "Accounting & Financial Reports";

  if (pathname?.includes("/accounting/invoices")) {
    moduleKey = "invoices";
    moduleName = "Invoice Management";
  } else if (pathname?.includes("/accounting/wallet")) {
    moduleKey = "wallet";
    moduleName = "Wallet & Bank Management";
  } else if (pathname?.includes("/accounting/transactions")) {
    moduleKey = "transactions";
    moduleName = "Transaction History";
  }

  const { allowed, loading, source, reason } = useModuleAccess(moduleKey);

  if (isOwner && loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Verifying module access...</p>
      </div>
    );
  }

  if (isOwner && !allowed) {
    return <ModuleLockedBanner module={moduleKey} source={source} reason={reason}>{children}</ModuleLockedBanner>;
  }

  return <>{children}</>;
}
