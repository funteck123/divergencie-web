"use client";

import { toast } from "sonner";
import { Button } from "@/ui2/components/Button";

/** Copies text to the clipboard. Falls back to a hidden textarea where the clipboard API is not allowed (older browsers, plain http). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label={`Copy ${label}`}
      onClick={async () => {
        if (await copyText(text)) toast.success(`Copied ${label}.`);
        else toast.error("Could not copy. Select the text and copy it by hand.");
      }}
    >
      Copy
    </Button>
  );
}
