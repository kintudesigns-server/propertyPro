import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, ctx: any) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: leaseId } = ctx.params;

  try {
    const { autoPayEnabled } = await req.json();

    if (typeof autoPayEnabled !== "boolean") {
      return NextResponse.json({ error: "Invalid payload. Expected autoPayEnabled boolean." }, { status: 400 });
    }

    // Verify lease belongs to tenant or owner
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId }
    });

    if (!lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    if (lease.tenantId !== (session.user as any).id && (session.user as any).role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: { autoPayEnabled } as any
    });

    return NextResponse.json(updatedLease);
  } catch (error: any) {
    console.error("Error toggling auto-pay:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
