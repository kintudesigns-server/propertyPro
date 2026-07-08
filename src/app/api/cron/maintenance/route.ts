import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

// This simulates a CRON job that would run daily (e.g., via Vercel Cron or a separate worker)
export async function POST() {
  try {
    const seventyTwoHoursAgo = new Date();
    seventyTwoHoursAgo.setHours(seventyTwoHoursAgo.getHours() - 72);

    // Find all maintenance requests in PENDING_TENANT_CONFIRMATION status
    // that were resolved more than 72 hours ago
    const pendingRequests = await prisma.maintenanceRequest.findMany({
      where: {
        status: "PENDING_TENANT_CONFIRMATION",
        updatedAt: { lte: seventyTwoHoursAgo },
      },
    });

    let autoClosedCount = 0;

    for (const request of pendingRequests) {
      await prisma.maintenanceRequest.update({
        where: { id: request.id },
        data: {
          status: "CLOSED",
        },
      });

      autoClosedCount++;

      // Notify the tenant that it was automatically closed
      try {
        await notify({
          userId: request.tenantId,
          title: `Maintenance Request Auto-Closed`,
          message: `Your maintenance request "${request.title}" has been automatically closed as we received no response within 72 hours of completion.`,
          type: "MAINTENANCE",
          priority: "LOW",
          relatedEntityId: request.id,
        });
      } catch (_) {}

      console.log(`[CRON] Maintenance request ${request.id} auto-closed.`);
    }

    return NextResponse.json({
      success: true,
      message: `Cron job completed. Auto-closed ${autoClosedCount} maintenance requests.`,
    });
  } catch (error: any) {
    console.error("Cron Maintenance Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
