import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextRequest } from "next/server";

const handler = NextAuth(authOptions);

export async function GET(req: NextRequest, context: any) {
  const params = await context.params;
  return handler(req, { ...context, params });
}

export async function POST(req: NextRequest, context: any) {
  const params = await context.params;
  return handler(req, { ...context, params });
}
