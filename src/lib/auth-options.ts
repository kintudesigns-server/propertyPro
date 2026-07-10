import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV !== "production",
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24, // 1 day session
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Missing email or password");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          await auditLog({
            entityType: "USER",
            entityId: "SYSTEM",
            action: "LOGIN_FAILED",
            note: `Failed login attempt: no user found with email ${credentials.email}`,
          });
          throw new Error("No account found with this email");
        }

        if (user.accountStatus === "PENDING_APPROVAL") {
          await auditLog({
            entityType: "USER",
            entityId: user.id,
            action: "LOGIN_FAILED",
            actorId: user.id,
            actorRole: user.role,
            note: `Failed login attempt: account status is PENDING_APPROVAL`,
          });
          throw new Error("Your account is pending admin approval.");
        }

        if (user.accountStatus === "SUSPENDED") {
          await auditLog({
            entityType: "USER",
            entityId: user.id,
            action: "LOGIN_FAILED",
            actorId: user.id,
            actorRole: user.role,
            note: `Failed login attempt: account status is SUSPENDED`,
          });
          throw new Error("Your account has been suspended. Please contact support@propertypro.com for assistance.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          await auditLog({
            entityType: "USER",
            entityId: user.id,
            action: "LOGIN_FAILED",
            actorId: user.id,
            actorRole: user.role,
            note: `Failed login attempt: invalid password for email ${credentials.email}`,
          });
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          hasCompletedOnboarding: user.hasCompletedOnboarding,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.phone = (user as any).phone;
        token.hasCompletedOnboarding = (user as any).hasCompletedOnboarding;
      } else if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, phone: true, name: true, balance: true, hasCompletedOnboarding: true, accountStatus: true },
        });
        if (dbUser && dbUser.accountStatus !== "SUSPENDED") {
          token.role = dbUser.role;
          token.phone = dbUser.phone;
          token.name = dbUser.name;
          token.balance = dbUser.balance;
          token.hasCompletedOnboarding = dbUser.hasCompletedOnboarding;
        } else {
          // User no longer exists or is suspended — return empty object to invalidate
          return {} as any;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && token.id) {
        if (session.user) {
          (session.user as any).id = token.id as string;
          (session.user as any).role = token.role as string;
          (session.user as any).phone = token.phone as string | null;
          (session.user as any).balance = token.balance ?? 0;
          (session.user as any).hasCompletedOnboarding = token.hasCompletedOnboarding as boolean;
        }
      } else {
        // Token is invalid/null (user deleted), clear the session user
        session.user = undefined as any;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  cookies: process.env.NODE_ENV === "production" ? {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true
      }
    }
  } : undefined,
  events: {
    async signIn({ user }) {
      await auditLog({
        entityType: "USER",
        entityId: user.id,
        action: "LOGIN_SUCCESS",
        actorId: user.id,
        actorRole: (user as any).role,
        note: `User logged in successfully.`,
      });
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};
