import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "destructive" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--primary)] text-[var(--text-on-primary)] active:bg-[var(--primary-pressed)] disabled:opacity-50",
  secondary:
    "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] active:bg-[var(--surface-tint)] disabled:opacity-50",
  destructive:
    "bg-[var(--danger)] text-[var(--text-on-primary)] active:opacity-90 disabled:opacity-50",
  ghost:
    "bg-transparent text-[var(--primary)] active:bg-[var(--brand-tint)] disabled:opacity-50",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition duration-150 ease-out active:scale-[0.98] ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
