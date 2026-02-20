import type { NextConfig } from "next";

// Extract Supabase hostname for image remotePatterns
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : "";

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' cdn.discordapp.com ${supabaseHostname} data: blob:`,
      "frame-src calendar.google.com",
      "connect-src 'self' *.supabase.co",
      "font-src 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      ...(supabaseHostname
        ? [{ protocol: "https" as const, hostname: supabaseHostname }]
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
