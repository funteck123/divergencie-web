"use client";

import { useMemo } from "react";
import { Combobox, type ComboOption } from "./Combobox";
import { Field, FieldGroup, TextInput } from "./Field";

export interface PersonOption {
  id: string;
  name: string;
  /** Shown after the name, e.g. the account type. */
  suffix?: string;
}

/**
 * A person that is either linked to a real account (the name follows the account) or typed as free text (a guest with no
 * account). Choosing the empty option unlinks and clears the name, the same rule as the classic Referrer and Facilitator inputs.
 */
export function PersonLink({ legend, linkLabel = "Linked account", nameLabel, people, name, userId, onChange }: { legend?: string; linkLabel?: string; nameLabel: string; people: readonly PersonOption[]; name: string; userId: string; onChange: (name: string, userId: string) => void }) {
  const options: ComboOption[] = useMemo(() => people.map((p) => ({ value: p.id, label: p.suffix ? `${p.name} (${p.suffix})` : p.name })), [people]);
  const body = (
    <>
      <Field label={linkLabel}>
        <Combobox
          value={userId}
          placeholder="Not linked (type a name below)"
          options={options}
          onChange={(id) => {
            const picked = people.find((p) => p.id === id);
            onChange(picked?.name ?? "", picked?.id ?? "");
          }}
        />
      </Field>
      <Field label={nameLabel} hint={userId ? "Follows the linked account." : undefined}>
        <TextInput value={name} disabled={!!userId} onChange={(e) => onChange(e.target.value, "")} />
      </Field>
    </>
  );
  return legend ? <FieldGroup legend={legend}>{body}</FieldGroup> : body;
}
