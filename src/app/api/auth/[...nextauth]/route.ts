import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextRequest } from "next/server";

const handler = NextAuth(authOptions);

// Next.js 15/16 App Router passes `params` as a Promise to route handlers.
// NextAuth v4 expects `context.params` to be resolved as an object.
async function authHandler(
  req: NextRequest,
  context: { params: Promise<{ nextauth?: string[] }> | { nextauth?: string[] } }
) {
  const params = await context.params;
  return handler(req, { params });
}

export { authHandler as GET, authHandler as POST };



