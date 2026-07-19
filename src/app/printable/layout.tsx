/** Nested under root layout — keep chrome-free via AppShell pathname check. */
export default function PrintableSegmentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
