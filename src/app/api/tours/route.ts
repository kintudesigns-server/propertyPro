import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status");

    let whereClause: any = {};

    if (role === "OWNER") {
      whereClause.property = { ownerId: userId };
    } else if (role === "TENANT") {
      whereClause.OR = [
        { tenantEmail: session.user.email || "" },
      ];
    } else if (role !== "SUPERADMIN") {
      return NextResponse.json([]);
    }

    if (propertyId) {
      whereClause.propertyId = propertyId;
    }
    if (status) {
      whereClause.status = status;
    }

    const tours = await prisma.tour.findMany({
      where: whereClause,
      include: {
        property: true,
        unit: true,
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    return NextResponse.json(tours);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch tours" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { propertyId, unitId, tenantName, tenantEmail, tenantPhone, tourType, scheduledAt } = await req.json();

    if (!propertyId || !tenantName || !tenantEmail || !tenantPhone || !scheduledAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify property exists and is approved
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (property.approvalStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Cannot schedule tours for properties pending administrative review" },
        { status: 403 }
      );
    }

    if (unitId) {
      const unit = await prisma.unit.findUnique({
        where: { id: unitId },
      });
      if (!unit || unit.propertyId !== propertyId) {
        return NextResponse.json({ error: "Invalid unit selected" }, { status: 400 });
      }
    }

    const tour = await prisma.tour.create({
      data: {
        propertyId,
        unitId: unitId || null,
        tenantName,
        tenantEmail,
        tenantPhone,
        tourType: tourType || "IN_PERSON",
        scheduledAt: new Date(scheduledAt),
        status: "PENDING",
      },
      include: {
        property: true,
        unit: true,
      },
    });

    return NextResponse.json(tour, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create tour" }, { status: 500 });
  }
}
