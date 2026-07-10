import { prisma } from "@/lib/prisma";
import { notificationEmitter } from "@/lib/notification-events";

type NotificationType = "PAYMENT" | "MAINTENANCE" | "LEASE" | "SYSTEM";
type NotificationPriority = "HIGH" | "MEDIUM" | "LOW";

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  relatedEntityId?: string;
}

/**
 * Silently creates a notification for a user. Errors are swallowed so that a
 * notification failure never breaks the calling API route.
 */
export async function notify(data: CreateNotificationInput): Promise<void> {
  try {
    const notif = await prisma.notification.create({ data });
    // Emit notification event to live SSE connections
    notificationEmitter.emit(`notification:${data.userId}`, notif);
  } catch (err) {
    // Non-fatal – log but do not propagate
    console.error("[notify] Failed to create notification:", err);
  }
}

/**
 * Notify multiple users at once. Runs in parallel.
 */
export async function notifyMany(
  users: string[],
  base: Omit<CreateNotificationInput, "userId">
): Promise<void> {
  await Promise.allSettled(
    users.map((userId) => notify({ ...base, userId }))
  );
}
