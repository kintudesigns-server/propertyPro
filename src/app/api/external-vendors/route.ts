import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
// Force TS reload for Prisma
import { prisma } from "@/lib/prisma";
import { sanitizeVendor } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  if (role !== "OWNER" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const vendors = await prisma.externalVendor.findMany({
      where: role === "OWNER" ? { ownerId: userId } : undefined,
      include: {
        _count: {
          select: { maintenanceRequests: { where: { status: "CLOSED" } } }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    const sanitizedVendors = vendors.map(v => sanitizeVendor(v));
    return NextResponse.json(sanitizedVendors);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  if (role !== "OWNER" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { name, email, phone, specialty, w9OnFile, insuranceOnFile, baseCallOutFee } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const newVendor = await prisma.externalVendor.create({
      data: {
        name,
        email,
        phone: phone || "",
        specialty: specialty || "General",
        w9OnFile: !!w9OnFile,
        insuranceOnFile: !!insuranceOnFile,
        baseCallOutFee: baseCallOutFee ? parseFloat(baseCallOutFee) : 0.0,
        ownerId: userId,
      },
    });

    return NextResponse.json(sanitizeVendor(newVendor), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
