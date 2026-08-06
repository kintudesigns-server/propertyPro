import { renderSaaSEmail } from "@/lib/email-template";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email, propertyId, unitId, honeypot } = await req.json();

    if (!email || !propertyId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Honeypot check
    if (honeypot && honeypot.trim() !== "") {
      // Silently return success to bot
      return NextResponse.json({ success: true, message: "Verification code sent" });
    }

    // Extract IP address for rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               req.headers.get("x-real-ip") || "unknown";

    // 2. Fetch platform settings
    let settings = await prisma.platformSettings.findFirst();
    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: {
          adminFeePercent: 2.00,
          tourMaxRequestsPerEmail: 3,
          tourRateLimitWindowHours: 24,
          tourOtpExpiryMinutes: 10,
          tourCancellationWindowHours: 24,
        },
      });
    }

    const maxRequests = settings.tourMaxRequestsPerEmail;
    const windowHours = settings.tourRateLimitWindowHours;
    const otpExpiryMinutes = settings.tourOtpExpiryMinutes;

    // 3. Rate limiting check using TourOtp table by Email and IP
    const windowStartDate = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const emailOtpCount = await prisma.tourOtp.count({
      where: {
        email,
        createdAt: { gte: windowStartDate },
      },
    });

    const ipOtpCount = await prisma.tourOtp.count({
      where: {
        ipAddress: ip,
        createdAt: { gte: windowStartDate },
      },
    });

    if (emailOtpCount >= maxRequests) {
      return NextResponse.json(
        { error: `You have requested verification codes ${maxRequests} times in the last ${windowHours} hours for this email. Please try again later.` },
        { status: 429 }
      );
    }

    if (ipOtpCount >= 10) {
      return NextResponse.json(
        { error: "Too many verification code requests from your IP address. Please try again later." },
        { status: 429 }
      );
    }

    // 4. Duplicate active booking check
    const existingTour = await prisma.tour.findFirst({
      where: {
        tenantEmail: email,
        propertyId,
        unitId: unitId || null,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });

    if (existingTour) {
      return NextResponse.json(
        { error: "You already have an active tour request scheduled for this unit. Please manage your existing tour instead." },
        { status: 409 }
      );
    }

    // 5. Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + otpExpiryMinutes * 60 * 1000);

    // Save to DB with IP address
    await prisma.tourOtp.create({
      data: {
        email,
        otp,
        propertyId,
        unitId: unitId || null,
        expiresAt,
        ipAddress: ip,
      },
    });

    // 6. Send Email
    const property = await prisma.property.findUnique({ where: { id: propertyId } });

    try {
      await sendEmail({
        to: email,
        subject: `Your PropertyPro Tour Verification Code: ${otp}`,
        html: renderSaaSEmail({
          categoryBadge: "TOUR VERIFICATION",
          preheader: `Your 6-digit tour verification code is ${otp}. Valid for ${otpExpiryMinutes} minutes.`,
          title: "Verify Your Tour Request",
          subtitle: `Showing Tour • ${property?.name || "PropertyPro Unit"}`,
          statusPill: { text: "OTP CODE", type: "info" },
          bodyParagraphs: [
            `You are currently scheduling a showing tour for <strong>${property?.name || "a property"}</strong> on PropertyPro.`,
            "Please enter the following 6-digit verification code to confirm your identity and finalize your booking:"
          ],
          summaryCard: {
            title: "Verification Code",
            items: [
              { label: "Security Code", value: `<span style="font-size: 24px; font-weight: 900; letter-spacing: 4px; color: #0F172A;">${otp}</span>` },
              { label: "Expires In", value: `${otpExpiryMinutes} minutes` },
            ],
          },
          infoNotice: {
            title: "Security Notice",
            text: `This single-use security code will automatically expire in ${otpExpiryMinutes} minutes. Do not share this code with anyone.`,
            type: "warning",
          },
        }),
      });
    } catch (err) {
      console.error("Failed to send OTP email:", err);
      // Fail gracefully if email fails (fallback for dev testing without SMTP)
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({ 
          success: true, 
          message: `[DEV ONLY] Code generated: ${otp} (SMTP not configured)`,
          otpDevFallback: otp 
        });
      }
      return NextResponse.json({ error: "Failed to send verification email. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Verification code sent successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process OTP request" }, { status: 500 });
  }
}
