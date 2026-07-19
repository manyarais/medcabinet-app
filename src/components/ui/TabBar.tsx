"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Tab = {
  href: string;
  label: string;
  icon: (active: boolean) => ReactNode;
};

const stroke = (active: boolean) =>
  active ? "var(--primary)" : "var(--text-secondary)";
const fill = (active: boolean) => (active ? "var(--primary)" : "none");

const tabs: Tab[] = [
  {
    href: "/",
    label: "Home",
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
          fill={fill(active)}
          stroke={stroke(active)}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/cabinet",
    label: "Cabinet",
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
        <rect
          x="4"
          y="3"
          width="16"
          height="18"
          rx="2.5"
          fill={active ? "var(--brand-tint)" : "none"}
          stroke={stroke(active)}
          strokeWidth="1.6"
        />
        <path
          d="M4 9h16M12 9v12"
          stroke={stroke(active)}
          strokeWidth="1.6"
        />
      </svg>
    ),
  },
  {
    href: "/symptoms",
    label: "Symptoms",
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
        <circle
          cx="12"
          cy="12"
          r="8"
          fill={active ? "var(--brand-tint)" : "none"}
          stroke={stroke(active)}
          strokeWidth="1.6"
        />
        <path
          d="M12 8v5"
          stroke={stroke(active)}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="12" cy="16.5" r="1" fill={stroke(active)} />
      </svg>
    ),
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
        <rect
          x="3"
          y="5"
          width="18"
          height="16"
          rx="2.5"
          fill={active ? "var(--brand-tint)" : "none"}
          stroke={stroke(active)}
          strokeWidth="1.6"
        />
        <path
          d="M3 10h18M8 3v4M16 3v4"
          stroke={stroke(active)}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {active && (
          <rect x="7" y="13" width="4" height="4" rx="1" fill="var(--primary)" />
        )}
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
        <circle
          cx="12"
          cy="12"
          r="3.25"
          fill={active ? "var(--primary)" : "none"}
          stroke={stroke(active)}
          strokeWidth="1.6"
        />
        <path
          d="M12 3.5v1.8M12 18.7v1.8M4.9 6.5l1.3 1.3M17.8 16.2l1.3 1.3M3.5 12h1.8M18.7 12h1.8M4.9 17.5l1.3-1.3M17.8 7.8l1.3-1.3"
          stroke={stroke(active)}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      data-tab-bar
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md"
      style={{ paddingBottom: "max(0.4rem, env(safe-area-inset-bottom))" }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5 px-2 pt-1.5">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className="flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 transition duration-150 active:scale-95"
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-2xl transition duration-150 ${
                    active ? "bg-[var(--brand-tint)]" : "bg-transparent"
                  }`}
                >
                  {tab.icon(active)}
                </span>
                <span
                  className={`text-[10px] font-semibold tracking-wide ${
                    active ? "text-[var(--primary)]" : "text-[var(--text-secondary)]"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
