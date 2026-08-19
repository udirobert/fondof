import type { Metadata } from "next";
import RemixLineagePage from "./remix-lineage-page-client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://fondof-api.trustfall.workers.dev";

interface Props {
  params: Promise<{ hash: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hash } = await params;
  try {
    const response = await fetch(
      `${API_BASE}/api/skills/${encodeURIComponent(hash)}/lineage`,
      { next: { revalidate: 300 } },
    );
    if (response.ok) {
      const data = (await response.json()) as {
        skill?: { title?: string };
        children?: unknown[];
      };
      const title = data.skill?.title ?? "Skill lineage";
      const description = `${data.children?.length ?? 0} public remix${data.children?.length === 1 ? "" : "es"} of ${title}. Explore how ideas were fitted to different repositories.`;
      return {
        title: `${title} remixes — fondof`,
        description,
        openGraph: {
          title: `${title} remixes — fondof`,
          description,
          url: `https://fondof.netlify.app/remix/${hash}`,
        },
        twitter: { card: "summary", title: `${title} remixes — fondof`, description },
      };
    }
  } catch {
    // Client page handles unavailable lineage.
  }

  return {
    title: "Skill lineage — fondof",
    description: "Explore parent skills, remixes, and fitted adaptations on fondof.",
  };
}

export default function Page() {
  return <RemixLineagePage />;
}
