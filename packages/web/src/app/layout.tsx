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
  metadataBase: new URL("https://fondof.netlify.app"),
  title: "fondof — Skill quality discovery on Monad",
  description:
    "fondof the pod. fond of the blog. Paste what you learn, forge a skill for your repo, publish quality on Monad.",
  openGraph: {
    type: "website",
    siteName: "fondof",
    title: "fondof — Skill quality discovery on Monad",
    description:
      "fondof the pod. fond of the blog. Forge agent skills with verifiable provenance on Monad.",
  },
  twitter: {
    card: "summary_large_image",
    title: "fondof — Skill quality discovery on Monad",
    description:
      "fondof the pod. fond of the blog. Forge agent skills with verifiable provenance on Monad.",
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
        <a
          href="/canvas"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ember focus:px-3 focus:py-2 focus:text-sm focus:text-ink"
        >
          Skip to tool
        </a>
        <Nav />
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
