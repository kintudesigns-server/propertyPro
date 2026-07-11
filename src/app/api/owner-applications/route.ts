import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { notifyMany } from "@/lib/notify";

// GET all owner applications (Admin only)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const applications = await prisma.ownerApplication.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(applications);
}

// POST - Submit new owner application (Public)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, website, entityType, portfolioSize, currentSoftware } = body;
    const finalPortfolioSize = portfolioSize || "1-5 Properties";

    if (!name || !email || !phone || !entityType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    
    // Check for duplicate email in applications or users
    const [existingApp, existingUser] = await Promise.all([
      prisma.ownerApplication.findFirst({ where: { email: normalizedEmail, status: { in: ["PENDING", "UNDER_REVIEW", "APPROVED"] } } }),
      prisma.user.findUnique({ where: { email: normalizedEmail } }),
    ]);

    if (existingUser) {
      return NextResponse.json({ error: "This email is already registered. Please sign in instead." }, { status: 409 });
    }
    if (existingApp) {
      return NextResponse.json({ error: "An application with this email is already pending or approved." }, { status: 409 });
    }

    const application = await prisma.ownerApplication.create({
      data: { name, email: normalizedEmail, phone, website, entityType, portfolioSize: finalPortfolioSize, currentSoftware, status: "PENDING" },
    });

    // Send confirmation email to applicant
    const trackingUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/track/owner/${application.trackingId}`;
    await sendEmail({
      to: email,
      subject: "Your PropertyPro Owner Application Has Been Received",
      html: `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                <!-- Header -->
                <tr>
                  <td align="center" style="background-color: #2563eb; padding: 40px 20px;">
                    <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/building-2.svg" width="48" height="48" style="display: block; margin-bottom: 16px; filter: brightness(0) invert(1);" alt="Logo">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Application Received</h1>
                    <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 16px;">PropertyPro Owner Access</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 40px 32px;">
                    <p style="margin: 0 0 16px; font-size: 16px; color: #0f172a; font-weight: 600;">Hi ${name},</p>
                    <p style="margin: 0 0 24px; color: #475569; line-height: 1.6; font-size: 15px;">
                      Thank you for applying for a PropertyPro Owner account. Our team will review your application within <strong style="color: #0f172a;">1-2 business days</strong> and notify you via email.
                    </p>
                    
                    <!-- Summary Card -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 20px;">
                          <h3 style="margin: 0 0 16px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Application Summary</h3>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 120px;">Name</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${name}</td></tr>
                            <tr><td colspan="2" style="border-bottom: 1px solid #e2e8f0;"></td></tr>
                            <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${email}</td></tr>
                            <tr><td colspan="2" style="border-bottom: 1px solid #e2e8f0;"></td></tr>
                            <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Phone</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${phone}</td></tr>
                            <tr><td colspan="2" style="border-bottom: 1px solid #e2e8f0;"></td></tr>
                            <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Entity Type</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${entityType}</td></tr>
                            <tr><td colspan="2" style="border-bottom: 1px solid #e2e8f0;"></td></tr>
                            <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Portfolio Size</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${finalPortfolioSize}</td></tr>
                            ${website ? `<tr><td colspan="2" style="border-bottom: 1px solid #e2e8f0;"></td></tr><tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Website</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${website}</td></tr>` : ""}
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Section -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 32px; text-align: center;">
                      <tr>
                        <td style="padding: 24px;">
                          <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 700; color: #1e40af;">Track Your Application</h3>
                          <p style="color: #3b82f6; font-size: 14px; margin: 0 0 16px;">Use the link below to check your status in real-time.</p>
                          <a href="${trackingUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">View Application Status →</a>
                        </td>
                      </tr>
                    </table>

                    <!-- Terms -->
                    <h3 style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px; border-top: 1px solid #e2e8f0; padding-top: 24px;">Terms & Conditions</h3>
                    <ul style="color: #64748b; font-size: 13px; line-height: 1.6; padding-left: 16px; margin: 0;">
                      <li style="margin-bottom: 4px;">Account access is granted only after manual admin verification.</li>
                      <li style="margin-bottom: 4px;">Platform fees apply based on your selected subscription tier.</li>
                      <li style="margin-bottom: 4px;">All transactions are processed securely via Stripe.</li>
                    </ul>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td align="center" style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} PropertyPro Inc. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `,
    });

    // Notify all admins via live-updating notifications
    try {
      const admins = await prisma.user.findMany({
        where: { role: "SUPERADMIN" },
        select: { id: true }
      });
      const adminIds = admins.map(a => a.id);
      await notifyMany(adminIds, {
        title: "New Owner Application",
        message: `${name} (${entityType}) has applied for owner access. Portfolio: ${finalPortfolioSize}.`,
        type: "SYSTEM",
        priority: "HIGH",
        relatedEntityId: application.id,
      });
    } catch (err) {
      console.error("[owner-applications] Failed to notify admins of new owner application:", err);
    }

    return NextResponse.json({ trackingId: application.trackingId, message: "Application submitted successfully" }, { status: 201 });
  } catch (error: any) {
    console.error("Owner Application Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
