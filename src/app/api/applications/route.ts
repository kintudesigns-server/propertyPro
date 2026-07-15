import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  if (role !== "OWNER" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    let applications;
    if (role === "SUPERADMIN") {
      applications = await prisma.application.findMany({
        include: { unit: { include: { property: true } } },
        orderBy: { createdAt: "desc" },
      });
    } else {
      applications = await prisma.application.findMany({
        where: { unit: { property: { ownerId: userId } } },
        include: { unit: { include: { property: true } } },
        orderBy: { createdAt: "desc" },
      });
    }
    return NextResponse.json(applications);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch applications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      unitId,
      name,
      email,
      phone,
      documents,
      idDocumentUrl,
      incomeProofUrl,
      leaseDuration,
      moveInDate,
      occupantsCount,
      employerName,
      jobTitle,
      monthlyIncome,
      hasGuarantor,
      guarantorName,
      guarantorEmail,
      guarantorPhone,
      guarantorIncome,
      prevLandlordName,
      prevLandlordPhone,
      prevLandlordEmail,
      reasonForMoving,
      petsCount,
      petDetails,
      vehicleInfo,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      backgroundCheckConsent,
      agreedToTerms
    } = await req.json();

    if (!unitId || !name || !email || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if the tenant already has an active application for this unit
    const existingApplication = await prisma.application.findFirst({
      where: {
        unitId,
        email,
        status: {
          in: ["PENDING", "APPROVED"]
        }
      }
    });

    if (existingApplication) {
      return NextResponse.json({ 
        error: "You have already submitted an application for this unit." 
      }, { status: 400 });
    }

    const application = await prisma.application.create({
      data: {
        unitId,
        name,
        email,
        phone,
        documents: documents || [],
        idDocumentUrl: idDocumentUrl || null,
        incomeProofUrl: incomeProofUrl || null,
        status: "PENDING",
        leaseDuration: leaseDuration ? Number(leaseDuration) : 12,
        moveInDate: moveInDate ? new Date(moveInDate) : null,
        occupantsCount: occupantsCount ? Number(occupantsCount) : 1,
        employerName: employerName || null,
        jobTitle: jobTitle || null,
        monthlyIncome: monthlyIncome ? Number(monthlyIncome) : null,
        hasGuarantor: Boolean(hasGuarantor),
        guarantorName: guarantorName || null,
        guarantorEmail: guarantorEmail || null,
        guarantorPhone: guarantorPhone || null,
        guarantorIncome: guarantorIncome ? Number(guarantorIncome) : null,
        prevLandlordName: prevLandlordName || null,
        prevLandlordPhone: prevLandlordPhone || null,
        prevLandlordEmail: prevLandlordEmail || null,
        reasonForMoving: reasonForMoving || null,
        petsCount: petsCount ? Number(petsCount) : 0,
        petDetails: petDetails || null,
        vehicleInfo: vehicleInfo || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        emergencyContactRelation: emergencyContactRelation || null,
        backgroundCheckConsent: Boolean(backgroundCheckConsent),
        agreedToTerms: Boolean(agreedToTerms)
      },
    });

    // Notify the property owner about the new application
    try {
      const unit = await prisma.unit.findUnique({
        where: { id: unitId },
        include: { property: true },
      });
      if (unit?.property?.ownerId) {
        await notify({
          userId: unit.property.ownerId,
          title: "New Rental Application Received",
          message: `${name} has submitted a rental application for Unit ${unit.name || unitId} at ${unit.property.name}. Review it in the Applications section.`,
          type: "SYSTEM",
          priority: "MEDIUM",
          relatedEntityId: application.id,
        });
      }

      // Send confirmation email to guest tenant with tracking link
      const origin = new URL(req.url).origin;
      const trackingLink = `${origin}/listings/apply/track?id=${application.id}`;
      await sendEmail({
        to: email,
        subject: `Rental Application Received - ${unit?.property?.name || "PropertyPro"}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="font-size: 24px; font-weight: 900; color: #2563eb; letter-spacing: -0.025em;">Property<span style="color: #0f172a;">Pro</span></span>
            </div>
            <h2 style="color: #0f172a; font-size: 18px; font-weight: 800; text-align: center; margin-bottom: 8px;">Your Rental Application is Received</h2>
            <p style="text-align: center; color: #64748b; font-size: 13px; margin-bottom: 24px;">Application ID: ${application.id}</p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">Hi <strong>${name}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">Thank you for applying for <strong>Unit ${unit?.name || ""}</strong> at <strong>${unit?.property?.name || "PropertyPro"}</strong>. The property owner has been notified and is currently reviewing your application.</p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">Since you applied as a guest, we have generated a secure live tracking dashboard for you. Use this link to view status updates, review landlord feedback, and sign lease drafts directly:</p>
            <div style="margin: 32px 0; text-align: center;">
              <a href="${trackingLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; text-decoration: none; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Track Application Status</a>
            </div>
            <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; text-align: center;">If you cannot click the button, copy and paste this link in your browser: <br/>${trackingLink}</p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This email is sent automatically by the PropertyPro rental management system.</p>
          </div>
        `,
        text: `Hi ${name},\n\nYour application for Unit ${unit?.name || ""} at ${unit?.property?.name || "PropertyPro"} has been received. Track its live status at: ${trackingLink}\n\nBest regards,\nPropertyPro Team`
      });

      // Fetch Owner details to send them an email
      if (unit?.property?.ownerId) {
        const owner = await prisma.user.findUnique({ where: { id: unit.property.ownerId } });
        if (owner?.email) {
          const ownerReviewLink = `${origin}/dashboard/owner`; // Linking to their dashboard
          await sendEmail({
            to: owner.email,
            subject: `New Application: Unit ${unit?.name} at ${unit?.property?.name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
                <div style="text-align: center; margin-bottom: 20px;">
                  <span style="font-size: 24px; font-weight: 900; color: #2563eb; letter-spacing: -0.025em;">Property<span style="color: #0f172a;">Pro</span></span>
                </div>
                <h2 style="color: #0f172a; font-size: 18px; font-weight: 800; text-align: center; margin-bottom: 8px;">New Tenant Application Received</h2>
                <p style="text-align: center; color: #64748b; font-size: 13px; margin-bottom: 24px;">Application ID: ${application.id}</p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                  <h3 style="margin-top: 0; font-size: 15px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Applicant Details</h3>
                  <p style="font-size: 14px; margin: 8px 0; color: #334155;"><strong>Name:</strong> ${name}</p>
                  <p style="font-size: 14px; margin: 8px 0; color: #334155;"><strong>Email:</strong> ${email}</p>
                  <p style="font-size: 14px; margin: 8px 0; color: #334155;"><strong>Phone:</strong> ${phone}</p>
                  <p style="font-size: 14px; margin: 8px 0; color: #334155;"><strong>Property:</strong> Unit ${unit?.name} at ${unit?.property?.name}</p>
                  <p style="font-size: 14px; margin: 8px 0; color: #334155;"><strong>Move-in Date:</strong> ${moveInDate ? new Date(moveInDate).toLocaleDateString() : 'Not Specified'}</p>
                  ${monthlyIncome ? `<p style="font-size: 14px; margin: 8px 0; color: #334155;"><strong>Monthly Income:</strong> $${monthlyIncome}</p>` : ''}
                  ${employerName ? `<p style="font-size: 14px; margin: 8px 0; color: #334155;"><strong>Employer:</strong> ${employerName}</p>` : ''}
                </div>

                <p style="font-size: 14px; line-height: 1.6; color: #334155;">Please log in to your dashboard to review this application, approve or reject it, and initiate the lease signing process.</p>
                <div style="margin: 32px 0; text-align: center;">
                  <a href="${ownerReviewLink}" style="background-color: #0f172a; color: #ffffff; padding: 12px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; text-decoration: none; display: inline-block; box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.2);">Review in Dashboard</a>
                </div>
                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This email is sent automatically by the PropertyPro rental management system.</p>
              </div>
            `,
            text: `New Application from ${name} for Unit ${unit?.name} at ${unit?.property?.name}.\n\nLog in to your dashboard to review.`
          });
        }
      }
    } catch (err) {
      console.error("[Email Confirmation] Failed to send email:", err);
    }

    return NextResponse.json(application, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to submit application" }, { status: 500 });
  }
}
