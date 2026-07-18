// App nav — logo home link + page links (full-width bar; wraps on narrow screens).

import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/", label: "Search" },
  { href: "/cabinet", label: "Cabinet" },
  { href: "/symptoms", label: "Symptoms" },
  { href: "/scan", label: "Scan" },
  { href: "/calendar", label: "Calendar" },
  { href: "/settings", label: "Settings" },
];

export function AppNav() {
  return (
    <nav className="w-full border-b border-[#b7cdc8] bg-[var(--brand-sage)]">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <Link href="/" className="shrink-0" aria-label="Pillio home">
          <Image
            src="/logo.png"
            alt="Pillio"
            width={140}
            height={36}
            style={{ width: "auto", height: 32 }}
            className="h-8 w-auto sm:h-9"
            priority
          />
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
