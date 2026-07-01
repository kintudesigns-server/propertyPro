import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  if (role !== "OWNER" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    let applications;
    if (role === "SUPERADMIN") {
      applications = await prisma.application.findMany({
        include: { unit: { include: { property: true } } },
        orderBy: { createdAt: "desc" },
      });
    } else {
      applications = await prisma.application.findMany({
        where: { unit: { property: { ownerId: userId } } },
        include: { unit: { include: { property: true } } },
        orderBy: { createdAt: "desc" },
      });
    }
    return NextResponse.json(applications);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch applications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { unitId, name, email, phone, documents } = await req.json();

    if (!unitId || !name || !email || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const application = await prisma.application.create({
      data: {
        unitId,
        name,
        email,
        phone,
        documents: documents || [],
        status: "PENDING",
      },
    });

    // Notify the property owner about the new application
    try {
      const unit = await prisma.unit.findUnique({
        where: { id: unitId },
        include: { property: true },
      });
      if (unit?.property?.ownerId) {
        await notify({
          userId: unit.property.ownerId,
          title: "New Rental Application Received",
          message: `${name} has submitted a rental application for Unit ${unit.name || unitId} at ${unit.property.name}. Review it in the Applications section.`,
          type: "SYSTEM",
          priority: "MEDIUM",
          relatedEntityId: application.id,
        });
      }
    } catch (_) {/* non-fatal */}

    return NextResponse.json(application, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to submit application" }, { status: 500 });
  }
}
