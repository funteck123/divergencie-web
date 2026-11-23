"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { parseAsString, useQueryState } from "nuqs";
import { useEnrollments } from "@/ui2/queries/enrollments";
import { useServices } from "@/ui2/queries/services";
import { useUsers } from "@/ui2/queries/users";
import "@/ui2/features/accounts/accounts.css";
import { BillTable } from "./BillTable";
import { MonthlyActions } from "./MonthlyActions";
import "./billing.css";

const SECTIONS = [
  { id: "invoices", label: "Invoices · Students" },
  { id: "paychecks", label: "Paychecks" },
  { id: "actions", label: "Generate and create" },
] as const;

const HINT_SEEN = "u2-bill-hint-seen";
/** The note stays open for a few seconds after it was first shown, so a quick return (or React running an effect twice while developing) does not fold it before it was read. */
const HINT_FOLD_AFTER_MS = 3000;

/** The lifecycle note: open on the first visit, one line afterwards (TKT-0429, level 1). The text is the same. */
function LifecycleHint({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    try {
      const first = Number(window.localStorage.getItem(HINT_SEEN));
      if (!first) window.localStorage.setItem(HINT_SEEN, String(Date.now()));
      else if (Date.now() - first > HINT_FOLD_AFTER_MS && ref.current) ref.current.open = false;
    } catch {
      /* private mode: it stays open */
    }
  }, []);
  return (
    <details ref={ref} className="u2-bill-hint u2-bill-hint--fold" open>
      <summary>How a bill moves</summary>
      <p>{children}</p>
    </details>
  );
}

export function BillingView() {
  const [section, setSection] = useQueryState("section", parseAsString.withDefault("invoices"));
  const users = useUsers();
  const services = useServices();
  const enrollments = useEnrollments();
  const active = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];
  const [viewSlot, setViewSlot] = useState<HTMLElement | null>(null); // the view switch of the table is drawn on this line, beside the tabs

  return (
    <section className="u2-accounts">
      <h1>Billing</h1>
      <div className="u2-bill-tabs">
        <div className="u2-seg" role="tablist" aria-label="Billing section">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" role="tab" aria-selected={s.id === active.id} className="u2-seg__btn" onClick={() => void setSection(s.id === "invoices" ? null : s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <div ref={setViewSlot} className="u2-cluster u2-bill-tabs__views" />
      </div>

      {active.id === "invoices" && (
        <>
          <LifecycleHint>
            Lifecycle: <strong>Draft</strong> (not yet sent) → <strong>Sent</strong> (student can see and pay it) → student marks it paid, which shows as <strong>needs approval</strong> until you confirm the amount received via Approve/Partial → <strong>settled</strong>. Use the status filter or the By status view to jump to any stage.
          </LifecycleHint>
          <BillTable kind="invoice" users={users.data ?? []} services={services.data ?? []} viewsInto={viewSlot} />
        </>
      )}
      {active.id === "paychecks" && (
        <>
          <LifecycleHint>
            Lifecycle: <strong>Draft</strong> (not yet sent) → <strong>Sent</strong> (staff can see it) → staff marks it received, which shows as <strong>needs approval</strong> until you confirm the amount via Approve/Partial → <strong>settled</strong>. Use the status filter or the By status view to jump to any stage.
          </LifecycleHint>
          <BillTable kind="paycheck" users={users.data ?? []} services={services.data ?? []} viewsInto={viewSlot} />
        </>
      )}
      {active.id === "actions" && <MonthlyActions users={users.data ?? []} services={services.data ?? []} enrollments={enrollments.data ?? []} />}
    </section>
  );
}
