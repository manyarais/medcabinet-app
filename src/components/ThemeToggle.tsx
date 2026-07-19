"use client";

import { useTheme, type ThemePreference } from "@/components/ThemeProvider";

const OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="rounded-2xl bg-[var(--surface)] px-4 py-4 shadow-sm shadow-black/[0.04]">
      <p className="text-sm font-semibold text-[var(--text-primary)]">Appearance</p>
      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
        Light, dark, or match your device.
      </p>
      <div
        className="mt-3 grid grid-cols-3 gap-1.5 rounded-full bg-[var(--surface-tint)] p-1"
        role="group"
        aria-label="Theme"
      >
        {OPTIONS.map((opt) => {
          const active = preference === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPreference(opt.value)}
              className={`min-h-9 rounded-full text-xs font-semibold transition duration-150 active:scale-95 ${
                active
                  ? "bg-[var(--primary)] text-[var(--text-on-primary)] shadow-sm"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
