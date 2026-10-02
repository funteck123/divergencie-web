"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { roleHomePath, setCurrentUser, setImpersonatorInfo } from "@/lib/client";
import { Button } from "@/ui2/components/Button";
import { Field, TextInput } from "@/ui2/components/Field";
import { apiFetch } from "@/ui2/queries/client";
import { AuthFrame } from "./AuthFrame";

/** Same call as classic: POST /api/login, remember the user, go to the role's home (which is /v2 when the account chose the new UI). */
export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await apiFetch<{ user: { UserType: string } }>("/api/login", { method: "POST", body: { username: username.trim(), password } });
      setCurrentUser(user);
      setImpersonatorInfo(null);
      router.push(roleHomePath(user.UserType));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame title="Welcome back" intro="Sign in to your DivergenCIE portal." footer={<>Don&apos;t have an account? <Link href="/v2/register">Apply for a trial or interview</Link></>}>
      <form className="u2-form" onSubmit={submit}>
        <Field label="Username"><TextInput autoFocus required autoComplete="username" placeholder="your-username" value={username} onChange={(e) => setUsername(e.target.value)} /></Field>
        {/* Never masked (TKT-0157): staff read passwords out to people, so it is plain text, no toggle. */}
        <Field label="Password" hint="Shown as you type.">
          <TextInput required autoComplete="current-password" placeholder="your-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <p style={{ margin: 0 }}><a href="mailto:divergenCIE@outlook.com" title="Forgot Password">Forgot your password?</a></p>
        {error && <p role="alert" className="u2-form__error">{error}</p>}
        <Button type="submit" variant="primary" loading={loading}>Portal Login</Button>
      </form>
    </AuthFrame>
  );
}
