"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown } from "lucide-react";

interface SourceBriefProps {
  title: string;
  url: string;
  contentType: string;
  ideasCount: number;
  textLength?: number;
  fondObject: string;
}

/**
 * Progressive beat 1 — acknowledge what was searched before shards.
 */
export function SourceBrief({
  title,
  url,
  contentType,
  ideasCount,
  textLength,
  fondObject,
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
            . Pick Forge-worthy shards to compose a skill.
          </p>
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
