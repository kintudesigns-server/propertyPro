import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const { id } = await params;

  try {
    const { status } = await req.json();
    if (!status) {
      return NextResponse.json({ error: "Status field is required" }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: { unit: { include: { property: true } } },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const isOwner = role === "OWNER" && application.unit.property.ownerId === userId;
    const isSuperAdmin = role === "SUPERADMIN";

    if (!isOwner && !isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedApp = await prisma.application.update({
      where: { id },
      data: { status },
    });

    // Notify the user or tenant (optional notifications)
    try {
      // If we have a user with this email, notify them directly
      const user = await prisma.user.findUnique({
        where: { email: application.email },
      });
      if (user) {
        await notify({
          userId: user.id,
          title: `Application ${status.toLowerCase()}`,
          message: `Your rental application for Unit ${application.unit.name} at ${application.unit.property.name} has been ${status.toLowerCase()}.`,
          type: "SYSTEM",
          priority: "HIGH",
          relatedEntityId: application.id,
        });
      }
    } catch (_) {}

    return NextResponse.json(updatedApp);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update application" }, { status: 500 });
  }
}
