"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { SourceCard } from "@/components/source-card";
import { IdeaShard } from "@/components/idea-shard";
import { DiscoveryPanel } from "@/components/discovery-panel";
import { IngestBar } from "@/components/ingest-bar";
import { StartPad } from "@/components/start-pad";
import { IngestStage, type IngestPhase } from "@/components/ingest-stage";
import { SelectionBar } from "@/components/selection-bar";
import { ForgeMode } from "@/components/forge-mode";
import { FitTarget } from "@/components/fit-target";
import { FondofWordmark } from "@/components/fondof-wordmark";
import { PipelineStrip } from "@/components/experience/pipeline-strip";
import { WhyDrawer } from "@/components/why-drawer";
import { useAppStore } from "@/lib/store";
import { fondofPhrase } from "@/lib/fondof-phrase";
import {
  resolveIngestStream,
  toApiIdea,
} from "@/lib/ingest-client";
import {
  matchRepos,
  scoreWorthiness,
} from "@/lib/idea-insights";
import {
  demoIdeas,
  demoRepos,
  demoSources,
  liveExamples,
  type LiveExample,
} from "@/lib/demo-data";
import type { ExistingSkillHit, IdeaFromAPI } from "@/lib/api";

type FloorMode = "pad" | "ingest" | "work";

function sampleIdeas(): IdeaFromAPI[] {
  return demoIdeas.map((idea) =>
    toApiIdea(idea, demoSources[0].url, "demo"),
  );
}

interface FondFloorProps {
  /** Show compact marketing frame (pipeline + why) around the pad */
  showFrame?: boolean;
}

/**
 * Tool-first shell: pad → ingest theater → shard plane.
 * Shared by `/` and `/canvas`.
 */
