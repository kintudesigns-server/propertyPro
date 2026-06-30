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
