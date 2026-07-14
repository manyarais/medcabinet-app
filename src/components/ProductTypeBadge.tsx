// Small OTC / Rx badge used on search results and detail pages.

import type { ProductType } from "@/lib/types";

export function ProductTypeBadge({ productType }: { productType: ProductType | string }) {
  const isOtc = productType === "OTC";
  const isRx = productType === "PRESCRIPTION";

  const label = isOtc ? "OTC" : isRx ? "Rx" : productType;
  const className = isOtc
    ? "bg-teal-100 text-teal-900"
    : isRx
      ? "bg-amber-100 text-amber-900"
      : "bg-zinc-100 text-zinc-700";

  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}
