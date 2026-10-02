"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import { clsx } from "clsx";
import "./RowMenu.css";

export interface RowMenuItem {
  label: string;
  onSelect?: () => void;
  /** Renders a link (for downloads and navigation) instead of a button. */
  href?: string;
  download?: string;
  disabled?: boolean;
  /** Shown as the tooltip and read out when the item is disabled. */
  disabledReason?: string;
  danger?: boolean;
}

/** The "more" menu of a row: keyboard operable, closes on Escape, focus returns to the trigger. */
export function RowMenu({ label, items, trigger = "⋯" }: { label: string; items: readonly RowMenuItem[]; trigger?: ReactNode }) {
  return (
    <Menu.Root>
      <Menu.Trigger className="u2-iconbtn" aria-label={label} title={label}>
        {trigger}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className="u2-portal u2-menu" align="end" sideOffset={4}>
          {items.map((it) => {
            const cls = clsx("u2-menu__item", it.danger && "u2-menu__item--danger");
            const title = it.disabled ? it.disabledReason : undefined;
            if (it.href && !it.disabled)
              return (
                <Menu.Item key={it.label} asChild>
                  <a className={cls} href={it.href} download={it.download}>
                    {it.label}
                  </a>
                </Menu.Item>
              );
            return (
              <Menu.Item key={it.label} className={cls} disabled={it.disabled} title={title} onSelect={() => it.onSelect?.()}>
                {it.label}
                {it.disabled && it.disabledReason && <span className="u2-visually-hidden"> ({it.disabledReason})</span>}
              </Menu.Item>
            );
          })}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
