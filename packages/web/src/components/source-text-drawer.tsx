"use client";

import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Download, Search, X } from "lucide-react";

export interface SourceTextDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
  text: string | null | undefined;
  contentType?: string;
}

/**
 * Inspect the source body — verify shards, copy, or download.
 */
export function SourceTextDrawer({
  open,
  onClose,
  title,
  url,
  text,
  contentType,
}: SourceTextDrawerProps) {
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const kind =
    contentType === "youtube" || contentType === "talk"
      ? "Transcript"
      : contentType === "podcast" || contentType === "audio"
        ? "Transcript"
        : contentType === "text"
          ? "Need text"
          : "Source text";

  useEffect(() => {
    if (!open) {
      setQuery("");
      setCopied(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const body = text?.trim() ?? "";
  const filtered =
    query.trim().length === 0
      ? body
      : body
          .split(/\n+/)
          .filter((line) =>
            line.toLowerCase().includes(query.trim().toLowerCase()),
          )
          .join("\n\n");

  const copy = async () => {
    if (!body) return;
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  const download = () => {
    if (!body) return;
    const header = `# ${title}\n\nSource: ${url}\n\n---\n\n`;
    const blob = new Blob([header + body], {
      type: "text/plain;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = slugFile(title) + ".txt";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close transcript"
            className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="relative flex h-full w-full max-w-md flex-col border-l border-ink/10 bg-paper shadow-2xl"
          >
            <header className="shrink-0 border-b border-ink/8 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    {kind}
                  </p>
                  <h2
                    id={titleId}
                    className="mt-0.5 font-serif text-lg leading-snug text-ink"
                  >
                    {title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-1.5 text-muted hover:bg-mist hover:text-ink"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => void copy()}
                  disabled={!body}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-ink/10 bg-mist px-2.5 text-[11px] text-ink disabled:opacity-40"
                >
                  {copied ? (
                    <Check size={12} className="text-ember" />
                  ) : (
                    <Copy size={12} />
                  )}
                  {copied ? "Copied" : "Copy all"}
                </button>
                <button
                  type="button"
                  onClick={download}
                  disabled={!body}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-ink/10 bg-mist px-2.5 text-[11px] text-ink disabled:opacity-40"
                >
                  <Download size={12} />
                  Download .txt
                </button>
              </div>
              {body && (
                <label className="mt-3 flex min-h-9 items-center gap-2 rounded-lg border border-ink/10 bg-paper px-2.5">
                  <Search size={12} className="shrink-0 text-muted" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find in text…"
                    className="min-w-0 flex-1 bg-transparent text-xs text-ink placeholder:text-muted focus:outline-none"
                  />
                </label>
              )}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {!body ? (
                <p className="text-sm text-muted">
                  Source text isn’t available for this entry yet. Re-run extract
                  on the URL to load the transcript, or open the original link.
                </p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted">No lines match “{query}”.</p>
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-foreground-secondary">
                  {filtered}
                </pre>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function slugFile(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug || "source";
}
