import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET /api/notifications/unread-count
// Used for polling-based real-time badge. Frontend polls every 30 seconds.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return NextResponse.json({ count }, {
      headers: {
        // Allow caching for 30 seconds — matches poll interval
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
