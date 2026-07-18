import Link from "next/link";

type FeatureCardProps = {
  href: string;
  title: string;
  meta: string;
  description: string;
};

export function HomeFeatureCard({ href, title, meta, description }: FeatureCardProps) {
  return (
    <Link
      href={href}
      className="flex min-h-[7.5rem] flex-col justify-between rounded-lg border border-zinc-200 bg-white px-3.5 py-3.5 transition-colors hover:border-[var(--brand-sage-deep)]"
    >
      <div>
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        <p className="mt-0.5 text-xs font-medium text-[var(--brand-sage-deep)]">{meta}</p>
      </div>
      <p className="mt-3 text-xs leading-snug text-zinc-500">{description}</p>
    </Link>
  );
}
