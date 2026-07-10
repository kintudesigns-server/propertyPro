import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const { id } = await params;

  try {
    const { status, feedbackRating, feedbackComments, scheduledAt, tourType } = await req.json();

    const tour = await prisma.tour.findUnique({
      where: { id },
      include: { property: true },
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

    const updateData: any = {};

    if (status !== undefined) updateData.status = status;
    if (feedbackRating !== undefined) updateData.feedbackRating = Number(feedbackRating);
    if (feedbackComments !== undefined) updateData.feedbackComments = feedbackComments;
    if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt);
    if (tourType !== undefined) updateData.tourType = tourType;

    const updatedTour = await prisma.tour.update({
      where: { id },
      data: updateData,
    });

    await auditLog({
      entityType: "TOUR",
      entityId: id,
      action: "UPDATED",
      actorId: userId,
      actorRole: role,
      oldValue: { status: tour.status },
      newValue: updateData,
      note: `Tour request updated by user.`,
    });

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
