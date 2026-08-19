import { ImageResponse } from "next/og";
import { OgCard } from "@/lib/og-card";

export const alt = "fondof skill lineage";
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
  let title = "Skill lineage";
  let children = 0;
  let parent = false;

  try {
    const response = await fetch(
      `${API_BASE}/api/skills/${encodeURIComponent(hash)}/lineage`,
      { next: { revalidate: 300 } },
    );
    if (response.ok) {
      const data = (await response.json()) as {
        skill?: { title?: string };
        parent?: unknown;
        children?: unknown[];
      };
      title = data.skill?.title ?? title;
      parent = Boolean(data.parent);
      children = data.children?.length ?? 0;
    }
  } catch {
    // Use the generic lineage card when the API is unavailable.
  }

  return new ImageResponse(
    <OgCard
      eyebrow="skill lineage"
      title={title}
      subtitle="Trace the parent skill and the public remixes fitted to different repositories."
      stats={[parent ? "has parent" : "original branch", `${children} remix${children === 1 ? "" : "es"}`]}
      footer="Derivation metadata is visible; causality is not implied."
    />,
    size,
  );
}
