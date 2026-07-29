import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health
 * System health probe for container orchestrators (k8s, ECS, Railway, Vercel, etc.)
 * Returns 200 when healthy, 503 when degraded.
 */
export async function GET() {
  const startTime = Date.now();

  let dbStatus: "ok" | "error" = "error";
  let dbLatencyMs: number | null = null;
  let dbError: string | null = null;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = "ok";
  } catch (err: any) {
    dbError = err?.message ?? "Unknown database error";
  }

  const envChecks = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY,
    EMAIL_HOST: !!process.env.EMAIL_HOST,
  };

  const allEnvReady = Object.values(envChecks).every(Boolean);
  const isHealthy = dbStatus === "ok" && allEnvReady;
  const totalLatencyMs = Date.now() - startTime;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "unknown",
      environment: process.env.NODE_ENV ?? "unknown",
      totalLatencyMs,
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
          ...(dbError ? { error: dbError } : {}),
        },
        environment: envChecks,
      },
    },
    {
      status: isHealthy ? 200 : 503,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    }
  );
}
