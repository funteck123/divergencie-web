"use client";

import { Button } from "@/ui2/components/Button";
import { Sheet } from "@/ui2/components/Sheet";
import type { UserRecord } from "@/ui2/queries/types";

/** Keys that never go on screen: the record keeps a password hash, and the plaintext only shows once at creation. */
const HIDDEN = /password|hash|token|secret/i;

/** Field order for the common ones; anything else on the record follows alphabetically so nothing is missed. */
const FIRST = ["UserID", "UserType", "Name", "Status", "Username", "Email", "WhatsAppNumber", "ParentEmail", "ParentWhatsAppNumber", "School", "Location", "Course", "Batch", "Timezone", "Currency", "Role", "Department", "PassportNumber", "Notes"];

const LABEL: Record<string, string> = {
  UserID: "ID", UserType: "Type", WhatsAppNumber: "WhatsApp", ParentEmail: "Parent email", ParentWhatsAppNumber: "Parent WhatsApp", PassportNumber: "Passport number",
  TimesheetURL: "Timesheet", ProgressTrackerURL: "Progress tracker", WorkFolderURL: "Work folder", GroupSent: "Group sent", GCRSent: "GCR sent", ScheduleSent: "Schedule sent",
  StudentIDs: "Linked students", ConvertedToUserID: "Converted to", UiPreference: "UI preference",
};

export function labelOf(key: string): string {
  return LABEL[key] ?? key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

export function displayValue(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.length ? v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Every field on the record, in a stable order, without secrets. Empty fields show a dash so the gaps are visible too. */
export function detailRows(user: UserRecord): { key: string; label: string; value: string }[] {
  const keys = Object.keys(user).filter((k) => !HIDDEN.test(k));
  const ordered = [...FIRST.filter((k) => keys.includes(k) || ["Email", "School", "Location"].includes(k) && user.UserType === "Student"), ...keys.filter((k) => !FIRST.includes(k)).sort()];
  return [...new Set(ordered)].map((key) => ({ key, label: labelOf(key), value: displayValue(user[key]) }));
}

/** Read-only view of one account, so staff can see everything without opening the edit form. */
export function AccountDetails({ user, onClose, onEdit, onExportAttendance }: { user: UserRecord | null; onClose: () => void; onEdit: (id: string) => void; onExportAttendance?: (id: string) => void }) {
  return (
    <Sheet
      open={!!user}
      onOpenChange={(o) => !o && onClose()}
      title={user ? user.Name : "Account details"}
      subtitle={user ? `${user.UserID} · ${user.UserType}` : undefined}
      footer={
        user && (
          <span className="u2-rowactions">
            <Button variant="primary" onClick={() => { onClose(); onEdit(user.UserID); }}>Edit</Button>
            {onExportAttendance && <Button variant="ghost" onClick={() => { onClose(); onExportAttendance(user.UserID); }}>Export attendance</Button>}
          </span>
        )
      }
    >
      {user && (
        <dl className="u2-details">
          {detailRows(user).map((r) => (
            <div key={r.key} className="u2-details__row">
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Sheet>
  );
}
