"use client";

import { useEffect, useRef } from "react";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";

/** Focus-trapping, escape-dismissible dialog used by every RBAC editor. */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          "max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-border bg-white shadow-lift",
          wide ? "max-w-2xl" : "max-w-lg",
        )}
      >
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-border bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close"
            className="text-ink-muted hover:text-ink"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:bg-bg-soft disabled:text-ink-muted";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-ink transition-colors hover:bg-bg-soft disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex h-10 items-center gap-2 rounded-xl bg-warn px-4 text-sm font-medium text-white shadow-lift transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-ink-soft">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      <span className="ml-3 text-sm">{label}</span>
    </div>
  );
}

/** Small confirm dialog for destructive RBAC actions. */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <ErrorNote message={error ?? null} />
      <div className="text-sm text-ink-soft">{body}</div>
      <div className="mt-6 flex justify-end gap-3">
        <GhostButton type="button" onClick={onClose}>
          Cancel
        </GhostButton>
        <DangerButton type="button" onClick={onConfirm} disabled={pending}>
          {pending ? "Working…" : confirmLabel}
        </DangerButton>
      </div>
    </Modal>
  );
}
