import { ingestURL, type IdeaFromAPI } from "@/lib/api";
import {
  hostnameTitle,
  seededIngestIdeas,
  seededNeedIdeas,
  type DemoIdea,
  type DemoSource,
} from "@/lib/demo-data";

function mapApiIdea(idea: IdeaFromAPI, index: number): DemoIdea {
  const score = Math.min(0.95, 0.55 + idea.description.length / 400);
  const worthiness: DemoIdea["worthiness"] =
    score > 0.75 ? "forge-skill" : score > 0.45 ? "apply-directly" : "skip";
  const matchType: DemoIdea["matchType"] =
    worthiness === "forge-skill"
      ? "novel"
      : worthiness === "apply-directly"
        ? "partial"
        : "conflict";

  return {
    id: idea.id || `api-${idea.sourceHash.slice(0, 8)}-${index}`,
    title: idea.title,
    description: idea.description,
    patternType: idea.patternType,
    domains: idea.domain?.length
      ? idea.domain
      : (idea.applicability?.slice(0, 3) ?? ["general"]),
    worthiness,
    worthinessScore: score,
    matchType,
  };
}

export interface IngestResult {
  source: DemoSource;
  ideas: DemoIdea[];
  fromApi: boolean;
}

/** Try live API; fall back to seeded demo material so the stage never dies. */
export async function resolveIngest(
  value: string,
  mode: "content" | "need",
): Promise<IngestResult> {
  if (mode === "need") {
    return {
      source: {
        type: "text",
        title: value.slice(0, 64) || "Stated need",
        author: "Need-first",
        url: `need://${encodeURIComponent(value.slice(0, 48))}`,
        ideasCount: seededNeedIdeas.length,
      },
      ideas: seededNeedIdeas.map((idea, i) => ({
        ...idea,
        id: `${idea.id}-${Date.now()}-${i}`,
      })),
      fromApi: false,
    };
  }

  try {
    const res = await Promise.race([
      ingestURL(value),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("timeout")), 8000);
      }),
    ]);

    if (!res.error && res.ideas?.length) {
      return {
        source: {
          type: "blog",
          title: res.title || hostnameTitle(value),
          url: value,
          ideasCount: res.ideas.length,
        },
        ideas: res.ideas.map(mapApiIdea),
        fromApi: true,
      };
    }
  } catch {
    // demo fallback below
  }

  const url = value.startsWith("http")
    ? value
    : `https://example.com/${encodeURIComponent(value)}`;

  return {
    source: {
      type: guessType(value),
      title: hostnameTitle(url),
      author: "Ingested",
      url,
      ideasCount: seededIngestIdeas.length,
    },
    ideas: seededIngestIdeas.map((idea, i) => ({
      ...idea,
      id: `${idea.id}-${Date.now()}-${i}`,
    })),
    fromApi: false,
  };
}

function guessType(value: string): DemoSource["type"] {
  if (/\.(mp3|m4a|wav)(\?|$)/i.test(value) || /podcast/i.test(value)) {
    return "podcast";
  }
  return "blog";
}
