"use client";

import { cloneElement, isValidElement, useId, type InputHTMLAttributes, type ReactElement, type ReactNode, type TextareaHTMLAttributes } from "react";
import { clsx } from "clsx";
import "./Field.css";

/**
 * A control with a caption that is always visible (a placeholder disappears once the field has a value).
 * The label, hint and error are wired to the control with ids, so a screen reader reads them with it.
 */
export function Field({ label, hint, error, children, wide }: { label: string; hint?: string; error?: string; children: ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>; wide?: boolean }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint ? hintId : "", error ? errId : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={clsx("u2-field", wide && "u2-field--wide")}>
      <label htmlFor={id} className="u2-field__label">
        {label}
      </label>
      {isValidElement(children) ? cloneElement(children, { id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined }) : children}
      {hint && (
        <p id={hintId} className="u2-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="u2-field__error">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx("u2-input", props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={clsx("u2-input u2-input--area", props.className)} />;
}

export function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="u2-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function FieldGroup({ children, legend }: { children: ReactNode; legend?: string }) {
  return (
    <fieldset className="u2-fieldgroup">
      {legend && <legend className="u2-fieldgroup__legend">{legend}</legend>}
      {children}
    </fieldset>
  );
}
