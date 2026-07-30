import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { checkUserFeatureAccess } from "@/lib/user-access-guard";
import { TENANT_FEATURES, INSPECTOR_FEATURES, UserFeatureKey } from "@/lib/UserFeatureRegistry";

// GET /api/subscription/check-all-features
// Returns a map of { [featureKey]: boolean } for all features applicable to the current user's role
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  // Owners and admins always have full access — return empty blocked map
  if (role === "SUPERADMIN" || role === "OWNER") {
    return NextResponse.json({ blocked: {} });
  }

  const features =
    role === "INSPECTOR"
      ? INSPECTOR_FEATURES
      : role === "TENANT"
      ? TENANT_FEATURES
      : [];

  // Check all features in parallel
  const results = await Promise.all(
    features.map(async (feature) => {
      try {
        const access = await checkUserFeatureAccess(userId, feature.key as UserFeatureKey);
        return { key: feature.key, allowed: access.allowed };
      } catch {
        return { key: feature.key, allowed: true };
      }
    })
  );

  // Return a map of blocked features only (key => true if blocked)
  const blocked: Record<string, boolean> = {};
  for (const r of results) {
    if (!r.allowed) {
      blocked[r.key] = true;
    }
  }

  return NextResponse.json({ blocked });
}
