import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { checkUserFeatureAccess } from "@/lib/user-access-guard";
import { UserFeatureKey } from "@/lib/UserFeatureRegistry";

// GET /api/subscription/check-feature-access?feature=submit_maintenance
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  // If user is owner or admin, they pass feature-level checks by default
  if (role === "SUPERADMIN" || role === "OWNER") {
    return NextResponse.json({ allowed: true });
  }

  const { searchParams } = new URL(req.url);
  const feature = searchParams.get("feature") as UserFeatureKey;

  if (!feature) {
    return NextResponse.json({ error: "feature parameter is required" }, { status: 400 });
  }

  try {
    const access = await checkUserFeatureAccess(userId, feature);
    return NextResponse.json({
      allowed: access.allowed,
      reason: access.reason,
      adminNote: access.adminNote,
      expiresAt: access.expiresAt,
      daysRemaining: access.daysRemaining,
      blockedAt: access.blockedAt,
      featureLabel: access.featureLabel,
      source: access.source
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
