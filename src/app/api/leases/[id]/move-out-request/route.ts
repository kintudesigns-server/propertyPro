import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "TENANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: leaseId } = await params;
  const { moveOutDate, moveOutReason } = await req.json();

  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    if (lease.tenantId !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden: Not your lease" }, { status: 403 });
    }
    
    if (lease.status !== "ACTIVE") {
        return NextResponse.json({ error: "Only ACTIVE leases can request move-out" }, { status: 400 });
    }

    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        moveOutStatus: "MOVE_OUT_REQUESTED",
        moveOutRequestDate: new Date(),
        moveOutDate: new Date(moveOutDate),
        moveOutReason,
      },
    });

    // TODO: Create a notification for the owner here

    return NextResponse.json(updatedLease, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to submit move-out request" }, { status: 500 });
  }
}
