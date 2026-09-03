"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

// Service-based: apply per enrolled Service (a recording/syllabus/etc. is
// specific to that class). User-based: apply once to the account overall,
// not per service. `linkField` names the Service field Management can set
// (see app/api/services/route.js's applyStudentLinkFields) — passed through
// to the placeholder page as a query param so it can show an "Access"
// button straight to that URL, alongside the in-app feature's own "Coming
// soon" note. `toggleKey` matches a key in RESOURCE_FEATURE_KEYS
// (app/api/resource-toggles/route.js) -- a feature whose toggle is off is
// filtered out entirely below, not just visually disabled.
// TKT-0215: Syllabus and Worksheets buttons removed per user direction --
// that content is now covered by the Syllabus Viewer and Question Solver
// tools (EXTERNAL_TOOLS below) instead of a per-service manually-set link.
// Management's admin UI for setting SyllabusLink/WorksheetsLink and their
// on/off toggles are left as-is (not asked to remove those), just no
// longer rendered here.
const SERVICE_FEATURES = [
  { slug: "recordings", label: "Recordings", linkField: "RecordingsLink", toggleKey: "recordings" },
  { slug: "gcr", label: "Google Classroom", linkField: "GCRLink", toggleKey: "gcr" },
];
const USER_FEATURES = [
  { slug: "timesheet", label: "Timesheet", toggleKey: "timesheet", linkField: "TimesheetURL" },
  { slug: "progress-tracker", label: "Progress Tracker", toggleKey: "progressTracker", linkField: "ProgressTrackerURL" },
];
// Straight external redirect to the syllabus-digitizer prototype's own
// Cloudflare quick tunnel -- no Supabase/DB involvement yet, just a link.
// Only works while that prototype's tunnel is actually running; a dead
// tunnel means a broken link until it's restarted. mcq-digitizer USED to
// be here too (as a bare external "Question Solver" link) until it was
// properly merged into the main app (see
// planning/mcq-digitizer-integration-plan.md's "Option B") -- that one is
// now rendered separately below as an internal link, not from this list,
// since it needs the logged-in student's own account/name to build its URL.
const EXTERNAL_TOOLS = [
  { label: "Syllabus Viewer", url: "https://configurations-determines-finest-discovered.trycloudflare.com" },
];

// `services` should be the enrolled Service objects (ServiceID + Name are
// all this needs) — same list each dashboard already builds for its "My
// Enrollments" table.
export default function ResourcesSection({ services, user, showExternalTools = false }) {
  // Toggles default all-on except Recordings (matches the API's own
  // default) while the fetch is in flight, so the section doesn't flash
  // "everything hidden" for a moment on every load.
  const [toggles, setToggles] = useState({ recordings: false, syllabus: true, worksheets: true, gcr: true, timesheet: true, progressTracker: true });

  useEffect(() => {
    api("/api/resource-toggles")
      .then((res) => setToggles(res.toggles))
      .catch(() => {}); // a failed fetch just keeps the all-on-except-recordings default above
  }, []);

  const visibleUserFeatures = USER_FEATURES.filter((f) => toggles[f.toggleKey]);
  const visibleServiceFeatures = SERVICE_FEATURES.filter((f) => toggles[f.toggleKey]);

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">Resources</h2>

      <div className="flex gap-2 flex-wrap mb-4">
        {visibleUserFeatures.map((f) => {
          const externalLink = user?.[f.linkField] || "";
          const params = externalLink ? `?${new URLSearchParams({ link: externalLink }).toString()}` : "";
          return (
            <Link key={f.slug} className="btn-ghost" href={`/dashboard/resources/${f.slug}${params}`}>
              {f.label}
            </Link>
          );
        })}
        {showExternalTools && EXTERNAL_TOOLS.map((f) => (
          <a key={f.label} className="btn-ghost" href={f.url} target="_blank" rel="noopener noreferrer">
            {f.label}
          </a>
        ))}
        {showExternalTools && user && (
          <a
            className="btn-ghost"
            href={`/mcq-digitizer/index.html?${new URLSearchParams({ account: user.UserID, name: user.Name }).toString()}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Question Solver
          </a>
        )}
      </div>

      {(services || []).length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No enrollments yet.</p>
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <div key={s.ServiceID} className="p-3 rounded" style={{ background: "var(--panel-2)" }}>
              <div className="font-medium mb-2">{s.Name}</div>
              <div className="flex gap-2 flex-wrap">
                {visibleServiceFeatures.map((f) => {
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
