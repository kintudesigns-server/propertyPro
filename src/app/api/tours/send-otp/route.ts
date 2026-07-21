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
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Property<span style="color: #3b82f6;">Pro</span></h1>
        </div>
        <div style="padding: 32px; color: #334155;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 700;">Tour Verification Request</h2>
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">You are currently scheduling a showing tour for <strong style="color: #0f172a;">${property?.name || "a property"}</strong> on PropertyPro.</p>
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">Please use the following secure 6-digit code to verify your identity and finalize your tour request:</p>
          
          <div style="background: linear-gradient(145deg, #f8fafc, #f1f5f9); border: 1px solid #e2e8f0; padding: 24px; border-radius: 8px; text-align: center; margin: 32px 0;">
            <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #2563eb;">${otp}</span>
          </div>
          
          <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            This security code will automatically expire in <strong>${otpExpiryMinutes} minutes</strong>. If you did not initiate this request, you can safely ignore or delete this email.
          </p>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        to: email,
        subject: `Your PropertyPro Tour Verification Code: ${otp}`,
        html: htmlBody,
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
