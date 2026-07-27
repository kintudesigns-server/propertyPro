import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import TierForm from "@/components/admin/pricing/TierForm";

export default async function NewPricingTierPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pt-6 pb-20 px-4 sm:px-6">
      <TierForm />
    </div>
  );
}
