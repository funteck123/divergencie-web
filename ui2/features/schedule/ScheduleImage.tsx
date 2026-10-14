"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { LinkButton } from "@/ui2/components/Button";
import { Combobox } from "@/ui2/components/Combobox";
import { Field } from "@/ui2/components/Field";
import { batchNames } from "@/lib/adminScheduleEntries";
import { TIMEZONE_GROUPS } from "@/lib/timezones";
import { useServices } from "@/ui2/queries/services";
import { useUsers } from "@/ui2/queries/users";

/** The weekly schedule picture: everyone's sessions (default), one batch with every subject it attends (TKT-0345), or one account's own week, as that person sees it (TKT-0314). */
export function ScheduleImage() {
  const users = useUsers();
  const services = useServices();
  const [userId, setUserId] = useState("");
  const [batch, setBatch] = useState("");
  const [tz, setTz] = useState("");
  const options = useMemo(
    () => [{ value: "", label: "Everyone (admin weekly schedule)" }, ...(users.data ?? []).filter((u) => u.Status !== "Converted").sort((a, b) => a.Name.localeCompare(b.Name)).map((u) => ({ value: u.UserID, label: `${u.Name} (${u.UserType}, ${u.UserID})` }))],
    [users.data],
  );
  const batchOptions = useMemo(() => [{ value: "", label: "All batches" }, ...batchNames(services.data ?? []).map((b) => ({ value: b, label: b }))], [services.data]);
  const tzOptions = useMemo(() => [{ value: "", label: "The batch's own timezone" }, ...TIMEZONE_GROUPS.flatMap((g) => g.options.map((o) => ({ value: o.value, label: o.label })))], []);
  const src = userId ? `/api/schedule/image?userId=${encodeURIComponent(userId)}` : batch ? `/api/schedule/admin-image?batch=${encodeURIComponent(batch)}${tz ? `&tz=${encodeURIComponent(tz)}` : ""}` : "/api/schedule/admin-image";
  const download = `${src}${src.includes("?") ? "&" : "?"}download=1`;
  const name = userId ? (users.data ?? []).find((u) => u.UserID === userId)?.Name ?? userId : batch ? `Batch ${batch}` : "Admin";
  return (
    <div className="u2-rows">
      <Field label="Batch (every subject in it)">
        <Combobox value={batch} onChange={(v) => { setBatch(v); setUserId(""); }} options={batchOptions} />
      </Field>
      {batch && (
        <Field label="Show times in">
          <Combobox value={tz} onChange={setTz} options={tzOptions} />
        </Field>
      )}
      <Field label="Or one account">
        <Combobox value={userId} onChange={(v) => { setUserId(v); setBatch(""); }} options={options} />
      </Field>
      <div className="u2-imagebox">
        {/* unoptimized: the route needs the caller's own session cookie, which the Next image optimizer would not forward. */}
        <Image key={src} src={src} alt={`Weekly schedule: ${name}`} fill style={{ objectFit: "contain" }} unoptimized />
      </div>
      <LinkButton href={download} download={`DC_Schedule_${name.replace(/\W+/g, "_")}.png`}>
        Download PNG
      </LinkButton>
    </div>
  );
}
