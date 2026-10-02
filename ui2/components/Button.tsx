"use client";

import { forwardRef, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
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
  const blocked = disabled || loading;
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (blocked) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };
  return (
    // aria-description (ARIA 1.3) is valid on every role; the lint rule only knows ARIA 1.2.
    // eslint-disable-next-line jsx-a11y/role-supports-aria-props
    <button
      ref={ref}
      type={type}
      className={clsx(styles.btn, styles[variant], size === "sm" && styles.sm, onDark && styles.onDark, disabled && styles.isDisabled, loading && styles.isLoading, className)}
      aria-disabled={blocked || undefined}
      aria-busy={loading || undefined}
      aria-description={disabled && disabledReason ? disabledReason : undefined}
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
