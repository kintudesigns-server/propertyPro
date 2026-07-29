import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getEffectiveSubscriptionRules } from "@/lib/subscription-rules";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  try {
    const rules = await getEffectiveSubscriptionRules(userId);
    return NextResponse.json(rules);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch subscription rules" }, { status: 500 });
  }
}
