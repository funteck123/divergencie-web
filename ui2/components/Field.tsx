"use client";

import { createContext, useContext, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { clsx } from "clsx";
import "./Field.css";

interface FieldCtx {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
}
const FieldContext = createContext<FieldCtx | null>(null);

/** The id and aria wiring of the surrounding Field, for controls that are not a plain input (for example the Combobox trigger). */
export function useFieldControl(): { id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean } {
  const c = useContext(FieldContext);
  return c ? { id: c.id, "aria-describedby": c.describedBy, "aria-invalid": c.invalid || undefined } : {};
}

/**
 * A control with a caption that is always visible (a placeholder disappears once the field has a value).
 * The label, hint and error are wired to the first control inside through context, so a screen reader reads them with it,
 * even when the control sits inside a row with a button next to it.
 */
export function Field({ label, hint, error, children, wide }: { label: string; hint?: string; error?: string; children: ReactNode; wide?: boolean }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint ? hintId : "", error ? errId : ""].filter(Boolean).join(" ") || undefined;
  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: !!error }}>
      <div className={clsx("u2-field", wide && "u2-field--wide")}>
        <label htmlFor={id} className="u2-field__label">
          {label}
        </label>
        {children}
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
    </FieldContext.Provider>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...useFieldControl()} {...props} className={clsx("u2-input", props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...useFieldControl()} {...props} className={clsx("u2-input u2-input--area", props.className)} />;
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
