"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Link2, Loader2 } from "lucide-react";
import { resolveIngest } from "@/lib/ingest-client";
import { useAppStore } from "@/lib/store";
import type { IdeaFromAPI } from "@/lib/api";

interface IngestBarProps {
  compact?: boolean;
}

export function IngestBar({ compact = false }: IngestBarProps) {
  const [url, setUrl] = useState("");
  const { isIngesting, setIngesting, addSource, updateSource, addIdeas } =
    useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isIngesting) return;

    const inputUrl = url.trim();
    setIngesting(true);
    addSource({
      url: inputUrl,
      title: "Extracting…",
      contentType: "article",
      ideasCount: 0,
      sourceHash: "",
      isProcessing: true,
    });

    try {
      const result = await resolveIngest(inputUrl, "content");
      updateSource(inputUrl, {
        title: result.source.title,
        contentType: result.source.type,
        ideasCount: result.ideas.length,
        sourceHash: result.fromApi ? "api" : "demo",
        isProcessing: false,
      });
      const mapped: IdeaFromAPI[] = result.ideas.map((idea) => ({
        id: idea.id,
        title: idea.title,
        description: idea.description,
        domain: idea.domains,
        applicability: idea.domains,
        patternType: idea.patternType,
        sourceUrl: result.source.url,
        sourceHash: result.fromApi ? "api" : "demo",
        embedding: [],
      }));
      addIdeas(mapped);
    } catch {
      updateSource(inputUrl, {
        title: "Failed — try another URL or the sample",
        isProcessing: false,
      });
    }

    setIngesting(false);
    setUrl("");
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
          disabled={isIngesting}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/60 focus:outline-none disabled:opacity-50"
        />
        <AnimatePresence mode="wait">
          {isIngesting ? (
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
