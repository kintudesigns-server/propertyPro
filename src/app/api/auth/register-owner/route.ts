import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auditLog } from "@/lib/audit-log";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const limiter = rateLimit(req, 5, 60000); // 5 attempts per minute
    if (!limiter.success) {
      return NextResponse.json({ error: "Too many requests. Please try again in a minute." }, { status: 429 });
    }
    const { name, email, phone, size } = await req.json();

    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    // Generate a temporary secure password (they will reset it when approved)
    const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: "OWNER",
        accountStatus: "PENDING_APPROVAL",
        notes: `Applied for owner access. Portfolio size: ${size}`,
      }
    });

    await auditLog({
      entityType: "USER",
      entityId: newUser.id,
      action: "CREATED",
      actorId: newUser.id,
      actorRole: "OWNER",
      newValue: { name, email, phone, role: "OWNER", accountStatus: "PENDING_APPROVAL" },
      note: `Owner registered new account (pending approval). Portfolio size: ${size}`,
    });

    // Notify the Admins (create a notification)
    const admins = await prisma.user.findMany({ where: { role: "SUPERADMIN" } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "New Owner Application",
          message: `${name} has applied for an Owner account. Portfolio size: ${size}.`,
          type: "SYSTEM",
          priority: "HIGH"
        }
      });
    }

    // Ideally, we'd also send an email to the admin here

    return NextResponse.json({ message: "Application submitted successfully" }, { status: 201 });

  } catch (error: any) {
    console.error("Owner Registration Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
