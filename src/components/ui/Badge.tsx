type Tone = "otc" | "rx" | "out" | "pending";

/** Pale bg + dark text pairs only (never solid loud fills). */
const styles: Record<Tone, string> = {
  otc: "bg-[var(--otc-bg)] text-[var(--otc-text)]",
  rx: "bg-[var(--rx-bg)] text-[var(--rx-text)]",
  out: "bg-[var(--warning-bg)] text-[var(--warning-text)]",
  pending: "bg-[var(--warning-bg)] text-[var(--warning-text)]",
};

const labels: Record<Tone, string> = {
  otc: "OTC",
  rx: "Rx",
  out: "OUT",
  pending: "Pending",
};

type Props = {
  tone: Tone;
  children?: string;
  className?: string;
};

export function Badge({ tone, children, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${styles[tone]} ${className}`}
    >
      {children ?? labels[tone]}
    </span>
  );
}
