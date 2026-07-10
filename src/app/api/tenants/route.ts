import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sanitizeUser } from "@/lib/utils";
import { encrypt } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    // Single tenant lookup
    if (id) {
      // Tenants can only look up themselves
      if (role === "TENANT" && id !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const tenant = await prisma.user.findUnique({
        where: { id, role: "TENANT" },
        include: {
          leases: {
            include: { unit: { include: { property: true } }, invoices: true }
          }
        }
      });
      if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
      // Extra check: owners can only see tenants on their properties
      if (role === "OWNER") {
        const hasLease = tenant.leases.some(
          (l: any) => l.unit?.property?.ownerId === userId
        );
        if (!hasLease) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json(sanitizeUser(tenant));
    }

    // Tenant listing themselves
    if (role === "TENANT") {
      const self = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          leases: {
            include: { unit: { include: { property: true } }, invoices: true }
          }
        }
      });
      return NextResponse.json(self ? [sanitizeUser(self)] : []);
    }

    // Owner sees only their tenants
    if (role === "OWNER") {
      const tenants = await prisma.user.findMany({
        where: {
          role: "TENANT",
          leases: { some: { unit: { property: { ownerId: userId } } } },
        },
        include: {
          leases: { include: { unit: { include: { property: true } } } }
        },
        orderBy: { createdAt: "desc" }
      });
      return NextResponse.json(tenants.map((t: any) => sanitizeUser(t)));
    }

    // SUPERADMIN sees all
    if (role === "SUPERADMIN") {
      const tenants = await prisma.user.findMany({
        where: { role: "TENANT" },
        include: {
          leases: { include: { unit: { include: { property: true } } } }
        },
        orderBy: { createdAt: "desc" }
      });
      return NextResponse.json(tenants.map((t: any) => sanitizeUser(t)));
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch tenants" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const data = await req.json();
    
    if (!data.email || !data.password || !data.name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify owner has at least one approved property
    const approvedPropertyCount = await prisma.property.count({
      where: {
        ownerId: (session.user as any).id,
        approvalStatus: "APPROVED"
      }
    });

    if (approvedPropertyCount === 0) {
      return NextResponse.json(
        { error: "You must have at least one approved property to add tenants." },
        { status: 403 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const tenant = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        phone: data.phone || null,
        role: "TENANT",
        tenantStatus: data.status || "Application Submitted",
        dob: data.dob || null,
        ssn: data.ssn ? encrypt(data.ssn) : null,
        employer: data.employer || null,
        position: data.position || null,
        annualIncome: data.annualIncome ? parseFloat(data.annualIncome) : null,
        employmentStartDate: data.employmentStartDate || null,
        emergencyName: data.emergencyName || null,
        emergencyRelationship: data.emergencyRelationship || null,
        emergencyPhone: data.emergencyPhone || null,
        emergencyEmail: data.emergencyEmail || null,
        creditScore: data.creditScore ? parseInt(data.creditScore) : null,
        targetMoveInDate: data.moveInDate || null,
        notes: data.notes || null,
      } as any
    });

    return NextResponse.json(sanitizeUser(tenant), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create tenant" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id, status } = await req.json();
    
    if (!id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { tenantStatus: status } as any,
    });
    
    return NextResponse.json({ success: true, message: "Status updated", tenantStatus: (updatedUser as any).tenantStatus });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update tenant status" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const updateData: any = {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      tenantStatus: data.tenantStatus || "Pending Review",
      dob: data.dob || null,
      ssn: data.ssn ? encrypt(data.ssn) : null,
      employer: data.employer || null,
      position: data.position || null,
      annualIncome: data.annualIncome ? parseFloat(data.annualIncome) : null,
      employmentStartDate: data.employmentStartDate || null,
      emergencyName: data.emergencyName || null,
      emergencyRelationship: data.emergencyRelationship || null,
      emergencyPhone: data.emergencyPhone || null,
      emergencyEmail: data.emergencyEmail || null,
      creditScore: data.creditScore ? parseInt(data.creditScore) : null,
      targetMoveInDate: data.moveInDate || null,
      notes: data.notes || null,
    };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const tenant = await prisma.user.update({
      where: { id: data.id },
      data: updateData as any,
    });

    return NextResponse.json(sanitizeUser(tenant));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update tenant" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      // Manually delete relations since schema doesn't have Cascade for them
      await tx.lease.deleteMany({ where: { tenantId: id } });
      await tx.maintenanceRequest.deleteMany({ where: { tenantId: id } });
      
      await tx.user.delete({
        where: { id }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete tenant" }, { status: 500 });
  }
}
