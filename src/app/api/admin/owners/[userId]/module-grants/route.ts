import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";
import { GATABLE_MODULES } from "@/lib/modules-registry";

// GET /api/admin/owners/[userId]/module-grants
export async function GET(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const grants = await prisma.ownerModuleGrant.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(grants);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/owners/[userId]/module-grants
export async function POST(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = (session.user as any).id;

  try {
    const { module, expiresAt, reason } = await req.json();

    if (!module) {
      return NextResponse.json({ error: "module is required" }, { status: 400 });
    }

    const matchedModule = GATABLE_MODULES.find(m => m.key === module);
    if (!matchedModule) {
      return NextResponse.json({ error: "Invalid module key" }, { status: 400 });
    }

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json({
        error: "A valid reason of at least 10 characters is required for audit purposes."
      }, { status: 400 });
    }

    const expiryDate = expiresAt ? new Date(expiresAt) : null;

    const grant = await prisma.ownerModuleGrant.upsert({
      where: {
        userId_module: {
          userId,
          module
        }
      },
      create: {
        userId,
        module,
        expiresAt: expiryDate,
        reason,
        adminId,
      },
      update: {
        expiresAt: expiryDate,
        reason,
        adminId,
      }
    });

    await auditLog({
      entityType: "USER",
      entityId: userId,
      action: "UPDATED",
      actorId: adminId,
      actorRole: "SUPERADMIN",
      newValue: { module, expiresAt: expiryDate, reason },
      note: `Admin granted module "${matchedModule.label}" access to user ${userId}. Reason: ${reason}`,
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId,
        title: "🔑 Premium Module Access Granted",
        message: `Admin has granted you access to "${matchedModule.label}"${expiryDate ? ` until ${expiryDate.toLocaleDateString()}` : ""}.`,
        type: "SYSTEM",
        priority: "MEDIUM",
      }
    });

    return NextResponse.json(grant);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/owners/[userId]/module-grants
export async function DELETE(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const module = searchParams.get("module");

  if (!module) {
    return NextResponse.json({ error: "module parameter is required" }, { status: 400 });
  }

  const matchedModule = GATABLE_MODULES.find(m => m.key === module);

  try {
    await prisma.ownerModuleGrant.deleteMany({
      where: {
        userId,
        module
      }
    });

    await auditLog({
      entityType: "USER",
      entityId: userId,
      action: "UPDATED",
      actorId: adminId,
      actorRole: "SUPERADMIN",
      note: `Admin revoked module "${matchedModule?.label || module}" access from user ${userId}`,
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId,
        title: "⚙️ Premium Module Access Revoked",
        message: `Your access to "${matchedModule?.label || module}" has been revoked by admin.`,
        type: "SYSTEM",
        priority: "MEDIUM",
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
