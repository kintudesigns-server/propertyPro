import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { sanitizeVendor } from "@/lib/sanitization";
import { getEffectiveSubscriptionRules } from "@/lib/subscription-rules";
import { checkModuleAccess, moduleLockedResponse } from "@/lib/module-guard";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  if (role !== "OWNER" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (role === "OWNER") {
    const access = await checkModuleAccess(userId, "vendors");
    if (!access.allowed) {
      return moduleLockedResponse(access);
    }
  }

  try {
    const vendors = await prisma.externalVendor.findMany({
      where: role === "OWNER" ? { ownerId: userId } : undefined,
      include: {
        _count: {
          select: { maintenanceRequests: { where: { status: "CLOSED" } } }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    const sanitizedVendors = vendors.map(v => sanitizeVendor(v));
    return NextResponse.json(sanitizedVendors);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  if (role !== "OWNER" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (role === "OWNER") {
    const access = await checkModuleAccess(userId, "vendors");
    if (!access.allowed) {
      return moduleLockedResponse(access);
    }
  }

  // Gate: paused OWNER accounts cannot add new vendors
  if (role === "OWNER") {
    const rules = await getEffectiveSubscriptionRules(userId);
    if (rules.isPaused && rules.blockAddVendor) {
      return NextResponse.json({
        error: "Your account is currently paused. Adding new vendors is restricted until your subscription is reactivated.",
        code: "ACCOUNT_PAUSED",
        isPaused: true,
      }, { status: 403 });
    }

    // Gate: maxVendors capacity check (0 = Unlimited)
    const owner = await prisma.user.findUnique({
      where: { id: userId },
      select: { pricingTier: true }
    });
    if (owner?.pricingTier?.maxVendors && owner.pricingTier.maxVendors > 0) {
      const currentVendorCount = await prisma.externalVendor.count({
        where: { ownerId: userId }
      });
      if (currentVendorCount >= owner.pricingTier.maxVendors) {
        return NextResponse.json({ 
          error: "LIMIT_REACHED", 
          message: `Plan limit reached. Your ${owner.pricingTier.name} plan allows up to ${owner.pricingTier.maxVendors} vendors.` 
        }, { status: 403 });
      }
    }
  }

  try {
    const { name, email, phone, specialty, w9OnFile, insuranceOnFile, baseCallOutFee } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const newVendor = await prisma.externalVendor.create({
      data: {
        name,
        email,
        phone: phone || "",
        specialty: specialty || "General",
        w9OnFile: !!w9OnFile,
        insuranceOnFile: !!insuranceOnFile,
        baseCallOutFee: baseCallOutFee ? parseFloat(baseCallOutFee) : 0.0,
        ownerId: userId,
      },
    });

    return NextResponse.json(sanitizeVendor(newVendor), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
