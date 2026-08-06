import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderSaaSEmail } from "@/lib/email-template";
import { setOtp } from "@/lib/otpStore";

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

    await setOtp(lease.id, otp);

    await sendEmail({
      to: lease.tenant.email,
      subject: `Your PropertyPro Lease Signature Code: ${otp}`,
      html: renderSaaSEmail({
        categoryBadge: "LEASE SIGNATURE",
        preheader: `Your 6-digit electronic signature verification code is ${otp}. Valid for 10 minutes.`,
        title: "Lease Signature Verification",
        subtitle: `${lease.unit.property.name} • Unit ${lease.unit.name}`,
        statusPill: { text: "SIGNATURE OTP", type: "info" },
        greeting: `Hi ${lease.tenant.name || "Resident"},`,
        bodyParagraphs: [
          `You are attempting to electronically sign the lease agreement for <strong>Unit ${lease.unit.name}</strong> at <strong>${lease.unit.property.name}</strong>.`,
          "Please enter the 6-digit verification code below to authorize your digital signature:"
        ],
        summaryCard: {
          title: "Verification Code",
          items: [
            { label: "Security Code", value: `<span style="font-size: 24px; font-weight: 900; letter-spacing: 4px; color: #0F172A;">${otp}</span>` },
            { label: "Expires In", value: "10 minutes" },
          ],
        },
        infoNotice: {
          title: "Legal & Security Notice",
          text: "By entering this code, you confirm your identity and authorize electronic signature of your lease contract.",
          type: "warning",
        },
      }),
    });

    return NextResponse.json({ success: true, message: "OTP sent" });
  } catch (error: any) {
    console.error("Failed to send OTP:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
