// OTC / Rx badge — pale bg + dark text (design tokens).

import type { ProductType } from "@/lib/types";

export function ProductTypeBadge({ productType }: { productType: ProductType | string }) {
  const isOtc = productType === "OTC";
  const isRx = productType === "PRESCRIPTION";

  const label = isOtc ? "OTC" : isRx ? "Rx" : productType;
  const className = isOtc
    ? "bg-[var(--otc-bg)] text-[var(--otc-text)]"
    : isRx
      ? "bg-[var(--rx-bg)] text-[var(--rx-text)]"
      : "bg-[var(--surface-tint)] text-[var(--text-secondary)]";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}
