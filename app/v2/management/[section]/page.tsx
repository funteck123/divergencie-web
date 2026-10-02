import Link from "next/link";
import { notFound } from "next/navigation";
import { MANAGEMENT_SECTIONS } from "@/ui2/features/management/tabs";

export function generateStaticParams() {
  return MANAGEMENT_SECTIONS.filter((s) => !s.built).map((s) => ({ section: s.slug }));
}

/** A section that is not rebuilt yet. Says so plainly and links to the classic page, which keeps working. */
export default async function NotBuiltYet({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const found = MANAGEMENT_SECTIONS.find((s) => s.slug === section);
  if (!found) notFound();
  return (
    <section style={{ display: "grid", gap: "var(--u2-space-3)", maxWidth: 560 }}>
      <h1>{found.label}</h1>
      <p>This section is not in the new UI yet. It works as before in the classic UI.</p>
      <p>
        <Link href="/dashboard/management">Open the classic {found.label} page</Link>, then pick &quot;{found.label}&quot;.
      </p>
    </section>
  );
}
