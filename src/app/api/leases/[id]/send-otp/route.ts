import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { otpStore } from "@/lib/otpStore";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const lease = await prisma.lease.findUnique({
      where: { id },
      include: {
        tenant: true,
        unit: {
          include: { property: true }
        }
      }
    });

    if (!lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    if (lease.tenant.email !== session.user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(lease.id, { code: otp, expiresAt });

    const htmlBody = `
      <div style="font-family: sans-serif; max-w-lg; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #0f172a;">Lease Signature Verification</h2>
        <p style="color: #475569;">You are attempting to sign the lease for <strong>${lease.unit.name} at ${lease.unit.property.name}</strong>.</p>
        <p style="color: #475569;">Please use the following 6-digit code to verify your identity and finalize your electronic signature:</p>
        
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #3b82f6;">${otp}</span>
        </div>
        
        <p style="color: #64748b; font-size: 12px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `;

    await sendEmail({
      to: lease.tenant.email,
      subject: `Your Verification Code: ${otp}`,
      html: htmlBody,
    });

    return NextResponse.json({ success: true, message: "OTP sent" });
  } catch (error: any) {
    console.error("Failed to send OTP:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
