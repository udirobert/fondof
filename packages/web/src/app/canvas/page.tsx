"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { SourceCard } from "@/components/source-card";
import { IdeaNode } from "@/components/idea-node";
import { IngestBar } from "@/components/ingest-bar";
import { StartPad } from "@/components/start-pad";
import { SelectionBar } from "@/components/selection-bar";
import { ForgeMode } from "@/components/forge-mode";
import { RepoPanel } from "@/components/repo-panel";
import { useAppStore } from "@/lib/store";
import { demoIdeas, demoRepos, demoSources } from "@/lib/demo-data";
import type { IdeaFromAPI } from "@/lib/api";

function sampleIdeas(): IdeaFromAPI[] {
  return demoIdeas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    description: idea.description,
    domain: idea.domains,
    applicability: idea.domains,
    patternType: idea.patternType,
    sourceUrl: demoSources[0].url,
    sourceHash: "demo",
    embedding: [],
  }));
}

export default function CanvasPage() {
  const searchParams = useSearchParams();
  const {
    sources,
    ideas,
    selectedIdeaIds,
    clearSelection,
    forgeOpen,
    setForgeOpen,
    loadSample,
  } = useAppStore();

  // Stay on the start pad until ideas exist — no mid-extract layout jump.
  const onPad = ideas.length === 0;

  useEffect(() => {
    if (searchParams.get("sample") !== "1") return;
    if (ideas.length > 0) return;
    loadSample(
      demoSources.map((s) => ({
        url: s.url,
        title: s.title,
        contentType: s.type,
        ideasCount: s.ideasCount ?? 0,
        sourceHash: "demo",
        isProcessing: false,
      })),
      sampleIdeas(),
      demoIdeas
        .filter((i) => i.worthiness === "forge-skill")
        .slice(0, 2)
        .map((i) => i.id),
    );
  }, [searchParams, ideas.length, loadSample]);

  useEffect(() => {
    if (searchParams.get("forge") === "1" && selectedIdeaIds.size > 0) {
      setForgeOpen(true);
    }
  }, [searchParams, selectedIdeaIds.size, setForgeOpen]);

  const selectedIdeas = ideas
    .filter((i) => selectedIdeaIds.has(i.id))
    .map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      patternType: i.patternType,
      domains: i.domain,
      worthiness: "forge-skill" as const,
      worthinessScore: 0.8,
      matchType: "novel" as const,
    }));

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] pt-14 atmosphere">
      <AnimatePresence mode="wait">
        {onPad ? (
          <motion.div
            key="pad"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
            className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center pb-16"
          >
            <StartPad />
          </motion.div>
        ) : (
          <motion.div
            key="work"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-[calc(100vh-3.5rem)] flex-col lg:flex-row"
          >
            <aside className="w-full shrink-0 border-b border-ink/8 p-4 lg:w-64 lg:overflow-y-auto lg:border-r lg:border-b-0">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted">
                  Sources
                </h2>
                <span className="text-[10px] text-muted">
                  {ideas.length} idea{ideas.length === 1 ? "" : "s"}
                </span>
              </div>
              <IngestBar compact />
              <div className="mt-3 space-y-2">
                {sources.map((source) => (
                  <SourceCard
                    key={source.url}
                    type={
                      (source.contentType === "podcast" ||
                      source.contentType === "blog" ||
                      source.contentType === "text"
                        ? source.contentType
                        : "blog") as "podcast" | "blog" | "text"
                    }
                    title={source.title}
                    url={source.url}
                    ideasCount={source.ideasCount}
                    isProcessing={source.isProcessing}
                  />
                ))}
              </div>
            </aside>

            <div className="relative flex-1 overflow-auto p-5 sm:p-8">
              <div className="mb-5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                  Select
                </p>
                <h2 className="font-serif text-2xl text-ink">
                  Click ideas to forge
                </h2>
              </div>

              <div
                className="relative z-10 flex flex-wrap gap-5 pb-28"
                style={{ perspective: 1000, transformStyle: "preserve-3d" }}
              >
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
              </div>
            </div>

            <div className="hidden lg:block">
              <RepoPanel
                repos={demoRepos}
                dimmed={selectedIdeaIds.size === 0}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SelectionBar
        count={selectedIdeaIds.size}
        onClear={clearSelection}
        onForge={() => setForgeOpen(true)}
      />

      <ForgeMode
        open={forgeOpen}
        ideas={selectedIdeas}
        repos={demoRepos}
        onClose={() => setForgeOpen(false)}
      />
    </div>
  );
}
