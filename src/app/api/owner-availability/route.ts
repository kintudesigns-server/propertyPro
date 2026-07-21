import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let ownerId = searchParams.get("ownerId");

    if (!ownerId) {
      const session = await getServerSession(authOptions);
      if (session?.user) {
        ownerId = (session.user as any).id;
      }
    }

    if (!ownerId) {
      return NextResponse.json({ error: "Missing ownerId" }, { status: 400 });
    }

    let availability = await (prisma as any).ownerAvailability.findUnique({
      where: { ownerId },
    });

    if (!availability) {
      // Default working hours Monday-Friday 9am-6pm
      const defaultHours = {
        monday: { start: "09:00", end: "18:00", enabled: true },
        tuesday: { start: "09:00", end: "18:00", enabled: true },
        wednesday: { start: "09:00", end: "18:00", enabled: true },
        thursday: { start: "09:00", end: "18:00", enabled: true },
        friday: { start: "09:00", end: "18:00", enabled: true },
        saturday: { start: "10:00", end: "16:00", enabled: true },
        sunday: { start: "10:00", end: "16:00", enabled: false },
      };

      availability = await (prisma as any).ownerAvailability.create({
        data: {
          ownerId,
          workingHours: defaultHours,
          blackoutDates: [],
          timezone: "America/New_York",
        },
      });
    }

    return NextResponse.json(availability);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch availability" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const ownerId = (session.user as any).id;

  if (role !== "OWNER" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { workingHours, blackoutDates, timezone } = await req.json();

    const availability = await prisma.ownerAvailability.upsert({
      where: { ownerId },
      update: {
        workingHours: workingHours || undefined,
        blackoutDates: blackoutDates || undefined,
        timezone: timezone || undefined,
      },
      create: {
        ownerId,
        workingHours: workingHours || {},
        blackoutDates: blackoutDates || [],
        timezone: timezone || "America/New_York",
      },
    });

    return NextResponse.json(availability);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save availability" }, { status: 500 });
  }
}
