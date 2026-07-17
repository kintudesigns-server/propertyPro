import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requesterRole = (session.user as any).role;
  const requesterId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  if (!role) {
    const me = await prisma.user.findUnique({
      where: { id: requesterId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        bankName: true,
        accountNumber: true,
        accountName: true,
        stripeCustomerId: true,
        emergencyName: true,
        emergencyPhone: true,
        emergencyRelationship: true,
        dob: true,
        employmentStatus: true,
        employer: true,
        position: true,
        annualIncome: true,
        avatar: true,
        subscriptionStatus: true,
        approvalThreshold: true,
        emergencyOverrideLimit: true,
        pricingTier: {
          select: {
            id: true,
            name: true,
            maxUnits: true,
            price: true,
            features: true,
          }
        },
      },
    });
    return NextResponse.json(me);
  }

  try {
    // Tenants can only fetch owners/inspectors linked to their own leases
    if (requesterRole === "TENANT") {
      if (role === "OWNER") {
        // Return only the owner(s) of properties the tenant has a lease on
        const tenantLeases = await prisma.lease.findMany({
          where: { tenantId: requesterId },
          include: {
            unit: {
              include: {
                property: {
                  include: {
                    owner: { select: { id: true, name: true, email: true, phone: true } },
                  },
                },
              },
            },
          },
        });
        const ownerMap = new Map<string, any>();
        tenantLeases.forEach((l) => {
          const owner = l.unit?.property?.owner;
          if (owner) ownerMap.set(owner.id, owner);
        });
        return NextResponse.json(Array.from(ownerMap.values()));
      }

      if (role === "INSPECTOR") {
        // Return only inspectors assigned to the tenant's maintenance requests
        const tenantRequests = await prisma.maintenanceRequest.findMany({
          where: { tenantId: requesterId, inspectorId: { not: null } },
          select: { inspectorId: true },
        });
        const inspectorIds = [...new Set(tenantRequests.map((r: any) => r.inspectorId).filter(Boolean))];
        const inspectors = await prisma.user.findMany({
          where: { id: { in: inspectorIds as string[] } },
          select: { id: true, name: true, email: true, phone: true },
        });
        return NextResponse.json(inspectors);
      }

      // Tenants cannot list other tenant or admin data
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Owners and admins can query freely
    let whereClause: any = { role: role as any };
    if (requesterRole === "OWNER" && role === "INSPECTOR") {
      whereClause.ownerId = requesterId;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: { id: true, name: true, email: true, phone: true },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch users" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const { 
      name, phone, bankName, accountNumber, accountName,
      emergencyName, emergencyPhone, emergencyRelationship, dob, 
      employmentStatus, employer, position, avatar,
      approvalThreshold, emergencyOverrideLimit
    } = await req.json();

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        phone,
        bankName,
        accountNumber,
        accountName,
        emergencyName,
        emergencyPhone,
        emergencyRelationship,
        dob,
        employmentStatus,
        employer,
        position,
        avatar,
        approvalThreshold: approvalThreshold !== undefined ? (approvalThreshold === "" || approvalThreshold === null ? 200.00 : Number(approvalThreshold)) : undefined,
        emergencyOverrideLimit: emergencyOverrideLimit !== undefined ? (emergencyOverrideLimit === "" || emergencyOverrideLimit === null ? 1500.00 : Number(emergencyOverrideLimit)) : undefined,
      },
    });

    const { password: _, ...sanitizedUser } = updatedUser;
    return NextResponse.json(sanitizedUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER" && (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const requesterId = (session.user as any).id;
    const requesterRole = (session.user as any).role;
    const { name, email, phone, role, password } = await req.json();

    if (!name || !email || !role || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role,
        password: hashedPassword,
        ...(role === "INSPECTOR" && requesterRole === "OWNER" ? { ownerId: requesterId } : {}),
      },
    });

    return NextResponse.json({ success: true, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER" && (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
  }

  try {
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete user" }, { status: 500 });
  }
}

