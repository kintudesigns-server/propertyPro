import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { PayoutStatus } from "@prisma/client";
import { notify, notifyMany } from "@/lib/notify";
import { getStripe } from "@/lib/stripe";
import { maskBankDetails } from "@/lib/sanitization";
import { encryptSymmetric } from "@/lib/encryption";
import { auditLog } from "@/lib/audit-log";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  // Parse query params for filtering / pagination / export
  const { searchParams } = new URL(req.url);
  const page       = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize   = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10)));
  const statusFilter = searchParams.get("status") || "ALL";       // ALL | PENDING | COMPLETED | REJECTED
  const typeFilter   = searchParams.get("type") || "ALL";         // ALL | OWNER | TENANT
  const fromDate     = searchParams.get("from");                  // ISO date string
  const toDate       = searchParams.get("to");                    // ISO date string
  const searchTerm   = searchParams.get("search") || "";
  const exportCsv    = searchParams.get("export") === "csv";

  try {
    const baseWhere: any = {};

    // Role-level scoping
    if (role === "OWNER") {
      baseWhere.ownerId = userId;
    } else if (role === "TENANT") {
      baseWhere.tenantId = userId;
    } else if (role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Status filter
    if (statusFilter !== "ALL") {
      baseWhere.status = statusFilter as PayoutStatus;
    }

    // Type filter (owner withdrawal vs tenant refund)
    if (typeFilter === "OWNER") {
      baseWhere.tenantId = null;
      baseWhere.ownerId = { not: null };
    } else if (typeFilter === "TENANT") {
      baseWhere.tenantId = { not: null };
    }

    // Date range filter
    if (fromDate || toDate) {
      baseWhere.createdAt = {};
      if (fromDate) baseWhere.createdAt.gte = new Date(fromDate);
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        baseWhere.createdAt.lte = to;
      }
    }

    // Search filter — applied via OR on relations
    let searchWhere: any = baseWhere;
    if (searchTerm) {
      searchWhere = {
        AND: [
          baseWhere,
          {
            OR: [
              { bankName: { contains: searchTerm, mode: "insensitive" } },
              { accountName: { contains: searchTerm, mode: "insensitive" } },
              { owner: { name: { contains: searchTerm, mode: "insensitive" } } },
              { owner: { email: { contains: searchTerm, mode: "insensitive" } } },
              { tenant: { name: { contains: searchTerm, mode: "insensitive" } } },
              { tenant: { email: { contains: searchTerm, mode: "insensitive" } } },
            ],
          },
        ],
      };
    }

    const include = {
      owner: { select: { name: true, email: true, balance: true } },
      tenant: { select: { name: true, email: true } },
      lease: {
        include: {
          unit: {
            include: {
              property: { select: { id: true, name: true, ownerId: true } },
            },
          },
        },
      },
    };

    // CSV Export — return all matching records streamed as CSV
    if (exportCsv && role === "SUPERADMIN") {
      const allPayouts = await prisma.payoutRequest.findMany({
        where: searchWhere,
        include,
        orderBy: { createdAt: "desc" },
      });

      const header = "Date,Type,Recipient Name,Recipient Email,Bank,Account (Masked),Amount,Status,Disbursed At,Reference,Rejection Reason\n";
      const rows = allPayouts.map((p: any) => {
        const isTenant = !!p.tenantId;
        const recipient = isTenant ? p.tenant : p.owner;
        const maskedAcc = p.accountNumber ? `***${p.accountNumber.slice(-4)}` : "N/A";
        const disbursed = p.disbursedAt ? new Date(p.disbursedAt).toLocaleDateString() : "";
        const reason = p.rejectionReason || "";
        return [
          new Date(p.createdAt).toLocaleDateString(),
          isTenant ? "Tenant Refund" : "Owner Withdrawal",
          recipient?.name || "N/A",
          recipient?.email || "N/A",
          p.bankName,
          maskedAcc,
          Number(p.amount).toFixed(2),
          p.status,
          disbursed,
          p.refNumber || "",
          `"${reason}"`,
        ].join(",");
      });

      const csv = header + rows.join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="payouts-ledger-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Count for pagination
    const totalCount = await prisma.payoutRequest.count({ where: searchWhere });

    // Paginated query
    const payouts = await prisma.payoutRequest.findMany({
      where: searchWhere,
      include,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Summary stats (always from unfiltered owner scope for accurate totals)
    const statWhere: any = role === "SUPERADMIN" ? {} : role === "OWNER" ? { ownerId: userId } : { tenantId: userId };
    const [pendingCount, completedAgg, rejectedAgg, processedCount] = await Promise.all([
      prisma.payoutRequest.count({ where: { ...statWhere, status: "PENDING" } }),
      prisma.payoutRequest.aggregate({ where: { ...statWhere, status: "COMPLETED" }, _sum: { amount: true }, _count: true }),
      prisma.payoutRequest.aggregate({ where: { ...statWhere, status: "REJECTED" }, _sum: { amount: true } }),
      prisma.payoutRequest.count({ where: { ...statWhere, status: { not: "PENDING" } } }),
    ]);

    // Avg processing time (createdAt → disbursedAt) for completed payouts
    const completedWithDates = await prisma.payoutRequest.findMany({
      where: { ...statWhere, status: "COMPLETED", disbursedAt: { not: null } },
      select: { createdAt: true, disbursedAt: true },
    });
    let avgProcessingHours = 0;
    if (completedWithDates.length > 0) {
      const totalMs = completedWithDates.reduce((acc: number, p: any) => {
        return acc + (new Date(p.disbursedAt).getTime() - new Date(p.createdAt).getTime());
      }, 0);
      avgProcessingHours = Math.round(totalMs / completedWithDates.length / (1000 * 60 * 60));
    }

    // Pending breakdown (owner vs tenant) for stats
    const [pendingOwnerCount, pendingTenantCount, pendingAmountAgg] = await Promise.all([
      prisma.payoutRequest.count({ where: { ...statWhere, status: "PENDING", tenantId: null, ownerId: { not: null } } }),
      prisma.payoutRequest.count({ where: { ...statWhere, status: "PENDING", tenantId: { not: null } } }),
      prisma.payoutRequest.aggregate({ where: { ...statWhere, status: "PENDING" }, _sum: { amount: true } }),
    ]);

    // Mask account numbers for ALL ROLES via DB-level obfuscation,
    // Since the actual DB record is AES encrypted, we just return a masked string here.
    const maskedPayouts = payouts.map((p: any) => {
      // If it's a tenant refund via STRIPE, it's not encrypted bank data, but token.
      if (p.bankName === "STRIPE") return p;
      if (p.accountNumber) {
         // Since it is an encrypted string in the DB (like hex string), we can't do slice(-4) on the raw number.
         // We'll just display a standard mask.
         return { ...p, accountNumber: "••••••••" };
      }
      return p;
    });

    return NextResponse.json({
      payouts: maskedPayouts,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
      stats: {
        pendingCount,
        pendingAmountAtRisk: Number(pendingAmountAgg._sum.amount || 0),
        pendingOwnerCount,
        pendingTenantCount,
        settledVolume: Number(completedAgg._sum.amount || 0),
        rejectedVolume: Number(rejectedAgg._sum.amount || 0),
        processedCount,
        avgProcessingHours,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch payouts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const ownerId = (session.user as any).id;

  try {
    const { amount, bankName, accountNumber, accountName } = await req.json();

    if (!amount || !bankName || !accountNumber || !accountName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const withdrawAmount = Number(amount);
    if (withdrawAmount <= 0) {
      return NextResponse.json({ error: "Invalid payout amount" }, { status: 400 });
    }

    // Check owner balance
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
    });

    if (!owner) {
      return NextResponse.json({ error: "Owner account not found" }, { status: 404 });
    }

    const currentBalance = Number(owner.balance);
    if (currentBalance < withdrawAmount) {
      return NextResponse.json({ error: "Insufficient balance in ledger" }, { status: 400 });
    }

    // Encrypt the sensitive bank account number securely at rest
    const encryptedAccountNumber = encryptSymmetric(accountNumber);

    // Create payout request and subtract from owner active balance in a transaction
    const [payout] = await prisma.$transaction([
      prisma.payoutRequest.create({
        data: {
          ownerId,
          amount: withdrawAmount,
          bankName,
          accountNumber: encryptedAccountNumber,
          accountName,
          status: PayoutStatus.PENDING,
        },
      }),
      prisma.user.update({
        where: { id: ownerId },
        data: {
          balance: {
            decrement: withdrawAmount,
          },
        },
      }),
    ]);

    await auditLog({
      entityType: "PAYOUT",
      entityId: payout.id,
      action: "CREATED",
      actorId: ownerId,
      actorRole: "OWNER",
      newValue: { amount: withdrawAmount, bankName },
      note: `Owner created payout request for $${withdrawAmount.toFixed(2)} to bank: ${bankName}`,
    });

    // Notify all admins of the new payout/withdrawal request
    try {
      const admins = await prisma.user.findMany({
        where: { role: "SUPERADMIN" },
        select: { id: true }
      });
      const adminIds = admins.map(a => a.id);
      await notifyMany(adminIds, {
        title: "New Payout Request",
        message: `Owner "${owner?.name || 'Owner'}" has requested a payout of $${withdrawAmount.toFixed(2)} to ${bankName}.`,
        type: "PAYMENT",
        priority: "HIGH",
        relatedEntityId: payout.id,
      });
    } catch (err) {
      console.error("[payouts] Failed to notify admins of new payout request:", err);
    }

    return NextResponse.json(payout, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create payout request" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Access denied. Admins only." }, { status: 403 });
  }

  try {
    const { payoutId, status, proofUrl, refNumber, bankName, accountNumber, accountName, amount, rejectionReason } = await req.json();

    if (!payoutId || !status) {
      return NextResponse.json({ error: "Missing payoutId or status" }, { status: 400 });
    }

    const payout = await prisma.payoutRequest.findUnique({
      where: { id: payoutId },
      include: {
        owner: true,
        tenant: true,
        lease: {
          include: {
            unit: {
              include: {
                property: true
              }
            }
          }
        }
      }
    });

    if (!payout) {
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
    }

    if (payout.status !== PayoutStatus.PENDING) {
      return NextResponse.json({ error: "Payout is already processed" }, { status: 400 });
    }

    const finalRef = refNumber || `TX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    if (status === PayoutStatus.COMPLETED) {
      // 1. Check if it's a Tenant Refund
      if (payout.tenantId && payout.leaseId) {
        let stripeRefundId = null;

        // If refundMethod is STRIPE, trigger automatic Stripe Refund
        if (payout.bankName === "STRIPE") {
          let stripePaymentIntentId = payout.lease!.refundRef;

          // Check transaction reference if not on lease
          if (!stripePaymentIntentId) {
            const depositTransaction = await prisma.transaction.findFirst({
              where: {
                tenantId: payout.tenantId,
                category: "DEPOSIT",
                type: "INCOME",
                status: "COMPLETED",
              },
              orderBy: { createdAt: "desc" },
            });
            if (depositTransaction?.reference?.startsWith("pi_")) {
              stripePaymentIntentId = depositTransaction.reference;
            }
          }

          if (!stripePaymentIntentId) {
            return NextResponse.json({
              error: "Stripe payout requested but could not locate original Stripe Payment Intent."
            }, { status: 400 });
          }

          try {
            const stripeClient = getStripe();
            const stripeRefund = await stripeClient.refunds.create({
              payment_intent: stripePaymentIntentId,
              amount: Math.round(Number(payout.amount) * 100),
            });
            stripeRefundId = stripeRefund.id;
          } catch (stripeErr: any) {
            console.error("Stripe refund execution failed:", stripeErr);
            return NextResponse.json({
              error: `Stripe Refund failed: ${stripeErr.message || "Unknown error"}`
            }, { status: 400 });
          }
        }

        const disbursementRef = stripeRefundId || finalRef;
        const deductionsList = (payout.lease!.deductions as any[]) || [];
        const newLeaseDepositStatus = deductionsList.length === 0 ? "REFUNDED" : "PARTIALLY_REFUNDED";

        // Execute DB updates inside a transaction
        const [updatedPayout] = await prisma.$transaction([
          prisma.payoutRequest.update({
            where: { id: payoutId },
            data: {
              status: PayoutStatus.COMPLETED,
              amount: amount ? Number(amount) : payout.amount,
              proofUrl: proofUrl || null,
              disbursedAt: new Date(),
              refNumber: disbursementRef,
              bankName: bankName || payout.bankName,
              accountNumber: stripeRefundId || accountNumber || payout.accountNumber,
              accountName: accountName || payout.accountName,
            },
          }),
          prisma.lease.update({
            where: { id: payout.leaseId },
            data: {
              depositStatus: newLeaseDepositStatus,
              moveOutStatus: "COMPLETED",
              refundRef: disbursementRef,
            },
          }),
          // Update the pending EXPENSE transaction to COMPLETED
          prisma.transaction.updateMany({
            where: {
              tenantId: payout.tenantId,
              type: "EXPENSE",
              category: "DEPOSIT",
              status: "PENDING",
            },
            data: {
              status: "COMPLETED",
              reference: disbursementRef,
            },
          }),
          // Register Refund Receipt Document
          prisma.document.create({
            data: {
              name: `Security Deposit Refund Notice - Unit ${payout.lease!.unit.name}`,
              category: "LEASE",
              url: proofUrl || `/dashboard/leases/${payout.leaseId!}`,
              tenantId: payout.tenantId!,
              propertyId: payout.lease!.unit.propertyId,
              fileSize: "150 KB",
            },
          }),
        ]);

        // Send Notifications to tenant and landlord
        try {
          await notify({
            userId: payout.tenantId!,
            title: "Security Deposit Refund Completed",
            message: `Your deposit refund of $${Number(payout.amount).toFixed(2)} has been completed by the admin via ${bankName || payout.bankName}. Reference: ${disbursementRef}.`,
            type: "PAYMENT",
            priority: "HIGH",
            relatedEntityId: payout.leaseId!,
          });

          await notify({
            userId: payout.lease!.unit.property.ownerId,
            title: "Tenant Refund Payout Completed",
            message: `The refund of $${Number(payout.amount).toFixed(2)} for tenant ${payout.tenant!.name} (Unit ${payout.lease!.unit.name}) has been completed and disbursed by the admin.`,
            type: "PAYMENT",
            priority: "MEDIUM",
            relatedEntityId: payout.leaseId!,
          });
        } catch (err) {
          console.error("Failed to send payout notifications:", err);
        }

        await auditLog({
          entityType: "PAYOUT",
          entityId: payoutId,
          action: "STATUS_CHANGED",
          actorId: (session.user as any).id,
          actorRole: "SUPERADMIN",
          oldValue: { status: payout.status },
          newValue: { status: PayoutStatus.COMPLETED, refNumber: disbursementRef },
          note: `Admin approved payout of $${Number(payout.amount).toFixed(2)}`,
        });

        return NextResponse.json(updatedPayout);
      } else {
        // 2. Regular Owner Payout
        const updated = await prisma.payoutRequest.update({
          where: { id: payoutId },
          data: {
            status: PayoutStatus.COMPLETED,
            proofUrl: proofUrl || null,
            disbursedAt: new Date(),
            refNumber: finalRef,
            bankName: bankName || payout.bankName,
            accountNumber: accountNumber || payout.accountNumber,
            accountName: accountName || payout.accountName,
          },
        });

        // Notify owner on completion
        try {
          if (payout.ownerId) {
            await notify({
              userId: payout.ownerId,
              title: "Payout Authorized & Disbursed",
              message: `Your withdrawal of $${Number(payout.amount).toFixed(2)} has been approved and disbursed. Reference: ${finalRef}.`,
              type: "PAYMENT",
              priority: "HIGH",
              relatedEntityId: payoutId,
            });
          }
        } catch (err) {
          console.error("Failed to send owner payout completion notification:", err);
        }

        await auditLog({
          entityType: "PAYOUT",
          entityId: payoutId,
          action: "STATUS_CHANGED",
          actorId: (session.user as any).id,
          actorRole: "SUPERADMIN",
          oldValue: { status: payout.status },
          newValue: { status: PayoutStatus.COMPLETED, refNumber: finalRef },
          note: `Admin approved payout of $${Number(payout.amount).toFixed(2)}`,
        });

        return NextResponse.json(updated);
      }
    } else if (status === PayoutStatus.REJECTED) {
      const rejectReason = rejectionReason || "No reason provided";

      if (payout.tenantId && payout.leaseId) {
        // Rejecting a tenant refund means returning the lease deposit status to HELD
        const [updated] = await prisma.$transaction([
          prisma.payoutRequest.update({
            where: { id: payoutId },
            data: { status: PayoutStatus.REJECTED, rejectionReason: rejectReason },
          }),
          prisma.lease.update({
            where: { id: payout.leaseId },
            data: { depositStatus: "HELD" },
          }),
          // Update transaction to FAILED
          prisma.transaction.updateMany({
            where: {
              tenantId: payout.tenantId,
              type: "EXPENSE",
              category: "DEPOSIT",
              status: "PENDING",
            },
            data: { status: "FAILED" },
          }),
          // Re-credit the landlord's balance since payout was rejected
          prisma.user.update({
            where: { id: payout.lease!.unit.property.ownerId },
            data: {
              balance: {
                increment: Number(payout.amount),
              },
            },
          }),
        ]);

        try {
          await notify({
            userId: payout.lease!.unit.property.ownerId,
            title: "Tenant Refund Payout Rejected",
            message: `The security deposit refund payout of $${Number(payout.amount).toFixed(2)} for ${payout.tenant!.name} was rejected. Reason: ${rejectReason}. The balance has been credited back to your ledger.`,
            type: "PAYMENT",
            priority: "HIGH",
            relatedEntityId: payout.leaseId!,
          });
          // Also notify the tenant
          await notify({
            userId: payout.tenantId,
            title: "Deposit Refund Request Rejected",
            message: `Your deposit refund request of $${Number(payout.amount).toFixed(2)} has been rejected by the admin. Reason: ${rejectReason}. Please contact support for further assistance.`,
            type: "PAYMENT",
            priority: "HIGH",
            relatedEntityId: payout.leaseId!,
          });
        } catch (err) {
          console.error(err);
        }

        await auditLog({
          entityType: "PAYOUT",
          entityId: payoutId,
          action: "STATUS_CHANGED",
          actorId: (session.user as any).id,
          actorRole: "SUPERADMIN",
          oldValue: { status: payout.status },
          newValue: { status: PayoutStatus.REJECTED, rejectionReason: rejectReason },
          note: `Admin rejected payout of $${Number(payout.amount).toFixed(2)}. Reason: ${rejectReason}`,
        });

        return NextResponse.json(updated);
      } else {
        // Return the money back to the owner balance for owner payout
        const [updated] = await prisma.$transaction([
          prisma.payoutRequest.update({
            where: { id: payoutId },
            data: { status: PayoutStatus.REJECTED, rejectionReason: rejectReason },
          }),
          prisma.user.update({
            where: { id: payout.ownerId! },
            data: {
              balance: {
                increment: Number(payout.amount),
              },
            },
          }),
        ]);

        // Notify owner about rejection
        try {
          if (payout.ownerId) {
            await notify({
              userId: payout.ownerId,
              title: "Payout Request Rejected",
              message: `Your withdrawal request of $${Number(payout.amount).toFixed(2)} has been rejected. Reason: ${rejectReason}. The funds have been returned to your ledger balance.`,
              type: "PAYMENT",
              priority: "HIGH",
              relatedEntityId: payoutId,
            });
          }
        } catch (err) {
          console.error("Failed to send rejection notification:", err);
        }

        await auditLog({
          entityType: "PAYOUT",
          entityId: payoutId,
          action: "STATUS_CHANGED",
          actorId: (session.user as any).id,
          actorRole: "SUPERADMIN",
          oldValue: { status: payout.status },
          newValue: { status: PayoutStatus.REJECTED, rejectionReason: rejectReason },
          note: `Admin rejected payout of $${Number(payout.amount).toFixed(2)}. Reason: ${rejectReason}`,
        });

        return NextResponse.json(updated);
      }
    } else {
      return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update payout request" }, { status: 500 });
  }
}
