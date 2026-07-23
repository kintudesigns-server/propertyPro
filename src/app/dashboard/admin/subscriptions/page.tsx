import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminSubscriptionsClient from "@/components/admin/AdminSubscriptionsClient";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any).role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  // Fetch all owners and their pricing tiers + overrides + soft-lock lifecycle fields
  const owners = await prisma.user.findMany({
    where: { role: "OWNER" },
    include: {
      pricingTier: true,
      subscriptionOverride: true,
      ownedProperties: {
        include: { units: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const platformSettings = await prisma.platformSettings.findFirst() || {
    gracePeriodDays: 7,
    blockPayoutsOnPastDue: true,
    blockPayoutsOnPaused: true,
    blockNewUnitsOnPaused: true,
    allowMaintenanceOnPaused: true,
    blockAddVendorOnPaused: true,
    blockAddInspectorOnPaused: true,
    blockProcessApplicationsOnPaused: true,
    blockAddTenantOnPaused: true,
    blockTourSlotsOnPaused: true,
  };

  // Calculate stats
  let mrr = 0;
  let atRiskMrr = 0;
  owners.forEach(owner => {
    const price = owner.pricingTier?.price ? Number(owner.pricingTier.price) : 0;
    if (owner.subscriptionStatus === "Active" || owner.subscriptionStatus === "Active (Canceling)") {
      mrr += price;
    } else if (owner.subscriptionStatus === "Paused" || owner.subscriptionStatus === "Past_Due") {
      atRiskMrr += price;
    }
  });

  // Serialize to avoid Prisma Decimal/Date NextJS serialization error
  const serializedOwners = JSON.parse(JSON.stringify(owners));
  const serializedSettings = JSON.parse(JSON.stringify(platformSettings));

  return (
    <div className="max-w-6xl mx-auto space-y-8 pt-6 pb-20 px-2 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1D1D1F] tracking-tight">Owner Subscriptions</h1>
          <p className="text-[#6E6E73] text-base mt-0.5">Overview and management panel for property owners and subscription lifecycles.</p>
        </div>
      </div>

      <AdminSubscriptionsClient 
        owners={serializedOwners} 
        mrr={mrr} 
        atRiskMrr={atRiskMrr}
        platformSettings={serializedSettings} 
      />
    </div>
  );
}
