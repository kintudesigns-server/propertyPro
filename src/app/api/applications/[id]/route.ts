import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { getEffectiveSubscriptionRules } from "@/lib/subscription-rules";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Find the latest lease drafted for this tenant's email and unit
    const lease = await prisma.lease.findFirst({
      where: {
        unitId: application.unitId,
        tenant: {
          email: application.email,
        },
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({
      id: application.id,
      name: application.name,
      email: application.email,
      phone: application.phone,
      status: application.status,
      createdAt: application.createdAt,
      leaseDuration: application.leaseDuration,
      moveInDate: application.moveInDate,
      occupantsCount: application.occupantsCount,
      employerName: application.employerName,
      jobTitle: application.jobTitle,
      monthlyIncome: application.monthlyIncome,
      prevLandlordName: application.prevLandlordName,
      prevLandlordPhone: application.prevLandlordPhone,
      prevLandlordEmail: application.prevLandlordEmail,
      reasonForMoving: application.reasonForMoving,
      petsCount: application.petsCount,
      petDetails: application.petDetails,
      vehicleInfo: application.vehicleInfo,
      documents: application.documents,
      idDocumentUrl: (application as any).idDocumentUrl,
      incomeProofUrl: (application as any).incomeProofUrl,
      hasGuarantor: (application as any).hasGuarantor,
      guarantorName: (application as any).guarantorName,
      guarantorEmail: (application as any).guarantorEmail,
      guarantorPhone: (application as any).guarantorPhone,
      guarantorIncome: (application as any).guarantorIncome,
      emergencyContactName: (application as any).emergencyContactName,
      emergencyContactPhone: (application as any).emergencyContactPhone,
      emergencyContactRelation: (application as any).emergencyContactRelation,
      backgroundCheckConsent: (application as any).backgroundCheckConsent,
      agreedToTerms: (application as any).agreedToTerms,
      unit: {
        id: application.unit.id,
        name: application.unit.name,
        rentAmount: application.unit.rentAmount,
        depositAmt: application.unit.depositAmt,
        property: {
          name: application.unit.property.name,
          address: application.unit.property.address,
          city: application.unit.property.city,
          country: application.unit.property.country,
          coverPhoto: application.unit.property.coverPhoto,
        },
      },
      lease: lease
        ? {
            id: lease.id,
            status: lease.status,
            startDate: lease.startDate,
            endDate: lease.endDate,
            monthlyRent: lease.monthlyRent,
            securityDeposit: lease.securityDeposit,
          }
        : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch application" }, { status: 500 });
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
    const { status, reason } = await req.json();
    if (!status) {
      return NextResponse.json({ error: "Status field is required" }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: { unit: { include: { property: true } } },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const isOwner = role === "OWNER" && application.unit.property.ownerId === userId;
    const isSuperAdmin = role === "SUPERADMIN";

    if (!isOwner && !isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isOwner) {
      const rules = await getEffectiveSubscriptionRules(userId);
      if (rules.isPaused && rules.blockProcessApplications) {
        return NextResponse.json({
          error: "Your account is currently paused. Processing tenant applications is restricted until your subscription is reactivated.",
          code: "ACCOUNT_PAUSED",
          isPaused: true,
        }, { status: 403 });
      }
    }

    const updatedApp = await prisma.application.update({
      where: { id },
      data: { 
        status,
        ...(status === "REJECTED" && reason ? { rejectionReason: reason } : {})
      },
    });

    // Notify the user or tenant (optional notifications)
    try {
      // If we have a user with this email, notify them directly
      const user = await prisma.user.findUnique({
        where: { email: application.email },
      });
      if (user) {
        await notify({
          userId: user.id,
          title: `Application ${status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}`,
          message: `Your rental application for Unit ${application.unit.name} at ${application.unit.property.name} has been ${status.toLowerCase()}.`,
          type: "SYSTEM",
          priority: "HIGH",
          relatedEntityId: application.id,
        });
      }

      // Send email to applicant
      const origin = new URL(req.url).origin;
      const trackingLink = `${origin}/listings/apply/track?id=${application.id}`;
      
      if (status === "REJECTED") {
        await sendEmail({
          to: application.email,
          subject: `Update on your rental application - ${application.unit.property.name}`,
          text: `Hi ${application.name},\n\nWe regret to inform you that your application for Unit ${application.unit.name} at ${application.unit.property.name} has been declined.\n\nReason: ${reason || "No specific reason provided."}\n\nWe wish you the best in your housing search.\n\nPropertyPro Team`,
          html: `<div style="font-family: 'Inter', system-ui, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 20px; background-color: #F8FAFC; color: #1E293B; border-radius: 16px; border: 1px solid #E2E8F0;">
            <div style="text-align: center; margin-bottom: 28px;">
              <div style="font-size: 24px; font-weight: 800; color: #2563EB;">Property<span style="color: #0F172A;">Pro</span></div>
            </div>
            <div style="background-color: #FFFFFF; border-radius: 12px; padding: 28px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <h2 style="font-size: 18px; font-weight: 800; color: #0F172A; margin: 0 0 16px 0;">Application Status Update</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
                Hi <strong>${application.name}</strong>,<br/><br/>
                Thank you for applying for <strong>Unit ${application.unit.name}</strong> at <strong>${application.unit.property.name}</strong>. After careful review, the landlord has decided not to move forward with your application at this time.
              </p>
              <div style="background-color: #FEF2F2; border-radius: 8px; padding: 16px; border: 1px solid #FCA5A5; margin-bottom: 24px;">
                <p style="font-size: 13px; font-weight: 700; color: #991B1B; margin: 0 0 4px 0;">Landlord Feedback:</p>
                <p style="font-size: 13px; color: #7F1D1D; margin: 0; line-height: 1.5;">${reason || "The landlord opted not to provide a specific reason. Common reasons include credit score criteria, income requirements, or selecting another applicant who applied earlier."}</p>
              </div>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0;">
                We wish you the very best in your continuing housing search!
              </p>
            </div>
          </div>`
        });
      } else if (status === "APPROVED") {
        await sendEmail({
          to: application.email,
          subject: `Congratulations! Your rental application was approved - ${application.unit.property.name}`,
          text: `Hi ${application.name},\n\nGreat news! Your application for Unit ${application.unit.name} at ${application.unit.property.name} has been approved.\n\nYou can track the next steps (lease signing, deposit payment) via your tracking portal: ${trackingLink}\n\nPropertyPro Team`,
          html: `<div style="font-family: 'Inter', system-ui, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 20px; background-color: #F8FAFC; color: #1E293B; border-radius: 16px; border: 1px solid #E2E8F0;">
            <div style="text-align: center; margin-bottom: 28px;">
              <div style="font-size: 24px; font-weight: 800; color: #2563EB;">Property<span style="color: #0F172A;">Pro</span></div>
            </div>
            <div style="background-color: #FFFFFF; border-radius: 12px; padding: 28px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <h2 style="font-size: 18px; font-weight: 800; color: #0F172A; margin: 0 0 16px 0;">Congratulations! 🎉</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
                Hi <strong>${application.name}</strong>,<br/><br/>
                Great news! The landlord has officially <strong>approved</strong> your application for <strong>Unit ${application.unit.name}</strong> at <strong>${application.unit.property.name}</strong>.
              </p>
              <div style="background-color: #F8FAFC; border-radius: 8px; padding: 18px; border: 1px solid #E2E8F0; margin-bottom: 24px;">
                <p style="font-size: 13px; font-weight: 700; color: #475569; margin: 0 0 8px 0;">What happens next?</p>
                <ol style="font-size: 13px; color: #475569; margin: 0; padding-left: 20px; line-height: 1.6;">
                  <li>The landlord will draft the final lease agreement.</li>
                  <li>You will receive login credentials to your Tenant Portal via email.</li>
                  <li>Log in to sign the lease and pay your security deposit.</li>
                </ol>
              </div>
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="${trackingLink}" style="background-color: #2563EB; color: #FFFFFF; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);">
                  View Tracking Dashboard
                </a>
              </div>
            </div>
          </div>`
        });
      }
    } catch (err) {
      console.error("Error sending application status notification/email:", err);
    }

    const redirectUrl = status === "APPROVED" ? `/dashboard/leases/new?appId=${application.id}` : null;
    return NextResponse.json({ ...updatedApp, redirectUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update application" }, { status: 500 });
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
    const application = await prisma.application.findUnique({
      where: { id },
      include: { unit: { include: { property: true } } },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const isOwner = role === "OWNER" && application.unit.property.ownerId === userId;
    const isSuperAdmin = role === "SUPERADMIN";

    if (!isOwner && !isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.application.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Application deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete application" }, { status: 500 });
  }
}
