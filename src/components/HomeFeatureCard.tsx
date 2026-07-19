import { Card } from "@/components/ui/Card";

type IconName =
  | "cabinet"
  | "symptoms"
  | "calendar"
  | "scan"
  | "travel"
  | "report"
  | "activity";

type FeatureCardProps = {
  href: string;
  title: string;
  meta: string;
  description: string;
  icon: IconName;
};

function FeatureIcon({ name }: { name: IconName }) {
  switch (name) {
    case "cabinet":
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="4"
            y="3"
            width="16"
            height="18"
            rx="2"
            stroke="var(--primary)"
            strokeWidth="1.75"
          />
          <path d="M4 9h16M12 9v12" stroke="var(--primary)" strokeWidth="1.75" />
        </svg>
      );
    case "symptoms":
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="8" stroke="var(--primary)" strokeWidth="1.75" />
          <path
            d="M12 8v5"
            stroke="var(--primary)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <circle cx="12" cy="16.5" r="1.1" fill="var(--primary)" />
        </svg>
      );
    case "calendar":
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="3"
            y="5"
            width="18"
            height="16"
            rx="2"
            stroke="var(--primary)"
            strokeWidth="1.75"
          />
          <path
            d="M3 10h18M8 3v4M16 3v4"
            stroke="var(--primary)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "scan":
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M7 4H5a1 1 0 0 0-1 1v2M17 4h2a1 1 0 0 1 1 1v2M7 20H5a1 1 0 0 1-1-1v-2M17 20h2a1 1 0 0 0 1-1v-2M8 12h8"
            stroke="var(--primary)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "travel":
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1M6 10h12l-.8 9.2A2 2 0 0 1 15.2 21H8.8a2 2 0 0 1-2-1.8L6 10Z"
            stroke="var(--primary)"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M9 13v4M15 13v4"
            stroke="var(--primary)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "report":
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
            stroke="var(--primary)"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M14 3v4h4M9 12h6M9 16h6"
            stroke="var(--primary)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "activity":
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 12h4l2-5 4 10 2-5h4"
            stroke="var(--primary)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

export function HomeFeatureCard({
  href,
  title,
  meta,
  description,
  icon,
}: FeatureCardProps) {
  return (
    <Card href={href} className="flex min-h-[4.75rem] items-center gap-4 p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-cream)]">
        <FeatureIcon name={icon} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="text-sm font-medium text-[var(--primary)]">{meta}</p>
        <p className="mt-0.5 text-sm leading-snug text-[var(--text-secondary)]">
          {description}
        </p>
      </div>
    </Card>
  );
}
