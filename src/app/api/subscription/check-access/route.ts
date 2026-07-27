import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { checkModuleAccess } from "@/lib/module-guard";
import { ModuleKey } from "@/lib/modules-registry";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  // Gating is only applied to owners (the paying subscribers).
  if (role !== "OWNER") {
    return NextResponse.json({ allowed: true });
  }

  const { searchParams } = new URL(req.url);
  const module = searchParams.get("module") as ModuleKey;

  if (!module) {
    return NextResponse.json({ error: "module parameter is required" }, { status: 400 });
  }

  try {
    const access = await checkModuleAccess(userId, module);
    return NextResponse.json({ allowed: access.allowed, reason: access.reason });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
