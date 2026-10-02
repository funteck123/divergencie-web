"use client";

import { useState } from "react";
import { Button } from "@/ui2/components/Button";
import { Combobox } from "@/ui2/components/Combobox";
import { Field, TextInput } from "@/ui2/components/Field";

const STATUS = ["Present", "Absent", "Late"].map((s) => ({ value: s, label: s }));

/** Status and hours of one person in one session. The Log button shows progress and cannot be double-clicked. */
export function MiniAttendanceForm({ defaultHrs, onSubmit, submitLabel = "Log" }: { defaultHrs: number | string; onSubmit: (status: string, hrs: number | string) => Promise<void> | void; submitLabel?: string }) {
  const [status, setStatus] = useState("Present");
  const [hrs, setHrs] = useState<number | string>(defaultHrs);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="u2-attform"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        try {
          await onSubmit(status, hrs);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Status">
        <Combobox value={status} onChange={setStatus} options={STATUS} />
      </Field>
      <Field label="Hours">
        <TextInput type="number" step="0.5" value={hrs} onChange={(e) => setHrs(e.target.value)} />
      </Field>
      <Button type="submit" size="sm" variant="primary" loading={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
