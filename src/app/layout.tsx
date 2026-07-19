import { AppShell } from "@/components/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pillio",
  description:
    "Pillio — smart medicine cabinet companion. Search medications and manage your cabinet.",
  applicationName: "Pillio",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F5F0" },
    { media: "(prefers-color-scheme: dark)", color: "#141715" },
  ],
  appleWebApp: {
    capable: true,
    title: "Pillio",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon.png?v=capsule", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png?v=capsule", sizes: "180x180", type: "image/png" }],
  },
};

const themeBootScript = `(function(){try{var t=localStorage.getItem("pillio-theme");var sys=window.matchMedia("(prefers-color-scheme: dark)").matches;var dark=t==="dark"||((t==null||t==="system")&&sys);var light=t==="light";var root=document.documentElement;root.classList.toggle("dark",dark);root.classList.toggle("light",light);root.style.colorScheme=dark?"dark":"light";var color=dark?"#141715":"#F7F5F0";var meta=document.querySelector('meta[name="theme-color"]');if(!meta){meta=document.createElement("meta");meta.setAttribute("name","theme-color");document.head.appendChild(meta);}meta.setAttribute("content",color);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-[var(--background)] text-[var(--text-primary)]">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
