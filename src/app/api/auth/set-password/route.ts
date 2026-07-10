import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/auth/set-password
// Called by newly created users to set their own password via a secure token
export async function POST(req: NextRequest) {
  try {
    const limiter = rateLimit(req, 5, 60000); // 5 attempts per minute
    if (!limiter.success) {
      return NextResponse.json({ error: "Too many requests. Please try again in a minute." }, { status: 429 });
    }
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Find the reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired link. Please contact your property manager." }, { status: 400 });
    }

    if (resetToken.used) {
      return NextResponse.json({ error: "This setup link has already been used. Please log in with your password." }, { status: 400 });
    }

    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json({ error: "This setup link has expired. Please contact your property manager for a new one." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and mark token as used in one transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { token },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Password set successfully. You can now log in." });
  } catch (error: any) {
    console.error("Set password error:", error);
    return NextResponse.json({ error: error.message || "Failed to set password" }, { status: 500 });
  }
}
