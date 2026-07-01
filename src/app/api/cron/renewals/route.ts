import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// This simulates a CRON job that would run daily (e.g., via Vercel Cron or a separate worker)
export async function POST() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day for comparison

    // 1. Find all active leases that are not yet eligible for renewal
    const activeLeases = await prisma.lease.findMany({
      where: {
        status: "ACTIVE",
        renewalStatus: "NOT_ELIGIBLE",
      },
      include: {
        tenant: true,
        unit: { include: { property: true } }
      }
    });

    let triggeredCount = 0;

    // 2. Check which ones have entered their renewal window
    for (const lease of activeLeases) {
      if (!lease.endDate) continue;

      const endDate = new Date(lease.endDate);
      const noticeDays = lease.renewalNoticeDays || 60;
      
      // Calculate the exact date the notice should be sent
      const noticeTriggerDate = new Date(endDate);
      noticeTriggerDate.setDate(endDate.getDate() - noticeDays);

      // If today is past or exactly on the trigger date, trigger renewal
      if (today >= noticeTriggerDate) {
        await prisma.lease.update({
          where: { id: lease.id },
          data: { renewalStatus: "PENDING_DECISION" }
        });
        
        triggeredCount++;

        // In a real app, we would send an email here using SendGrid/Resend
        console.log(`[CRON] RENEWAL TRIGGERED: Sent renewal offer to ${lease.tenant.email} for Unit ${lease.unit.name}. Current rent: $${lease.monthlyRent}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Cron job completed. Triggered ${triggeredCount} renewal offers.` 
    });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
