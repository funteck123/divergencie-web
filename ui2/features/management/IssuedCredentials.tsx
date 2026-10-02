"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Credentials } from "@/ui2/queries/types";

interface IssuedValue {
  issued: Readonly<Record<string, Credentials>>;
  /** Remember the plaintext credentials of an account for this page session (shown once, the server keeps only a hash). */
  remember: (userId: string, credentials: Credentials) => void;
  forget: (userId: string) => void;
}

const Ctx = createContext<IssuedValue | null>(null);

/**
 * Lives in the Management layout, so it survives moving between tabs. Same reason as the classic page: an admin
 * who just reset a password and switched tab must still be able to copy it. Memory only, never stored.
 */
export function IssuedProvider({ children }: { children: ReactNode }) {
  const [issued, setIssued] = useState<Record<string, Credentials>>({});
  const remember = useCallback((userId: string, c: Credentials) => setIssued((p) => ({ ...p, [userId]: c })), []);
  const forget = useCallback((userId: string) => setIssued(({ [userId]: _drop, ...rest }) => rest), []);
  const value = useMemo(() => ({ issued, remember, forget }), [issued, remember, forget]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIssued(): IssuedValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useIssued must be used inside IssuedProvider");
  return v;
}
