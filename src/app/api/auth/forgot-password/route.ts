import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderSaaSEmail } from "@/lib/email-template";
import crypto from "crypto";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const limiter = rateLimit(req, 5, 60000); // 5 attempts per minute
    if (!limiter.success) {
      return NextResponse.json({ error: "Too many requests. Please try again in a minute." }, { status: 429 });
    }
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Invalidate old tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const origin = new URL(req.url).origin;
    const resetUrl = `${origin}/auth/reset-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: "Reset Your PropertyPro Password",
      html: renderSaaSEmail({
        categoryBadge: "SECURITY & ACCOUNT",
        preheader: "Reset your PropertyPro account password using this secure link (expires in 1 hour).",
        title: "Reset Your Password",
        statusPill: { text: "ACTION REQUIRED", type: "warning" },
        greeting: `Hello ${user.name || "there"},`,
        bodyParagraphs: [
          "We received a request to reset the password for your PropertyPro account.",
          "Click the button below to set a new password. For security purposes, this link is valid for <strong>1 hour</strong>."
        ],
        primaryAction: {
          label: "Reset My Password →",
          url: resetUrl,
        },
        infoNotice: {
          title: "Didn't request this?",
          text: "If you did not initiate a password reset, you can safely ignore this email. Your password will remain unchanged.",
          type: "info",
        },
      }),
      text: `Reset your PropertyPro password by visiting: ${resetUrl}\n\nThis link expires in 1 hour.`,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Forgot Password]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
