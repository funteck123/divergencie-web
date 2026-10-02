"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { IconButton } from "./Button";
import "./Sheet.css";

/**
 * Side panel for one record. The list stays visible behind it, focus is trapped inside, Escape and the close button
 * close it. Full width on a phone. `footer` stays pinned to the bottom so Save is always reachable.
 */
export function Sheet({ open, onOpenChange, title, subtitle, children, footer, wide }: { wide?: boolean; open: boolean; onOpenChange: (open: boolean) => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="u2-portal u2-sheet__overlay" />
        <Dialog.Content className={wide ? "u2-portal u2-sheet u2-sheet--wide" : "u2-portal u2-sheet"} aria-describedby={undefined}>
          <header className="u2-sheet__head">
            <div>
              <Dialog.Title className="u2-sheet__title">{title}</Dialog.Title>
              {subtitle && <p className="u2-sheet__subtitle">{subtitle}</p>}
            </div>
            <Dialog.Close asChild>
              <IconButton variant="ghost" size="sm" label="Close">
                ✕
              </IconButton>
            </Dialog.Close>
          </header>
          <div className="u2-sheet__body">{children}</div>
          {footer && <footer className="u2-sheet__foot">{footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
