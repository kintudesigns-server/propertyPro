import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { auditLog } from "@/lib/audit-log";

// POST /api/cron/paused-account-cleanup
// Runs weekly/daily. Warns owners of data retention policies for paused accounts.
export async function POST(req: NextRequest) {
  // 🔒 CRON SECRET AUTH
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pausedOwners = await prisma.user.findMany({
      where: {
        role: "OWNER",
        subscriptionStatus: "Paused",
        pausedAt: { not: null },
      },
      select: {
        id: true,
        email: true,
        name: true,
        pausedAt: true,
      }
    });

    let emailedCount = 0;
    let archivedCount = 0;
    const now = Date.now();

    for (const owner of pausedOwners) {
      if (!owner.pausedAt) continue;

      const daysPaused = Math.floor((now - new Date(owner.pausedAt).getTime()) / 86400000);

      // Warning at Day 30-34
      if (daysPaused >= 30 && daysPaused < 35) {
        // Send 30-day notice
        emailedCount++;
        await prisma.notification.create({
          data: {
            userId: owner.id,
            title: "⚠️ Subscription Paused for 30 Days",
            message: "Your PropertyPro subscription has been paused for 30 days. Resubscribe to keep your profile active.",
            type: "SYSTEM",
            priority: "MEDIUM",
          }
        });

        if (owner.email) {
          await sendEmail({
            to: owner.email,
            subject: "Your PropertyPro Account has been Paused for 30 Days",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2>Subscription Paused 30 Days</h2>
                <p>Hi ${owner.name || 'Owner'},</p>
                <p>Your PropertyPro account has been paused for 30 days due to payment failure.</p>
                <p>We are keeping your properties and tenant data safe. However, to maintain active status and enable payout withdrawals, please update your billing details.</p>
                <div style="margin: 24px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/owner/billing" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Reactivate Account</a>
                </div>
              </div>
            `
          });
        }
      } 
      // Warning at Day 55-59
      else if (daysPaused >= 55 && daysPaused < 60) {
        // Send final 5-day warning
        emailedCount++;
        await prisma.notification.create({
          data: {
            userId: owner.id,
            title: "⚠️ Final Notice: Account Archival in 5 Days",
            message: "Your paused account is scheduled for archival in 5 days due to long-term non-payment.",
            type: "SYSTEM",
            priority: "HIGH",
          }
        });

        if (owner.email) {
          await sendEmail({
            to: owner.email,
            subject: "⚠️ Final Notice: Your PropertyPro Data is Scheduled for Archival",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #ef4444;">Final Notice: Account Archival</h2>
                <p>Hi ${owner.name || 'Owner'},</p>
                <p>Your subscription has been lapsed for 55 days. Under our terms of service, accounts paused for 60+ days are marked for archival.</p>
                <p>Please update your billing card within the next 5 days to secure your data and maintain regular platform access.</p>
                <div style="margin: 24px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/owner/billing" style="background-color: #ef4444; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Save My Data & Reactivate</a>
                </div>
              </div>
            `
          });
        }
      } 
      // Over Day 60 -> Archival flag
      else if (daysPaused >= 60) {
        archivedCount++;
        await auditLog({
          entityType: "USER",
          entityId: owner.id,
          action: "FLAGGED_FOR_ARCHIVAL",
          note: `Owner account has been paused for ${daysPaused} days. Flagged for manual admin data cleanup review.`
        });
      }
    }

    return NextResponse.json({
      success: true,
      scanned: pausedOwners.length,
      emailsSent: emailedCount,
      flaggedForArchival: archivedCount,
    });
  } catch (error: any) {
    console.error("Paused Account Cleanup Cron Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
