import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
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
      html: `
        <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px; background: #F8FAFC; border-radius: 16px; border: 1px solid #E2E8F0;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 24px; font-weight: 800; color: #2563EB;">Property<span style="color: #0F172A;">Pro</span></div>
            <div style="font-size: 13px; color: #64748B; margin-top: 4px; font-weight: 600;">Password Reset Request</div>
          </div>
          <div style="background: #fff; border-radius: 12px; padding: 28px; border: 1px solid #E2E8F0;">
            <h2 style="font-size: 18px; font-weight: 800; color: #0F172A; margin: 0 0 12px;">Reset your password</h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
              Hello ${user.name || "there"},<br/><br/>
              We received a request to reset your password. Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${resetUrl}" style="background: #2563EB; color: #fff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 10px; display: inline-block;">
                Reset My Password
              </a>
            </div>
            <p style="font-size: 12px; color: #94A3B8; text-align: center; margin: 0;">
              If you did not request a password reset, you can safely ignore this email.<br/>Your password will not change.
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #94A3B8;">
            &copy; 2026 PropertyPro. All rights reserved.
          </div>
        </div>
      `,
      text: `Reset your PropertyPro password by visiting: ${resetUrl}\n\nThis link expires in 1 hour.`,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Forgot Password]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
