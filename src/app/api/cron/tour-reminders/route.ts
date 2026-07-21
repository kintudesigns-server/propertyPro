import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { notify } from "@/lib/notify";
import { getTimezoneForState, formatDateTimeInTimezone } from "@/lib/timezones";

export async function POST(req: NextRequest) {
  // 🔒 CRON SECRET AUTH — prevents public abuse
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    // Scan window: 50 minutes to 70 minutes from now (approx 1 hour away)
    const windowStart = new Date(now.getTime() + 50 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 70 * 60 * 1000);

    const upcomingTours = await prisma.tour.findMany({
      where: {
        status: "CONFIRMED",
        scheduledAt: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      include: {
        property: true,
        unit: true,
      },
    });

    let reminderCount = 0;

    for (const tour of upcomingTours) {
      const tz = getTimezoneForState(tour.property?.state);
      const { dateStr, timeStr, tzAbbrev } = formatDateTimeInTimezone(tour.scheduledAt, tz);
      const displayTime = `${timeStr} ${tzAbbrev}`.trim();
      const location = tour.tourType === "VIDEO_CALL" 
        ? ((tour as any).meetingLink || "Virtual Meeting Link") 
        : `${tour.property.address}, ${tour.property.city}`;

      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">Property<span style="color: #3b82f6;">Pro</span></h1>
          </div>
          <div style="padding: 32px; color: #334155;">
            <h2 style="color: #2563eb; margin-top: 0; font-size: 20px; font-weight: 700;">⏰ Tour Reminder: Starting in 1 Hour!</h2>
            <p style="font-size: 15px; line-height: 1.6;">Hello <strong style="color: #0f172a;">${tour.tenantName}</strong>,</p>
            <p style="font-size: 15px; line-height: 1.6;">Your upcoming showing tour for <strong style="color: #0f172a;">${tour.property.name}</strong> is starting in approximately 1 hour.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0; font-weight: 700; color: #0f172a;">Time: ${displayTime}</p>
              <p style="margin: 0 0 8px 0; font-weight: 700; color: #0f172a;">Type: ${tour.tourType === "VIDEO_CALL" ? "Virtual Video Call" : "In-Person Showing"}</p>
              <p style="margin: 0; font-weight: 700; color: #0f172a;">Location: ${location}</p>
            </div>

            ${(tour as any).meetingLink && tour.tourType === "VIDEO_CALL" ? `
              <div style="text-align: center; margin: 24px 0;">
                <a href="${(tour as any).meetingLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">Join Video Call Now</a>
              </div>
            ` : ""}

            <p style="color: #64748b; font-size: 13px;">Please make sure to be on time!</p>
          </div>
        </div>
      `;

      try {
        await sendEmail({
          to: tour.tenantEmail,
          subject: `⏰ Reminder: Tour for ${tour.property.name} starts in 1 hour`,
          html: htmlBody,
        });
        reminderCount++;
      } catch (_) {}

      // In-app notification
      try {
        const registeredTenant = await prisma.user.findFirst({ where: { email: tour.tenantEmail } });
        if (registeredTenant) {
          await notify({
            userId: registeredTenant.id,
            title: "Tour Starting in 1 Hour ⏰",
            message: `Your tour for ${tour.property.name} starts at ${displayTime}.`,
            type: "SYSTEM",
            priority: "HIGH",
            relatedEntityId: tour.id,
          });
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: `Processed tour reminders. Sent ${reminderCount} reminders.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process tour reminders" }, { status: 500 });
  }
}
