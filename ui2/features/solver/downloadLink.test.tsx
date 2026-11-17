import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LinkButton } from "@/ui2/components/Button";
import { solvedPdfUrl, yearlyPdfUrl } from "@/ui2/queries/solver";
import { pdfFileName } from "./solverLogic";

// TKT-0426: the Download PDF button in the library picker is a real link with the download attribute, so a phone saves the file even when it cannot show a PDF in a tab.
describe("Download PDF link", () => {
  it("renders an anchor to the PDF with the download attribute and a safe file name", () => {
    const html = renderToStaticMarkup(createElement(LinkButton, { variant: "secondary", size: "md", href: yearlyPdfUrl("znotes_physics_theory"), download: pdfFileName("ZNotes -- Physics Theory") }, "Download PDF"));
    expect(html).toMatch(/^<a /);
    expect(html).toContain('href="/api/mcq/yearly-pdf?paperId=znotes_physics_theory"');
    expect(html).toContain('download="ZNotes -- Physics Theory.pdf"');
    expect(html).not.toContain("target=");
  });
  it("works for a solved paper too", () => {
    const html = renderToStaticMarkup(createElement(LinkButton, { href: solvedPdfUrl("s 1"), download: pdfFileName("Solved: Paper 1") }, "Download PDF"));
    expect(html).toContain('href="/api/mcq/solved-pdf?id=s%201"');
    expect(html).toContain('download="Solved Paper 1.pdf"');
  });
});
