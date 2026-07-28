import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";

// GET /api/admin/users/[id]/access-overrides
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId } = await params;

  try {
    const overrides = await prisma.userAccessOverride.findMany({
      where: { userId, isRevoked: false },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(overrides);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/users/[id]/access-overrides
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = (session.user as any).id;
  const { id: userId } = await params;

  try {
    const { feature, overrideType, reason, expiresAt } = await req.json();

    if (!feature || !overrideType) {
      return NextResponse.json({ error: "feature and overrideType are required" }, { status: 400 });
    }

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json({
        error: "A valid reason of at least 10 characters is required for audit purposes."
      }, { status: 400 });
    }

    const expiryDate = expiresAt ? new Date(expiresAt) : null;

    // Revoke any existing active override for this feature first (since we want only one active at a time)
    await prisma.userAccessOverride.updateMany({
      where: { userId, feature, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date(), revokedByAdminId: adminId }
    });

    const override = await prisma.userAccessOverride.create({
      data: {
        userId,
        feature,
        overrideType,
        reason,
        expiresAt: expiryDate,
        adminId
      }
    });

    const isBlock = overrideType === "BLOCK";

    await auditLog({
      entityType: "USER",
      entityId: userId,
      action: isBlock ? "USER_FEATURE_BLOCKED" : "USER_FEATURE_GRANT",
      actorId: adminId,
      actorRole: "SUPERADMIN",
      newValue: { feature, overrideType, expiresAt: expiryDate, reason },
      note: `Admin set user feature override "${feature}" to ${overrideType} for user ${userId}. Reason: ${reason}`,
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId,
        title: isBlock ? "⚙️ Feature Restricted" : "🔑 Feature Access Granted",
        message: isBlock
          ? `Your access to the "${feature}" feature has been restricted by an administrator.`
          : `You have been granted access to the "${feature}" feature by an administrator.`,
        type: "SYSTEM",
        priority: isBlock ? "HIGH" : "MEDIUM"
      }
    });

    return NextResponse.json(override);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id]/access-overrides?feature=X
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = (session.user as any).id;
  const { id: userId } = await params;
  const { searchParams } = new URL(req.url);
  const feature = searchParams.get("feature");

  if (!feature) {
    return NextResponse.json({ error: "feature parameter is required" }, { status: 400 });
  }

  try {
    await prisma.userAccessOverride.updateMany({
      where: { userId, feature, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date(), revokedByAdminId: adminId }
    });

    await auditLog({
      entityType: "USER",
      entityId: userId,
      action: "USER_FEATURE_REVOKED",
      actorId: adminId,
      actorRole: "SUPERADMIN",
      note: `Admin revoked feature override "${feature}" for user ${userId}`,
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId,
        title: "⚙️ Feature Access Updated",
        message: `Your access settings for the "${feature}" feature have been restored to defaults.`,
        type: "SYSTEM",
        priority: "MEDIUM"
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
