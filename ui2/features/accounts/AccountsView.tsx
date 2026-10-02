"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCurrentUser, roleHomePath, setCurrentUser, setImpersonatorInfo } from "@/lib/client";
import { Badge } from "@/ui2/components/Badge";
import { Button } from "@/ui2/components/Button";
import { ConfirmDialog } from "@/ui2/components/ConfirmDialog";
import { DataTable, type Column } from "@/ui2/components/DataTable";
import { RowMenu, type RowMenuItem } from "@/ui2/components/RowMenu";
import { apiFetch } from "@/ui2/queries/client";
import { keys } from "@/ui2/queries/keys";
import type { Credentials, UserRecord } from "@/ui2/queries/types";
import { usePatchUser, useUsers } from "@/ui2/queries/users";
import { useIssued } from "@/ui2/features/management/IssuedCredentials";
import { ACCOUNT_GROUPS, CONVERT_LABEL, type AccountGroup } from "./groups";
import "./accounts.css";

interface MeBundle {
  interviewItems?: { InterviewAccID: string; Status: string }[];
  trialItems?: { TrialAccID: string; Status: string }[];
}

/** Same rule as the classic Accounts tab (TKT-0113 and TKT-0124): look at every item of the account, not the first. */
function convertEligibility(acc: UserRecord, bundle: MeBundle | undefined): boolean | undefined {
  if (!bundle) return undefined; // unknown yet
  const interviews = bundle.interviewItems?.filter((it) => it.InterviewAccID === acc.UserID) ?? [];
  const trials = bundle.trialItems?.filter((t) => t.TrialAccID === acc.UserID) ?? [];
  if (interviews.length) return interviews.some((it) => it.Status === "OfferAccepted");
  if (trials.length) return trials.some((t) => t.Status === "FeedbackSubmitted");
  return true;
}

function statusKind(status: string) {
  return status === "Converted" ? "info" : status === "Inactive" ? "error" : "success";
}

