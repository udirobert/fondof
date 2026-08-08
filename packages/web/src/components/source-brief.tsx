"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
 * Acknowledge the source — one beat, then pick shards. Provenance stays tucked away.
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
  const [detailsOpen, setDetailsOpen] = useState(false);
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
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
        From {fondObject}
        {ingestValue?.cacheHit ? " · cached" : ""}
      </p>
      <h2 className="mt-1 font-serif text-xl leading-snug text-ink sm:text-2xl">
        {title}
      </h2>

      <p className="mt-2 text-sm text-foreground-secondary">
        <motion.span
          key={ideasCount}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          className="font-medium text-ink tabular-nums"
        >
          {ideasCount}
        </motion.span>{" "}
        idea{ideasCount === 1 ? "" : "s"} ready — select to forge
        {material ? (
          <span className="text-muted">
            {" "}
            · from {material}
          </span>
        ) : null}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
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
        {(extractLabel || providers.length > 0 || shortHash) && (
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className="inline-flex items-center gap-1 font-mono text-[10px] text-muted hover:text-ink"
            aria-expanded={detailsOpen}
          >
            How this was made
            <ChevronDown
              size={12}
              className={`transition-transform ${detailsOpen ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {detailsOpen && (
        <div className="mt-2 space-y-1.5 rounded-lg bg-mist/60 px-3 py-2">
          {(extractLabel || providers.length > 0) && (
            <p className="font-mono text-[10px] leading-relaxed tracking-wide text-muted">
              {extractLabel ? `Read via ${extractLabel}` : "Extracted"}
              {ingestValue?.cacheHit
                ? " · $0 this run (cache)"
                : providers.includes("workers-ai")
                  ? " · shards via Workers AI"
                  : ""}
              {" · "}
              Compare / forge billed when you ask
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
