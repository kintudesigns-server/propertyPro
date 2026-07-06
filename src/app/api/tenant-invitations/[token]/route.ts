import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET - fetch invitation details by token
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const invitation = await prisma.tenantInvitation.findUnique({
    where: { token: params.token },
    include: { unit: { include: { property: true } }, invitedByOwner: { select: { name: true } } },
  });

  if (!invitation) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  if (invitation.status !== "PENDING") {
    return NextResponse.json({ error: "This invitation has already been used or expired", status: invitation.status }, { status: 400 });
  }

  if (new Date() > invitation.expiresAt) {
    await prisma.tenantInvitation.update({ where: { token: params.token }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "This invitation has expired" }, { status: 400 });
  }

  return NextResponse.json(invitation);
}

// POST - Accept invitation (create account + lease)
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { name, phone, password } = await req.json();

    const invitation = await prisma.tenantInvitation.findUnique({
      where: { token: params.token },
      include: { unit: { include: { property: true } } },
    });

    if (!invitation || invitation.status !== "PENDING") {
      return NextResponse.json({ error: "Invalid or already used invitation" }, { status: 400 });
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.tenantInvitation.update({ where: { token: params.token }, data: { status: "EXPIRED" } });
      return NextResponse.json({ error: "This invitation has expired" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if tenant already has an account
    let tenant = await prisma.user.findUnique({ where: { email: invitation.tenantEmail } });

    if (!tenant) {
      tenant = await prisma.user.create({
        data: {
          name: name || invitation.tenantName,
          email: invitation.tenantEmail,
          phone,
          password: hashedPassword,
          role: "TENANT",
          accountStatus: "ACTIVE",
          tenantStatus: "Active",
        },
      });
    }

    // Calculate lease end date (12 months from start)
    const endDate = new Date(invitation.leaseStartDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    // Create the lease
    const lease = await prisma.lease.create({
      data: {
        unitId: invitation.unitId,
        tenantId: tenant.id,
        startDate: invitation.leaseStartDate,
        endDate,
        monthlyRent: invitation.monthlyRent,
        status: "ACTIVE",
        securityDeposit: invitation.monthlyRent,
      },
    });

    // Update unit to OCCUPIED
    await prisma.unit.update({ where: { id: invitation.unitId }, data: { status: "OCCUPIED" } });

    // Mark invitation as accepted
    await prisma.tenantInvitation.update({
      where: { token: params.token },
      data: { status: "ACCEPTED", acceptedByTenantId: tenant.id },
    });

    // Notify owner
    await prisma.notification.create({
      data: {
        userId: invitation.invitedByOwnerId,
        title: "Tenant Accepted Invitation",
        message: `${tenant.name} has accepted the invitation for ${invitation.unit.name} and their lease is now active.`,
        type: "SYSTEM",
        priority: "HIGH",
        relatedEntityId: lease.id,
      },
    });

    return NextResponse.json({ message: "Invitation accepted! Your account is ready.", leaseId: lease.id });
  } catch (error: any) {
    console.error("Accept invitation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
