import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email";
import { notify } from "@/lib/notify";
import { getTimezoneForState, formatDateTimeInTimezone } from "@/lib/timezones";
import { generateICSContent } from "@/lib/ics";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const { id } = await params;

  try {
    const tour = await prisma.tour.findUnique({
      where: { id },
      include: {
        property: {
          include: {
            owner: true,
          },
        },
        unit: true,
      },
    });

    if (!tour) {
      return NextResponse.json({ error: "Tour request not found" }, { status: 404 });
    }

    const isOwner = role === "OWNER" && tour.property.ownerId === userId;
    const isSuperAdmin = role === "SUPERADMIN";
    const isTargetTenant = role === "TENANT" && tour.tenantEmail === session.user.email;

    if (!isOwner && !isSuperAdmin && !isTargetTenant) {
      return NextResponse.json({ error: "Unauthorized access to this tour request" }, { status: 403 });
    }

    return NextResponse.json(tour);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch tour request" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const { id } = await params;

  try {
    const body = await req.json();
    const { 
      status, 
      feedbackRating, 
      feedbackComments, 
      feedbackCategories,
      scheduledAt, 
      tourType,
      cancellationReason,
      meetingLink,
      ownerNotes,
      ownerProspectRating,
      ownerProspectNotes
    } = body;

    const tour = await prisma.tour.findUnique({
      where: { id },
      include: { property: { include: { owner: true } }, unit: true },
    });

    if (!tour) {
      return NextResponse.json({ error: "Tour request not found" }, { status: 404 });
    }

    // Role checks
    const isOwner = role === "OWNER" && tour.property.ownerId === userId;
    const isSuperAdmin = role === "SUPERADMIN";
    const isTargetTenant = role === "TENANT" && tour.tenantEmail === session.user.email;

    if (!isOwner && !isSuperAdmin && !isTargetTenant) {
      return NextResponse.json({ error: "Unauthorized access to this tour request" }, { status: 403 });
    }

    // Role-based Field Isolation
    const updateData: any = {};

    if (isTargetTenant) {
      // Tenant can ONLY cancel, leave feedback, or reschedule if PENDING
      if (status === "CANCELLED") {
        // Enforce 24-hour cancellation window for CONFIRMED tours
        if (tour.status === "CONFIRMED") {
          const settings = await prisma.platformSettings.findFirst();
          const windowHours = settings?.tourCancellationWindowHours ?? 24;
          const hoursUntilTour = (new Date(tour.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60);

          if (hoursUntilTour < windowHours) {
            return NextResponse.json(
              { error: `This tour is scheduled within ${windowHours} hours and can no longer be self-cancelled. Please contact the property manager directly.` },
              { status: 403 }
            );
          }
        }

        updateData.status = "CANCELLED";
        updateData.cancellationReason = cancellationReason || "Cancelled by prospect.";
        updateData.cancelledAt = new Date();
      }

      if (scheduledAt && (tour.status === "PENDING" || tour.status === "CONFIRMED")) {
        // Check slot conflict
        const requestedTime = new Date(scheduledAt).getTime();
        const slotConflict = await prisma.tour.findFirst({
          where: {
            propertyId: tour.propertyId,
            id: { not: tour.id },
            status: { in: ["PENDING", "CONFIRMED"] },
            scheduledAt: {
              gte: new Date(requestedTime - 30 * 60 * 1000),
              lte: new Date(requestedTime + 30 * 60 * 1000),
            },
          },
        });

        if (slotConflict) {
          return NextResponse.json(
            { error: "The requested new time slot is already booked. Please choose another time." },
            { status: 409 }
          );
        }

        updateData.scheduledAt = new Date(scheduledAt);
        updateData.rescheduledAt = new Date();
        // Reset status to PENDING if rescheduled by tenant
        if (tour.status === "CONFIRMED") {
          updateData.status = "PENDING";
        }
      }

      if (feedbackRating !== undefined) updateData.feedbackRating = Number(feedbackRating);
      if (feedbackComments !== undefined) updateData.feedbackComments = feedbackComments;
      if (feedbackCategories !== undefined) updateData.feedbackCategories = feedbackCategories;

    } else if (isOwner || isSuperAdmin) {
      // Owner/SuperAdmin permissions
      if (status !== undefined) updateData.status = status;
      if (cancellationReason !== undefined) {
        updateData.cancellationReason = cancellationReason;
        if (status === "CANCELLED") updateData.cancelledAt = new Date();
      }
      if (ownerNotes !== undefined) updateData.ownerNotes = ownerNotes;
      if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
      if (tourType !== undefined) updateData.tourType = tourType;
      
      if (scheduledAt !== undefined) {
        const requestedTime = new Date(scheduledAt).getTime();
        const slotConflict = await prisma.tour.findFirst({
          where: {
            propertyId: tour.propertyId,
            id: { not: tour.id },
            status: { in: ["PENDING", "CONFIRMED"] },
            scheduledAt: {
              gte: new Date(requestedTime - 30 * 60 * 1000),
              lte: new Date(requestedTime + 30 * 60 * 1000),
            },
          },
        });

        if (slotConflict) {
          return NextResponse.json(
            { error: "This time slot conflicts with another active tour." },
            { status: 409 }
          );
        }

        updateData.scheduledAt = new Date(scheduledAt);
        updateData.rescheduledAt = new Date();
      }

      if (ownerProspectRating !== undefined) updateData.ownerProspectRating = Number(ownerProspectRating);
      if (ownerProspectNotes !== undefined) updateData.ownerProspectNotes = ownerProspectNotes;

      // Validation: Cancellation reason required for declines
      if (status === "CANCELLED" && !cancellationReason) {
        return NextResponse.json({ error: "A cancellation reason is required to decline this tour." }, { status: 400 });
      }

      // Validation: Video call requires meeting link when confirming
      const targetTourType = tourType || tour.tourType;
      const effectiveMeetingLink = meetingLink !== undefined ? meetingLink : tour.meetingLink;
      if (status === "CONFIRMED" && targetTourType === "VIDEO_CALL" && (!effectiveMeetingLink || !effectiveMeetingLink.trim())) {
        return NextResponse.json(
          { error: "A meeting link (Zoom, Google Meet, etc.) is required to confirm a Virtual Video Call tour." },
          { status: 400 }
        );
      }
    }

    const updatedTour = await prisma.tour.update({
      where: { id },
      data: updateData,
      include: {
        property: true,
        unit: true,
      },
    });

    // Audit logs
    await auditLog({
      entityType: "TOUR",
      entityId: id,
      action: "UPDATED",
      actorId: userId,
      actorRole: role,
      oldValue: { status: tour.status },
      newValue: updateData,
      note: `Tour request updated. Status: ${status || tour.status}`,
    });

    const tz = getTimezoneForState(tour.property.state);
    const effectiveScheduledAt = updatedTour.scheduledAt;
    const { dateStr, timeStr, tzAbbrev } = formatDateTimeInTimezone(effectiveScheduledAt, tz);
    const timeDisplay = `${timeStr} ${tzAbbrev}`.trim();

    // Trigger email & notifications on Reschedule
    if (updateData.rescheduledAt && updateData.scheduledAt) {
      if (isTargetTenant) {
        await notify({
          userId: tour.property.ownerId,
          title: "Tour Rescheduled by Prospect",
          message: `${tour.tenantName} rescheduled their tour for ${tour.property.name} to ${dateStr} at ${timeDisplay}.`,
          type: "SYSTEM",
          priority: "HIGH",
          relatedEntityId: tour.id
        });
      } else if (isOwner || isSuperAdmin) {
        const registeredTenant = await prisma.user.findFirst({ where: { email: tour.tenantEmail } });
        if (registeredTenant) {
          await notify({
            userId: registeredTenant.id,
            title: "Tour Rescheduled by Owner",
            message: `Your tour for ${tour.property.name} was rescheduled to ${dateStr} at ${timeDisplay}.`,
            type: "SYSTEM",
            priority: "HIGH",
            relatedEntityId: tour.id
          });
        }
      }
    }

    const { sendApplicationInvite } = body;

    // Trigger application invite notification if requested by owner
    if ((isOwner || isSuperAdmin) && (sendApplicationInvite || (ownerProspectRating !== undefined && Number(ownerProspectRating) >= 4))) {
      const registeredTenant = await prisma.user.findFirst({ where: { email: tour.tenantEmail } });
      if (registeredTenant) {
        await notify({
          userId: registeredTenant.id,
          title: "Application Invite Received! 🎉",
          message: `The property manager of ${tour.property.name} enjoyed meeting you! Submit your rental application now to secure the property.`,
          type: "TOUR",
          priority: "HIGH",
          relatedEntityId: tour.id
        });
      }
    }

    // Notify & Email Trigger on Status Change
    if (status && status !== tour.status) {
      if (status === "CONFIRMED") {
        const fullAddress = `${tour.property.address}, ${tour.property.city}`;
        const meetingUrl = updatedTour.meetingLink || "";

        // Generate ICS Calendar File Content
        const icsContent = generateICSContent({
          title: `Property Tour: ${tour.property.name}`,
          description: `Showing tour for ${tour.property.name} ${tour.unitId ? `Unit ${tour.unit?.name}` : ""}. Owner instructions: ${updatedTour.ownerNotes || "None"}. ${meetingUrl ? `Meeting Link: ${meetingUrl}` : ""}`,
          location: updatedTour.tourType === "VIDEO_CALL" ? meetingUrl : fullAddress,
          start: new Date(effectiveScheduledAt),
          durationMinutes: 45,
          url: meetingUrl || undefined,
        });

        const htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #0f172a; padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Property<span style="color: #3b82f6;">Pro</span></h1>
            </div>
            <div style="padding: 32px; color: #334155;">
              <h2 style="color: #16a34a; margin-top: 0; font-size: 20px; font-weight: 700;">✅ Tour Confirmed!</h2>
              <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">Hello <strong style="color: #0f172a;">${tour.tenantName}</strong>,</p>
              <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">The property owner has confirmed your showing request for <strong style="color: #0f172a;">${tour.property.name}</strong> ${tour.unitId ? `(Unit ${tour.unit?.name})` : ""}.</p>
              
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
                  <td style="padding: 16px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Type:</td>
                  <td style="padding: 16px; color: #0f172a; font-weight: 500;">${updatedTour.tourType === "VIDEO_CALL" ? "Virtual Video Call" : "In-Person Showing"}</td>
                </tr>
                <tr>
                  <td style="padding: 16px; font-weight: 600; color: #64748b;">Location:</td>
                  <td style="padding: 16px; color: #0f172a; font-weight: 500;">${updatedTour.tourType === "VIDEO_CALL" ? (meetingUrl ? `<a href="${meetingUrl}" style="color: #2563eb; font-weight: 700;">Join Video Call</a>` : "Link Pending") : fullAddress}</td>
                </tr>
              </table>

              ${updatedTour.ownerNotes ? `
                <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 4px;">
                  <p style="margin: 0 0 8px 0; font-weight: 700; color: #1e40af; font-size: 14px;">Owner's Instructions:</p>
                  <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.5;">"${updatedTour.ownerNotes}"</p>
                </div>
              ` : ""}
              
              <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                We have attached a calendar event (.ics) to this email so you can add this tour directly to your calendar!
              </p>
            </div>
          </div>
        `;

        try {
          await sendEmail({
            to: tour.tenantEmail,
            subject: `✅ Confirmed Showing: ${tour.property.name}`,
            html: htmlBody,
            attachments: [
              {
                filename: `tour-${tour.id}.ics`,
                content: icsContent,
                contentType: "text/calendar; method=REQUEST",
              },
            ],
          });
        } catch (_) {}

        try {
          const registeredTenant = await prisma.user.findFirst({ where: { email: tour.tenantEmail } });
          if (registeredTenant) {
            await notify({
              userId: registeredTenant.id,
              title: "Tour Showing Confirmed! 🎉",
              message: `Your tour for ${tour.property.name} on ${dateStr} at ${timeDisplay} has been confirmed.`,
              type: "TOUR",
              priority: "HIGH",
              relatedEntityId: tour.id
            });
          }
        } catch (_) {}
      }

      if (status === "COMPLETED") {
        const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const applyLink = `${appUrl}/listings?applyUnitId=${tour.unitId || ""}`;
        const feedbackLink = `${appUrl}/tours/${tour.id}/feedback`;

        const htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #0f172a; padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Property<span style="color: #3b82f6;">Pro</span></h1>
            </div>
            <div style="padding: 32px; color: #334155;">
              <h2 style="color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 700;">🎉 Tour Completed!</h2>
              <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px;">Hello <strong style="color: #0f172a;">${tour.tenantName}</strong>,</p>
              <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">Thank you for touring <strong style="color: #0f172a;">${tour.property.name}</strong>! We hope you had a great experience during your visit.</p>
              
              ${sendApplicationInvite ? `
                <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
                  <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 16px; font-weight: 700;">📋 Ready to make this your home?</h3>
                  <p style="margin: 0 0 16px 0; color: #1e3a8a; font-size: 14px; line-height: 1.5;">The property manager has invited you to submit your formal rental application for this unit!</p>
                  <a href="${applyLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px;">Submit Rental Application →</a>
                </div>
              ` : ""}

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 15px; font-weight: 700;">⭐ How was your showing visit?</h3>
                <p style="margin: 0 0 16px 0; color: #64748b; font-size: 13px;">Please take 15 seconds to rate your tour experience and share your feedback.</p>
                <a href="${feedbackLink}" style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 10px 20px; border-radius: 8px;">Leave Tour Rating & Feedback</a>
              </div>
              
              <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                If you have any questions or need further assistance, please log in to your PropertyPro dashboard or reply to this email.
              </p>
            </div>
          </div>
        `;

        try {
          await sendEmail({
            to: tour.tenantEmail,
            subject: `🎉 Tour Completed: How was your visit at ${tour.property.name}?`,
            html: htmlBody,
          });
        } catch (_) {}

        try {
          const registeredTenant = await prisma.user.findFirst({ where: { email: tour.tenantEmail } });
          if (registeredTenant) {
            await notify({
              userId: registeredTenant.id,
              title: "How was your tour? ⭐",
              message: `Your tour for ${tour.property.name} is complete. Leave your tour rating and feedback now!`,
              type: "TOUR",
              priority: "MEDIUM",
              relatedEntityId: tour.id
            });
          }
        } catch (_) {}
      }

      if (status === "CANCELLED") {
        const htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #0f172a; padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Property<span style="color: #3b82f6;">Pro</span></h1>
            </div>
            <div style="padding: 32px; color: #334155;">
              <h2 style="color: #dc2626; margin-top: 0; font-size: 20px; font-weight: 700;">❌ Tour Request Cancelled</h2>
              <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">Hello <strong style="color: #0f172a;">${tour.tenantName}</strong>,</p>
              <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">Your scheduled tour request for <strong style="color: #0f172a;">${tour.property.name}</strong> has been cancelled.</p>
              
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0 0 8px 0; font-weight: 700; color: #991b1b; font-size: 14px;">Reason for Cancellation:</p>
                <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.5;">"${cancellationReason || "No specific reason provided."}"</p>
              </div>
              
              <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                If you wish to schedule a different time, please visit the property listing page to submit a new request.
              </p>
            </div>
          </div>
        `;

        try {
          await sendEmail({
            to: tour.tenantEmail,
            subject: `❌ Cancelled Tour: ${tour.property.name}`,
            html: htmlBody
          });
        } catch (_) {}

        try {
          const registeredTenant = await prisma.user.findFirst({ where: { email: tour.tenantEmail } });
          if (registeredTenant) {
            await notify({
              userId: registeredTenant.id,
              title: "Tour Request Declined",
              message: `Your tour request for ${tour.property.name} has been cancelled: "${cancellationReason || 'No reason specified'}"`,
              type: "SYSTEM",
              priority: "MEDIUM",
              relatedEntityId: tour.id
            });
          }
        } catch (_) {}

        if (isTargetTenant) {
          try {
            await notify({
              userId: tour.property.ownerId,
              title: "Tour Cancelled by Prospect",
              message: `${tour.tenantName} cancelled their scheduled tour for ${tour.property.name} on ${dateStr}. Reason: "${cancellationReason || 'Not provided'}"`,
              type: "SYSTEM",
              priority: "MEDIUM",
              relatedEntityId: tour.id
            });
          } catch (_) {}
        }
      }
    }

    return NextResponse.json(updatedTour);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update tour" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const { id } = await params;

  try {
    const tour = await prisma.tour.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!tour) {
      return NextResponse.json({ error: "Tour request not found" }, { status: 404 });
    }

    const isOwner = role === "OWNER" && tour.property.ownerId === userId;
    const isSuperAdmin = role === "SUPERADMIN";

    if (!isOwner && !isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await auditLog({
      entityType: "TOUR",
      entityId: id,
      action: "DELETED",
      actorId: userId,
      actorRole: role,
      oldValue: { id: tour.id, status: tour.status },
      note: `Tour request deleted by user.`,
    });

    await prisma.tour.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Tour request deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete tour request" }, { status: 500 });
  }
}
