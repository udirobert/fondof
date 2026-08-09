import type { Metadata } from "next";
import { Fraunces, Outfit, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import { Providers } from "@/components/providers";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fondof.netlify.app"),
  title: "fondof — Forge fitted skills from what you learn",
  description:
    "Paste a podcast, blog, or need. Get a short skill fitted to your repo. Hand it to any coding agent.",
  openGraph: {
    type: "website",
    siteName: "fondof",
    title: "fondof — Forge fitted skills from what you learn",
    description:
      "Turn what you learn into a coding skill fitted to your repo. Works with Kiro, Claude, and Cursor.",
  },
  twitter: {
    card: "summary_large_image",
    title: "fondof — Forge fitted skills from what you learn",
    description:
      "Turn what you learn into a coding skill fitted to your repo. Works with Kiro, Claude, and Cursor.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${fraunces.variable} ${geistMono.variable} antialiased grain vignette`}
      >
        <Providers>
          <a
            href="/canvas"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ember focus:px-3 focus:py-2 focus:text-sm focus:text-ink"
          >
            Skip to tool
          </a>
          <Nav />
          <main id="main">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
