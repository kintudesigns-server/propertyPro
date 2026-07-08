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
    // Find all PAID invoices for this owner's properties
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

    return NextResponse.json({
      grossRevenue,
      totalPlatformFees,
      totalNetEarnings
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch stats" }, { status: 500 });
  }
}
