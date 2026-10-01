import Image from "next/image";
import { Button, IconButton } from "@/ui2/components/Button";
import styles from "./system.module.css";

// Component gallery: every shared piece in every state, so a reviewer sees them side by side.
// Grows with each phase. Colour pairs are listed with the text token that sits on them.
const PAIRS: { bg: string; fg: string; label: string }[] = [
  { bg: "bg", fg: "text", label: "Body text on page" },
  { bg: "bg", fg: "text-muted", label: "Muted text on page" },
  { bg: "brand", fg: "on-brand", label: "Text on navy" },
  { bg: "accent", fg: "on-accent", label: "Navy text on gold button" },
  { bg: "error", fg: "text-inverse", label: "White on error red" },
  { bg: "info-bg", fg: "info-text", label: "Info text" },
  { bg: "success-bg", fg: "success", label: "Success text" },
  { bg: "warning-bg", fg: "warning-text", label: "Warning text" },
  { bg: "error-bg", fg: "error", label: "Error text" },
];
const TYPE = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"];
const SPACE = ["1", "2", "3", "4", "6", "8", "12", "16"];
const RADIUS = ["sm", "md", "lg", "xl"];

export default function SystemGallery() {
  return (
    <div className={styles.page}>
      <h1>Component gallery</h1>

      <section aria-labelledby="g-color">
        <h2 id="g-color">Colour pairs</h2>
        <div className={styles.grid}>
          {PAIRS.map((p) => (
            <div key={p.label} className={styles.pair} style={{ background: `var(--u2-color-${p.bg})`, color: `var(--u2-color-${p.fg})` }}>
              <strong>{p.label}</strong>
              <span>
                {p.fg} on {p.bg}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="g-type">
        <h2 id="g-type">Type scale</h2>
        {TYPE.map((t) => (
          <p key={t} style={{ fontSize: `var(--u2-text-${t})` }} className={styles.typeRow}>
            text-{t}: Cambridge IGCSE Physics 0625
          </p>
        ))}
      </section>

      <section aria-labelledby="g-space">
        <h2 id="g-space">Spacing and radius</h2>
        <div className={styles.row}>
          {SPACE.map((s) => (
            <div key={s} className={styles.space} style={{ width: `var(--u2-space-${s})`, height: `var(--u2-space-${s})` }} title={`space-${s}`} />
          ))}
        </div>
        <div className={styles.row}>
          {RADIUS.map((r) => (
            <div key={r} className={styles.radius} style={{ borderRadius: `var(--u2-radius-${r})` }}>
              {r}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="g-logo">
        <h2 id="g-logo">Logo</h2>
        <div className={styles.row}>
          <div className={styles.logoDark}>
            <Image src="/ui2/logo/logo-white-160.webp" alt="DivergenCIE logo, white, on navy" width={120} height={44} unoptimized />
          </div>
          <div className={styles.logoLight}>
            <Image src="/ui2/logo/logo-dark-160.webp" alt="DivergenCIE logo, dark, on white" width={120} height={44} unoptimized />
          </div>
          <Image src="/ui2/logo/icon-64.webp" alt="DivergenCIE icon" width={32} height={32} unoptimized />
        </div>
      </section>

      <section aria-labelledby="g-button">
        <h2 id="g-button">Button</h2>
        {(["primary", "secondary", "ghost", "danger"] as const).map((v) => (
          <div key={v} className={styles.row} data-variant={v}>
            <Button variant={v}>{v}</Button>
            <Button variant={v} forceState="hover">
              hover
            </Button>
            <Button variant={v} forceState="focus">
              focus
            </Button>
            <Button variant={v} loading>
              loading
            </Button>
            <Button variant={v} disabled disabledReason="Select at least one row first.">
              disabled
            </Button>
            <Button variant={v} size="sm">
              small
            </Button>
            <IconButton variant={v} label="Add item">
              +
            </IconButton>
          </div>
        ))}
      </section>
    </div>
  );
}
