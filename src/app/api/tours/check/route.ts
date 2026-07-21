import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const propertyId = searchParams.get("propertyId");
    const unitId = searchParams.get("unitId");

    if (!email || !propertyId) {
      return NextResponse.json({ error: "Missing required query params" }, { status: 400 });
    }

    const existingTour = await prisma.tour.findFirst({
      where: {
        tenantEmail: email,
        propertyId,
        unitId: unitId || null,
        status: { in: ["PENDING", "CONFIRMED"] }
      },
      include: {
        property: true,
        unit: true
      }
    });

    return NextResponse.json(existingTour);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to check tours" }, { status: 500 });
  }
}
