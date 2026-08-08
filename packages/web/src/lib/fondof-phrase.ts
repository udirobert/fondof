import type { SourceEntry } from "@/lib/store";

export type FondObject =
  | "the pod"
  | "the talk"
  | "the blog"
  | "the piece"
  | "the need"
  | "these threads"
  | "this source";

export interface FondPhrase {
  /** Typographic line: fondof · the pod */
  compact: string;
  /** Spoken / headline: fond of the pod */
  spoken: string;
  object: FondObject | string;
  kind: "podcast" | "youtube" | "blog" | "article" | "need" | "mixed" | "empty";
}

function kindOf(source: Pick<SourceEntry, "contentType" | "url" | "title">) {
  const t = (source.contentType || "").toLowerCase();
  const url = source.url || "";
  if (url.startsWith("need://") || t === "text") return "need" as const;
  if (/(?:youtube\.com|youtu\.be)/i.test(url) || t === "youtube") {
    return "youtube" as const;
  }
  if (t === "podcast" || /\.(mp3|m4a|wav)(\?|$)/i.test(url) || /podcast/i.test(url)) {
    return "podcast" as const;
  }
  if (t === "blog") return "blog" as const;
  if (t === "article") return "article" as const;
  return "article" as const;
}

const OBJECT: Record<Exclude<FondPhrase["kind"], "mixed" | "empty">, FondObject> = {
  podcast: "the pod",
  youtube: "the talk",
  blog: "the blog",
  article: "the piece",
  need: "the need",
};

/** Short title when it’s punchy enough to wear the brand. */
function titleObject(title: string): string | null {
  const clean = title.replace(/\s+/g, " ").trim();
  if (!clean || clean === "Extracting…" || clean.length > 36) return null;
  if (/^(https?:|www\.)/i.test(clean)) return null;
  return clean;
}

/**
 * Brand play: fondof adapts to what you bring.
 * fondof the pod · fond of the blog · fondof the talk
 */
export function fondofPhrase(
  sources: Pick<SourceEntry, "contentType" | "url" | "title">[],
): FondPhrase {
  if (!sources.length) {
    return {
      compact: "fondof",
      spoken: "fond of",
      object: "this source",
      kind: "empty",
    };
  }

  const kinds = sources.map(kindOf);
  const unique = [...new Set(kinds)];

  if (unique.length > 1) {
    return {
      compact: "fondof · these threads",
      spoken: "fond of these threads",
      object: "these threads",
      kind: "mixed",
    };
  }

  const kind = unique[0];
  const primary = sources[0];
  const named = titleObject(primary.title);
  // Prefer typed noun for brand clarity; use title when it’s a short episode/post name.
  const object =
    kind === "need" && named
      ? named
      : named && (kind === "blog" || kind === "podcast") && named.length <= 28
        ? named
        : OBJECT[kind];

  return {
    compact: `fondof · ${object}`,
    spoken: `fond of ${object}`,
    object,
    kind,
  };
}
