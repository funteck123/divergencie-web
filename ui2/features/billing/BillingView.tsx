"use client";

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

export function BillingView() {
  const [section, setSection] = useQueryState("section", parseAsString.withDefault("invoices"));
  const users = useUsers();
  const services = useServices();
  const enrollments = useEnrollments();
  const active = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];

  return (
    <section className="u2-accounts">
      <h1>Billing</h1>
      <div className="u2-seg" role="tablist" aria-label="Billing section">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={s.id === active.id} className="u2-seg__btn" onClick={() => void setSection(s.id === "invoices" ? null : s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {active.id === "invoices" && (
        <>
          <p className="u2-bill-hint">
            Lifecycle: <strong>Draft</strong> (not yet sent) → <strong>Sent</strong> (student can see and pay it) → student marks it paid, which shows as <strong>needs approval</strong> until you confirm the amount received via Approve/Partial → <strong>settled</strong>. Use the status filter or the By status view to jump to any stage.
          </p>
          <BillTable kind="invoice" users={users.data ?? []} services={services.data ?? []} />
        </>
      )}
      {active.id === "paychecks" && (
        <>
          <p className="u2-bill-hint">
            Lifecycle: <strong>Draft</strong> (not yet sent) → <strong>Sent</strong> (staff can see it) → staff marks it received, which shows as <strong>needs approval</strong> until you confirm the amount via Approve/Partial → <strong>settled</strong>. Use the status filter or the By status view to jump to any stage.
          </p>
          <BillTable kind="paycheck" users={users.data ?? []} services={services.data ?? []} />
        </>
      )}
      {active.id === "actions" && <MonthlyActions users={users.data ?? []} services={services.data ?? []} enrollments={enrollments.data ?? []} />}
    </section>
  );
}
