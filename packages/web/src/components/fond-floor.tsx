"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { SourceCard } from "@/components/source-card";
import { IdeaShard } from "@/components/idea-shard";
import { DiscoveryPanel } from "@/components/discovery-panel";
import { SourceBrief } from "@/components/source-brief";
import { AgentExportBar } from "@/components/agent-export-bar";
import { IngestBar } from "@/components/ingest-bar";
import { StartPad } from "@/components/start-pad";
import { IngestStage, type IngestPhase } from "@/components/ingest-stage";
import { SelectionBar } from "@/components/selection-bar";
import { ForgeMode } from "@/components/forge-mode";
import { FitTarget } from "@/components/fit-target";
import { FondofWordmark } from "@/components/fondof-wordmark";
import { WorkStages } from "@/components/work-stages";
import { SkillPoolPulse } from "@/components/skill-pool-pulse";
import { SourceTextDrawer } from "@/components/source-text-drawer";
import { Tip } from "@/components/tip";
import { useAppStore } from "@/lib/store";
import { fondofPhrase } from "@/lib/fondof-phrase";
import { track } from "@/lib/track";
import {
  resolveIngestStream,
  toApiIdea,
} from "@/lib/ingest-client";
import {
  fitForRepo,
  matchRepos,
  refineWorthinessWithOverlap,
  scoreWorthiness,
} from "@/lib/idea-insights";
import { asConnected } from "@/lib/github-repo";
import { overlapsForIdea, relatedShardIds } from "@/lib/skill-overlap";
import {
  demoIdeas,
  demoRepos,
  demoSources,
  liveExamples,
  type LiveExample,
} from "@/lib/demo-data";
import type { IdeaFromAPI, IngestValue } from "@/lib/api";

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
  const deepLinkRef = useRef<string | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [mode, setMode] = useState<FloorMode>("pad");
  const [phases, setPhases] = useState<IngestPhase[]>([]);
  const [activePhase, setActivePhase] = useState<string | undefined>();
  const [liveFondObject, setLiveFondObject] = useState("this source");
  const [liveTitle, setLiveTitle] = useState<string | undefined>();
  const [liveIdeas, setLiveIdeas] = useState<IdeaFromAPI[]>([]);
  const [fitFilterActive, setFitFilterActive] = useState(false);
  const [focusShardId, setFocusShardId] = useState<string | null>(null);
  const focusClearRef = useRef<number | null>(null);
  const [textDrawerUrl, setTextDrawerUrl] = useState<string | null>(null);

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
    ingestValue,
    setIngestValue,
    setCompareNote,
    activeRepo,
    userRepos,
    selectIdeas,
  } = useAppStore();

  const phrase = useMemo(() => fondofPhrase(sources), [sources]);

  const allRepos = useMemo(() => {
    const demos = demoRepos.map(asConnected);
    const seen = new Set(userRepos.map((r) => r.fullName));
    return [...userRepos, ...demos.filter((d) => !seen.has(d.fullName))];
  }, [userRepos]);

  const activeRepoObj = useMemo(
    () => allRepos.find((r) => r.fullName === activeRepo) ?? allRepos[0],
    [allRepos, activeRepo],
  );

  // Sync mode from store when ideas exist (e.g. sample, deep link)
  useEffect(() => {
    if (ideas.length > 0 && mode !== "ingest") {
      setMode("work");
    }
  }, [ideas.length, mode]);

  useEffect(() => {
    if (searchParams.get("url")) return;
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
      setIngestValue(null);
      setCompareNote(null);

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
      let extractedChars = 0;
      let sourceHash = "";
      const valueBag = { current: null as IngestValue | null };

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
              if (event.type === "sourceText") {
                extractedChars = event.text.length;
                updateSource(placeholderUrl, {
                  bodyText: event.text,
                  textLength: event.text.length,
                });
              }
              if (event.type === "idea") {
                const idea: IdeaFromAPI = {
                  ...event.idea,
                  domain: event.idea.domain ?? [],
                  applicability: event.idea.applicability ?? [],
                  embedding: event.idea.embedding ?? [],
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
              if (event.type === "value") {
                valueBag.current = event.value;
                setIngestValue(event.value);
                sourceHash = event.value.sourceHash || sourceHash;
              }
              if (event.type === "done") {
                extractedChars = event.textLength ?? 0;
                sourceHash = event.sourceHash || sourceHash;
                if (event.providers && !valueBag.current) {
                  const v: IngestValue = {
                    providers: event.providers,
                    cacheHit: !!event.cacheHit,
                    sourceHash: event.sourceHash,
                    textLength: event.textLength,
                    ideaCount: event.ideaCount,
                    deferred: ["exa", "forge", "publish"],
                  };
                  valueBag.current = v;
                  setIngestValue(v);
                }
              }
            },
          },
          controller.signal,
        );

        extractedChars = result.textLength ?? extractedChars;
        const finalIdeas =
          collected.length > 0
            ? collected
            : result.ideas.map((idea) =>
                toApiIdea(
                  idea,
                  result.source.url,
                  result.fromApi ? sourceHash || "api" : "local",
                ),
              );

        const delivered = valueBag.current;
        updateSource(placeholderUrl, {
          title: result.source.title,
          contentType:
            streamContentType === "youtube" ||
            result.contentType === "youtube"
              ? "youtube"
              : streamContentType === "podcast" ||
                  streamContentType === "audio" ||
                  result.contentType === "podcast" ||
                  result.contentType === "audio"
                ? "podcast"
                : result.source.type === "text"
                  ? "text"
                  : "blog",
          ideasCount: finalIdeas.length,
          sourceHash: sourceHash || (result.fromApi ? "api" : "local"),
          isProcessing: false,
          url: result.source.url,
          textLength: extractedChars || undefined,
          extractProvider: delivered?.extractProvider,
          cacheHit: delivered?.cacheHit,
        });

        setIdeas(finalIdeas);
        // Compare (Exa) is intentional — user runs it from DiscoveryPanel
        setDiscoverySkills([]);
        if (!delivered) {
          setIngestValue({
            providers: result.fromApi ? ["workers-ai"] : ["cache"],
            cacheHit: !result.fromApi,
            sourceHash: sourceHash || "local",
            textLength: extractedChars,
            ideaCount: finalIdeas.length,
            deferred: ["exa", "forge", "publish"],
          });
        }
        setMode("work");
        track("ingest_completed", {
          ideaCount: finalIdeas.length,
          contentType: streamContentType,
        });
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
      setCompareNote,
      setDiscoverySkills,
      setIdeas,
      setIngestValue,
      setIngesting,
      updateSource,
    ],
  );

  // Viral deep link: /?url=https://… → start ingest once
  useEffect(() => {
    const raw = searchParams.get("url");
    if (!raw || ideas.length > 0 || isIngesting) return;
    if (deepLinkRef.current === raw) return;
    deepLinkRef.current = raw;
    const url = raw.startsWith("http") ? raw : `https://${raw}`;
    void runIngest({ url });
  }, [searchParams, ideas.length, isIngesting, runIngest]);

  const onExample = (ex: LiveExample) => {
    void runIngest({ url: ex.url });
  };

  const ideaInsights = useMemo(
    () =>
      ideas.map((idea, idx) => {
        const overlaps = overlapsForIdea(idea, discoverySkills, idx);
        const worth = refineWorthinessWithOverlap(
          scoreWorthiness(idea),
          overlaps[0],
        );
        const repos = matchRepos(idea, allRepos);
        const fit = fitForRepo(idea, activeRepoObj);
        return { idea, worth, repos, fit, overlaps };
      }),
    [ideas, allRepos, activeRepoObj, discoverySkills],
  );

  const fittedInsights = useMemo(
    () => ideaInsights.filter((r) => r.fit),
    [ideaInsights],
  );
  const activeFitCount = fittedInsights.length;

  const fitPreviews = useMemo(
    () =>
      fittedInsights.slice(0, 3).map((r) => ({
        id: r.idea.id,
        title: r.idea.title,
        why: r.fit?.why ?? "stack match",
      })),
    [fittedInsights],
  );

  const fitIdeaIds = useMemo(
    () => fittedInsights.map((r) => r.idea.id),
    [fittedInsights],
  );

  // Reset fit filter when the target repo changes
  useEffect(() => {
    setFitFilterActive(false);
    setFocusShardId(null);
  }, [activeRepo]);

  useEffect(() => {
    return () => {
      if (focusClearRef.current) window.clearTimeout(focusClearRef.current);
    };
  }, []);

  const showFitShards = useCallback(() => {
    setFitFilterActive(true);
    const first = fitIdeaIds[0];
    if (first) {
      window.requestAnimationFrame(() => {
        document
          .getElementById(`shard-${first}`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, [fitIdeaIds]);

  const clearFitFilter = useCallback(() => {
    setFitFilterActive(false);
  }, []);

  const selectFitShards = useCallback(() => {
    const forgeable = fittedInsights
      .filter(
        (r) =>
          r.worth.worthiness === "forge" &&
          r.overlaps[0]?.label !== "covers",
      )
      .map((r) => r.idea.id);
    const ids = forgeable.length > 0 ? forgeable : fitIdeaIds;
    selectIdeas(ids);
    setFitFilterActive(true);
    const first = ids[0];
    if (first) {
      window.requestAnimationFrame(() => {
        document
          .getElementById(`shard-${first}`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, [fittedInsights, fitIdeaIds, selectIdeas]);

  const focusShard = useCallback((id: string) => {
    setFitFilterActive(true);
    setFocusShardId(id);
    if (focusClearRef.current) window.clearTimeout(focusClearRef.current);
    focusClearRef.current = window.setTimeout(() => {
      setFocusShardId(null);
    }, 2200);
    window.requestAnimationFrame(() => {
      document
        .getElementById(`shard-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

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

  const relatedPair = useMemo(() => relatedShardIds(ideas), [ideas]);

  const composeHint = useMemo(() => {
    const n = selectedIdeaIds.size;
    if (n === 0) return undefined;
    if (n === 1) {
      return "Add another Forge shard → one hallmark skill, not N weak ones";
    }
    const selected = ideaInsights.filter((r) =>
      selectedIdeaIds.has(r.idea.id),
    );
    const types = new Set(selected.map((r) => r.idea.patternType));
    if (types.size >= 2) {
      return `${n} shards · ${types.size} pattern types → stronger skill`;
    }
    const repoHits = new Set(
      selected.flatMap((r) => r.repos.map((m) => m.name)),
    );
    if (repoHits.size > 0) {
      return `Fits ${[...repoHits].join(" + ")} — forge once`;
    }
    return `Compose ${n} into one skill — don’t forge each alone`;
  }, [ideaInsights, selectedIdeaIds]);

  const idleComposeHint =
    selectedIdeaIds.size === 0
      ? relatedPair.length === 2
        ? "These two shards are related — select both, then forge once"
        : "Select 2+ Forge shards · one skill beats many thin ones"
      : null;

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
            <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
              {showFrame && (
                <div className="mb-6 text-center">
                  <FondofWordmark size="hero" />
                  <p className="mx-auto mt-3 max-w-sm font-serif text-lg text-ink sm:text-xl">
                    You just learned something. Your agent still hasn't.
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-foreground-secondary">
                    Paste it — get a skill fitted to your repo.
                  </p>
                </div>
              )}
              <StartPad
                busy={isIngesting}
                onSubmitUrl={(url) => void runIngest({ url })}
                onSubmitNeed={(need) => void runIngest({ need })}
                onTrySample={loadInstantSample}
              />
              {showFrame && (
                <p className="mt-6 text-center text-[11px] text-muted">
                  Works with Kiro, Claude, and Cursor
                </p>
              )}
            </div>
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
                          source.contentType === "podcast" ||
                          source.contentType === "youtube" ||
                          source.contentType === "text" ||
                          source.contentType === "blog"
                            ? source.contentType
                            : "blog"
                        }
                        title={source.title}
                        url={source.url}
                        ideasCount={source.ideasCount}
                        textLength={source.textLength}
                        isProcessing={source.isProcessing}
                        hasBodyText={!!source.bodyText}
                        onViewText={
                          source.isProcessing
                            ? undefined
                            : () => setTextDrawerUrl(source.url)
                        }
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
              <div className="mx-auto max-w-2xl">
                <FondofWordmark object={phrase.object} size="inline" />

                {sources[0] && (
                  <div className="mt-4">
                    <SourceBrief
                      title={sources[0].title}
                      url={sources[0].url}
                      contentType={sources[0].contentType}
                      ideasCount={ideas.length}
                      textLength={sources[0].textLength}
                      fondObject={phrase.object}
                      sourceHash={sources[0].sourceHash}
                      ingestValue={ingestValue}
                    />
                    {sources[0].url && !sources[0].url.startsWith("need://") && (
                      <button
                        type="button"
                        onClick={() => {
                          const shareLink = `${window.location.origin}/?url=${encodeURIComponent(sources[0].url)}`;
                          void navigator.clipboard.writeText(shareLink);
                        }}
                        className="mt-2 text-[11px] text-muted hover:text-ember"
                      >
                        Copy shareable link — let others fondof this source
                      </button>
                    )}
                  </div>
                )}

                <SkillPoolPulse className="mb-5" />

                <div className="mb-4 lg:hidden">
                  <FitTarget
                    repos={allRepos}
                    variant="strip"
                    selectedIdeaCount={selectedIdeaIds.size}
                    fitCount={activeFitCount}
                    fitPreviews={fitPreviews}
                    fitFilterActive={fitFilterActive}
                    onShowFit={showFitShards}
                    onClearFit={clearFitFilter}
                    onSelectFit={selectFitShards}
                    onFocusShard={focusShard}
                  />
                </div>

                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted">
                      <Tip tip="shard">
                        <span className="cursor-help border-b border-dotted border-muted/50">
                          Shards
                        </span>
                      </Tip>
                      {" · select to "}
                      <Tip tip="forge">
                        <span className="cursor-help border-b border-dotted border-muted/50">
                          forge
                        </span>
                      </Tip>
                      {fitFilterActive && activeRepoObj
                        ? ` · showing fits for ${activeRepoObj.name}`
                        : activeRepoObj
                          ? ` · fit for ${activeRepoObj.name}`
                          : ""}
                    </p>
                    <p className="mt-1 text-sm text-ink">
                      <span className="font-medium text-ember">
                        {forgeWorthyCount}
                      </span>
                      <span className="text-muted">/{ideas.length}</span> worth
                      forging
                      {activeFitCount > 0 && activeRepoObj ? (
                        <>
                          {" "}
                          ·{" "}
                          <button
                            type="button"
                            onClick={() =>
                              fitFilterActive
                                ? clearFitFilter()
                                : showFitShards()
                            }
                            className="font-medium text-ember underline-offset-2 hover:underline"
                          >
                            {fitFilterActive
                              ? "Show all shards"
                              : `${activeFitCount} fit ${activeRepoObj.name}`}
                          </button>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeFitCount > 0 && !fitFilterActive && (
                      <Tip tip="fit">
                        <button
                          type="button"
                          onClick={selectFitShards}
                          className="inline-flex min-h-9 items-center justify-center rounded-full border border-ink/12 bg-mist px-3.5 text-[12px] font-medium text-ink hover:border-ember/35"
                        >
                          Select {activeFitCount} fits
                        </button>
                      </Tip>
                    )}
                    {idleComposeHint && (
                      <button
                        type="button"
                        onClick={() => {
                          if (relatedPair.length === 2) {
                            selectIdeas(relatedPair);
                          } else {
                            selectIdeas(
                              ideaInsights
                                .filter((r) => r.worth.worthiness === "forge")
                                .slice(0, 2)
                                .map((r) => r.idea.id),
                            );
                          }
                        }}
                        className="inline-flex min-h-9 items-center justify-center rounded-full border border-ember/35 bg-ember/8 px-3.5 text-left text-[12px] font-medium leading-snug text-ember transition-colors hover:border-ember/55 hover:bg-ember/12"
                      >
                        {relatedPair.length === 2
                          ? "Select related pair"
                          : "Select top 2 to forge"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="idea-shard-plane flex flex-col gap-2.5 pb-6 sm:gap-3">
                  {fitFilterActive && activeFitCount === 0 ? (
                    <p className="rounded-lg bg-mist/60 px-3 py-4 text-sm text-muted">
                      No shards match this repo&apos;s stack —{" "}
                      <button
                        type="button"
                        onClick={clearFitFilter}
                        className="text-ember underline-offset-2 hover:underline"
                      >
                        show all
                      </button>
                    </p>
                  ) : null}
                  {ideaInsights.map(
                    ({ idea, worth, repos, fit, overlaps }, i) => {
                      const topOverlap = overlaps[0];
                      const isFit = !!fit;
                      if (fitFilterActive && !isFit) {
                        return null;
                      }
                      return (
                        <IdeaShard
                          key={idea.id}
                          id={idea.id}
                          title={idea.title}
                          description={idea.description}
                          patternType={idea.patternType}
                          domains={idea.domain}
                          applicability={idea.applicability}
                          index={i}
                          idea={idea}
                          activeRepo={activeRepoObj}
                          worthiness={worth.worthiness}
                          worthinessReason={worth.reason}
                          worthinessConfidence={worth.confidence}
                          fitDetail={fit?.detail}
                          repoMatches={repos.map((r) => ({
                            name: r.name,
                            why: r.why,
                          }))}
                          similarSkill={
                            topOverlap
                              ? {
                                  title: topOverlap.skill.title,
                                  url: topOverlap.skill.url,
                                  label: topOverlap.label,
                                  why: topOverlap.why,
                                  snippet: topOverlap.skill.snippet,
                                  method: topOverlap.method,
                                }
                              : null
                          }
                          highlight={focusShardId === idea.id}
                        />
                      );
                    },
                  )}
                </div>

                <DiscoveryPanel
                  existingSkills={discoverySkills}
                  repoMatchSummary={repoMatchSummary}
                  forgeWorthyCount={forgeWorthyCount}
                  totalIdeas={ideas.length}
                  ideas={ideas}
                  onSkillsUpdate={setDiscoverySkills}
                  onCompareNote={setCompareNote}
                />

                <WorkStages>
                  <AgentExportBar
                    className="mb-2"
                    ideas={ideas}
                    sourceTitle={sources[0]?.title}
                    sourceUrl={sources[0]?.url}
                    fondObject={phrase.object}
                    repo={activeRepo}
                    selectedIds={selectedIdeaIds}
                  />
                </WorkStages>
              </div>
            </div>

            <div className="hidden self-stretch lg:block">
              <FitTarget
                repos={allRepos}
                selectedIdeaCount={selectedIdeaIds.size}
                fitCount={activeFitCount}
                fitPreviews={fitPreviews}
                fitFilterActive={fitFilterActive}
                onShowFit={showFitShards}
                onClearFit={clearFitFilter}
                onSelectFit={selectFitShards}
                onFocusShard={focusShard}
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
        repos={allRepos}
        onClose={() => setForgeOpen(false)}
      />

      <SourceTextDrawer
        open={!!textDrawerUrl}
        onClose={() => setTextDrawerUrl(null)}
        title={
          sources.find((s) => s.url === textDrawerUrl)?.title ?? "Source"
        }
        url={textDrawerUrl ?? ""}
        text={sources.find((s) => s.url === textDrawerUrl)?.bodyText}
        contentType={
          sources.find((s) => s.url === textDrawerUrl)?.contentType
        }
      />
    </div>
  );
}
