"use client";

import { useState } from "react";
import { Button } from "@/ui2/components/Button";
import { Field } from "@/ui2/components/Field";
import "./solver.css";

/** The student's own question paper and mark scheme. Two PDFs, both required. Uploaded papers are never tracked. */
export function UploadStage({ busy, error, onDigitize, onBack }: { busy: boolean; error: string; onDigitize: (qp: File, ms: File) => void; onBack: () => void }) {
  const [qp, setQp] = useState<File | null>(null);
  const [ms, setMs] = useState<File | null>(null);
  const pdf = (f: File | null) => (f && f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf") ? "That file isn't a PDF." : "");
  const problem = pdf(qp) || pdf(ms);
  return (
    <div className="u2-solver">
      <div className="u2-rowactions"><Button variant="ghost" onClick={onBack}>← Back to library</Button></div>
      <p className="u2-muted">Upload a multiple-choice question paper and its mark scheme. Papers you upload aren&apos;t saved to your progress history.</p>
      <Field label="Question paper (PDF)" error={pdf(qp) || undefined}>
        <input type="file" accept="application/pdf,.pdf" onChange={(e) => setQp(e.target.files?.[0] ?? null)} />
      </Field>
      <Field label="Mark scheme (PDF)" error={pdf(ms) || undefined}>
        <input type="file" accept="application/pdf,.pdf" onChange={(e) => setMs(e.target.files?.[0] ?? null)} />
      </Field>
      {error && <p role="alert" className="u2-form__error">{error}</p>}
      <Button variant="primary" loading={busy} disabled={!qp || !ms || !!problem} disabledReason={problem || "Choose both files first."} onClick={() => qp && ms && onDigitize(qp, ms)}>Digitize this paper</Button>
    </div>
  );
}
