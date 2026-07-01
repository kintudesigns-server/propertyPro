import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

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
    } catch (e) {
      console.warn("Notification error:", e);
    }

    return NextResponse.json(updatedProperty, { status: 200 });
  } catch (error: any) {
    console.error("Property approval error:", error);
    return NextResponse.json({ error: error.message || "Failed to update property" }, { status: 500 });
  }
}
