import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/email";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        tenantStatus: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Fetch all users error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { firstName, lastName, email, phone, password, role } = await req.json();

    if (!email || !firstName || !password || !role) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already in use." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const fullName = `${firstName} ${lastName || ""}`.trim();

    const newUser = await prisma.user.create({
      data: {
        email,
        name: fullName,
        phone,
        password: hashedPassword,
        role: role, // Expecting SUPERADMIN, OWNER, TENANT, INSPECTOR
      },
    });

    const getRoleDetails = (userRole: string) => {
      switch (userRole) {
        case "SUPERADMIN":
          return {
            title: "Platform Administrator",
            desc: "You have full administrator access. You can configure global settings, manage all platform users, audit accounts, and overview all properties and payments across the network."
          };
        case "OWNER":
          return {
            title: "Property Owner",
            desc: "You have landlord access. You can register properties, add units, review rental applications, track tenant agreements, view financial dashboards, and receive payout ledgers."
          };
        case "TENANT":
          return {
            title: "Tenant Profile",
            desc: "You have resident access. You can sign your lease agreement, pay your rent online, keep track of invoice history, and submit/track maintenance requests for your unit."
          };
        case "INSPECTOR":
          return {
            title: "Property Inspector",
            desc: "You have field inspector access. You can review scheduled inspections, check unit checklists, and submit compliance reports directly from the field."
          };
        case "ACCOUNTANT":
          return {
            title: "Financial Accountant",
            desc: "You have accounting privileges. You can manage rent invoicing schedules, generate financial reports, audit ledgers, and approve payout requests."
          };
        default:
          return {
            title: userRole,
            desc: "You have access to the PropertyPro platform features suited to your role."
          };
      }
    };

    const roleInfo = getRoleDetails(role);
    const appUrl = process.env.APP_URL || "http://localhost:3000";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to PropertyPro</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #F8FAFC;">
          <tr>
            <td align="center" style="padding: 40px 10px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
                <!-- Header Banner -->
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 32px 20px;">
                    <h1 style="color: #FFFFFF; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; text-transform: uppercase;">PropertyPro</h1>
                    <p style="color: #94A3B8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 4px 0 0 0;">Welcome onboard</p>
                  </td>
                </tr>
                <!-- Content Area -->
                <tr>
                  <td style="padding: 40px 32px;">
                    <h2 style="font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 16px 0;">Hello ${fullName},</h2>
                    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
                      An administrator has created your new account on the <strong>PropertyPro</strong> portal. Below are your account credentials and role configuration details.
                    </p>

                    <!-- Account Card -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F1F5F9; border-radius: 12px; margin-bottom: 28px;">
                      <tr>
                        <td style="padding: 20px;">
                          <h3 style="font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">Your Credentials</h3>
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td width="30%" style="font-size: 14px; font-weight: 700; color: #0F172A; padding: 4px 0;">Login Email:</td>
                              <td style="font-size: 14px; color: #334155; padding: 4px 0; font-family: monospace;">${email}</td>
                            </tr>
                            <tr>
                              <td style="font-size: 14px; font-weight: 700; color: #0F172A; padding: 4px 0;">Temporary Password:</td>
                              <td style="font-size: 14px; color: #334155; padding: 4px 0; font-family: monospace;">${password}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Role Details -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-left: 4px solid #3B82F6; background-color: #EFF6FF; border-radius: 4px; margin-bottom: 32px;">
                      <tr>
                        <td style="padding: 16px 20px;">
                          <h4 style="font-size: 13px; font-weight: 800; color: #1D4ED8; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Account Role: ${roleInfo.title}</h4>
                          <p style="font-size: 14px; color: #1E40AF; line-height: 1.5; margin: 0;">${roleInfo.desc}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Action Button -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="${appUrl}/auth/login" target="_blank" style="display: inline-block; background-color: #3B82F6; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1);">
                            Access Your Account
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td align="center" style="padding: 24px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;">
                    <p style="font-size: 12px; color: #94A3B8; margin: 0 0 8px 0;">This email was sent by the PropertyPro administration team.</p>
                    <p style="font-size: 11px; color: #CBD5E1; margin: 0;">&copy; ${new Date().getFullYear()} PropertyPro. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const emailText = `Hi ${fullName},\n\nYour account has been created by the Admin.\n\nRole: ${roleInfo.title}\n\nLogin Email: ${email}\nPassword: ${password}\n\nPlease login to access the platform: ${appUrl}/auth/login`;

    try {
      if (typeof sendEmail === "function") {
        await sendEmail({
          to: email,
          subject: `Welcome to PropertyPro - Your ${roleInfo.title} Account`,
          text: emailText,
          html: emailHtml,
        });
      }
    } catch (e) {
      console.warn("Email could not be sent. Please ensure email provider is configured.");
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}
