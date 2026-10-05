"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { LinkButton } from "@/ui2/components/Button";
import { Combobox } from "@/ui2/components/Combobox";
import { Field } from "@/ui2/components/Field";
import { useUsers } from "@/ui2/queries/users";

/** The weekly schedule picture: everyone's sessions (default) or one account's own week, as that person sees it (TKT-0314). */
export function ScheduleImage() {
  const users = useUsers();
  const [userId, setUserId] = useState("");
  const options = useMemo(
    () => [{ value: "", label: "Everyone (admin weekly schedule)" }, ...(users.data ?? []).filter((u) => u.Status !== "Converted").sort((a, b) => a.Name.localeCompare(b.Name)).map((u) => ({ value: u.UserID, label: `${u.Name} (${u.UserType}, ${u.UserID})` }))],
    [users.data],
  );
  const src = userId ? `/api/schedule/image?userId=${encodeURIComponent(userId)}` : "/api/schedule/admin-image";
  const download = `${src}${src.includes("?") ? "&" : "?"}download=1`;
  const name = userId ? (users.data ?? []).find((u) => u.UserID === userId)?.Name ?? userId : "Admin";
  return (
    <div className="u2-rows">
      <Field label="Show the schedule of">
        <Combobox value={userId} onChange={setUserId} options={options} />
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
