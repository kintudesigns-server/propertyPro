import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { propertyId, status, rejectionReason } = await req.json();

    if (!propertyId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: {
        approvalStatus: status,
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
      },
      include: { owner: true }
    });

    // Notify the owner
    const title = status === "APPROVED" ? "Property Approved" : "Property Rejected";
    let message = `Your property "${updatedProperty.name}" has been ${status.toLowerCase()}.`;
    if (status === "REJECTED" && rejectionReason) {
      message += ` Reason: ${rejectionReason}`;
    }

    try {
      await notify({
        userId: updatedProperty.ownerId,
        title,
        message,
        type: "SYSTEM",
        priority: status === "REJECTED" ? "HIGH" : "MEDIUM",
        relatedEntityId: updatedProperty.id,
      });

      // Send email to owner
      if (updatedProperty.owner?.email) {
        await sendEmail({
          to: updatedProperty.owner.email,
          subject: status === "APPROVED" ? "Your Property is Approved!" : "Update on Your Property",
          html: `
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td align="center" style="background-color: ${status === "APPROVED" ? "#059669" : "#dc2626"}; padding: 40px 20px;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Property ${status === "APPROVED" ? "Approved" : "Rejected"}</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px 32px;">
                        <p style="margin: 0 0 16px; font-size: 16px; color: #0f172a; font-weight: 600;">Hi ${updatedProperty.owner.name || 'Owner'},</p>
                        <p style="margin: 0 0 24px; color: #475569; line-height: 1.6; font-size: 15px;">
                          Your property <strong>${updatedProperty.name}</strong> has been ${status.toLowerCase()} by an admin.
                        </p>
                        ${status === "REJECTED" && rejectionReason ? `
                          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 24px;">
                            <p style="margin: 0; color: #991b1b; font-size: 14px;"><strong>Reason:</strong> ${rejectionReason}</p>
                          </div>
                        ` : ""}
                        ${status === "APPROVED" ? `
                          <p style="margin: 0; color: #475569; font-size: 15px;">It is now active and ready to be managed in your portfolio.</p>
                        ` : `
                          <p style="margin: 0; color: #475569; font-size: 15px;">Please update the property details or contact support for more info.</p>
                        `}
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} PropertyPro Inc. All rights reserved.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          `
        });
      }
    } catch (e) {
      console.warn("Notification error:", e);
    }

    return NextResponse.json(updatedProperty, { status: 200 });
  } catch (error: any) {
    console.error("Property approval error:", error);
    return NextResponse.json({ error: error.message || "Failed to update property" }, { status: 500 });
  }
}
