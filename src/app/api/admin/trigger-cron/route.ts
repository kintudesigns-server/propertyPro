import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    const cronSecret = process.env.CRON_SECRET;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (cronSecret) {
      headers["Authorization"] = `Bearer ${cronSecret}`;
    }

    // Call the local API route
    const origin = new URL(req.url).origin;
    const targetUrl = `${origin}${endpoint}`;

    const res = await fetch(targetUrl, {
      method: "POST",
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json({ error: data.error || `Trigger failed with status ${res.status}` }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Trigger cron proxy error:", error);
    return NextResponse.json({ error: error.message || "Failed to trigger cron job" }, { status: 500 });
  }
}