export function FondFloor({ showFrame = false }: FondFloorProps) {
  const searchParams = useSearchParams();
  const abortRef = useRef<AbortController | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [mode, setMode] = useState<FloorMode>("pad");
  const [phases, setPhases] = useState<IngestPhase[]>([]);
  const [activePhase, setActivePhase] = useState<string | undefined>();
  const [liveFondObject, setLiveFondObject] = useState("this source");
  const [liveTitle, setLiveTitle] = useState<string | undefined>();
  const [liveIdeas, setLiveIdeas] = useState<IdeaFromAPI[]>([]);

  const {
    sources,
    ideas,
    selectedIdeaIds,
    clearSelection,
    forgeOpen,
    setForgeOpen,
    loadSample,
    isIngesting,
    setIngesting,
    addSource,
    updateSource,
    removeSource,
    setIdeas,
    discoverySkills,
    setDiscoverySkills,
  } = useAppStore();

  const phrase = useMemo(() => fondofPhrase(sources), [sources]);

  // Sync mode from store when ideas exist (e.g. sample, deep link)
  useEffect(() => {
    if (ideas.length > 0 && mode !== "ingest") {
      setMode("work");
    }
  }, [ideas.length, mode]);

  useEffect(() => {
    if (searchParams.get("sample") !== "1") return;
    if (ideas.length > 0) return;
    const pod = demoSources[0];
    loadSample(
      [
        {
          url: pod.url,
          title: pod.title,
          contentType: pod.type,
          ideasCount: pod.ideasCount ?? demoIdeas.length,
          sourceHash: "demo",
          isProcessing: false,
        },
      ],
      sampleIdeas(),
      demoIdeas
        .filter((i) => i.worthiness === "forge-skill")
        .slice(0, 2)
        .map((i) => i.id),
    );
    setMode("work");
  }, [searchParams, ideas.length, loadSample]);

  useEffect(() => {
    if (searchParams.get("forge") === "1" && selectedIdeaIds.size > 0) {
      setForgeOpen(true);
    }
  }, [searchParams, selectedIdeaIds.size, setForgeOpen]);

  const loadInstantSample = () => {
    const pod = demoSources[0];
    loadSample(
      [
        {
          url: pod.url,
          title: pod.title,
          contentType: pod.type,
          ideasCount: pod.ideasCount ?? demoIdeas.length,
          sourceHash: "demo",
          isProcessing: false,
        },
      ],
      sampleIdeas(),
      demoIdeas
        .filter((i) => i.worthiness === "forge-skill")
        .slice(0, 2)
        .map((i) => i.id),
    );
    setMode("work");
  };

  const cancelIngest = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIngesting(false);
    setMode(ideas.length > 0 ? "work" : "pad");
    setPhases([]);
    setLiveIdeas([]);
    const processing = useAppStore.getState().sources.filter((s) => s.isProcessing);
    for (const s of processing) removeSource(s.url);
  }, [ideas.length, removeSource, setIngesting]);

  const runIngest = useCallback(
    async (input: { url: string } | { need: string }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const isNeed = "need" in input;
      const value = isNeed ? input.need : input.url;

      setIngesting(true);
      setMode("ingest");
      setPhases([]);
      setActivePhase(undefined);
      setLiveIdeas([]);
      setLiveTitle(undefined);
      setLiveFondObject(isNeed ? "the need" : "this source");
      setDiscoverySkills([]);

      const placeholderUrl = isNeed
        ? `need://${encodeURIComponent(value.slice(0, 48))}`
        : value;

      addSource({
        url: placeholderUrl,
        title: isNeed ? value.slice(0, 48) : "Extracting…",
        contentType: isNeed ? "text" : "article",
        ideasCount: 0,
        sourceHash: "",
        isProcessing: true,
      });

      const collected: IdeaFromAPI[] = [];
      let streamContentType = isNeed ? "text" : "article";
      let foundSkills: ExistingSkillHit[] = [];

      try {
        const result = await resolveIngestStream(
          value,
          isNeed ? "need" : "content",
          {
            onEvent: (event) => {
              if (event.type === "kind") {
                setLiveFondObject(event.fondObject);
                streamContentType = event.contentType;
                updateSource(placeholderUrl, {
                  contentType:
                    event.contentType === "youtube"
                      ? "youtube"
                      : event.contentType === "podcast" ||
                          event.contentType === "audio"
                        ? "podcast"
                        : event.contentType === "text"
                          ? "text"
                          : "blog",
                });
              }
              if (event.type === "phase") {
                setPhases((prev) => {
                  if (prev.some((p) => p.phase === event.phase)) {
                    return prev.map((p) =>
                      p.phase === event.phase
                        ? { phase: event.phase, label: event.label }
                        : p,
                    );
                  }
                  return [...prev, { phase: event.phase, label: event.label }];
                });
                setActivePhase(event.phase);
              }
              if (event.type === "meta") {
                setLiveTitle(event.title);
                updateSource(placeholderUrl, { title: event.title });
              }
              if (event.type === "idea") {
                const idea: IdeaFromAPI = {
                  ...event.idea,
                  patternType: (
                    [
                      "technique",
                      "mental-model",
                      "anti-pattern",
                      "architecture",
                    ].includes(event.idea.patternType)
                      ? event.idea.patternType
                      : "technique"
                  ) as IdeaFromAPI["patternType"],
                };
                collected.push(idea);
                setLiveIdeas([...collected]);
              }
              if (event.type === "discovery") {
                foundSkills = event.existingSkills ?? [];
                setDiscoverySkills(foundSkills);
              }
            },
          },
          controller.signal,
        );

        updateSource(placeholderUrl, {
          title: result.source.title,
          contentType:
            streamContentType === "youtube"
              ? "youtube"
              : streamContentType === "podcast" || streamContentType === "audio"
                ? "podcast"
                : result.source.type === "text"
                  ? "text"
                  : "blog",
          ideasCount: result.ideas.length,
          sourceHash: result.fromApi ? "api" : "local",
          isProcessing: false,
          url: result.source.url,
        });

        const mapped = result.ideas.map((idea) =>
          toApiIdea(idea, result.source.url, result.fromApi ? "api" : "local"),
        );
        setIdeas(mapped);
        if (foundSkills.length === 0 && !result.fromApi) {
          // Seeded path: still show comparative skills so the USP is demoable
          setDiscoverySkills([
            {
              title: "agentskills/compose-patterns",
              url: "https://github.com/agentskills/compose-patterns",
              snippet:
                "Existing skill covering multi-source composition and fit-to-repo folding.",
            },
          ]);
        } else if (foundSkills.length > 0) {
          setDiscoverySkills(foundSkills);
        }
        setMode("work");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          removeSource(placeholderUrl);
          setMode("pad");
        } else {
          updateSource(placeholderUrl, {
            title: "Couldn’t extract",
            isProcessing: false,
          });
          removeSource(placeholderUrl);
          setMode("pad");
        }
      } finally {
        abortRef.current = null;
        setIngesting(false);
        setPhases([]);
        setLiveIdeas([]);
      }
    },
    [
      addSource,
      removeSource,
      setDiscoverySkills,
      setIdeas,
      setIngesting,
      updateSource,
    ],
  );

  const onExample = (ex: LiveExample) => {
    void runIngest({ url: ex.url });
  };

  const ideaInsights = useMemo(
    () =>
      ideas.map((idea) => {
        const worth = scoreWorthiness(idea);
        const repos = matchRepos(idea, demoRepos);
        return { idea, worth, repos };
      }),
    [ideas],
  );

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

  const repoMatchSummary = useMemo(() => {
    const counts = new Map<string, { name: string; count: number; why: string }>();
    for (const row of ideaInsights) {
      for (const m of row.repos) {
        const cur = counts.get(m.name);
        if (cur) {
          cur.count += 1;
          if (!cur.why.includes(m.why)) cur.why = `${cur.why} · ${m.why}`;
        } else {
          counts.set(m.name, { name: m.name, count: 1, why: m.why });
        }
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  }, [ideaInsights]);

  const forgeWorthyCount = ideaInsights.filter(
    (r) => r.worth.worthiness === "forge",
  ).length;

  const composeHint = useMemo(() => {
    const n = selectedIdeaIds.size;
    if (n < 2) {
      return n === 1
        ? "Add another shard to compose a hallmark skill from multiple angles."
        : undefined;
    }
    const selected = ideaInsights.filter((r) =>
      selectedIdeaIds.has(r.idea.id),
    );
    const types = new Set(selected.map((r) => r.idea.patternType));
    if (types.size >= 2) {
      return `Combining ${n} shards across ${types.size} pattern types — your skill will be more distinctive.`;
    }
    const repoHits = new Set(
      selected.flatMap((r) => r.repos.map((m) => m.name)),
    );
    if (repoHits.size > 0) {
      return `These ${n} fit ${[...repoHits].join(" + ")} — forge once, reuse across that stack.`;
    }
    return `Compose ${n} related ideas into one skill instead of forging each alone.`;
  }, [ideaInsights, selectedIdeaIds]);

  const showPad = mode === "pad" && ideas.length === 0;
  const showIngest = mode === "ingest";
  const showWork = mode === "work" || ideas.length > 0;

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] pt-14 atmosphere">
      <AnimatePresence mode="wait">
        {showPad && !showIngest && (
          <motion.div
            key="pad"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
            className="flex min-h-[calc(100dvh-3.5rem)] flex-col"
          >
            <div className="flex flex-1 flex-col items-center justify-center pb-8 pt-6">
              {showFrame && (
                <div className="mb-6 text-center px-4">
                  <FondofWordmark size="hero" />
                  <p className="mx-auto mt-3 max-w-md text-sm text-foreground-secondary">
                    fondof the pod. fond of the blog. Paste what you learn —
                    forge a skill for your repo.
                  </p>
                </div>
              )}
              <StartPad
                busy={isIngesting}
                onSubmitUrl={(url) => void runIngest({ url })}
                onSubmitNeed={(need) => void runIngest({ need })}
                onTrySample={loadInstantSample}
                onExample={onExample}
              />
            </div>
            {showFrame && (
              <>
                <div className="pb-10">
                  <PipelineStrip />
                </div>
                <WhyDrawer />
              </>
            )}
          </motion.div>
        )}

        {showIngest && (
          <motion.div
            key="ingest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[calc(100dvh-3.5rem)] flex-col justify-center pb-16"
          >
            <IngestStage
              fondObject={liveFondObject}
              title={liveTitle}
              phases={phases}
              activePhase={activePhase}
              liveIdeas={liveIdeas}
              onCancel={cancelIngest}
            />
          </motion.div>
        )}

        {showWork && !showIngest && (
          <motion.div
            key="work"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:h-[calc(100dvh-3.5rem)] lg:flex-row"
          >
            <aside className="shrink-0 border-b border-ink/8 lg:flex lg:w-60 lg:flex-col lg:overflow-y-auto lg:border-r lg:border-b-0">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left lg:pointer-events-none lg:cursor-default"
                onClick={() => setSourcesOpen((o) => !o)}
                aria-expanded={sourcesOpen}
              >
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                  Sources · {sources.length}
                </span>
                <span className="flex items-center gap-2 text-[10px] text-muted">
                  {ideas.length} shards
                  <ChevronDown
                    size={14}
                    className={`transition-transform lg:hidden ${sourcesOpen ? "rotate-180" : ""}`}
                  />
                </span>
              </button>
              <div
                className={`space-y-2 px-4 pb-4 ${sourcesOpen ? "block" : "hidden"} lg:block lg:flex-1`}
              >
                <IngestBar
                  compact
                  onIngestUrl={(url) => void runIngest({ url })}
                />
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible">
                  {sources.map((source) => (
                    <div
                      key={source.url}
                      className="min-w-[220px] shrink-0 lg:min-w-0"
                    >
                      <SourceCard
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
                    </div>
                  ))}
                </div>
                <div className="mt-3 hidden flex-wrap gap-1.5 lg:flex">
                  {liveExamples.slice(0, 3).map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => onExample(ex)}
                      className="rounded-full bg-mist px-2 py-1 text-[10px] text-muted hover:text-ember"
                    >
                      + {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <div className="relative min-w-0 flex-1 overflow-auto p-4 pb-36 sm:p-6 lg:p-8">
              <div className="mb-5 flex flex-col gap-3 sm:mb-6">
                <div>
                  <FondofWordmark object={phrase.object} size="inline" />
                  <p className="mt-2 max-w-md text-sm text-foreground-secondary">
                    Pick shards from {phrase.object}. Selected ones fold into a
                    skill fitted to your repo.
                  </p>
                </div>
                <div className="lg:hidden">
                  <FitTarget
                    repos={demoRepos}
                    variant="strip"
                    selectedIdeaCount={selectedIdeaIds.size}
                  />
                </div>
              </div>

              <div className="mx-auto max-w-2xl">
                <DiscoveryPanel
                  existingSkills={discoverySkills}
                  repoMatchSummary={repoMatchSummary}
                  forgeWorthyCount={forgeWorthyCount}
                  totalIdeas={ideas.length}
                />
              </div>

              <div className="idea-shard-plane mx-auto flex max-w-2xl flex-col gap-3 pb-8 sm:gap-3.5">
                {ideaInsights.map(({ idea, worth, repos }, i) => (
                  <IdeaShard
                    key={idea.id}
                    id={idea.id}
                    title={idea.title}
                    description={idea.description}
                    patternType={idea.patternType}
                    domains={idea.domain}
                    index={i}
                    worthiness={worth.worthiness}
                    worthinessReason={worth.reason}
                    repoMatches={repos.map((r) => ({
                      name: r.name,
                      why: r.why,
                    }))}
                  />
                ))}
              </div>
            </div>

            <div className="hidden self-stretch lg:block">
              <FitTarget
                repos={demoRepos}
                selectedIdeaCount={selectedIdeaIds.size}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SelectionBar
        count={selectedIdeaIds.size}
        onClear={clearSelection}
        onForge={() => setForgeOpen(true)}
        fondObject={phrase.object}
        selectedTitles={selectedIdeas.map((i) => i.title)}
        composeHint={composeHint}
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
