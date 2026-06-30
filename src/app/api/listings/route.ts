import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const vacantUnits = await prisma.unit.findMany({
      where: {
        status: "VACANT",
      },
      include: {
        property: {
          select: {
            name: true,
            address: true,
            city: true,
            country: true,
            coverPhoto: true,
          },
        },
      },
      orderBy: {
        rentAmount: "asc",
      },
    });

    return NextResponse.json(vacantUnits);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch public listings" },
      { status: 500 }
    );
  }
}
