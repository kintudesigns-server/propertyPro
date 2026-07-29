import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OwnerDetailClient from "@/components/admin/OwnerDetailClient";

export const dynamic = "force-dynamic";

export default async function OwnerDetailPage({ params }: { params: Promise<{ userId: string }> | { userId: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const resolvedParams = await Promise.resolve(params);
  const userId = resolvedParams?.userId;
  if (!userId) {
    notFound();
  }

  // Fetch full owner data
  const owner = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      pricingTier: true,
      subscriptionOverride: true,
      ownedProperties: {
        include: { units: true }
      }
    }
  });

  if (!owner || owner.role !== "OWNER") {
    return (
      <div style={{ color: "black", background: "white", padding: "20px" }}>
        <h1>404 - Not Found Debug</h1>
        <p>Could not find owner.</p>
        <p>userId from params: "{userId}"</p>
        <p>owner object: {JSON.stringify(owner)}</p>
      </div>
    );
  }

  // Fetch module grants
  const grants = await prisma.ownerModuleGrant.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  // Fetch audit logs
  let auditLogs = [];
  try {
    auditLogs = await (prisma as any).auditLog.findMany({
      where: {
        OR: [
          { entityType: "USER", entityId: userId },
          { actorId: userId }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  } catch (err) {
    console.error("Failed to load audit logs in page:", err);
  }

  // Serialize to avoid Prisma Decimal/Date NextJS serialization error
  const serializedOwner = JSON.parse(JSON.stringify(owner));
  const serializedGrants = JSON.parse(JSON.stringify(grants));
  const serializedAuditLogs = JSON.parse(JSON.stringify(auditLogs));

  return (
    <div className="max-w-6xl mx-auto space-y-8 pt-6 pb-20 px-4 sm:px-6">
      <OwnerDetailClient 
        owner={serializedOwner} 
        initialGrants={serializedGrants}
        auditLogs={serializedAuditLogs}
      />
    </div>
  );
}
