import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email";
import { renderSaaSEmail } from "@/lib/email-template";
import { notify } from "@/lib/notify";
import { getTimezoneForState, formatDateTimeInTimezone } from "@/lib/timezones";
import { checkModuleAccess, moduleLockedResponse } from "@/lib/module-guard";
import { checkUserFeatureAccess } from "@/lib/user-access-guard";

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
      const guard = await checkModuleAccess(userId, "tours");
      if (!guard.allowed) return moduleLockedResponse(guard);

      whereClause.property = { ownerId: userId };
    } else if (role === "TENANT") {
      const featureCheck = await checkUserFeatureAccess(userId, "tenant_tours");
      if (!featureCheck.allowed) {
        return NextResponse.json({ error: featureCheck.reason || "Access restricted" }, { status: 403 });
      }
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

    try {
      await sendEmail({
        to: tenantEmail,
        subject: `PropertyPro Tour Requested: ${property.name}`,
        html: renderSaaSEmail({
          categoryBadge: "SHOWING TOUR REQUEST",
          preheader: `Tour request received for ${property.name}. Date: ${dateStr} at ${timeDisplay}.`,
          title: "Tour Request Received",
          subtitle: `${property.name}${unitId ? ` • Unit ${tour.unit?.name}` : ""}`,
          statusPill: { text: "PENDING REVIEW", type: "warning" },
          greeting: `Hello ${tenantName},`,
          bodyParagraphs: [
            `We have received your request to tour <strong>${property.name}</strong>${unitId ? ` (Unit ${tour.unit?.name})` : ""}.`,
            "The property owner is currently reviewing your requested slot. We will notify you via email as soon as your tour is confirmed or rescheduled."
          ],
          summaryCard: {
            title: "Tour Reservation Details",
            items: [
              { label: "Property", value: property.name },
              ...(unitId && tour.unit?.name ? [{ label: "Unit", value: tour.unit.name }] : []),
              { label: "Date", value: dateStr },
              { label: "Time", value: timeDisplay },
              { label: "Tour Type", value: tourType === "VIDEO_CALL" ? "Virtual Video Call" : "In-Person Showing" },
            ],
          },
          infoNotice: {
            title: "Status Update Notice",
            text: "The property manager will review your request. You will receive an automated update once confirmed.",
            type: "info",
          },
        }),
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
