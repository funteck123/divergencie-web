"use client";

import { useState } from "react";
import { fetchTicketImageUrl } from "@/ui2/queries/tickets";
import { Button } from "./Button";
import "./TicketPicture.css";

/** The picture on a ticket. It is only fetched when asked for: the link is private and works for 5 minutes. */
export function TicketPicture({ ticketId, label = "Show picture" }: { ticketId: string; label?: string }) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");

  async function show() {
    setState("loading");
    try {
      setUrl(await fetchTicketImageUrl(ticketId));
      setState("idle");
    } catch {
      setState("failed");
    }
  }

  if (url) {
    return (
      <a className="u2-ticketpic" href={url} target="_blank" rel="noreferrer" title="Open the picture in a new tab">
        {/* eslint-disable-next-line @next/next/no-img-element -- a private, short-lived link: nothing for the image optimiser to cache */}
        <img src={url} alt={`Picture attached to ${ticketId}`} />
      </a>
    );
  }
  return (
    <span className="u2-ticketpic__ask">
      <Button size="sm" variant="secondary" loading={state === "loading"} onClick={() => void show()}>
        {label}
      </Button>
      {state === "failed" && <span role="alert" className="u2-muted">The picture could not be opened.</span>}
    </span>
  );
}
