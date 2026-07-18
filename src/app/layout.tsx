import { AppNav } from "@/components/AppNav";
import { DueDosesBanner } from "@/components/DueDosesBanner";
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
  description: "Pillio — smart medicine cabinet companion. Search medications and manage your cabinet.",
  applicationName: "Pillio",
  appleWebApp: {
    capable: true,
    title: "Pillio",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/app-icon.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-stone-50 text-zinc-900">
        <AppNav />
        <DueDosesBanner />
        {children}
      </body>
    </html>
  );
}
