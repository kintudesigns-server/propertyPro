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
      return NextResponse.json({ error: "Cannot review at this stage. The inspection report must be ready first." }, { status: 400 });
    }

    if (action === "accept") {
      // Refund method is captured on the lease — no need to check tenant user profile bank fields
      const updatedLease = await prisma.lease.update({
        where: { id: leaseId },
        data: {
          moveOutStatus: "TENANT_ACCEPTED",
          tenantReviewedAt: new Date(),
        },
      });

      await notify({
        userId: lease.unit.property.ownerId,
        title: "Tenant Accepted — Ready to Finalize",
        message: `The tenant has accepted the deductions and refund estimate for ${lease.unit?.property?.name}. You can now navigate to the Final Statement to process the deposit refund.`,
        type: "LEASE",
        priority: "HIGH",
        relatedEntityId: lease.id,
      });

      return NextResponse.json(updatedLease);

    } else if (action === "dispute") {
      if (!tenantDisputeNote || tenantDisputeNote.trim().length < 10) {
        return NextResponse.json({ error: "Please provide a clear reason for your dispute (minimum 10 characters)." }, { status: 400 });
      }

      const disputeCount = (lease.disputeCount || 0) + 1;
      // 2nd dispute → DISPUTE_FINALIZED (replaces the dead ADMIN_MEDIATION)
      const newStatus = disputeCount >= 2 ? "DISPUTE_FINALIZED" : "TENANT_DISPUTED";

      const updatedLease = await prisma.lease.update({
        where: { id: leaseId },
        data: {
          moveOutStatus: newStatus,
          tenantDisputeNote,
          disputeCount,
          tenantReviewedAt: new Date(),
        },
      });

      // Notify Owner
      await notify({
        userId: lease.unit.property.ownerId,
        title: newStatus === "DISPUTE_FINALIZED" ? "⚠️ Move-Out Dispute Finalized" : "Tenant Disputed Deductions",
        message: newStatus === "DISPUTE_FINALIZED"
          ? `The tenant has disputed the deductions a second time for ${lease.unit?.property?.name}. The dispute has been finalized. Both parties should resolve this matter offline or through small claims court. A Dispute Record is available to download from the lease page.`
          : `The tenant has disputed the deductions for ${lease.unit?.property?.name}. Please review their note: "${tenantDisputeNote}" — you can revise deductions or respond.`,
        type: "LEASE",
        priority: "HIGH",
        relatedEntityId: lease.id,
      });

      // Notify Tenant of DISPUTE_FINALIZED
      if (newStatus === "DISPUTE_FINALIZED") {
        await notify({
          userId: lease.tenantId,
          title: "Dispute Record Generated",
          message: `Your move-out dispute for ${lease.unit?.property?.name} has been formally recorded. Both parties are encouraged to resolve this through mediation or small claims court. You can download a Dispute Record document from your lease page.`,
          type: "LEASE",
          priority: "HIGH",
          relatedEntityId: lease.id,
        });
      }

      return NextResponse.json(updatedLease);
    }

    return NextResponse.json({ error: "Invalid action. Use 'accept' or 'dispute'." }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to submit review" }, { status: 500 });
  }
}
