import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");
  const id = searchParams.get("id");

  try {
    if (id) {
      const unit = await prisma.unit.findUnique({
        where: { id },
        include: { leases: { include: { tenant: true } }, property: true },
      });
      if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
      // Tenants can only view their own unit
      if (role === "TENANT") {
        const hasTenancy = unit.leases.some((l: any) => l.tenantId === userId);
        if (!hasTenancy) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Owners can only view units on their properties
      if (role === "OWNER" && unit.property.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json(unit);
    }

    if (propertyId) {
      // Verify owner access
      if (role === "OWNER") {
        const prop = await prisma.property.findUnique({ where: { id: propertyId } });
        if (!prop || prop.ownerId !== userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      // Tenants: only return the unit(s) they lease in this property
      const units = await prisma.unit.findMany({
        where: role === "TENANT"
          ? { propertyId, leases: { some: { tenantId: userId } } }
          : { propertyId },
        include: { leases: true, property: true },
      });
      return NextResponse.json(units);
    }

    // No specific filter — return scoped units
    if (role === "TENANT") {
      // Only units the tenant is actively leasing
      const units = await prisma.unit.findMany({
        where: { leases: { some: { tenantId: userId } } },
        include: { leases: true, property: true },
      });
      return NextResponse.json(units);
    }

    if (role === "OWNER") {
      const units = await prisma.unit.findMany({
        where: { property: { ownerId: userId } },
        include: { leases: true, property: true },
      });
      return NextResponse.json(units);
    }

    // SUPERADMIN — all units
    const units = await prisma.unit.findMany({
      include: { leases: true, property: true },
    });
    return NextResponse.json(units);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch units" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { name, rentAmount, depositAmt, rooms, sqFootage, amenities, propertyId } = await req.json();

    if (!name || !rentAmount || !depositAmt || !rooms || !sqFootage || !propertyId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify property belongs to owner
    const ownerId = (session.user as any).id;
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.ownerId !== ownerId) {
      return NextResponse.json({ error: "Property not found or access denied" }, { status: 404 });
    }

    // Tier Enforcement Check
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      include: { pricingTier: true }
    });

    if (owner?.pricingTier?.maxUnits) {
      const currentUnitCount = await prisma.unit.count({
        where: { property: { ownerId: ownerId } }
      });
      if (currentUnitCount + 1 > owner.pricingTier.maxUnits) {
        return NextResponse.json({ 
          error: "LIMIT_REACHED", 
          message: `Plan limit reached. You can only have up to ${owner.pricingTier.maxUnits} units on your current plan.` 
        }, { status: 403 });
      }
    }

    const unit = await prisma.unit.create({
      data: {
        name,
        rentAmount: Number(rentAmount),
        depositAmt: Number(depositAmt),
        rooms: Number(rooms),
        sqFootage: Number(sqFootage),
        amenities: amenities || [],
        propertyId,
        status: "VACANT",
      },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create unit" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id, name, rentAmount, depositAmt, rooms, sqFootage, amenities, propertyId } = await req.json();

    if (!id || !name || !rentAmount || !depositAmt || !rooms || !sqFootage || !propertyId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify property belongs to owner
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Property not found or access denied" }, { status: 404 });
    }

    const unit = await prisma.unit.update({
      where: { id },
      data: {
        name,
        rentAmount: Number(rentAmount),
        depositAmt: Number(depositAmt),
        rooms: Number(rooms),
        sqFootage: Number(sqFootage),
        amenities: amenities || [],
        propertyId,
      },
    });

    return NextResponse.json(unit, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update unit" }, { status: 500 });
  }
}
