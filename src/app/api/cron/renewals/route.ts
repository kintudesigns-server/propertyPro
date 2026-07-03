import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

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

        // Send the automated renewal notice email
        if (typeof sendEmail === "function") {
          await sendEmail({
            to: lease.tenant.email,
            subject: `Lease Renewal Notice - ${lease.unit.property.name} - ${lease.unit.name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #0F172A;">Lease Renewal Notice</h2>
                <p>Dear ${lease.tenant.name},</p>
                <p>Your lease for <strong>${lease.unit.name}</strong> at <strong>${lease.unit.property.name}</strong> is scheduled to expire on <strong>${new Date(lease.endDate).toLocaleDateString()}</strong>.</p>
                <p>We are reaching out <strong>${noticeDays} days</strong> in advance to give you plenty of time to decide if you would like to renew your lease with us!</p>
                <p>Please log in to your Tenant Dashboard to review your renewal options.</p>
                <br/>
                <p>Best regards,<br/>The Property Management Team</p>
              </div>
            `,
          });
        }
        
        console.log(`[CRON] RENEWAL TRIGGERED & EMAILED: Sent to ${lease.tenant.email} for Unit ${lease.unit.name}.`);
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
