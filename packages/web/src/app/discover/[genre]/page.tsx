import type { Metadata } from "next";
import DiscoverGenrePage from "./discover-genre-page-client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://fondof-api.trustfall.workers.dev";

interface Props {
  params: Promise<{ genre: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { genre } = await params;
  const slug = decodeURIComponent(genre).toLowerCase();
  let label = slug.replace(/-/g, " ");
  let count = 0;

  try {
    const response = await fetch(
      `${API_BASE}/api/skills?genre=${encodeURIComponent(slug)}&limit=1`,
      { next: { revalidate: 300 } },
    );
    if (response.ok) {
      const data = (await response.json()) as {
        skills?: unknown[];
        facets?: { genres?: Array<{ slug: string; label: string }> };
      };
      count = data.skills?.length ?? 0;
      label =
        data.facets?.genres?.find((item) => item.slug === slug)?.label ?? label;
    }
  } catch {
    // The client page can still render if the API is unavailable.
  }

  const title = `${label} skills — fondof`;
  const description = count
    ? `${count} public ${label.toLowerCase()} skill${count === 1 ? "" : "s"}, fitted to real repositories and ranked by transparent evidence.`
    : `Explore public ${label.toLowerCase()} skills fitted to real repositories on fondof.`;

  return {
    title,
    description,
    openGraph: { title, description, url: `https://fondof.netlify.app/discover/${genre}` },
    twitter: { card: "summary", title, description },
  };
}

export default function Page() {
  return <DiscoverGenrePage />;
}
