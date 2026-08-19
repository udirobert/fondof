import { ImageResponse } from "next/og";
import { OgCard } from "@/lib/og-card";

export const alt = "fondof public coding skill";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://fondof-api.trustfall.workers.dev";

export default async function Image({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  let title = "A fitted coding skill";
  let subtitle = "Copy a skill forged for a real repository into your agent.";
  const stats: string[] = [];

  try {
    const response = await fetch(
      `${API_BASE}/api/skills/${encodeURIComponent(hash)}`,
      { next: { revalidate: 300 } },
    );
    if (response.ok) {
      const data = (await response.json()) as {
        title?: string;
        blurb?: string;
        repo?: string;
        genres?: Array<{ label: string }>;
        evidenceSummary?: {
          evidenceScore?: number;
          claimedUseCount?: number;
          outcomeCount?: number;
        };
      };
      title = data.title ?? title;
      subtitle =
        data.blurb ??
        `Fitted for ${data.repo ?? "a real repository"} · copy it into your agent.`;
      if (data.genres?.[0]?.label) stats.push(data.genres[0].label);
      if (data.evidenceSummary?.claimedUseCount) {
        stats.push(`${data.evidenceSummary.claimedUseCount} claimed uses`);
      }
      if (data.evidenceSummary?.outcomeCount) {
        stats.push(`${data.evidenceSummary.outcomeCount} outcome${data.evidenceSummary.outcomeCount === 1 ? "" : "s"}`);
      }
    }
  } catch {
    // Use the generic card when the API is unavailable.
  }

  return new ImageResponse(
    <OgCard
      eyebrow="fitted agent skill"
      title={title}
      subtitle={subtitle}
      stats={stats}
      footer="Evidence is a public summary—not a causal impact claim."
    />,
    size,
  );
}
