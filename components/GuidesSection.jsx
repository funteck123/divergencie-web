"use client";

// Static named-link buttons Management sets up per portal type (see the
// Guides tab in app/dashboard/management/page.js) — external URLs (PDF
// handbooks, video walkthroughs, etc.), not tied to any enrollment.
export default function GuidesSection({ guides }) {
  if (!guides || guides.length === 0) return null;

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">Guides</h2>
      <div className="flex gap-2 flex-wrap">
        {guides.map((g) => (
          <a key={g.GuideID} className="btn-ghost" href={g.Url} target="_blank" rel="noopener noreferrer">
            {g.Name}
          </a>
        ))}
      </div>
    </div>
  );
}
