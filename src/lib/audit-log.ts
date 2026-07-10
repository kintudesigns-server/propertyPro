import { prisma } from "@/lib/prisma";

interface AuditLogEntry {
  entityType: string;   // LEASE | INVOICE | MAINTENANCE | USER | PAYOUT | PROPERTY
  entityId: string;
  action: string;       // CREATED | UPDATED | DELETED | STATUS_CHANGED | SIGNED | ACTIVATED | TERMINATED
  actorId?: string | null;   // userId who performed the action (null = system/cron)
  actorRole?: string | null; // OWNER | TENANT | SUPERADMIN | SYSTEM
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  note?: string;
}

/**
 * Write an entry to the AuditLog table.
 * Non-fatal — never throws. Audit failures are logged to console only.
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await (prisma as any).auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        actorId: entry.actorId ?? null,
        actorRole: entry.actorRole ?? null,
        oldValue: entry.oldValue ?? undefined,
        newValue: entry.newValue ?? undefined,
        note: entry.note ?? null,
      },
    });
  } catch (err) {
    // Non-fatal: audit log failures must never block the main operation
    console.warn("[AuditLog] Failed to write audit entry:", err);
  }
}
