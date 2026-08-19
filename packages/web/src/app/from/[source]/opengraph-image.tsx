import { ImageResponse } from "next/og";
import { OgCard } from "@/lib/og-card";

export const alt = "fondof source impact snapshot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://fondof-api.trustfall.workers.dev";

export default async function Image({
  params,
}: {
  params: Promise<{ source: string }>;
}) {
  const { source } = await params;
  const domain = decodeURIComponent(source);
  let count = 0;
  let outcomes = 0;
  let remixes = 0;

  try {
    const response = await fetch(
      `${API_BASE}/api/sources/${encodeURIComponent(domain)}`,
      { next: { revalidate: 300 } },
    );
    if (response.ok) {
      const data = (await response.json()) as {
        count?: number;
        impact?: { outcomeCount?: number; remixCount?: number; evidenceScore?: number };
      };
      count = data.count ?? 0;
      outcomes = data.impact?.outcomeCount ?? 0;
      remixes = data.impact?.remixCount ?? 0;
    }
  } catch {
    // Use the generic counts when the API is unavailable.
  }

  return new ImageResponse(
    <OgCard
      eyebrow="source impact snapshot"
      title={`Forged from ${domain}`}
      subtitle="See how developers turned one source into fitted skills across real repositories."
      stats={[
        `${count} skill${count === 1 ? "" : "s"}`,
        `${outcomes} outcome${outcomes === 1 ? "" : "s"}`,
        `${remixes} remix${remixes === 1 ? "" : "es"}`,
      ]}
      footer="Evidence summary only—not proof that the source caused a change."
    />,
    size,
  );
}
