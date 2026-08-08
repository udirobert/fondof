"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Link2, Loader2 } from "lucide-react";

interface IngestBarProps {
  compact?: boolean;
  /** When set, parent (FondFloor) owns the ingest theater */
  onIngestUrl?: (url: string) => void;
}

export function IngestBar({ compact = false, onIngestUrl }: IngestBarProps) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || busy) return;
    const inputUrl = url.trim().startsWith("http")
      ? url.trim()
      : `https://${url.trim()}`;
    setUrl("");
    if (onIngestUrl) {
      onIngestUrl(inputUrl);
      return;
    }
    setBusy(true);
    // Fallback: nothing without parent — reset
    setBusy(false);
  };

  return (
    <form onSubmit={handleSubmit} className={compact ? "" : "relative mb-2"}>
      <div
        className={`flex items-center gap-2 ${
          compact
            ? "rounded-xl border border-ink/10 bg-paper px-2.5 py-2"
            : "paper-sm px-3 py-2.5"
        }`}
      >
        <Link2 size={14} className="shrink-0 text-muted" />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Add another URL…"
          disabled={busy}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/60 focus:outline-none disabled:opacity-50"
        />
        <AnimatePresence mode="wait">
          {busy ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Loader2 size={14} className="animate-spin text-ember" />
            </motion.div>
          ) : url.trim() ? (
            <motion.button
              key="submit"
              type="submit"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-ember hover:text-ember-hot transition-colors"
              aria-label="Extract"
            >
              <ArrowRight size={14} />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
    </form>
  );
}
