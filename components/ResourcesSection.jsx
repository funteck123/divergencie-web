"use client";

import Link from "next/link";

// Service-based: apply per enrolled Service (a recording/syllabus/etc. is
// specific to that class). User-based: apply once to the account overall,
// not per service. `linkField` names the Service field Management can set
// (see app/api/services/route.js's applyStudentLinkFields) — passed through
// to the placeholder page as a query param so it can show an "Access"
// button straight to that URL, alongside the in-app feature's own "Coming
// soon" note.
const SERVICE_FEATURES = [
  { slug: "recordings", label: "Recordings", linkField: "RecordingsLink" },
  { slug: "syllabus", label: "Syllabus", linkField: "SyllabusLink" },
  { slug: "worksheets", label: "Worksheets", linkField: "WorksheetsLink" },
  { slug: "gcr", label: "Google Classroom", linkField: "GCRLink" },
];
const USER_FEATURES = [
  { slug: "timesheet", label: "Timesheet" },
  { slug: "progress-tracker", label: "Progress Tracker" },
];
// Straight external redirects to the syllabus-digitizer/mcq-digitizer
// prototypes' own Cloudflare quick tunnels -- no Supabase/DB involvement
// yet, just a link. Only work while that prototype's tunnel is actually
// running; a dead tunnel means a broken link until it's restarted.
const EXTERNAL_TOOLS = [
  { label: "Syllabus Viewer", url: "https://thus-tuner-elegant-position.trycloudflare.com" },
  { label: "Question Solver", url: "https://durham-sofa-usd-traveling.trycloudflare.com" },
];

// `services` should be the enrolled Service objects (ServiceID + Name are
// all this needs) — same list each dashboard already builds for its "My
// Enrollments" table.
export default function ResourcesSection({ services, showExternalTools = false }) {
  return (
    <div className="card">
      <h2 className="font-semibold mb-4">Resources</h2>

      <div className="flex gap-2 flex-wrap mb-4">
        {USER_FEATURES.map((f) => (
          <Link key={f.slug} className="btn-ghost" href={`/dashboard/resources/${f.slug}`}>
            {f.label}
          </Link>
        ))}
        {showExternalTools && EXTERNAL_TOOLS.map((f) => (
          <a key={f.label} className="btn-ghost" href={f.url} target="_blank" rel="noopener noreferrer">
            {f.label}
          </a>
        ))}
      </div>

      {(services || []).length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No enrollments yet.</p>
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <div key={s.ServiceID} className="p-3 rounded" style={{ background: "var(--panel-2)" }}>
              <div className="font-medium mb-2">{s.Name}</div>
              <div className="flex gap-2 flex-wrap">
                {SERVICE_FEATURES.map((f) => {
                  const externalLink = s[f.linkField] || "";
                  const params = new URLSearchParams({ serviceId: s.ServiceID, serviceName: s.Name });
                  if (externalLink) params.set("link", externalLink);
                  return (
                    <Link key={f.slug} className="btn-ghost" href={`/dashboard/resources/${f.slug}?${params.toString()}`}>
                      {f.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
