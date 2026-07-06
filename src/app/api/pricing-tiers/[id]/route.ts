import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const updatedTier = await prisma.pricingTier.update({
      where: { id: params.id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price !== undefined ? Number(data.price) : undefined,
        minUnits: data.minUnits !== undefined ? Number(data.minUnits) : undefined,
        maxUnits: data.maxUnits !== undefined ? Number(data.maxUnits) : undefined,
        features: data.features,
        isCustom: data.isCustom,
        isActive: data.isActive,
      }
    });
    return NextResponse.json(updatedTier);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update pricing tier" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.pricingTier.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ message: "Pricing tier deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete pricing tier" }, { status: 500 });
  }
}
