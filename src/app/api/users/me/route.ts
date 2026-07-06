import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  
  try {
    const data = await req.json();
    const updateData: any = {};
    if (typeof data.hasCompletedOnboarding === 'boolean') {
      updateData.hasCompletedOnboarding = data.hasCompletedOnboarding;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("Update Me Error:", error);
    return NextResponse.json({ error: "Failed to update user profile" }, { status: 500 });
  }
}
