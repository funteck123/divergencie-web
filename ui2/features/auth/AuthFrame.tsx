import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import "./auth.css";

/** The page around sign in and register: logo on navy, one centred card. Public pages, so no shell. */
export function AuthFrame({ title, intro, children, footer }: { title: string; intro?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="u2-auth">
      <header className="u2-auth__bar u2-on-dark">
        <Link href="/" aria-label="DivergenCIE home">
          <Image src="/ui2/logo/logo-white-160.webp" alt="DivergenCIE Coaching" width={120} height={44} priority unoptimized />
        </Link>
        <Link href="/" className="u2-auth__back">← Back to site</Link>
      </header>
      <main className="u2-auth__main">
        <section className="u2-auth__card">
          <h1>{title}</h1>
          {intro && <p className="u2-muted">{intro}</p>}
          {children}
          {footer && <p className="u2-auth__foot">{footer}</p>}
        </section>
      </main>
    </div>
  );
}
