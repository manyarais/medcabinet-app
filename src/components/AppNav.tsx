// App nav — logo home link + page links (full-width bar; wraps on narrow screens).

import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/", label: "Search" },
  { href: "/cabinet", label: "Cabinet" },
  { href: "/symptoms", label: "Symptoms" },
  { href: "/scan", label: "Scan" },
  { href: "/assistant", label: "Assistant" },
  { href: "/calendar", label: "Calendar" },
  { href: "/alerts", label: "Alerts" },
  { href: "/expiry", label: "Expiry" },
  { href: "/travel", label: "Travel" },
  { href: "/report", label: "Report" },
  { href: "/settings", label: "Settings" },
];

export function AppNav() {
  return (
    <nav className="w-full border-b border-[#b7cdc8] bg-[var(--brand-sage)]">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <Link href="/" className="inline-flex shrink-0 items-center gap-2" aria-label="Pillio home">
          <Image
            src="/icon.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-cover"
            priority
          />
          <span className="text-base font-semibold tracking-tight text-zinc-900">Pillio</span>
        </Link>
        <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          {links.map((link) => (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                className="inline-block font-medium text-zinc-900 hover:underline"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
