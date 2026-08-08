"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SourceCard } from "@/components/source-card";
import { IdeaNode } from "@/components/idea-node";
import { IngestBar } from "@/components/ingest-bar";
import { useAppStore } from "@/lib/store";
import { Flame, Sparkles } from "lucide-react";
import Link from "next/link";

export default function CanvasPage() {
  const { sources, ideas, selectedIdeaIds } = useAppStore();

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sources — left shelf */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="w-72 p-5 overflow-y-auto border-r border-background-subtle"
      >
        <h2 className="text-[11px] text-muted uppercase tracking-wider font-medium mb-3">
          Sources
        </h2>
        <IngestBar />
        <div className="space-y-3 mt-3">
          <AnimatePresence>
            {sources.map((source) => (
              <SourceCard
                key={source.url}
                type={source.contentType as "podcast" | "blog" | "text"}
                title={source.title}
                url={source.url}
                ideasCount={source.ideasCount}
                isProcessing={source.isProcessing}
              />
            ))}
          </AnimatePresence>
        </div>

        {sources.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-xs text-muted">
              Paste a URL above to extract ideas
            </p>
          </div>
        )}
      </motion.div>

      {/* Ideas — center canvas */}
      <div className="flex-1 relative overflow-auto bg-background-subtle/50 p-8">
        <div className="flex items-center justify-between mb-6">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[11px] text-muted uppercase tracking-wider font-medium"
          >
            {ideas.length > 0
              ? `${ideas.length} ideas extracted`
              : "Extracted ideas"}
          </motion.h2>

          {/* Forge button when ideas are selected */}
          <AnimatePresence>
            {selectedIdeaIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Link
                  href="/forge"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
                >
                  <Flame size={12} />
                  Forge {selectedIdeaIds.size} idea{selectedIdeaIds.size > 1 ? "s" : ""}
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Ideas grid — Codrops-style 3D stagger on enter */}
        <div
          className="flex flex-wrap gap-5 relative z-10"
          style={{ perspective: 1000, transformStyle: "preserve-3d" }}
        >
          <AnimatePresence>
            {ideas.map((idea, i) => (
              <IdeaNode
                key={idea.id}
                id={idea.id}
                title={idea.title}
                description={idea.description}
                patternType={idea.patternType}
                domains={idea.domain}
                index={i}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {ideas.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <Sparkles size={32} className="text-muted/30 mb-4" />
            <p className="text-foreground-secondary text-sm">
              Paste a URL in the source panel to extract ideas
            </p>
            <p className="text-muted text-xs mt-1.5">
              Ideas will appear here. Click to select, then forge into a skill.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
