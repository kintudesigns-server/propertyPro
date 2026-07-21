import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const tour = await prisma.tour.findUnique({
      where: { id },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        tenantName: true,
        tenantEmail: true,
        feedbackRating: true,
        feedbackComments: true,
        unitId: true,
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            images: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
            rentAmount: true,
          },
        },
      },
    });

    if (!tour) {
      return NextResponse.json({ error: "Tour not found" }, { status: 404 });
    }

    return NextResponse.json(tour);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch tour" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { feedbackRating, feedbackComments } = body;

    if (!feedbackRating || typeof feedbackRating !== "number") {
      return NextResponse.json({ error: "Rating (1-5) is required" }, { status: 400 });
    }

    const updatedTour = await prisma.tour.update({
      where: { id },
      data: {
        feedbackRating: Math.min(5, Math.max(1, Number(feedbackRating))),
        feedbackComments: feedbackComments || null,
      },
      include: {
        property: true,
      },
    });

    return NextResponse.json(updatedTour);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to submit feedback" }, { status: 500 });
  }
}
