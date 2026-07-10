import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { PayoutStatus } from "@prisma/client";
import { notify } from "@/lib/notify";
import { getStripe } from "@/lib/stripe";
import { maskBankDetails } from "@/lib/sanitization";
import { auditLog } from "@/lib/audit-log";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  try {
    let payouts: any[] = [];
    if (role === "SUPERADMIN") {
      payouts = await prisma.payoutRequest.findMany({
        include: {
          owner: { select: { name: true, email: true } },
          tenant: { select: { name: true, email: true } },
          lease: {
            include: {
              unit: {
                include: {
                  property: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (role === "OWNER") {
      payouts = await prisma.payoutRequest.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: "desc" },
      });
    } else if (role === "TENANT") {
      payouts = await prisma.payoutRequest.findMany({
        where: { tenantId: userId },
        include: {
          lease: {
            include: {
              unit: {
                include: {
                  property: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" },
      });
    }
    if (role !== "SUPERADMIN") {
      payouts = payouts.map(p => {
        if (p.accountNumber) {
          const masked = maskBankDetails(p.accountNumber, null);
          return { ...p, accountNumber: masked.accountNumber };
        }
        return p;
      });
    }

    return NextResponse.json(payouts);
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

    // Create payout request and subtract from owner active balance in a transaction
    const [payout] = await prisma.$transaction([
      prisma.payoutRequest.create({
        data: {
          ownerId,
          amount: withdrawAmount,
          bankName,
          accountNumber,
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
    const { payoutId, status, proofUrl, refNumber, bankName, accountNumber, accountName, amount } = await req.json();

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

    const finalRef = refNumber || payout.accountNumber || `TX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

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
          newValue: { status: PayoutStatus.COMPLETED },
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
            bankName: bankName || payout.bankName,
            accountNumber: accountNumber || payout.accountNumber,
            accountName: accountName || payout.accountName,
          },
        });

        await auditLog({
          entityType: "PAYOUT",
          entityId: payoutId,
          action: "STATUS_CHANGED",
          actorId: (session.user as any).id,
          actorRole: "SUPERADMIN",
          oldValue: { status: payout.status },
          newValue: { status: PayoutStatus.COMPLETED },
          note: `Admin approved payout of $${Number(payout.amount).toFixed(2)}`,
        });

        return NextResponse.json(updated);
      }
    } else if (status === PayoutStatus.REJECTED) {
      if (payout.tenantId && payout.leaseId) {
        // Rejecting a tenant refund means returning the lease deposit status to HELD (since it wasn't refunded)
        // and refunding landlord balance
        const [updated] = await prisma.$transaction([
          prisma.payoutRequest.update({
            where: { id: payoutId },
            data: { status: PayoutStatus.REJECTED },
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
          // Re-credit the landlord's balance since payout was rejected/refund failed
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
            message: `The security deposit refund payout of $${Number(payout.amount).toFixed(2)} for ${payout.tenant!.name} was rejected by the admin. The balance has been credited back to your ledger.`,
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
          newValue: { status: PayoutStatus.REJECTED },
          note: `Admin rejected payout of $${Number(payout.amount).toFixed(2)}`,
        });

        return NextResponse.json(updated);
      } else {
        // Return the money back to the owner balance for owner payout
        const [updated] = await prisma.$transaction([
          prisma.payoutRequest.update({
            where: { id: payoutId },
            data: { status: PayoutStatus.REJECTED },
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

        await auditLog({
          entityType: "PAYOUT",
          entityId: payoutId,
          action: "STATUS_CHANGED",
          actorId: (session.user as any).id,
          actorRole: "SUPERADMIN",
          oldValue: { status: payout.status },
          newValue: { status: PayoutStatus.REJECTED },
          note: `Admin rejected payout of $${Number(payout.amount).toFixed(2)}`,
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
