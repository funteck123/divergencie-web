import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [], // Providers added in auth.ts (Node only)
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id         = user.id;
        token.role       = user.role;
        token.dept       = user.dept;
        token.subGroup   = user.subGroup;
        token.supervisor = user.supervisor;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id         = token.id as string;
        session.user.role       = token.role as string;
        session.user.dept       = token.dept as string | null | undefined;
        session.user.subGroup   = token.subGroup as string | null | undefined;
        session.user.supervisor = token.supervisor as boolean | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
