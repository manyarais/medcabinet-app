type Props = {
  title: string;
  subtitle?: string;
  className?: string;
};

export function PageHeader({ title, subtitle, className = "" }: Props) {
  return (
    <header className={`mb-5 ${className}`}>
      <h1 className="text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[var(--text-primary)]">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          {subtitle}
        </p>
      )}
    </header>
  );
}
