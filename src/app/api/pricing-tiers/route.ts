import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const tiers = await prisma.pricingTier.findMany({
      orderBy: { price: 'asc' }
    });
    return NextResponse.json(tiers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch pricing tiers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const newTier = await prisma.pricingTier.create({
      data: {
        name: data.name,
        description: data.description,
        price: Number(data.price),
        minUnits: Number(data.minUnits),
        maxUnits: Number(data.maxUnits),
        features: data.features,
        isCustom: data.isCustom || false,
        isActive: data.isActive !== undefined ? data.isActive : true,
      }
    });
    return NextResponse.json(newTier, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create pricing tier" }, { status: 500 });
  }
}
