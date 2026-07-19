import Link from "next/link";
import type { ReactNode } from "react";

type BaseProps = {
  children: ReactNode;
  className?: string;
  /** Soft sage fill instead of pure white */
  tinted?: boolean;
  /** Use raised elevation (active/popover feel) */
  raised?: boolean;
};

type StaticCardProps = BaseProps & {
  href?: undefined;
  onClick?: undefined;
};

type LinkCardProps = BaseProps & {
  href: string;
  onClick?: undefined;
};

type ButtonCardProps = BaseProps & {
  href?: undefined;
  onClick: () => void;
};

type Props = StaticCardProps | LinkCardProps | ButtonCardProps;

export function Card(props: Props) {
  const { children, className = "", tinted = false, raised = false } = props;
  const elevation = raised ? "shadow-[var(--shadow-raised)]" : "shadow-[var(--shadow-soft)]";
  const base = `block w-full rounded-2xl border border-[var(--border)]/60 p-4 ${elevation} transition duration-150 ease-out ${
    tinted ? "bg-[var(--surface-tint)]" : "bg-[var(--surface)]"
  }`;
  const tappable =
    "active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]";

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={`${base} ${tappable} ${className}`}>
        {children}
      </Link>
    );
  }

  if ("onClick" in props && props.onClick) {
    return (
      <button
        type="button"
        onClick={props.onClick}
        className={`${base} ${tappable} cursor-pointer text-left ${className}`}
      >
        {children}
      </button>
    );
  }

  return <div className={`${base} ${className}`}>{children}</div>;
}
