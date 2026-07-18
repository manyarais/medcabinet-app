// App nav — logo home link + Search / Cabinet / Symptoms.

import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/", label: "Search" },
  { href: "/cabinet", label: "Cabinet" },
  { href: "/symptoms", label: "Symptoms" },
  { href: "/scan", label: "Scan" },
];

export function AppNav() {
  return (
    <nav className="border-b border-[#b7cdc8] bg-[var(--brand-sage)]">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-4 px-4 py-2.5">
        <Link href="/" className="shrink-0" aria-label="Pillio home">
          <Image
            src="/logo.png"
            alt="Pillio"
            width={140}
            height={36}
            style={{ width: "auto", height: 36 }}
            className="h-9 w-auto"
            priority
          />
        </Link>
        <ul className="flex gap-3 text-sm">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="font-medium text-zinc-900 hover:underline"
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
