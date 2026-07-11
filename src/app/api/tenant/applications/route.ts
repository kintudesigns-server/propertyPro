import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
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

    return NextResponse.json(applications);
  } catch (error: any) {
    console.error("Error fetching tenant applications:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}
