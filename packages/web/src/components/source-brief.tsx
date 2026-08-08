"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown } from "lucide-react";
import type { IngestValue } from "@/lib/api";

interface SourceBriefProps {
  title: string;
  url: string;
  contentType: string;
  ideasCount: number;
  textLength?: number;
  fondObject: string;
  sourceHash?: string;
  ingestValue?: IngestValue | null;
}

const PROVIDER_LABEL: Record<string, string> = {
  firecrawl: "Firecrawl",
  html: "HTML fallback",
  timedtext: "YouTube captions",
  page: "YouTube page",
  elevenlabs: "ElevenLabs",
  rss: "RSS",
  "workers-ai": "Workers AI",
  cache: "edge cache",
};

/**
 * Progressive beat 1 — acknowledge what was searched + what earned its keep.
 */
export function SourceBrief({
  title,
  url,
  contentType,
  ideasCount,
  textLength,
  fondObject,
  sourceHash,
  ingestValue,
}: SourceBriefProps) {
  const [open, setOpen] = useState(true);
  const kind =
    contentType === "youtube" || contentType === "talk"
      ? "talk"
      : contentType === "podcast" || contentType === "audio"
        ? "transcript"
        : contentType === "text"
          ? "need"
          : "piece";

  const material =
    textLength && textLength > 0
      ? kind === "talk" || kind === "transcript"
        ? `${textLength.toLocaleString()} chars of transcript`
        : `${textLength.toLocaleString()} chars read`
      : null;

  const providers = ingestValue?.providers ?? [];
  const extractLabel = ingestValue?.extractProvider
    ? PROVIDER_LABEL[ingestValue.extractProvider] ?? ingestValue.extractProvider
    : null;
  const shortHash =
    sourceHash && sourceHash.length > 12
      ? `${sourceHash.slice(0, 8)}…${sourceHash.slice(-4)}`
      : sourceHash;

  return (
    <section className="mb-5 border-b border-ink/8 pb-4 sm:mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
            From {fondObject}
            {ingestValue?.cacheHit ? " · cached" : ""}
          </p>
          <h2 className="mt-1 font-serif text-xl leading-snug text-ink sm:text-2xl">
            {title}
          </h2>
        </div>
        <ChevronDown
          size={16}
          className={`mt-1.5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-foreground-secondary">
            Extracted{" "}
            <span className="font-medium text-ink">{ideasCount}</span> discrete
            idea{ideasCount === 1 ? "" : "s"}
            {material ? (
              <>
                {" "}
                from <span className="font-medium text-ink">{material}</span>
              </>
            ) : null}
            . Next: compare similar skills, then forge.
          </p>

          {(extractLabel || providers.length > 0) && (
            <p className="font-mono text-[10px] leading-relaxed tracking-wide text-muted">
              Value delivered
              {extractLabel ? ` · read via ${extractLabel}` : ""}
              {ingestValue?.cacheHit
                ? " · $0 this run (cache)"
                : providers.includes("workers-ai")
                  ? " · shards via Workers AI"
                  : ""}
              {" · "}
              Exa / forge / publish still open
            </p>
          )}

          {shortHash && (
            <p
              className="font-mono text-[10px] text-muted"
              title={sourceHash}
            >
              Provenance · sha256 {shortHash}
            </p>
          )}

          <a
            href={url.startsWith("http") ? url : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex max-w-full items-center gap-1.5 font-mono text-[11px] text-muted ${
              url.startsWith("http")
                ? "hover:text-ember"
                : "pointer-events-none"
            }`}
          >
            <ExternalLink size={11} className="shrink-0" />
            <span className="truncate">{displayUrl(url)}</span>
          </a>
        </div>
      )}
    </section>
  );
}

function displayUrl(url: string) {
  try {
    if (!url.startsWith("http")) return url;
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + u.pathname.slice(0, 36);
  } catch {
    return url;
  }
}
