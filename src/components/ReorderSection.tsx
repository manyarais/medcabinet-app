import { InstacartReorderButton } from "@/components/InstacartReorderButton";

type Props = {
  brandName: string;
  dosage?: string | null;
  /** "reorder" for in-cabinet OTC; "need" when searching / not owned yet. */
  mode?: "reorder" | "need";
};

/**
 * Instacart hop for OTC — restock (owned) or pick up when not in cabinet.
 * Parent should only mount for productType === "OTC" (never Rx).
 */
export function ReorderSection({
  brandName,
  dosage,
  mode = "reorder",
}: Props) {
  const heading = mode === "need" ? "Need it?" : "Reorder";
  const label =
    mode === "need" ? "Find on Instacart" : "Reorder on Instacart";

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-soft)]">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
        {heading}
      </h2>
      <InstacartReorderButton
        brandName={brandName}
        dosage={dosage}
        label={label}
      />
      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
        Opens Instacart — Pillio doesn&apos;t sell or recommend products.
      </p>
    </section>
  );
}
