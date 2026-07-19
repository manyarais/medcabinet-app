import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className = "" }: Props) {
  return (
    <div
      className={`flex flex-col items-center rounded-2xl bg-[var(--accent-cream)] px-6 py-10 text-center ${className}`}
    >
      <div
        aria-hidden
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-tint)]"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" fill="var(--primary)" />
          <circle cx="12" cy="12" r="8" stroke="var(--primary)" strokeWidth="1.5" opacity="0.45" />
        </svg>
      </div>
      <p className="text-base font-semibold text-[var(--text-primary)]">{title}</p>
      {description && (
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
