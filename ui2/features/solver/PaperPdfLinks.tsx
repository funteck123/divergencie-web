"use client";

import { LinkButton } from "@/ui2/components/Button";
import { pdfUrl, yearlyPdfUrl } from "@/ui2/queries/solver";

export interface PaperPdfLinksValue {
  qpId: string;
  msId?: string;
  title: string;
  yearlyId?: string;
}

/**
 * Download buttons for the paper's PDFs (TKT-0370). The question paper is always offered. The mark scheme is offered only when it gives nothing away:
 * while practising, and on the results screen, never in the middle of a test. A student's own uploaded papers have no stored PDF, so they get none.
 * The solver server sends both as downloads, so these save the file.
 */
export function PaperPdfLinks({ links, showMs }: { links: PaperPdfLinksValue | null | undefined; showMs: boolean }) {
  if (!links || links.qpId.startsWith("upload")) return null;
  const qp = links.yearlyId ? yearlyPdfUrl(links.yearlyId, "qp") : pdfUrl(links.qpId, `${links.title} QP`);
  const ms = links.msId ? (links.yearlyId ? yearlyPdfUrl(links.yearlyId, "ms") : pdfUrl(links.msId, `${links.title} MS`)) : null;
  return (
    <span className="u2-rowactions">
      <LinkButton href={qp} download>Download QP PDF</LinkButton>
      {showMs && ms && <LinkButton href={ms} download>Download MS PDF</LinkButton>}
    </span>
  );
}
