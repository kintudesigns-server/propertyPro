import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "TENANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: leaseId } = await params;
  const { action, tenantDisputeNote } = await req.json();

  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { tenant: true, unit: { include: { property: true } } },
    });

    if (!lease || lease.tenantId !== (session.user as any).id) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    if (lease.moveOutStatus !== "INSPECTION_COMPLETED") {
        return NextResponse.json({ error: "Cannot review at this stage" }, { status: 400 });
    }

    if (action === "accept") {
        if (!lease.tenant.bankName || !lease.tenant.accountNumber || !lease.tenant.accountName) {
            return NextResponse.json({ error: "Bank details are required to accept" }, { status: 400 });
        }

        const updatedLease = await prisma.lease.update({
            where: { id: leaseId },
            data: { moveOutStatus: "TENANT_ACCEPTED" }
        });

        // Notify Owner
        await notify({
            userId: lease.unit.property.ownerId,
            title: "Tenant Accepted Refund Estimate",
            message: `The tenant has accepted the deductions and refund estimate for lease ${lease.id}. You can now finalize the move-out.`,
            type: "LEASE",
            priority: "MEDIUM",
            relatedEntityId: lease.id,
        });

        return NextResponse.json(updatedLease);
    } else if (action === "dispute") {
        const disputeCount = lease.disputeCount + 1;
        const newStatus = disputeCount >= 2 ? "ADMIN_MEDIATION" : "TENANT_DISPUTED";

        const updatedLease = await prisma.lease.update({
            where: { id: leaseId },
            data: { 
                moveOutStatus: newStatus,
                tenantDisputeNote,
                disputeCount
            }
        });

        // Notify Owner
        await notify({
            userId: lease.unit.property.ownerId,
            title: newStatus === "ADMIN_MEDIATION" ? "Move-Out Dispute Escalated" : "Tenant Disputed Refund Estimate",
            message: newStatus === "ADMIN_MEDIATION" 
                ? `Tenant has disputed the estimate 2 times. It has been escalated to Admin Mediation.`
                : `The tenant has disputed the deductions for lease ${lease.id}. Please review their notes.`,
            type: "LEASE",
            priority: "HIGH",
            relatedEntityId: lease.id,
        });

        // If escalated, maybe notify admin (assuming SUPERADMIN or all admins, but for now we just change status)

        return NextResponse.json(updatedLease);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to submit review" }, { status: 500 });
  }
}
