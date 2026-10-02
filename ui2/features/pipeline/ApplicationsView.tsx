"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatInternationalNumber } from "@/lib/countryCodes";
import { Badge } from "@/ui2/components/Badge";
import { Button } from "@/ui2/components/Button";
import { DataTable, type Column } from "@/ui2/components/DataTable";
import { CheckField } from "@/ui2/components/Field";
import { copyToClipboard } from "@/ui2/lib/clipboard";
import { useActOnRegForm, useAutoApprove, useRegForms, useSetAutoApprove } from "@/ui2/queries/pipeline";
import type { RegForm } from "@/ui2/queries/types";
import { useIssued } from "@/ui2/features/management/IssuedCredentials";
import "@/ui2/features/accounts/accounts.css";

const BOOKING_LABEL: Record<string, string> = { Trial: "Trial", TeacherInterview: "Interview — Teacher", StaffInterview: "Interview — Staff", AmbassadorInterview: "Interview — Ambassador" };

const detailsOf = (r: RegForm): [string, string][] =>
  ([
    ["Email", r.Email], ["WhatsApp", formatInternationalNumber(r.WhatsAppNumber)], ["Parent", formatInternationalNumber(r.ParentContactNumber)], ["Parent email", r.ParentEmail],
    ["Gender", r.Gender], ["Location", r.Location], ["School", r.SchoolName], ["Studying", r.Studying], ["Wants", r.HelpWanted], ["Subjects", r.Subjects],
    ["Referrer", r.ReferrerName], ["Heard via", r.HeardAbout], ["Coupon", r.CouponCode], ["A* possible", r.ScoreAStar],
  ] as [string, string | undefined][]).filter((p): p is [string, string] => !!p[1]);

export function ApplicationsView() {
  const forms = useRegForms();
  const auto = useAutoApprove();
  const setAuto = useSetAutoApprove();
  const act = useActOnRegForm();
  const { issued, remember } = useIssued();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const rows = useMemo(() => (forms.data ?? []).filter((r) => !search.trim() || r.Name.toLowerCase().includes(search.trim().toLowerCase())), [forms.data, search]);

  async function decide(r: RegForm, action: "approve" | "reject") {
    setBusy(r.RegFormID);
    try {
      const res = await act.mutateAsync({ regFormId: r.RegFormID, action });
      if (res.credentials) remember(r.RegFormID, res.credentials);
      toast.success(action === "approve" ? `Approved ${r.Name}.` : `Rejected ${r.Name}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  }

  const columns: Column<RegForm>[] = [
    { id: "id", header: "ID", width: 90, sortValue: (r) => r.RegFormID, cell: (r) => <span className="u2-mono">{r.RegFormID}</span> },
    { id: "name", header: "Name", width: 160, sortValue: (r) => r.Name, tip: (r) => r.Name, cell: (r) => <strong className="u2-strong">{r.Name}</strong> },
    { id: "type", header: "Type", width: 150, sortValue: (r) => r.RequestedType, cell: (r) => BOOKING_LABEL[r.RequestedType] || r.RequestedType },
    { id: "status", header: "Status", width: 90, sortValue: (r) => r.Status, cell: (r) => <Badge kind={r.Status === "Pending" ? "warning" : r.Status === "Approved" ? "success" : "error"}>{r.Status}</Badge> },
    {
      id: "details", header: "Details", tip: (r) => detailsOf(r).map(([k, v]) => `${k}: ${v}`).join("\n"),
      cell: (r) => <details className="u2-details"><summary>{detailsOf(r).length} fields</summary><div>{detailsOf(r).map(([k, v]) => <div key={k}><b>{k}:</b> {v}</div>)}</div></details>,
    },
    {
      id: "cred", header: "Credentials", width: 220,
      cell: (r) => {
        const c = issued[r.RegFormID];
        if (c)
          return (
            <span className="u2-rowactions">
              <span className="u2-muted">{c.username} / {c.password}</span>
              <Button size="sm" variant="ghost" onClick={async () => { await copyToClipboard(`${c.username} / ${c.password}`); toast.success("Copied."); }}>Copy</Button>
            </span>
          );
        return r.Username ? <span className="u2-muted">{r.Username} (reset the password in Accounts to view)</span> : "—";
      },
    },
    {
      id: "actions", header: "", title: "Actions", width: 150,
      cell: (r) =>
        r.Status === "Pending" ? (
          <span className="u2-rowactions">
            <Button size="sm" variant="primary" loading={busy === r.RegFormID} onClick={() => void decide(r, "approve")}>Approve</Button>
            <Button size="sm" variant="ghost" disabled={busy === r.RegFormID} onClick={() => void decide(r, "reject")}>Reject</Button>
          </span>
        ) : null,
    },
  ];

  return (
    <section className="u2-accounts">
      <h1>Applications</h1>
      <div className="u2-toolbar">
        <input type="search" className="u2-search" placeholder="Search applicant name…" aria-label="Search applicants" value={search} onChange={(e) => setSearch(e.target.value)} />
        <CheckField label="Auto-approve new applications (emails login to applicant immediately)" checked={!!auto.data} onChange={async (on) => { try { await setAuto.mutateAsync(on); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save."); } }} />
      </div>
      {forms.error ? <div role="alert" className="u2-errorbox">Could not load applications: {forms.error.message}</div> : <DataTable caption="RegForm applications" rows={rows} columns={columns} rowKey={(r) => r.RegFormID} loading={forms.isPending} initialSort={{ id: "id", dir: "desc" }} emptyText="No applications yet." />}
    </section>
  );
}
