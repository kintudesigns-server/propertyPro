import { renderSaaSEmail } from "@/lib/email-template";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import bcrypt from "bcryptjs";

// GET all invitations for the owner
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = (session.user as any).id;
  const invitations = await prisma.tenantInvitation.findMany({
    where: { invitedByOwnerId: ownerId },
    include: { unit: { include: { property: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invitations);
}

// POST - Owner sends an invitation to a tenant
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ownerId = (session.user as any).id;
    const { tenantEmail, tenantName, unitId, monthlyRent, leaseStartDate } = await req.json();

    if (!tenantEmail || !tenantName || !unitId || !monthlyRent || !leaseStartDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get unit and property info
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { property: true },
    });
    if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

    // Check for duplicate pending invitation for same unit
    const existingInvite = await prisma.tenantInvitation.findFirst({
      where: { unitId, tenantEmail, status: "PENDING" },
    });
    if (existingInvite) {
      return NextResponse.json({ error: "An invitation is already pending for this tenant and unit." }, { status: 409 });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // 14 day expiry

    const invitation = await prisma.tenantInvitation.create({
      data: {
        tenantEmail,
        tenantName,
        unitId,
        propertyId: unit.propertyId,
        monthlyRent,
        leaseStartDate: new Date(leaseStartDate),
        invitedByOwnerId: ownerId,
        expiresAt,
        status: "PENDING",
      },
    });

    const acceptUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/invite/${invitation.token}`;

    await sendEmail({
      to: tenantEmail,
      subject: `You've been invited to join ${unit.property.name} on PropertyPro`,
      html: renderSaaSEmail({
        categoryBadge: "TENANCY INVITATION",
        preheader: `You've been invited to join ${unit.property.name} (Unit ${unit.name}). Accept to activate your tenant portal.`,
        title: "You've Been Invited!",
        subtitle: `${unit.property.name} • Unit ${unit.name}`,
        statusPill: { text: "INVITATION PENDING", type: "info" },
        greeting: `Hi ${tenantName},`,
        bodyParagraphs: [
          `You have been invited to manage your tenancy for <strong>Unit ${unit.name}</strong> at <strong>${unit.property.name}</strong> through PropertyPro.`,
          "Accept this invitation to activate your tenant portal where you can pay rent online, submit maintenance requests, and message your property manager."
        ],
        summaryCard: {
          title: "Unit & Lease Details",
          items: [
            { label: "Property", value: unit.property.name },
            { label: "Unit", value: unit.name },
            { label: "Monthly Rent", value: `$${Number(monthlyRent).toLocaleString()}/mo` },
            { label: "Lease Start Date", value: new Date(leaseStartDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) },
            { label: "Location", value: `${unit.property.address}, ${unit.property.city}` },
          ],
        },
        primaryAction: {
          label: "Accept Invitation & Create Account →",
          url: acceptUrl,
        },
        infoNotice: {
          title: "Invitation Expiry",
          text: `This secure invitation link is valid until ${expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`,
          type: "warning",
        },
      }),
    });

    return NextResponse.json({ message: "Invitation sent successfully", invitationId: invitation.id }, { status: 201 });
  } catch (error: any) {
    console.error("Tenant invitation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
