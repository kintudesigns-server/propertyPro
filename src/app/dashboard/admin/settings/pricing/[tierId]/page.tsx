import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TierForm from "@/components/admin/pricing/TierForm";

export default async function EditPricingTierPage({ params }: { params: Promise<{ tierId: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const { tierId } = await params;

  // Find pricing tier
  const tier = await prisma.pricingTier.findUnique({
    where: { id: tierId }
  });

  if (!tier) {
    notFound();
  }

  // Count active subscribers on this tier
  const subscriberCount = await prisma.user.count({
    where: {
      currentTierId: tierId,
      role: "OWNER"
    }
  });

  const serializedTier = JSON.parse(JSON.stringify(tier));

  return (
    <div className="max-w-6xl mx-auto space-y-8 pt-6 pb-20 px-4 sm:px-6">
      <TierForm initialTier={serializedTier} subscriberCount={subscriberCount} />
    </div>
  );
}
