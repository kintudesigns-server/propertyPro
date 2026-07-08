import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role !== "OWNER" && role !== "SUPERADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const vendor = await prisma.externalVendor.findUnique({ where: { id } });
    if (!vendor || (role === "OWNER" && vendor.ownerId !== userId)) {
      return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
    }

    const updated = await prisma.externalVendor.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        specialty: body.specialty,
        w9OnFile: Boolean(body.w9OnFile),
        insuranceOnFile: Boolean(body.insuranceOnFile),
        baseCallOutFee: body.baseCallOutFee ? parseFloat(body.baseCallOutFee) : 0.0,
      }
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role !== "OWNER" && role !== "SUPERADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const vendor = await prisma.externalVendor.findUnique({ where: { id }, include: { _count: { select: { maintenanceRequests: true } } } });
    if (!vendor || (role === "OWNER" && vendor.ownerId !== userId)) {
      return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
    }

    if (vendor._count.maintenanceRequests > 0) {
      return NextResponse.json({ error: "Cannot delete vendor with existing maintenance requests. Please re-assign them first." }, { status: 400 });
    }

    await prisma.externalVendor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
