"use client";

// Portal-level error boundary — catches errors in any portal page
// without crashing the whole app. The sidebar/topbar stay visible.
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 p-8 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">
          Something went wrong
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          {error.message || "An unexpected error occurred loading this page."}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-[var(--navy)] text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:opacity-80 transition-opacity"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
