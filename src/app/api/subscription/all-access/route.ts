import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { checkAllModulesAccess } from "@/lib/module-guard";
import { GATABLE_MODULES } from "@/lib/modules-registry";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  // Non-owners (Tenants, Inspectors, Admins) have full access by default
  if (role !== "OWNER") {
    const allAllowed: Record<string, { allowed: boolean }> = {};
    for (const m of GATABLE_MODULES) {
      allAllowed[m.key] = { allowed: true };
    }
    return NextResponse.json(allAllowed);
  }

  try {
    const accessMap = await checkAllModulesAccess(userId);
    return NextResponse.json(accessMap);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
