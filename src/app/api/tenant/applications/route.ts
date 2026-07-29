import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email;
  
  if (!email) {
    return NextResponse.json({ error: "No email associated with session" }, { status: 400 });
  }

  try {
    const applications = await prisma.application.findMany({
      where: { email },
      include: {
        unit: {
          include: {
            property: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const tenantUser = await prisma.user.findUnique({
      where: { email }
    });

    const enrichedApplications = await Promise.all(
      applications.map(async (app) => {
        let lease = null;
        if (tenantUser && (app.status === "APPROVED" || app.status === "LEASE_CREATED")) {
          lease = await prisma.lease.findFirst({
            where: {
              unitId: app.unitId,
              tenantId: tenantUser.id,
              status: { notIn: ["TERMINATED", "EXPIRED"] }
            },
            orderBy: { startDate: 'desc' }
          });
        }
        return { ...app, lease };
      })
    );

    return NextResponse.json(enrichedApplications);
  } catch (error: any) {
    console.error("Error fetching tenant applications:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}
