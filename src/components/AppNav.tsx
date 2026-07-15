// App nav — Search, Cabinet, Symptoms (Phase 2+).

import Link from "next/link";

const links = [
  { href: "/", label: "Search" },
  { href: "/cabinet", label: "Cabinet" },
  { href: "/symptoms", label: "Symptoms" },
];

export function AppNav() {
  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-lg items-center gap-4 px-4 py-3">
        <span className="text-sm font-semibold text-teal-800">MedCabinet</span>
        <ul className="flex gap-3 text-sm">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-zinc-700 hover:text-zinc-900 hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
