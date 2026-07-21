"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import { useState } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all duration-200 outline-none",
        "focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "px-2.5 py-1 text-xs",
        size === "md" && "px-3.5 py-2 text-sm",
        size === "lg" && "px-5 py-2.5 text-sm",
        variant === "primary" &&
          "bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:-translate-y-px hover:bg-brand-500 hover:shadow-md hover:shadow-brand-600/30 active:translate-y-0 active:scale-[0.98]",
        variant === "secondary" &&
          "surface-2 border border-[var(--border)] text-[var(--text)] hover:border-brand-400/60 active:scale-[0.98]",
        variant === "ghost" &&
          "bg-transparent text-muted hover:surface-2 hover:text-[var(--text)]",
        variant === "outline" &&
          "border border-brand-500/40 text-brand-600 hover:bg-brand-500/10 active:scale-[0.98]",
        variant === "danger" &&
          "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white active:scale-[0.98]",
        className,
      )}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "inline-block size-4 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500",
        className,
      )}
      role="status"
      aria-label="加载中"
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} aria-hidden />;
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-xl border border-[var(--border)] surface px-3.5 py-2.5 text-sm text-[var(--text)]",
        "placeholder:text-muted outline-none transition",
        "focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-5.5 w-10 shrink-0 items-center rounded-full transition-colors duration-200 outline-none",
        "focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:pointer-events-none disabled:opacity-50",
        checked ? "bg-brand-600" : "bg-[color-mix(in_oklab,var(--text-muted)_35%,transparent)]",
      )}
    >
      <span
        className={clsx(
          "inline-block size-4 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-5.5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={clsx(
        "surface rounded-2xl border border-[var(--border)] shadow-lg shadow-black/[0.04]",
        padded && "p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "green" | "amber" | "red";
  dot?: boolean;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tone === "neutral" && "surface-2 text-muted ring-[var(--border)]",
        tone === "brand" && "bg-brand-500/10 text-brand-600 ring-brand-500/20",
        tone === "green" &&
          "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
        tone === "amber" && "bg-amber-500/10 text-amber-600 ring-amber-500/20",
        tone === "red" && "bg-red-500/10 text-red-500 ring-red-500/20",
      )}
    >
      {dot && (
        <span
          className={clsx(
            "size-1.5 rounded-full",
            tone === "green" && "bg-emerald-500",
            tone === "amber" && "bg-amber-500",
            tone === "red" && "bg-red-500",
            tone === "brand" && "bg-brand-500",
            tone === "neutral" && "bg-[var(--text-muted)]",
          )}
        />
      )}
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  badges,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  badges?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="page-title text-[var(--text)]">{title}</h1>
          {badges}
        </div>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center gap-2 px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-2 grid size-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-medium text-[var(--text)]">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm leading-6 text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-500">
      {children}
    </p>
  );
}

export function AppDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" />
        <Dialog.Content
          className={clsx(
            "dialog-content fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-full -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
            "glass-pill rounded-3xl p-7 shadow-2xl focus:outline-none",
            wide ? "max-w-lg" : "max-w-md",
          )}
        >
          <Dialog.Title className="text-lg font-semibold tracking-tight">
            {title}
          </Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-1.5 text-sm leading-6 text-muted">
              {description}
            </Dialog.Description>
          ) : null}
          <div className="mt-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CopyIcon({ done }: { done: boolean }) {
  return done ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="9"
        y="9"
        width="11"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M5 15V5a2 2 0 012-2h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CopyButton({
  value,
  label = "复制",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        });
      }}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
        "text-muted transition hover:surface-2 hover:text-[var(--text)]",
        className,
      )}
    >
      <CopyIcon done={done} />
      {done ? "已复制" : label}
    </button>
  );
}

export function CodeBlock({
  code,
  lang,
}: {
  code: string;
  lang?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--border)] surface-2">
      {lang ? (
        <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-1.5">
          <span className="text-xs font-medium text-muted">{lang}</span>
          <CopyButton value={code} />
        </div>
      ) : (
        <div className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100">
          <CopyButton value={code} />
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code className="font-mono text-[var(--text)]">{code}</code>
      </pre>
    </div>
  );
}
