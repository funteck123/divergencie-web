"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/ui2/components/Button";
import { apiFetch } from "@/ui2/queries/client";
import { Card } from "./Cards";
import "@/ui2/features/accounts/accounts.css";

const FEATURE_LABELS: Record<string, string> = { recordings: "Recordings", syllabus: "Syllabus", worksheets: "Worksheets", gcr: "Google Classroom", timesheet: "Timesheet", "progress-tracker": "Progress Tracker" };
const http = (u: string) => /^https?:\/\//i.test(u);

/** One resource: a button to the external page (until the in-app version exists) and, for worksheets, the Drive folder's files. */
export function ResourceFeature() {
  const router = useRouter();
  const feature = String(useParams().feature);
  const sp = useSearchParams();
  const label = FEATURE_LABELS[feature] || feature;
  const serviceName = sp.get("serviceName");
  const link = sp.get("link") || "";
  const target = http(link) ? link : "https://google.com";
  return (
    <div className="u2-accounts">
      <div><Button variant="ghost" onClick={() => router.back()}>← Back</Button></div>
      <Card title={`${label}${serviceName ? ` — ${serviceName}` : ""}`}>
        <p className="u2-muted">In-app {label} is coming soon.</p>
        <div><a className="u2-pill" href={target} target="_blank" rel="noreferrer">Access {label}</a></div>
      </Card>
      {feature === "worksheets" && <DriveFiles link={link} />}
    </div>
  );
}

interface DriveFile { id: string; name: string; webViewLink: string; iconLink?: string }

function DriveFiles({ link }: { link: string }) {
  const isFolder = /drive\.google\.com\/.*\/folders\//i.test(link);
  const files = useQuery({ queryKey: ["drive-folder", link] as const, enabled: isFolder, retry: false, queryFn: async () => (await apiFetch<{ files?: DriveFile[] }>(`/api/resources/drive-folder?link=${encodeURIComponent(link)}`)).files ?? [] });
  if (!isFolder) return null;
  return (
    <Card title="Files">
      {files.error && <p role="alert" className="u2-form__error">Couldn&apos;t load folder contents — {files.error.message}</p>}
      {files.isPending && !files.error && <p className="u2-muted">Loading…</p>}
      {files.data && files.data.length === 0 && <p className="u2-muted">This folder is empty.</p>}
      {files.data && files.data.length > 0 && (
        <div className="u2-filegrid">
          {files.data.map((f) => (
            <a key={f.id} href={http(f.webViewLink) ? f.webViewLink : "https://google.com"} target="_blank" rel="noreferrer" className="u2-filecard">
              {/* eslint-disable-next-line @next/next/no-img-element -- Drive icons are tiny remote images with no known host list */}
              {f.iconLink && <img src={f.iconLink} alt="" width={32} height={32} />}
              <span>{f.name}</span>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
