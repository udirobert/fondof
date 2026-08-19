import { ImageResponse } from "next/og";
import { OgCard } from "@/lib/og-card";

export const alt = "fondof creator craft snapshot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://fondof-api.trustfall.workers.dev";

export default async function Image({
  params,
}: {
  params: Promise<{ login: string }>;
}) {
  const { login } = await params;
  let skillCount = 0;
  let uses = 0;
  let outcomes = 0;

  try {
    const response = await fetch(
      `${API_BASE}/api/skills/creator/${encodeURIComponent(login)}`,
      { next: { revalidate: 300 } },
    );
    if (response.ok) {
      const data = (await response.json()) as {
        impact?: { skillCount?: number; claimedUseCount?: number; outcomeCount?: number };
      };
      skillCount = data.impact?.skillCount ?? 0;
      uses = data.impact?.claimedUseCount ?? 0;
      outcomes = data.impact?.outcomeCount ?? 0;
    }
  } catch {
    // Use the generic card when the API is unavailable.
  }

  return new ImageResponse(
    <OgCard
      eyebrow="public craft snapshot"
      title={`@${login}`}
      subtitle="Public skills forged from real learning, fitted to real repositories."
      stats={[
        `${skillCount} skill${skillCount === 1 ? "" : "s"}`,
        `${uses} claimed use${uses === 1 ? "" : "s"}`,
        `${outcomes} outcome${outcomes === 1 ? "" : "s"}`,
      ]}
      footer="Evidence summary only—not a causal impact or quality verdict."
    />,
    size,
  );
}
