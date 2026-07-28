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
    const { module, expiresAt, reason, overrideType } = await req.json();

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

    const type = overrideType === "BLOCK" ? "BLOCK" : "GRANT";
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
        overrideType: type,
      },
      update: {
        expiresAt: expiryDate,
        reason,
        adminId,
        overrideType: type,
      }
    });

    const isBlock = type === "BLOCK";

    await auditLog({
      entityType: "USER",
      entityId: userId,
      action: isBlock ? "MODULE_BLOCKED" : "MODULE_GRANT",
      actorId: adminId,
      actorRole: "SUPERADMIN",
      newValue: { module, expiresAt: expiryDate, reason, overrideType: type },
      note: isBlock 
        ? `Admin blocked module "${matchedModule.label}" access for user ${userId}. Reason: ${reason}`
        : `Admin granted module "${matchedModule.label}" access to user ${userId}. Reason: ${reason}`,
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId,
        title: isBlock ? "⚙️ Premium Module Access Restricted" : "🔑 Premium Module Access Granted",
        message: isBlock
          ? `Admin has restricted your access to "${matchedModule.label}"${expiryDate ? ` until ${expiryDate.toLocaleDateString()}` : ""}.`
          : `Admin has granted you access to "${matchedModule.label}"${expiryDate ? ` until ${expiryDate.toLocaleDateString()}` : ""}.`,
        type: "SYSTEM",
        priority: isBlock ? "HIGH" : "MEDIUM",
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
    const existing = await prisma.ownerModuleGrant.findFirst({
      where: { userId, module }
    });

    await prisma.ownerModuleGrant.deleteMany({
      where: {
        userId,
        module
      }
    });

    const isBlock = existing?.overrideType === "BLOCK";

    await auditLog({
      entityType: "USER",
      entityId: userId,
      action: isBlock ? "MODULE_BLOCK_LIFTED" : "UPDATED",
      actorId: adminId,
      actorRole: "SUPERADMIN",
      note: isBlock
        ? `Admin lifted module "${matchedModule?.label || module}" block for user ${userId}`
        : `Admin revoked module "${matchedModule?.label || module}" access from user ${userId}`,
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId,
        title: isBlock ? "⚙️ Module Access Restored" : "⚙️ Premium Module Access Revoked",
        message: isBlock
          ? `Your access to "${matchedModule?.label || module}" has been restored.`
          : `Your access to "${matchedModule?.label || module}" has been revoked by admin.`,
        type: "SYSTEM",
        priority: "MEDIUM",
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
