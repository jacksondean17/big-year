import type { Metadata, Viewport } from "next";
import { Fraunces, Spectral, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { MobileNav } from "@/components/mobile-nav";
import "./globals.css";

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const bodyFont = Spectral({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "The Big Year Challenges",
  description: "A year of meaningful challenges",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "The Big Year",
  },
};

export const viewport: Viewport = {
  themeColor: "#f8f1e6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} art-body antialiased`}
      >
        <div className="filigree-layer" aria-hidden="true" />
        <header className="site-header">
          <div className="header-inner mx-auto max-w-5xl px-4 py-4 min-w-0">
            <Link href="/" className="brand text-xl tracking-tight shrink-0">
              The Big Year
            </Link>
            <nav className="hidden md:flex items-center gap-3 overflow-x-auto min-w-0">
              <a
                href="https://docs.google.com/document/d/143Nhx7JKWc2l0QVy8OtCkHPzdZ82VM8NJQ61VgzJtJ4/edit?tab=t.0"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                Guide
              </a>
              <span className="text-border shrink-0">|</span>
              <Link
                href="/schedule"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                Schedule
              </Link>
              <span className="text-border shrink-0">|</span>
              <Link
                href="/users"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                Users
              </Link>
              <span className="text-border shrink-0">|</span>
              <Link
                href="/leaderboard"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                Leaderboard
              </Link>
              <span className="text-border shrink-0">|</span>
              <Link
                href="/point-judge"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                Point Judge
              </Link>
              <AuthButton />
            </nav>
            <MobileNav />
          </div>
        </header>
        <main className="content-wrap mx-auto max-w-5xl px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
