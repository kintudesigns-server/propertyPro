import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email";
import { notify } from "@/lib/notify";
import { getTimezoneForState, formatDateTimeInTimezone } from "@/lib/timezones";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");
  const dateStrParam = searchParams.get("date");

  // Allow unauthenticated query for booked slots on a specific property & date
  if (propertyId && dateStrParam) {
    try {
      const targetDate = new Date(dateStrParam);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const activeTours = await prisma.tour.findMany({
        where: {
          propertyId,
          status: { in: ["PENDING", "CONFIRMED"] },
          scheduledAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          scheduledAt: true,
        },
      });

      return NextResponse.json(activeTours.map((t) => t.scheduledAt));
    } catch (err: any) {
      return NextResponse.json({ error: "Failed to fetch booked slots" }, { status: 500 });
    }
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  try {
    const status = searchParams.get("status");
    let whereClause: any = {};

    if (role === "OWNER") {
      whereClause.property = { ownerId: userId };
    } else if (role === "TENANT") {
      whereClause.OR = [
        { tenantEmail: session.user.email || "" },
      ];
    } else if (role !== "SUPERADMIN") {
      return NextResponse.json([]);
    }

    if (propertyId) {
      whereClause.propertyId = propertyId;
    }
    if (status) {
      whereClause.status = status;
    }

    const tours = await prisma.tour.findMany({
      where: whereClause,
      include: {
        property: true,
        unit: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tours);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch tours" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { 
      propertyId, 
      unitId, 
      tenantName, 
      tenantEmail, 
      tenantPhone, 
      tourType, 
      scheduledAt, 
      tenantMessage,
      otpCode 
    } = await req.json();

    if (!propertyId || !tenantName || !tenantEmail || !tenantPhone || !scheduledAt || !otpCode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Verify OTP
    const validOtp = await prisma.tourOtp.findFirst({
      where: {
        email: tenantEmail,
        otp: otpCode,
        propertyId,
        unitId: unitId || null,
        used: false,
        expiresAt: { gte: new Date() }
      }
    });

    if (!validOtp) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }

    // Mark OTP as used
    await prisma.tourOtp.update({
      where: { id: validOtp.id },
      data: { used: true }
    });

    // 2. Verify property exists and is approved
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { owner: true }
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (property.approvalStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Cannot schedule tours for properties pending administrative review" },
        { status: 403 }
      );
    }

    if (unitId) {
      const unit = await prisma.unit.findUnique({
        where: { id: unitId },
      });
      if (!unit || unit.propertyId !== propertyId) {
        return NextResponse.json({ error: "Invalid unit selected" }, { status: 400 });
      }
    }

    // 3. Duplicate check for same tenant
    const existingTour = await prisma.tour.findFirst({
      where: {
        tenantEmail,
        propertyId,
        unitId: unitId || null,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });

    if (existingTour) {
      return NextResponse.json(
        { error: "You already have an active tour request scheduled for this unit." },
        { status: 409 }
      );
    }

    // 3b. Slot conflict check (±30 minutes window across ALL tenants)
    const requestedTime = new Date(scheduledAt).getTime();
    const slotConflict = await prisma.tour.findFirst({
      where: {
        propertyId,
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledAt: {
          gte: new Date(requestedTime - 30 * 60 * 1000),
          lte: new Date(requestedTime + 30 * 60 * 1000),
        },
      },
    });

    if (slotConflict) {
      return NextResponse.json(
        { error: "This time slot is already booked or conflicts with another showing. Please select a different time." },
        { status: 409 }
      );
    }

    // 4. Create verified tour request
    const tour = await prisma.tour.create({
      data: {
        propertyId,
        unitId: unitId || null,
        tenantName,
        tenantEmail,
        tenantPhone,
        tenantMessage: tenantMessage || null,
        tourType: tourType || "IN_PERSON",
        scheduledAt: new Date(scheduledAt),
        status: "PENDING",
        verifiedEmail: true
      },
      include: {
        property: true,
        unit: true,
      },
    });

    // 5. Auto-email tenant with timezone formatting
    const tz = getTimezoneForState(property.state);
    const { dateStr, timeStr, tzAbbrev } = formatDateTimeInTimezone(scheduledAt, tz);
    const timeDisplay = `${timeStr} ${tzAbbrev}`.trim();

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Property<span style="color: #3b82f6;">Pro</span></h1>
        </div>
        <div style="padding: 32px; color: #334155;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 700;">Tour Request Received!</h2>
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">Hello <strong style="color: #0f172a;">${tenantName}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">We have received your request to tour <strong style="color: #0f172a;">${property.name}</strong> ${unitId ? `(Unit ${tour.unit?.name})` : ""}.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
            <tr>
              <td style="padding: 16px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 120px;">Date:</td>
              <td style="padding: 16px; color: #0f172a; font-weight: 500; border-bottom: 1px solid #e2e8f0;">${dateStr}</td>
            </tr>
            <tr>
              <td style="padding: 16px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Time:</td>
              <td style="padding: 16px; color: #0f172a; font-weight: 500; border-bottom: 1px solid #e2e8f0;">${timeDisplay}</td>
            </tr>
            <tr>
              <td style="padding: 16px; font-weight: 600; color: #64748b;">Type:</td>
              <td style="padding: 16px; color: #0f172a; font-weight: 500;">${tourType === "VIDEO_CALL" ? "Virtual Video Call" : "In-Person Showing"}</td>
            </tr>
          </table>
          
          <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
              The property owner is currently reviewing your request. We will email you as soon as they confirm or cancel the showing.
            </p>
          </div>
          
          <p style="color: #94a3b8; font-size: 13px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            Thank you for using PropertyPro!
          </p>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        to: tenantEmail,
        subject: `PropertyPro Tour Requested: ${property.name}`,
        html: htmlBody
      });
    } catch (_) {}

    // 6. In-app notify owner
    try {
      await notify({
        userId: property.ownerId,
        title: "New Showing Tour Requested",
        message: `${tenantName} requested ${tourType === "VIDEO_CALL" ? "a virtual" : "an in-person"} tour for ${property.name} on ${dateStr} at ${timeDisplay}.`,
        type: "TOUR",
        priority: "MEDIUM",
        relatedEntityId: tour.id
      });
    } catch (_) {}

    return NextResponse.json(tour, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create tour" }, { status: 500 });
  }
}
