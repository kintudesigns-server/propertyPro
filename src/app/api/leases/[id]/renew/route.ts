import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "TENANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { action } = await req.json();

    const lease = await prisma.lease.findUnique({
      where: { id },
    });

    if (!lease || lease.tenantId !== (session.user as any).id) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    if (lease.renewalStatus !== "PENDING_DECISION") {
      return NextResponse.json({ error: "No pending renewal offer found." }, { status: 400 });
    }

    if (action === "ACCEPT") {
      // In a real app, this might create a new lease record with status 'DRAFT' and new dates/rent.
      // For this workflow, we mark the current renewal offer as accepted.
      await prisma.lease.update({
        where: { id },
        data: { renewalStatus: "RENEWED" },
      });
      return NextResponse.json({ success: true, status: "RENEWED" });
      
    } else if (action === "REJECT") {
      // Tenant rejects renewal. Mark for move-out.
      await prisma.lease.update({
        where: { id },
        data: { renewalStatus: "NON_RENEWAL" },
      });
      return NextResponse.json({ success: true, status: "NON_RENEWAL" });
      
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Renewal action error:", error);
    return NextResponse.json({ error: "Failed to process renewal action" }, { status: 500 });
  }
}
