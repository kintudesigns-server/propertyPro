import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  if (role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 1. Fetch Paid Invoices for Gross/Net calculations
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        status: "PAID",
        lease: {
          unit: {
            property: {
              ownerId: userId
            }
          }
        }
      },
      select: {
        amount: true,
        adminFee: true,
        netToOwner: true
      }
    });

    const grossRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const totalPlatformFees = paidInvoices.reduce((sum, inv) => sum + Number(inv.adminFee || 0), 0);
    const totalNetEarnings = paidInvoices.reduce((sum, inv) => sum + Number(inv.netToOwner || 0), 0);

    // 2. Escrow Balance (held deposits on active leases)
    const activeLeases = await prisma.lease.findMany({
      where: {
        unit: {
          property: {
            ownerId: userId
          }
        },
        depositStatus: "HELD",
        status: { in: ["ACTIVE", "NOTICE_GIVEN", "SIGNED"] }
      },
      select: {
        depositBalance: true
      }
    });

    const escrowBalance = activeLeases.reduce((sum, l) => sum + Number(l.depositBalance || 0), 0);

    // 3. Total Refunds (refunded deposits from closed leases)
    const closedLeases = await prisma.lease.findMany({
      where: {
        unit: {
          property: {
            ownerId: userId
          }
        },
        depositStatus: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] }
      },
      select: {
        depositRefundAmount: true
      }
    });

    const totalRefunded = closedLeases.reduce((sum, l) => sum + Number(l.depositRefundAmount || 0), 0);

    // 4. Retrieve transaction list for this owner
    // Includes rent collections, expenses, and deposit refunds
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          // Transactions linked to invoices on owner's leases
          {
            invoice: {
              lease: {
                unit: {
                  property: {
                    ownerId: userId
                  }
                }
              }
            }
          },
          // Escrow refund expense transactions
          {
            tenant: {
              leases: {
                some: {
                  unit: {
                    property: {
                      ownerId: userId
                    }
                  }
                }
              }
            },
            category: "DEPOSIT"
          }
        ]
      },
      include: {
        tenant: true,
        invoice: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({
      grossRevenue,
      totalPlatformFees,
      totalNetEarnings,
      escrowBalance,
      totalRefunded,
      transactions
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch overview" }, { status: 500 });
  }
}
