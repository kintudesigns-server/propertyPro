import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";

// GET /api/admin/subscriptions/override?userId=xxx
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const override = await prisma.subscriptionOverride.findUnique({
      where: { userId }
    });
    return NextResponse.json(override || null);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/subscriptions/override
// Body: { userId, blockPayouts, blockNewUnits, allowMaintenance, expiresAt, reason }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = (session.user as any).id;

  try {
    const { 
      userId, 
      blockPayouts, 
      blockNewUnits, 
      allowMaintenance, 
      allowAddVendor,
      allowAddInspector,
      allowProcessApplications,
      allowAddTenant,
      allowTourSlots,
      blockPayoutsExpiresAt,
      blockNewUnitsExpiresAt,
      allowAddVendorExpiresAt,
      allowAddInspectorExpiresAt,
      allowProcessApplicationsExpiresAt,
      allowAddTenantExpiresAt,
      allowTourSlotsExpiresAt,
      expiresAt, 
      reason 
    } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json({
        error: "A valid reason of at least 10 characters is required for audit purposes."
      }, { status: 400 });
    }

    const parseExpiry = (d: any) => (d ? new Date(d) : null);
    const expiryDate = parseExpiry(expiresAt);

    const blockPayoutsExp = parseExpiry(blockPayoutsExpiresAt);
    const blockNewUnitsExp = parseExpiry(blockNewUnitsExpiresAt);
    const allowAddVendorExp = parseExpiry(allowAddVendorExpiresAt);
    const allowAddInspectorExp = parseExpiry(allowAddInspectorExpiresAt);
    const allowProcessApplicationsExp = parseExpiry(allowProcessApplicationsExpiresAt);
    const allowAddTenantExp = parseExpiry(allowAddTenantExpiresAt);
    const allowTourSlotsExp = parseExpiry(allowTourSlotsExpiresAt);

    const overrideData = {
      userId,
      blockPayouts,
      blockNewUnits,
      allowMaintenance,
      allowAddVendor,
      allowAddInspector,
      allowProcessApplications,
      allowAddTenant,
      allowTourSlots,
      blockPayoutsExpiresAt: blockPayoutsExp,
      blockNewUnitsExpiresAt: blockNewUnitsExp,
      allowAddVendorExpiresAt: allowAddVendorExp,
      allowAddInspectorExpiresAt: allowAddInspectorExp,
      allowProcessApplicationsExpiresAt: allowProcessApplicationsExp,
      allowAddTenantExpiresAt: allowAddTenantExp,
      allowTourSlotsExpiresAt: allowTourSlotsExp,
      expiresAt: expiryDate,
      adminId,
      reason,
    };

    const override = await prisma.subscriptionOverride.upsert({
      where: { userId },
      create: overrideData,
      update: overrideData,
    });

    await auditLog({
      entityType: "USER",
      entityId: userId,
      action: "UPDATED",
      actorId: adminId,
      actorRole: "SUPERADMIN",
      newValue: overrideData,
      note: `Admin set subscription override on user ${userId}. Reason: ${reason}`,
    });

    return NextResponse.json(override);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/subscriptions/override?userId=xxx
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    await prisma.subscriptionOverride.deleteMany({
      where: { userId }
    });

    await auditLog({
      entityType: "USER",
      entityId: userId,
      action: "UPDATED",
      actorId: adminId,
      actorRole: "SUPERADMIN",
      note: `Admin cleared subscription override for user ${userId}`,
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId,
        title: "⚙️ Subscription Settings Updated",
        message: "Your subscription exceptions have been reverted to platform default settings.",
        type: "SYSTEM",
        priority: "MEDIUM",
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
