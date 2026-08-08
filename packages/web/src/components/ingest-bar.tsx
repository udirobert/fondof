"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Loader2, ArrowRight } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ingestURL } from "@/lib/api";

export function IngestBar() {
  const [url, setUrl] = useState("");
  const { isIngesting, setIngesting, addSource, updateSource, addIdeas } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isIngesting) return;

    const inputUrl = url.trim();
    setIngesting(true);
    addSource({
      url: inputUrl,
      title: "Loading...",
      contentType: "article",
      ideasCount: 0,
      sourceHash: "",
      isProcessing: true,
    });

    try {
      const result = await ingestURL(inputUrl);

      if (result.error) {
        updateSource(inputUrl, { title: `Error: ${result.error}`, isProcessing: false });
      } else {
        updateSource(inputUrl, {
          title: result.title || inputUrl,
          contentType: result.contentType,
          ideasCount: result.ideas.length,
          sourceHash: result.sourceHash,
          isProcessing: false,
        });
        addIdeas(result.ideas);
      }
    } catch {
      updateSource(inputUrl, {
        title: "Failed to connect",
        isProcessing: false,
      });
    }

    setIngesting(false);
    setUrl("");
  };

  return (
    <form onSubmit={handleSubmit} className="relative mb-2">
      <div className="paper-sm px-3 py-2.5 flex items-center gap-2">
        <Link2 size={14} className="text-muted flex-shrink-0" />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a podcast or blog URL..."
          disabled={isIngesting}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/60 focus:outline-none disabled:opacity-50"
        />
        <AnimatePresence mode="wait">
          {isIngesting ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Loader2 size={14} className="text-accent animate-spin" />
            </motion.div>
          ) : url.trim() ? (
            <motion.button
              key="submit"
              type="submit"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-accent hover:text-accent-hover transition-colors"
            >
              <ArrowRight size={14} />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
    </form>
  );
}
