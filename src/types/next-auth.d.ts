import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    dept?: string | null;
    subGroup?: string | null;
    supervisor?: boolean;
  }
  interface Session {
    user: {
      id: string;
      role: string;
      dept?: string | null;
      subGroup?: string | null;
      supervisor?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    dept?: string | null;
    subGroup?: string | null;
    supervisor?: boolean;
  }
}
