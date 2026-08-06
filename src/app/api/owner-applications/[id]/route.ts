import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderSaaSEmail } from "@/lib/email-template";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

// GET single application (by trackingId or id)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const application = await prisma.ownerApplication.findFirst({
    where: { OR: [{ id }, { trackingId: id }] },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  return NextResponse.json(application);
}

// PATCH - Approve or Reject application (Admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, rejectionReason, adminNotes } = await req.json();
    const adminId = (session.user as any).id;

    const application = await prisma.ownerApplication.findUnique({ where: { id } });
    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    if (action === "APPROVE") {
      // Check if user already created
      const existingUser = await prisma.user.findUnique({ where: { email: application.email } });
      if (existingUser) {
        return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
      }

      // Create a secure placeholder password (direct credentials login will be impossible until they set their password)
      const placeholderPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(placeholderPassword, 10);

      // Create the owner user
      const newUser = await prisma.user.create({
        data: {
          name: application.name,
          email: application.email,
          phone: application.phone,
          password: hashedPassword,
          role: "OWNER",
          accountStatus: "ACTIVE",
          employmentStatus: application.entityType === "BUSINESS" ? "BUSINESS" : "INDIVIDUAL",
          notes: `Approved from application. Entity: ${application.entityType}. Portfolio: ${application.portfolioSize}. Website: ${application.website || "N/A"}`,
          currentTierId: null,
          subscriptionStatus: "PendingPlanSelection",
        },
      });

      // Generate secure random token for setup link (valid for 48 hours)
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
      
      await prisma.passwordResetToken.create({
        data: { token, userId: newUser.id, expiresAt },
      });

      // Update application
      await prisma.ownerApplication.update({
        where: { id },
        data: {
          status: "APPROVED",
          adminNotes,
          reviewedAt: new Date(),
          reviewedByAdminId: adminId,
          createdUserId: newUser.id,
        },
      });

      const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const setupUrl = `${origin}/auth/set-password?token=${token}`;

      // Send welcome email
      await sendEmail({
        to: application.email,
        subject: "🎉 Welcome to PropertyPro — Securely Set Up Your Owner Account!",
        html: renderSaaSEmail({
          categoryBadge: "OWNER APPLICATION APPROVED",
          preheader: `Welcome to PropertyPro! Set up your password to activate your owner account.`,
          title: "Welcome Aboard!",
          subtitle: "Your owner application has been approved.",
          statusPill: { text: "APPROVED", type: "success" },
          greeting: `Hi ${application.name},`,
          bodyParagraphs: [
            "Great news! Your PropertyPro owner application has been reviewed and <strong>approved</strong>.",
            "Click the button below to set up your password, choose your subscription plan, and start managing your portfolio."
          ],
          primaryAction: {
            label: "Set Up Your Password & Login →",
            url: setupUrl,
          },
          infoNotice: {
            title: "🔒 One-Time Security Setup",
            text: "This security link is single-use only and expires in 48 hours for account safety.",
            type: "info",
          },
          summaryCard: {
            title: "Subscription Setup Info",
            items: [
              { label: "Selected Entity", value: application.entityType || "Individual/Business" },
              { label: "Portfolio Size", value: application.portfolioSize || "Standard" },
              { label: "Account Status", value: "Pending Password Setup" },
            ],
          },
          checklist: [
            { text: "Owner application approved", completed: true },
            { text: "Set up your password & credentials", completed: false },
            { text: "Select your subscription plan & payment method", completed: false },
            { text: "Add your first property & units", completed: false },
          ],
        }),
      });

      return NextResponse.json({ message: "Application approved and owner account created", userId: newUser.id });

    } else if (action === "REJECT") {
      await prisma.ownerApplication.update({
        where: { id },
        data: {
          status: "REJECTED",
          adminNotes,
          rejectionReason,
          reviewedAt: new Date(),
          reviewedByAdminId: adminId,
        },
      });

      await sendEmail({
        to: application.email,
        subject: "Update on Your PropertyPro Owner Application",
        html: renderSaaSEmail({
          categoryBadge: "OWNER APPLICATION UPDATE",
          preheader: `Important update regarding your PropertyPro owner application.`,
          title: "Application Status Update",
          statusPill: { text: "NOT APPROVED", type: "danger" },
          greeting: `Hi ${application.name},`,
          bodyParagraphs: [
            "Thank you for your interest in PropertyPro. After reviewing your application, we are unable to approve your owner account at this time."
          ],
          infoNotice: rejectionReason ? {
            title: "Decision Details",
            text: rejectionReason,
            type: "warning",
          } : undefined,
          footerNote: "You are welcome to re-apply in 30 days if your portfolio details change. If you believe this decision was made in error, please reply to this email.",
        }),
      });

      return NextResponse.json({ message: "Application rejected" });
    }

    // Set to UNDER_REVIEW
    await prisma.ownerApplication.update({
      where: { id },
      data: { status: "UNDER_REVIEW", adminNotes, reviewedByAdminId: adminId },
    });
    return NextResponse.json({ message: "Application status updated" });

  } catch (error: any) {
    console.error("Application PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
