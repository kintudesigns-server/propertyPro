import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { enforcePlanLimit } from "@/lib/plan-guard";
import { getEffectiveSubscriptionRules } from "@/lib/subscription-rules";
import { sendEmail } from "@/lib/email";

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
      approvalThreshold, emergencyOverrideLimit,
      currentPassword, newPassword
    } = await req.json();

    let passwordHash: string | undefined = undefined;
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required to set a new password." }, { status: 400 });
      }
      const existingUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!existingUser) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
      const valid = await bcrypt.compare(currentPassword, existingUser.password);
      if (!valid) {
        return NextResponse.json({ error: "Incorrect current password." }, { status: 400 });
      }
      passwordHash = await bcrypt.hash(newPassword, 10);
    }

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
        ...(passwordHash ? { password: passwordHash } : {}),
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
    
    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
      select: { name: true }
    });
    const requesterName = requester?.name || "An Owner";

    const { name, email, phone, role, password } = await req.json();

    if (!name || !email || !role || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (role === "INSPECTOR" && requesterRole === "OWNER") {
      const rules = await getEffectiveSubscriptionRules(requesterId);
      if (rules.isPaused && rules.blockAddInspector) {
        return NextResponse.json({
          error: "ACCOUNT_PAUSED",
          message: "Your account is paused. Adding new inspectors/team members is restricted.",
        }, { status: 403 });
      }

      const planGuard = await enforcePlanLimit(requesterId, "ADD_INSPECTOR");
      if (!planGuard.allowed) {
        return NextResponse.json({
          error: planGuard.code || "LIMIT_REACHED",
          message: planGuard.message,
        }, { status: 403 });
      }
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

    if (role === "INSPECTOR") {
      try {
        await sendEmail({
          to: email,
          subject: `📋 Invitation: Access the Inspector Portal on PropertyPro`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e5e5ea; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
              <div style="text-align: center; margin-bottom: 28px;">
                <span style="font-size: 40px;">📋</span>
              </div>
              <h2 style="color: #1d1d1f; font-size: 22px; font-weight: 800; text-align: center; margin-top: 0; margin-bottom: 8px; letter-spacing: -0.5px;">Welcome to PropertyPro!</h2>
              <p style="color: #6e6e73; font-size: 15px; text-align: center; margin-top: 0; margin-bottom: 24px;">
                You have been added as an inspector by <strong>${requesterName}</strong>. You can now access your inspector account to manage turnovers, move-out inspections, and maintenance tasks.
              </p>
              
              <div style="background-color: #f5f5f7; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
                <h3 style="color: #1d1d1f; font-size: 14px; font-weight: 700; margin-top: 0; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Your Account Credentials</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #1d1d1f;">
                  <tr>
                    <td style="padding: 6px 0; color: #86868b; width: 120px;">Portal Link:</td>
                    <td style="padding: 6px 0; font-weight: 600;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login" style="color: #007aff; text-decoration: none;">PropertyPro Portal</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #86868b;">Login Email:</td>
                    <td style="padding: 6px 0; font-weight: 600; font-family: monospace;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #86868b;">Temporary Password:</td>
                    <td style="padding: 6px 0; font-weight: 600; font-family: monospace; color: #1d1d1f;">${password}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin-bottom: 28px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login" style="background-color: #007aff; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(0, 122, 255, 0.24); transition: background-color 0.2s;">
                  Access Inspector Portal
                </a>
              </div>

              <hr style="border: 0; border-top: 1px solid #e5e5ea; margin-bottom: 24px;" />

              <div style="font-size: 12px; color: #86868b; line-height: 1.5; text-align: center;">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #6e6e73;">🔒 Security Recommendation</p>
                <p style="margin: 0;">For security purposes, we highly recommend changing your temporary password immediately upon your first successful login from your Profile settings page.</p>
              </div>
            </div>
          `
        });
      } catch (emailErr: any) {
        console.error("[CreateInspectorEmail] Failed to send email:", emailErr?.message);
      }
    }

    return NextResponse.json({ success: true, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } }, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A user with this email address already exists. Please use a different email." },
        { status: 400 }
      );
    }
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

