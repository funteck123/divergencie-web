"use client";

import React, { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-primary)] text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] transition-all placeholder:text-[var(--text-muted)] placeholder:opacity-50 text-[var(--text-primary)] ${
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="text-[10px] font-semibold text-red-500 tracking-wide mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-primary)] text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] transition-all text-[var(--text-primary)] ${
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-[10px] font-semibold text-red-500 tracking-wide mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-primary)] text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] transition-all placeholder:text-[var(--text-muted)] placeholder:opacity-50 text-[var(--text-primary)] min-h-[100px] ${
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="text-[10px] font-semibold text-red-500 tracking-wide mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            ref={ref}
            type="checkbox"
            className={`h-4.5 w-4.5 rounded border border-[var(--border-subtle)] text-[var(--gold)] focus:ring-[var(--gold)] bg-white dark:bg-[var(--bg-primary)] transition-all ${
              error ? "border-red-500" : ""
            } ${className}`}
            {...props}
          />
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {label}
          </span>
        </label>
        {error && (
          <p className="text-[10px] font-semibold text-red-500 tracking-wide mt-0.5">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";
