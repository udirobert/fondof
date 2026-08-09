import type { Metadata } from "next";
import SourcePage from "./source-page-client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://fondof-api.trustfall.workers.dev";

interface Props {
  params: Promise<{ source: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { source } = await params;
  const domain = decodeURIComponent(source);

  // Fetch skill count for richer metadata
  try {
    const res = await fetch(`${API_BASE}/api/sources/${encodeURIComponent(domain)}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = (await res.json()) as { count?: number };
      const count = data.count || 0;
      const description =
        count > 0
          ? `${count} coding skill${count === 1 ? "" : "s"} forged by developers from ${domain}`
          : `Skills forged from ${domain} — turn content into coding skills with fondof`;
      return {
        title: `Forged from ${domain} — fondof`,
        description,
        openGraph: {
          title: `Forged from ${domain} — fondof`,
          description,
          url: `https://fondof.netlify.app/from/${source}`,
        },
        twitter: {
          card: "summary",
          title: `Forged from ${domain} — fondof`,
          description,
        },
      };
    }
  } catch {
    // Fall through
  }

  return {
    title: `Forged from ${domain} — fondof`,
    description: `Skills forged from ${domain} — turn content into coding skills with fondof`,
  };
}

export default function Page() {
  return <SourcePage />;
}
