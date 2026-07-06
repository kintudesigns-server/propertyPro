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

  // Fetch all owners and their pricing tiers
  const owners = await prisma.user.findMany({
    where: { role: "OWNER" },
    include: {
      pricingTier: true,
      ownedProperties: {
        include: { units: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // Calculate some basic stats
  let mrr = 0;
  owners.forEach(owner => {
    if (owner.subscriptionStatus === "Active" && owner.pricingTier?.price) {
      mrr += Number(owner.pricingTier.price);
    }
  });

  // Serialize owners to avoid "Only plain objects can be passed to Client Components" error for Prisma Decimal/Date objects
  const serializedOwners = JSON.parse(JSON.stringify(owners));

  return (
    <div className="max-w-6xl mx-auto space-y-8 pt-6 pb-20 px-2 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">Owner Subscriptions</h1>
          <p className="text-[#64748B] text-base mt-0.5">Overview of property owners and their active subscription tiers.</p>
        </div>
      </div>

      <AdminSubscriptionsClient owners={serializedOwners} mrr={mrr} />
    </div>
  );
}
