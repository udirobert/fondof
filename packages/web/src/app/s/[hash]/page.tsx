import type { Metadata } from "next";
import SkillPublicPage from "./skill-page-client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://fondof-api.trustfall.workers.dev";

interface Props {
  params: Promise<{ hash: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hash } = await params;

  // Try to fetch skill title/blurb from the API for rich metadata
  try {
    const res = await fetch(`${API_BASE}/api/skills/${hash}`, {
      next: { revalidate: 300 }, // cache 5 min
    });
    if (res.ok) {
      const data = (await res.json()) as {
        title?: string;
        blurb?: string;
        repo?: string;
      };
      if (data.title) {
        const description =
          data.blurb ||
          `A coding skill forged with fondof${data.repo ? ` · fitted for ${data.repo}` : ""}`;
        return {
          title: `${data.title} — fondof`,
          description,
          openGraph: {
            title: `${data.title} — fondof`,
            description,
            url: `https://fondof.netlify.app/s/${hash}`,
          },
          twitter: {
            card: "summary",
            title: `${data.title} — fondof`,
            description,
          },
        };
      }
    }
  } catch {
    // Fall through to default
  }

  return {
    title: `Skill — fondof`,
    description: "A coding skill forged with fondof. Copy it into any agent.",
    openGraph: {
      title: "Skill — fondof",
      description: "A coding skill forged with fondof. Copy it into any agent.",
      url: `https://fondof.netlify.app/s/${hash}`,
    },
  };
}

export default function Page() {
  return <SkillPublicPage />;
}
