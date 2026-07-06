import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import bcrypt from "bcryptjs";

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

      // Generate random password
      const tempPassword = `PropPro${Math.random().toString(36).slice(-6).toUpperCase()}!`;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Determine appropriate pricing tier based on portfolio size
      const portfolioNumber = parseInt(application.portfolioSize.split("-")[0]) || 1;
      const tier = await prisma.pricingTier.findFirst({
        where: { isActive: true, minUnits: { lte: portfolioNumber }, maxUnits: { gte: portfolioNumber } },
        orderBy: { minUnits: "asc" },
      });

      // Create the owner user
      const newUser = await prisma.user.create({
        data: {
          name: application.name,
          email: application.email,
          phone: application.phone,
          password: hashedPassword,
          role: "OWNER",
          accountStatus: "ACTIVE",
          notes: `Approved from application. Entity: ${application.entityType}. Portfolio: ${application.portfolioSize}. Website: ${application.website || "N/A"}`,
          currentTierId: tier?.id,
          subscriptionStatus: tier?.price === 0 ? "active" : null,
        },
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

      const dashboardUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/login`;

      // Send welcome email
      await sendEmail({
        to: application.email,
        subject: "🎉 Welcome to PropertyPro — Your Owner Account is Ready!",
        html: `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                <!-- Header -->
                <tr>
                  <td align="center" style="background-color: #059669; padding: 40px 20px;">
                    <div style="font-size: 40px; margin-bottom: 12px;">🎉</div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">You're Approved!</h1>
                    <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 16px;">Your PropertyPro owner account is ready</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 40px 32px;">
                    <p style="margin: 0 0 16px; font-size: 16px; color: #0f172a; font-weight: 600;">Hi ${application.name},</p>
                    <p style="margin: 0 0 24px; color: #475569; line-height: 1.6; font-size: 15px;">
                      Your owner application has been reviewed and <strong style="color: #059669;">approved</strong>. Welcome to PropertyPro! Below are your login credentials.
                    </p>
                    
                    <!-- Credentials Card -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border-radius: 8px; margin-bottom: 24px; text-align: center;">
                      <tr>
                        <td style="padding: 24px;">
                          <p style="color: #94a3b8; font-size: 12px; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Your Login Credentials</p>
                          <p style="color: #64748b; font-size: 12px; margin: 0 0 4px;">Email Address</p>
                          <p style="color: #ffffff; font-size: 16px; font-weight: 700; margin: 0 0 16px 0;">${application.email}</p>
                          
                          <div style="border-top: 1px solid #1e293b; margin: 0 24px 16px 24px;"></div>
                          
                          <p style="color: #64748b; font-size: 12px; margin: 0 0 4px;">Temporary Password</p>
                          <p style="color: #10b981; font-size: 24px; font-weight: 800; letter-spacing: 2px; margin: 0; font-family: 'Courier New', Courier, monospace;">${tempPassword}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Warning -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef9c3; border: 1px solid #fde047; border-radius: 6px; margin-bottom: 32px;">
                      <tr>
                        <td style="padding: 12px 16px;">
                          <p style="color: #854d0e; font-size: 13px; margin: 0; font-weight: 600;">⚠️ Please change your password immediately after your first login for security.</p>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA -->
                    <div style="text-align: center; margin-bottom: 32px;">
                      <a href="${dashboardUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px;">Access Your Dashboard →</a>
                    </div>

                    <!-- Plan Details -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 20px;">
                          <h3 style="margin: 0 0 12px; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Your Plan: ${tier?.name || "Hobbyist"}</h3>
                          <ul style="color: #475569; font-size: 13px; line-height: 1.8; padding-left: 16px; margin: 0;">
                            ${tier?.features.map(f => `<li style="margin-bottom: 4px;">${f}</li>`).join("") || "<li>Free plan — up to 2 units</li>"}
                          </ul>
                        </td>
                      </tr>
                    </table>

                    <!-- Checklist -->
                    <h3 style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px; border-top: 1px solid #e2e8f0; padding-top: 24px;">Getting Started Checklist</h3>
                    <ul style="list-style: none; padding: 0; margin: 0; color: #475569; font-size: 14px; line-height: 2;">
                      <li><span style="color: #10b981; font-weight: bold; margin-right: 8px;">✓</span> Account created</li>
                      <li><span style="color: #94a3b8; font-weight: bold; margin-right: 8px;">○</span> Log in and change your password</li>
                      <li><span style="color: #94a3b8; font-weight: bold; margin-right: 8px;">○</span> Complete your profile</li>
                      <li><span style="color: #94a3b8; font-weight: bold; margin-right: 8px;">○</span> Add your first property</li>
                    </ul>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td align="center" style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} PropertyPro Inc. Need help? Reply to this email.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        `,
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
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0f172a; padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 22px;">Application Update</h1>
            </div>
            <div style="padding: 32px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none;">
              <p style="color: #0f172a; font-weight: 600;">Hi ${application.name},</p>
              <p style="color: #475569; line-height: 1.7;">Thank you for your interest in PropertyPro. After reviewing your application, we are unable to approve it at this time.</p>
              ${rejectionReason ? `<div style="background: white; border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;"><p style="color: #0f172a; font-weight: 600; margin: 0 0 4px; font-size: 13px;">Reason:</p><p style="color: #475569; margin: 0;">${rejectionReason}</p></div>` : ""}
              <p style="color: #475569;">You are welcome to re-apply in 30 days if your circumstances change. If you believe this decision was made in error, please contact our support team.</p>
            </div>
          </div>
        `,
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