export function AccountsView() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: users, error, isPending, refetch } = useUsers();
  const patch = usePatchUser();
  const { issued, remember, forget } = useIssued();

  const [groupId, setGroupId] = useQueryState("type", parseAsString.withDefault("students"));
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const deferredSearch = useDeferredValue(search);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);

  const group: AccountGroup = ACCOUNT_GROUPS.find((g) => g.id === groupId) ?? ACCOUNT_GROUPS[0]!;
  const all = useMemo(() => users ?? [], [users]);

  const countByGroup = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of ACCOUNT_GROUPS) m.set(g.id, all.filter((u) => g.types.includes(u.UserType)).length);
    return m;
  }, [all]);

  const groupRows = useMemo(() => all.filter((u) => group.types.includes(u.UserType)), [all, group]);
  const rows = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return groupRows;
    return groupRows.filter((u) => u.Name.toLowerCase().includes(q) || u.UserID.toLowerCase().includes(q) || (u.Email ?? "").toLowerCase().includes(q));
  }, [groupRows, deferredSearch]);

  // Pending accounts: one /api/me per account decides whether Convert is allowed yet (only when that group is open).
  const pendingAccs = useMemo(() => (group.showConvert ? groupRows : []), [group, groupRows]);
  const eligibleOf = useQueries({
    queries: pendingAccs.map((acc) => ({
      queryKey: ["me", acc.UserID] as const,
      queryFn: () => apiFetch<MeBundle>(`/api/me?userId=${acc.UserID}`),
    })),
    // A plain object keeps a stable identity while nothing changed (structural sharing), so the columns are not rebuilt every render.
    combine: (results) => Object.fromEntries(pendingAccs.map((acc, i) => [acc.UserID, convertEligibility(acc, results[i]?.data)])) as Record<string, boolean | undefined>,
  });

  const withBusy = async (id: string, work: () => Promise<void>) => {
    setBusy((p) => new Set(p).add(id));
    try {
      await work();
    } finally {
      setBusy((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    }
  };

  const toggleStatus = (u: UserRecord) =>
    withBusy(u.UserID, async () => {
      const next = u.Status === "Active" ? "Inactive" : "Active";
      try {
        await patch.mutateAsync({ userId: u.UserID, fields: { status: next }, optimistic: { Status: next } });
        toast.success(`${u.Name} is now ${next}.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not change the status.");
      }
    });

  const resetPassword = (u: UserRecord) =>
    withBusy(u.UserID, async () => {
      const res = await patch.mutateAsync({ userId: u.UserID, fields: { resetPassword: true } });
      if (res.credentials) remember(u.UserID, res.credentials);
      toast.success(`New password for ${u.Name} is ready. Copy it from the box above the table.`);
    });

  const impersonate = (u: UserRecord) =>
    withBusy(u.UserID, async () => {
      try {
        const { user: target, impersonatorUserId } = await apiFetch<{ user: { UserType: string }; impersonatorUserId: string }>("/api/impersonate", { method: "POST", body: { userId: u.UserID } });
        const admin = getCurrentUser();
        setCurrentUser(target);
        setImpersonatorInfo({ userId: impersonatorUserId, name: admin?.Name || impersonatorUserId });
        router.push(roleHomePath(target.UserType));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not log in as this account.");
      }
    });

  const convert = (u: UserRecord) =>
    withBusy(u.UserID, async () => {
      try {
        const res = await apiFetch<{ credentials: Credentials; oldUser: UserRecord; newUser: UserRecord }>("/api/convert", { method: "POST", body: { accountId: u.UserID } });
        remember(u.UserID, res.credentials);
        // The reply has no credential join, so rebuild it the way GET /api/users does.
        const created = { ...res.newUser, Username: res.credentials.username, Password: res.credentials.password };
        qc.setQueryData<UserRecord[]>(keys.users, (prev) => [...(prev ?? []).map((x) => (x.UserID === u.UserID ? res.oldUser : x)), created]);
        toast.success(`${u.Name} converted to ${CONVERT_LABEL[u.UserType] ?? "account"}.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not convert.");
      }
    });

  const columns = useMemo<Column<UserRecord>[]>(() => {
    const isStudent = group.id === "students";
    const actionsWidth = isStudent ? 100 : group.showConvert ? 240 : 108;
    const menuItems = (u: UserRecord): RowMenuItem[] => {
      const items: RowMenuItem[] = [];
      if (u.Status === "Active" || u.Status === "Inactive") items.push({ label: u.Status === "Active" ? "Deactivate" : "Activate", onSelect: () => void toggleStatus(u) });
      if (u.Username && !u.ConvertedToUserID) items.push({ label: "Reset password", onSelect: () => setResetTarget(u) });
      if (group.showSchedule) items.push({ label: "Download schedule PNG", href: `/api/schedule/image?userId=${u.UserID}&download=1`, download: `DC_Schedule_${u.Name}.png` });
      items.push({ label: "Delete", danger: true, disabled: true, disabledReason: "Delete arrives in the next build step. Use the classic UI for now." });
      return items;
    };
    const actions: Column<UserRecord> = {
      id: "actions",
      header: "",
      title: "Actions",
      width: actionsWidth,
      cell: (u) => {
        const working = busy.has(u.UserID);
        const canLogIn = !!u.Username && !u.ConvertedToUserID && u.UserType !== "Management";
        const eligible = eligibleOf[u.UserID];
        return (
          <span className="u2-rowactions">
            {group.showConvert && CONVERT_LABEL[u.UserType] && (u.Status !== "Converted" || !u.ConvertedToUserID) &&
              (eligible === false ? (
                <span className="u2-muted">Not yet accepted</span>
              ) : (
                <Button size="sm" variant="primary" loading={working} disabled={eligible === undefined} disabledReason="Checking whether the offer was accepted." onClick={() => void convert(u)}>
                  Convert to {CONVERT_LABEL[u.UserType]}
                </Button>
              ))}
            <button type="button" className="u2-iconbtn" aria-disabled="true" aria-label={`Edit ${u.Name} (next build step)`} title="Edit arrives in the next build step. Use the classic UI for now.">
              ✎
            </button>
            {canLogIn && (
              <button type="button" className="u2-iconbtn" disabled={working} aria-label={`Log in as ${u.Name}`} title="Log in as: use this account exactly as they would, without seeing their password" onClick={() => void impersonate(u)}>
                ⇥
              </button>
            )}
            <RowMenu label={`More actions for ${u.Name}`} items={menuItems(u)} />
          </span>
        );
      },
    };
    const idCol: Column<UserRecord> = { id: "id", header: "ID", width: 80, sortValue: (u) => u.UserID, cell: (u) => <span className="u2-mono">{u.UserID}</span> };
    const nameCol: Column<UserRecord> = {
      id: "name",
      header: "Name",
      width: isStudent ? 100 : undefined,
      sortValue: (u) => u.Name,
      tip: (u) => u.Name,
      cell: (u) => <strong className="u2-strong">{u.Name}</strong>,
    };
    const statusCol: Column<UserRecord> = {
      id: "status",
      header: "Status",
      width: 78,
      sortValue: (u) => u.Status,
      cell: (u) => (
        <Badge kind={statusKind(u.Status)} dot>
          {u.Status}
        </Badge>
      ),
    };
    const usernameCol: Column<UserRecord> = {
      id: "username",
      header: "Username",
      width: 110,
      sortValue: (u) => u.Username ?? "",
      tip: (u) => u.Username,
      cell: (u) => (u.ConvertedToUserID ? <span className="u2-muted">→ {u.ConvertedToUserID}</span> : u.Username ? <span className="u2-mono">{u.Username}</span> : "—"),
    };
    return [idCol, nameCol, statusCol, ...group.columns({ users: all }), ...(isStudent ? [] : [usernameCol]), actions];
    // toggleStatus/resetPassword/impersonate/convert close over stable hooks; busy and eligibility drive the cells.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, all, busy, eligibleOf]);

  const issuedEntries = Object.entries(issued);
  const mobileCard = (u: UserRecord) => (
    <div className="u2-acctcard">
      <div className="u2-acctcard__top">
        <strong className="u2-strong">{u.Name}</strong>
        <Badge kind={statusKind(u.Status)} dot>
          {u.Status}
        </Badge>
      </div>
      <div className="u2-muted u2-mono">{u.UserID}</div>
      {group.id === "students" && (
        <div>
          {[u.Course, u.Batch].filter(Boolean).join(" · ") || "—"} · {u.Email || "no email"}
        </div>
      )}
      <div className="u2-acctcard__actions">
        {u.Username && !u.ConvertedToUserID && u.UserType !== "Management" && (
          <Button size="sm" variant="ghost" loading={busy.has(u.UserID)} onClick={() => void impersonate(u)}>
            Log in as
          </Button>
        )}
        {(u.Status === "Active" || u.Status === "Inactive") && (
          <Button size="sm" variant="ghost" loading={busy.has(u.UserID)} onClick={() => void toggleStatus(u)}>
            {u.Status === "Active" ? "Deactivate" : "Activate"}
          </Button>
        )}
        {u.Username && !u.ConvertedToUserID && (
          <Button size="sm" variant="ghost" onClick={() => setResetTarget(u)}>
            Reset password
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <section className="u2-accounts">
      <h1>Accounts</h1>

      <div className="u2-seg" role="tablist" aria-label="Account type">
        {ACCOUNT_GROUPS.map((g) => (
          <button key={g.id} type="button" role="tab" aria-selected={g.id === group.id} className="u2-seg__btn" onClick={() => void setGroupId(g.id)}>
            {g.label}
            <span className="u2-seg__count">{countByGroup.get(g.id) ?? 0}</span>
          </button>
        ))}
      </div>

      {issuedEntries.length > 0 && (
        <div className="u2-issued" role="status" aria-live="polite">
          <strong>New credentials (shown once, the server keeps only a hash)</strong>
          {issuedEntries.map(([id, c]) => {
            const owner = all.find((u) => u.UserID === id);
            return (
              <div key={id} className="u2-issued__row">
                <span>{owner?.Name ?? id}</span>
                <span className="u2-mono">
                  {c.username} / {c.password}
                </span>
                <CopyButton text={`${c.username} / ${c.password}`} />
                <button type="button" className="u2-linkbtn" onClick={() => forget(id)}>
                  Hide
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="u2-toolbar">
        <input
          type="search"
          className="u2-search"
          placeholder={`Search ${group.title.toLowerCase()}…`}
          aria-label={`Search ${group.title}`}
          value={search}
          onChange={(e) => void setSearch(e.target.value || null)}
        />
        <span className="u2-muted" aria-live="polite">
          {rows.length === groupRows.length ? `${groupRows.length} accounts` : `${rows.length} of ${groupRows.length}`}
        </span>
      </div>

      {error ? (
        <div role="alert" className="u2-errorbox">
          Could not load accounts: {error.message}{" "}
          <Button size="sm" variant="ghost" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <DataTable
          caption={group.title}
          rows={rows}
          columns={columns}
          rowKey={(u) => u.UserID}
          loading={isPending}
          initialSort={{ id: "name", dir: "asc" }}
          emptyText={groupRows.length === 0 ? "None yet." : "No matches."}
          card={mobileCard}
        />
      )}

      <ConfirmDialog
        open={!!resetTarget}
        onOpenChange={(o) => !o && setResetTarget(null)}
        title="Reset password?"
        description={
          <>
            This replaces the password of <strong>{resetTarget?.Name}</strong> with a new generated one. The old password stops working at once. You see the new one once, in the box above the table.
          </>
        }
        confirmLabel="Reset password"
        danger
        onConfirm={async () => {
          if (resetTarget) await resetPassword(resetTarget);
        }}
      />
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Could not copy. Select the text and copy it by hand.");
        }
      }}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
