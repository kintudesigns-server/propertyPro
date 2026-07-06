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
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 40px 32px; border-radius: 16px 16px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">🏠 Tenancy Invitation</h1>
            <p style="color: #c4b5fd; margin: 8px 0 0;">${unit.property.name} has invited you</p>
          </div>
          <div style="padding: 32px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none;">
            <p style="font-size: 16px; color: #0f172a; font-weight: 600; margin-top: 0;">Hi ${tenantName},</p>
            <p style="color: #475569; line-height: 1.7;">You have been invited to manage your tenancy for the following unit through the PropertyPro platform. Accept the invitation to get access to your tenant portal where you can pay rent online, submit maintenance requests, and communicate with your landlord.</p>

            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <h3 style="margin: 0 0 16px; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Unit Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 140px;">Property</td><td style="padding: 8px 0; font-weight: 700; color: #0f172a; font-size: 14px;">${unit.property.name}</td></tr>
                <tr style="border-top: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Unit</td><td style="padding: 8px 0; font-weight: 700; color: #0f172a; font-size: 14px;">${unit.name}</td></tr>
                <tr style="border-top: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Monthly Rent</td><td style="padding: 8px 0; font-weight: 700; color: #059669; font-size: 16px;">$${Number(monthlyRent).toLocaleString()}/mo</td></tr>
                <tr style="border-top: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Lease Start</td><td style="padding: 8px 0; font-weight: 700; color: #0f172a; font-size: 14px;">${new Date(leaseStartDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</td></tr>
                <tr style="border-top: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Address</td><td style="padding: 8px 0; font-weight: 600; color: #475569; font-size: 13px;">${unit.property.address}, ${unit.property.city}</td></tr>
              </table>
            </div>

            <div style="text-align: center; margin: 28px 0;">
              <a href="${acceptUrl}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 16px;">Accept Invitation & Create Account →</a>
            </div>

            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">This invitation expires on ${expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ message: "Invitation sent successfully", invitationId: invitation.id }, { status: 201 });
  } catch (error: any) {
    console.error("Tenant invitation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
