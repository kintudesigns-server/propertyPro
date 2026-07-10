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

  try {
    let whereClause: any = {};

    if (role === "TENANT") {
      whereClause.tenantId = userId;
    } else if (role === "OWNER") {
      whereClause.tenant = {
        leases: {
          some: {
            unit: {
              property: {
                ownerId: userId
              }
            }
          }
        }
      };
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        tenant: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch transactions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const ownerId = (session.user as any).id;

  try {
    const { type, category, amount, reference, tenantId, status } = await req.json();
    if (!type || !category || !amount || !tenantId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify tenant has a lease belonging to this owner
    const lease = await prisma.lease.findFirst({
      where: {
        tenantId,
        unit: {
          property: {
            ownerId
          }
        }
      }
    });

    if (!lease) {
      return NextResponse.json({ error: "Tenant does not have a lease under your properties" }, { status: 400 });
    }

    const numericAmount = Number(amount);
    const isCompleted = status === "COMPLETED";

    const tx = await prisma.transaction.create({
      data: {
        type,
        category,
        amount: numericAmount,
        reference: reference || null,
        status: status || "COMPLETED",
        tenantId,
      },
    });

    return NextResponse.json(tx, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to record transaction" }, { status: 500 });
  }
}
