// src/lib/auth.ts
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import * as bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { authConfig } from "./auth.config";

class InactiveAccountError extends CredentialsSignin {
  code = "account_inactive";
}

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email    = (credentials?.email    as string)?.toLowerCase().trim();
        const password = credentials?.password as string;

        if (!email || !password) throw new InvalidCredentialsError();

        try {
          const user = await prisma.user.findUnique({ where: { email } });

          if (!user) throw new InvalidCredentialsError();
          if (!user.active) throw new InactiveAccountError();

          const hash = user.passwordHash;

          // Require bcrypt hash — legacy "demo" fallback removed for security
          if (!hash) throw new InvalidCredentialsError();

          const valid = await bcrypt.compare(password, hash);
          if (!valid) throw new InvalidCredentialsError();

          return {
            id:         user.id,
            email:      user.email,
            name:       user.name,
            role:       user.role,
            dept:       user.dept,
            subGroup:   user.subGroup,
            supervisor: user.supervisor,
          };
        } catch (error) {
          if (error instanceof CredentialsSignin) throw error;
          console.error("[AUTH] DB error:", error);
          throw new InvalidCredentialsError();
        }
      },
    }),
  ],
});
