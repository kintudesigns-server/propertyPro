import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType") || undefined;
  const action = searchParams.get("action") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const search = searchParams.get("search")?.trim() || undefined;

  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  
  const rawLimit = parseInt(searchParams.get("limit") || "15", 10);
  const limit = Math.min(Math.max(isNaN(rawLimit) ? 15 : rawLimit, 1), 100);
  const skip = (page - 1) * limit;

  try {
    const where: any = {};

    if (entityType === "AUTH") {
      where.OR = [
        { entityType: "AUTH" },
        { action: { in: ["LOGIN_SUCCESS", "LOGIN_FAILURE", "LOGIN_BLOCKED", "REGISTER_SUCCESS"] } },
      ];
    } else if (entityType) {
      where.entityType = entityType;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = where.createdAt || {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      // Find matching user IDs by name/email for actor search
      const matchingUsers = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      const matchingUserIds = matchingUsers.map((u) => u.id);

      const searchConditions = [
        { entityId: { contains: search, mode: "insensitive" } },
        { actorId: { contains: search, mode: "insensitive" } },
        { note: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
        ...(matchingUserIds.length > 0 ? [{ actorId: { in: matchingUserIds } }] : []),
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [logs, total, totalFailedLogins24h, totalToday, criticalEvents, entityTypeGroups, actionGroups] = await prisma.$transaction([
      (prisma as any).auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      (prisma as any).auditLog.count({ where }),
      (prisma as any).auditLog.count({
        where: {
          action: { in: ["LOGIN_FAILURE", "LOGIN_BLOCKED"] },
          createdAt: { gte: twentyFourHoursAgo },
        },
      }),
      (prisma as any).auditLog.count({
        where: {
          createdAt: { gte: startOfToday },
        },
      }),
      (prisma as any).auditLog.count({
        where: {
          action: { in: ["DELETED", "PAYOUT_REJECTED", "LOGIN_BLOCKED", "TERMINATED"] },
        },
      }),
      (prisma as any).auditLog.groupBy({
        by: ["entityType"],
        _count: { _all: true },
      }),
      (prisma as any).auditLog.groupBy({
        by: ["action"],
        _count: { _all: true },
      }),
    ]);

    // Resolve actor user details safely without requiring compiled Prisma relations
    const actorIds = Array.from(new Set(logs.map((l: any) => l.actorId).filter(Boolean))) as string[];
    let actorMap: Record<string, any> = {};
    if (actorIds.length > 0) {
      try {
        const users = await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true, role: true, avatar: true },
        });
        actorMap = Object.fromEntries(users.map((u) => [u.id, u]));
      } catch (err) {
        console.warn("[AuditLogs] Failed to resolve actors:", err);
      }
    }

    const enrichedLogs = logs.map((l: any) => ({
      ...l,
      actor: l.actorId ? actorMap[l.actorId] || null : null,
    }));

    const entityTypeCounts = Object.fromEntries(entityTypeGroups.map((g: any) => [g.entityType, g._count._all]));
    const actionCounts = Object.fromEntries(actionGroups.map((g: any) => [g.action, g._count._all]));

    return NextResponse.json({
      logs: enrichedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats: {
        totalEvents: total,
        failedLogins24h: totalFailedLogins24h,
        todayEvents: totalToday,
        criticalEvents,
      },
      entityTypeCounts,
      actionCounts,
    });
  } catch (error: any) {
    console.error("[AuditLogs GET Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch audit logs" }, { status: 500 });
  }
}
