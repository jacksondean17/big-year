import type { Metadata, Viewport } from "next";
import { Fraunces, Spectral, JetBrains_Mono } from "next/font/google";
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
  title: "Big Year Challenges",
  description: "A year of meaningful challenges",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Big Year",
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
          <div className="header-inner mx-auto max-w-5xl px-4 py-4">
            <a href="/" className="brand text-xl tracking-tight">
              Big Year
            </a>
          </div>
        </header>
        <main className="content-wrap mx-auto max-w-5xl px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
