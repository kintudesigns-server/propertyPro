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

  try {
    const where: any = {};

    if (entityType) where.entityType = entityType;
    if (action) where.action = action;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
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

      where.OR = [
        { entityId: { contains: search, mode: "insensitive" } },
        { actorId: { contains: search, mode: "insensitive" } },
        { note: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
        ...(matchingUserIds.length > 0 ? [{ actorId: { in: matchingUserIds } }] : []),
      ];
    }

    const logs = await (prisma as any).auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const actorIds = Array.from(new Set(logs.map((l: any) => l.actorId).filter(Boolean))) as string[];
    let actorMap: Record<string, any> = {};
    if (actorIds.length > 0) {
      try {
        const users = await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true, role: true },
        });
        actorMap = Object.fromEntries(users.map((u) => [u.id, u]));
      } catch (err) {
        console.warn("[AuditLogs Export] Failed to resolve actors:", err);
      }
    }

    const headers = [
      "Log ID",
      "Timestamp (ISO)",
      "Entity Type",
      "Entity ID",
      "Action",
      "Actor Name",
      "Actor Email",
      "Actor Role",
      "IP Address",
      "User Agent",
      "Description / Note",
      "Old Value (JSON)",
      "New Value (JSON)",
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = logs.map((log: any) => {
      const actor = log.actorId ? actorMap[log.actorId] : null;
      return [
        escapeCsv(log.id),
        escapeCsv(new Date(log.createdAt).toISOString()),
        escapeCsv(log.entityType),
        escapeCsv(log.entityId),
        escapeCsv(log.action),
        escapeCsv(actor?.name || "System"),
        escapeCsv(actor?.email || "N/A"),
        escapeCsv(log.actorRole || actor?.role || "SYSTEM"),
        escapeCsv(log.ipAddress || "N/A"),
        escapeCsv(log.userAgent || "N/A"),
        escapeCsv(log.note || ""),
        escapeCsv(log.oldValue),
        escapeCsv(log.newValue),
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `audit-logs-${dateStr}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[AuditLogs Export Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to export audit logs" }, { status: 500 });
  }
}
