import type { NextConfig } from "next";

const defaultHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), tools=(self)",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Link",
    value: '<https://fondof.netlify.app/.well-known/webmcp>; rel="webmcp"',
  },
];

const wellKnownHeaders = [
  {
    key: "Content-Type",
    value: "application/json; charset=utf-8",
  },
  {
    key: "Access-Control-Allow-Origin",
    value: "*",
  },
  {
    key: "Cache-Control",
    value: "public, max-age=0, must-revalidate",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: defaultHeaders,
      },
      {
        source: "/.well-known/:path*",
        headers: wellKnownHeaders,
      },
    ];
  },
};

export default nextConfig;
