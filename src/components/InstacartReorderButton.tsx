"use client";

import { buildReorderQuery, instacartWebSearchUrl } from "@/lib/retailerSearch";
import { useState, type MouseEvent } from "react";

type Props = {
  brandName: string;
  dosage?: string | null;
  /** Button label — e.g. "Reorder on Instacart" vs "Find on Instacart". */
  label?: string;
  /** Compact control for search result rows. */
  compact?: boolean;
};

/**
 * Opens Instacart for an OTC product.
 * Prefers shopping-list API when INSTACART_API_KEY is set; otherwise web search.
 */
export function InstacartReorderButton({
  brandName,
  dosage,
  label = "Find on Instacart",
  compact = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemName = buildReorderQuery(brandName, dosage);

  async function handleClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setError(null);
    if (!itemName.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/reorder/instacart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ name: itemName, quantity: 1 }],
          title: "Pillio restock",
        }),
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (response.ok && data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
        return;
      }

      // No API key / API down — hop to Instacart search instead of failing.
      if (response.status === 503 || response.status === 404) {
        window.open(instacartWebSearchUrl(itemName), "_blank", "noopener,noreferrer");
        return;
      }

      setError(data.error ?? "Could not open Instacart.");
    } catch {
      window.open(instacartWebSearchUrl(itemName), "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  }

  const className = compact
    ? "inline-flex min-h-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-primary)] shadow-[var(--shadow-soft)] transition duration-150 ease-out active:scale-[0.98] active:bg-[var(--surface-tint)] disabled:opacity-50"
    : "inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-primary)] shadow-[var(--shadow-soft)] transition duration-150 ease-out active:scale-[0.98] active:bg-[var(--surface-tint)] disabled:opacity-50";

  return (
    <div className={compact ? "flex shrink-0 flex-col items-end gap-1" : "flex flex-col gap-1.5"}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !itemName.trim()}
        className={className}
      >
        {loading ? "Opening…" : label}
      </button>
      {error && (
        <p className="text-xs text-[var(--danger-text)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
