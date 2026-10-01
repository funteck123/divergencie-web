"use client";

import { forwardRef, useId, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { clsx } from "clsx";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  /** Shows a spinner, keeps the width, blocks clicks, sets aria-busy. */
  loading?: boolean;
  /** A disabled button must say why: the reason shows as a tooltip and is read to screen readers. */
  disabled?: boolean;
  disabledReason?: string;
  /** Sits on a navy surface (white focus ring and outline). */
  onDark?: boolean;
  /** Gallery only: draw the hover or focus state. */
  forceState?: "hover" | "focus";
  icon?: ReactNode;
}

/**
 * The one button of the new UI. Variants: primary (gold, navy text), secondary (navy), ghost (outline), danger.
 * Disabled uses aria-disabled so the button stays focusable and can explain itself.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, disabled = false, disabledReason, onDark = false, forceState, icon, className, children, onClick, type = "button", ...rest },
  ref,
) {
  const reasonId = useId();
  const blocked = disabled || loading;
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (blocked) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(styles.btn, styles[variant], size === "sm" && styles.sm, onDark && styles.onDark, disabled && styles.isDisabled, loading && styles.isLoading, className)}
      aria-disabled={blocked || undefined}
      aria-busy={loading || undefined}
      aria-describedby={disabled && disabledReason ? reasonId : undefined}
      title={disabled && disabledReason ? disabledReason : rest.title}
      data-force={forceState}
      onClick={handleClick}
      {...rest}
    >
      <span className={styles.label}>
        {icon}
        {children}
      </span>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {disabled && disabledReason && (
        <span id={reasonId} className="u2-visually-hidden">
          {disabledReason}
        </span>
      )}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonProps, "children" | "icon"> {
  /** Required: the accessible name, also shown as the tooltip. */
  label: string;
  children: ReactNode;
}

/** Square icon-only button. The label is mandatory so an icon never goes unnamed. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ label, children, className, ...rest }, ref) {
  return (
    <Button ref={ref} aria-label={label} title={label} className={clsx(styles.iconOnly, className)} {...rest}>
      {children}
    </Button>
  );
});
