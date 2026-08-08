import type { Metadata } from "next";
import { Fraunces, Outfit, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
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
  title: "fondof — The bridge between what you learn and what your agents do",
  description:
    "Connect the content you consume with the projects you build. Forge best-in-class skills fitted to your coding environment.",
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
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ember focus:px-3 focus:py-2 focus:text-ink focus:text-sm"
        >
          Skip to content
        </a>
        <Nav />
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
