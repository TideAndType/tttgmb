import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifySync } from "otplib";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    // Cookie persists up to 30 days; the actual per-login window is enforced
    // in the jwt callback via token.expiresAt (1 day unless "remember me").
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "Authentication code", type: "text" },
        rememberMe: { label: "Remember me", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // Two-factor: if enabled, a valid TOTP code is required.
        if (user.totpEnabled && user.totpSecret) {
          const code = (credentials.totp || "").replace(/\s/g, "");
          if (!code) {
            throw new Error("2FA_REQUIRED");
          }
          const result = verifySync({ token: code, secret: user.totpSecret, epochTolerance: 30 });
          if (!result.valid) {
            throw new Error("INVALID_2FA");
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyName: user.companyName,
          permissions: user.permissions ?? [],
          rememberMe: credentials.rememberMe === "true",
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.companyName = (user as any).companyName;
        token.permissions = (user as any).permissions ?? [];
        // Per-login expiry: 30 days if "remember me", otherwise 1 day.
        const days = (user as any).rememberMe ? 30 : 1;
        token.expiresAt = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
      }
      // Enforce our window — once past it, drop identity so middleware re-auths.
      if (token.expiresAt && Math.floor(Date.now() / 1000) > (token.expiresAt as number)) {
        return {};
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).companyName = token.companyName;
        (session.user as any).permissions = token.permissions ?? [];
      } else {
        // Expired/invalid token — strip the user so the client treats it as signed out.
        (session as any).user = undefined;
      }
      return session;
    },
  },
};
