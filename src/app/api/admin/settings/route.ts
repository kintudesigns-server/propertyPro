import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let settings = await prisma.platformSettings.findFirst();
    if (!settings) {
      // Seed default settings if none exist
      settings = await prisma.platformSettings.create({
        data: { adminFeePercent: 2.00 },
      });
    }
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { adminFeePercent } = await req.json();
    if (adminFeePercent === undefined || adminFeePercent < 0 || adminFeePercent > 100) {
      return NextResponse.json({ error: "Invalid percentage" }, { status: 400 });
    }

    let settings = await prisma.platformSettings.findFirst();
    
    if (settings) {
      settings = await prisma.platformSettings.update({
        where: { id: settings.id },
        data: { adminFeePercent },
      });
    } else {
      settings = await prisma.platformSettings.create({
        data: { adminFeePercent },
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
