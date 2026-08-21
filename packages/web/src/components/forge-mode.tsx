"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Flame,
  GitFork,
  Shield,
  X,
} from "lucide-react";
import { parseEther } from "viem";
import {
  useConnection,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import type { DemoIdea } from "@/lib/demo-data";
import { skillDraftTemplate } from "@/lib/demo-data";
import {
  forgeSkill,
  getSkillSignal,
  publishSkill,
  publishSkillMeta,
  shareSkill,
} from "@/lib/api";
import {
  FORGE_BACKING,
  SKILL_POOL_ABI,
  SKILL_POOL_ADDRESS,
  monadTestnet,
  shortAddress,
  toBytes32,
} from "@/lib/monad-chain";
import { OrigamiRitualCanvas } from "@/components/experience/origami-ritual-canvas";
import { AttestationBurst } from "@/components/experience/attestation-burst";
import { SignalCountUp } from "@/components/experience/signal-count-up";
import { IdentityLabel } from "@/components/identity-label";
import { WalletButton } from "@/components/wallet-button";
import { SkillViewer } from "@/components/skill-viewer";
import { SkillFitStrip } from "@/components/skill-fit-strip";
import { SkillSharePanel } from "@/components/skill-share-panel";
import { SkillExportPanel } from "@/components/skill-export-panel";
import { WhereItLandsList } from "@/components/where-it-lands";
import { useAppStore } from "@/lib/store";
import { fondofPhrase } from "@/lib/fondof-phrase";
import {
  rememberSkillMeta,
  skillPreviewFromMarkdown,
} from "@/lib/skill-meta";
import { skillFitCheck } from "@/lib/skill-fit-check";
import { whereItLands } from "@/lib/where-it-lands";
import { track } from "@/lib/track";
import { publicSkillHashFromUrl } from "@/lib/skill-share";
import { checkForge, type ForgeCheck } from "@/lib/billing";

type Phase = "ritual" | "compose" | "attested";

interface ForgeModeProps {
  open: boolean;
  ideas: Array<
    DemoIdea & { sourceUrl?: string; sourceHash?: string }
  >;
  repos: {
    fullName: string;
    name: string;
    frameworks?: string[];
    languages?: { language: string; percentage: number }[];
  }[];
  onClose: () => void;
}

const RITUAL_MS = 700;

/**
 * Showmanship covers the wait — API starts with the ritual so the draft
 * is often ready when the fold ends.
 */
export function ForgeMode({ open, ideas, repos, onClose }: ForgeModeProps) {
  const activeRepo = useAppStore((s) => s.activeRepo);
  const setActiveRepo = useAppStore((s) => s.setActiveRepo);
  const gapByIdeaId = useAppStore((s) => s.gapByIdeaId);
  const clearGaps = useAppStore((s) => s.clearGaps);
  const sources = useAppStore((s) => s.sources);
  const phrase = fondofPhrase(sources);
  const [phase, setPhase] = useState<Phase>("ritual");
  const [repo, setRepo] = useState(activeRepo || repos[0]?.fullName || "");
  const [draft, setDraft] = useState("");
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const [skillHash, setSkillHash] = useState<string | null>(null);
  const [sourceHashes, setSourceHashes] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [composing, setComposing] = useState(false);
  const [liveSignal, setLiveSignal] = useState<string | null>(null);
  const [usageCount, setUsageCount] = useState<number | null>(null);
  const [publishNote, setPublishNote] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [attestKey, setAttestKey] = useState(0);
  const [forgeTitle, setForgeTitle] = useState<string | null>(null);
  const [forgeBlocked, setForgeBlocked] = useState<ForgeCheck | null>(null);
  const [forgePrivate, setForgePrivate] = useState(true);
  const { address, isConnected, chainId } = useConnection();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [walletTxHash, setWalletTxHash] = useState<`0x${string}` | undefined>();
  const { isSuccess: walletTxConfirmed } = useWaitForTransactionReceipt({
    hash: walletTxHash,
  });
  const pendingMarkdown = useRef<string | null>(null);
  const streamCancel = useRef<(() => void) | null>(null);
  const prevRepo = useRef(repo);
  const walletReady =
    isConnected && !!address && chainId === monadTestnet.id;

  useEffect(() => {
    if (!open) return;
    const next = activeRepo || repos[0]?.fullName || "";
    setRepo(next);
    prevRepo.current = next;
  }, [open, activeRepo, repos]);

  const runForge = async (targetRepo: string, signal: { cancelled: boolean }) => {
    // Read latest gaps (Forge the gap may set them in the same tick as open)
    const gaps = useAppStore.getState().gapByIdeaId;
    const gap = ideas.length === 1 ? gaps[ideas[0].id] : undefined;

    // Check forge limits before calling API
    const limit = await checkForge();
    if (!limit.allowed) {
      setForgeBlocked(limit);
      setComposing(false);
      return;
    }
    setForgeBlocked(null);

    track("forge_started", { ideaCount: ideas.length, repo: targetRepo });
    const fallback = skillDraftTemplate(
      ideas,
      targetRepo || "your-repo",
      gap,
    );
    const meta = repos.find((r) => r.fullName === targetRepo);
    try {
      const res = await forgeSkill(
          ideas.map((idea) => ({
            title: idea.title,
            description: idea.description,
            domains: idea.domains,
            applicability: idea.domains,
            patternType: idea.patternType,
            sourceHash: idea.sourceHash,
            sourceUrl:
              idea.sourceUrl && idea.sourceUrl.length > 0
                ? idea.sourceUrl
                : "https://fondof.local/demo",
          })),
          {
            name: targetRepo,
            frameworks: meta?.frameworks?.length
              ? meta.frameworks
              : ["TypeScript"],
            languages: meta?.languages?.length
              ? meta.languages.map((l) => l.language)
              : ["TypeScript"],
          },
          gap,
          {
            private: forgePrivate,
            derivedFromSkillHash: gap
              ? publicSkillHashFromUrl(gap.url) ?? undefined
              : undefined,
          },
        );

      if (signal.cancelled) return;
      if (res.code === "quota_exceeded") {
        setForgeBlocked({
          allowed: false,
          remaining: res.remaining ?? 0,
          plan: res.plan ?? "free",
        });
        setComposing(false);
        return;
      }
      if (!res.error && res.markdown) {
        setSkillHash(res.skillHash);
        setSourceHashes(res.sourceHashes ?? []);
        if (res.title) setForgeTitle(res.title);
        pendingMarkdown.current = res.markdown;
        track("forge_completed", { repo: targetRepo, hasHash: !!res.skillHash });
        return;
      }
    } catch {
      // fall through to labeled local draft
    }
    if (!signal.cancelled) {
      setDraftNote(
        "Forge API unavailable — showing a local template draft (not LLM-composed). Retry when the API recovers.",
      );
      pendingMarkdown.current = fallback;
    }
  };

  // Open → ritual covers latency; API starts immediately (not gated on fold).
  // Reset only on open→closed transition (not every render while closed).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) {
        clearGaps();
        setPhase("ritual");
        setDraft("");
        setSkillHash(null);
        setSourceHashes([]);
        setComposing(false);
        setDraftNote(null);
        setLiveSignal(null);
        setUsageCount(null);
        setPublishNote(null);
        setSharing(false);
        setCelebrate(false);
        setWalletTxHash(undefined);
        setShowFullDraft(false);
        setForgeTitle(null);
        setForgePrivate(true);
        pendingMarkdown.current = null;
        streamCancel.current?.();
        streamCancel.current = null;
      }
      wasOpen.current = false;
      return;
    }

    wasOpen.current = true;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const signal = { cancelled: false };
    setComposing(true);
    pendingMarkdown.current = null;
    void runForge(repo, signal);

    if (reduce) {
      setPhase("compose");
      return () => {
        signal.cancelled = true;
      };
    }

    setPhase("ritual");
    const t = window.setTimeout(() => setPhase("compose"), RITUAL_MS);
    return () => {
      signal.cancelled = true;
      window.clearTimeout(t);
    };
    // ideas locked at open; repo changes handled below without replaying ritual
  // The forge is intentionally locked to the ideas/repo captured on open;
  // repo changes are handled by the quiet re-fit effect below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ideas, clearGaps]);

  // Quiet re-fit only when the user changes repo (not on open).
  useEffect(() => {
    if (!open) {
      prevRepo.current = repo;
      return;
    }
    if (prevRepo.current === repo || phase === "ritual") return;
    prevRepo.current = repo;

    const signal = { cancelled: false };
    setComposing(true);
    pendingMarkdown.current = null;
    setDraft("");
    setDraftNote(null);
    void runForge(repo, signal).then(() => {
      if (signal.cancelled || !pendingMarkdown.current) return;
      setDraft(pendingMarkdown.current);
      setComposing(false);
    });
    return () => {
      signal.cancelled = true;
    };
  // Re-run only after the user changes repo outside the ritual phase.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, open, phase]);

  // When compose phase starts, reveal pending markdown (stream if motion ok).
  useEffect(() => {
    if (!open || phase !== "compose") return;

    let pollId: number | undefined;

    const reveal = () => {
      const full = pendingMarkdown.current;
      if (!full) {
        pollId = window.setInterval(() => {
          if (pendingMarkdown.current) {
            if (pollId) window.clearInterval(pollId);
            reveal();
          }
        }, 80);
        return;
      }

      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      streamCancel.current?.();
      if (reduce || full.length < 80) {
        setDraft(full);
        setComposing(false);
        return;
      }

      streamCancel.current = streamText(full, setDraft, () =>
        setComposing(false),
      );
    };

    reveal();
    return () => {
      if (pollId) window.clearInterval(pollId);
    };
  }, [phase, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (phase === "ritual") setPhase("compose");
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase, onClose]);

  const refreshSignal = async (hashToRead: string) => {
    try {
      const onChain = await getSkillSignal(hashToRead);
      if (!onChain.error && onChain.signal != null) {
        setLiveSignal(onChain.signal);
        setUsageCount(onChain.usageCount ?? 0);
        return;
      }
    } catch {
      // demo fallback below
    }
    setLiveSignal("1.0");
    setUsageCount(0);
  };

  const ensureMonadChain = async () => {
    if (chainId === monadTestnet.id) return true;
    try {
      await switchChainAsync({ chainId: monadTestnet.id });
      return true;
    } catch {
      setPublishNote("Switch to Monad Testnet in your wallet to continue.");
      return false;
    }
  };

  const stashLiveMeta = (hash: string) => {
    const preview = skillPreviewFromMarkdown(
      draft,
      forgeTitle ?? ideas[0]?.title,
    );
    const landings = whereItLands({
      repoName: repo || undefined,
      frameworks: repoMeta?.frameworks,
      languages: repoMeta?.languages?.map((l) => l.language),
      ideaText: ideas.map((i) => `${i.title} ${i.description}`).join(" "),
    });
    const artifact = {
      title: preview.title,
      blurb: preview.blurb,
      repo: repo || undefined,
      markdown: draft || undefined,
      landings,
      frameworks: repoMeta?.frameworks,
    };
    rememberSkillMeta(hash, {
      title: artifact.title,
      blurb: artifact.blurb,
      repo: artifact.repo,
      live: true,
    });
    void publishSkillMeta(hash, artifact);
  };

  const shareDraft = async () => {
    if (!skillHash || !draft || !ready) return;
    setSharing(true);
    setPublishNote(null);
    const preview = skillPreviewFromMarkdown(
      draft,
      forgeTitle ?? ideas[0]?.title,
    );
    const landings = whereItLands({
      repoName: repo || undefined,
      frameworks: repoMeta?.frameworks,
      languages: repoMeta?.languages?.map((l) => l.language),
      ideaText: ideas.map((i) => `${i.title} ${i.description}`).join(" "),
    });
    const gap =
      ideas.length === 1
        ? useAppStore.getState().gapByIdeaId[ideas[0].id]
        : undefined;

    try {
      const res = await shareSkill(skillHash, {
        title: preview.title,
        markdown: draft,
        repo: repo || undefined,
        frameworks: repoMeta?.frameworks,
        languages: repoMeta?.languages?.map((l) => l.language),
        domains: [...new Set(ideas.flatMap((idea) => idea.domains))],
        patternTypes: [...new Set(ideas.map((idea) => idea.patternType))],
        derivedFromSkillHash: gap
          ? publicSkillHashFromUrl(gap.url) ?? undefined
          : undefined,
        sourceUrls: ideas
          .map((idea) => idea.sourceUrl)
          .filter((url): url is string => !!url && url.startsWith("http")),
        sourceHashes,
      });
      if (res.error) {
        setPublishNote(res.error);
      } else {
        setForgePrivate(false);
        track("skill_shared", { skillHash });
        setPublishNote(
          "Shared publicly — the skill now has a source page and can be re-forged. Attestation remains optional.",
        );
        void publishSkillMeta(skillHash, {
          title: preview.title,
          blurb: preview.blurb,
          repo: repo || undefined,
          markdown: draft,
          landings,
          frameworks: repoMeta?.frameworks,
        });
      }
    } catch {
      setPublishNote("Couldn’t share this draft right now. It remains private.");
    } finally {
      setSharing(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    setPublishNote(null);
    const preview = skillPreviewFromMarkdown(
      draft,
      forgeTitle ?? ideas[0]?.title,
    );
    const landings = whereItLands({
      repoName: repo || undefined,
      frameworks: repoMeta?.frameworks,
      languages: repoMeta?.languages?.map((l) => l.language),
      ideaText: ideas.map((i) => `${i.title} ${i.description}`).join(" "),
    });
    const artifactMeta = {
      title: preview.title,
      blurb: preview.blurb,
      repo: repo || undefined,
      markdown: draft || undefined,
      landings,
      frameworks: repoMeta?.frameworks,
    };

    // Connected wallet → forge on-chain as the user (you are the forger).
    if (isConnected && skillHash && sourceHashes.length > 0) {
      try {
        if (!(await ensureMonadChain())) {
          setPublishing(false);
          return;
        }
        const txHash = await writeContractAsync({
          address: SKILL_POOL_ADDRESS,
          abi: SKILL_POOL_ABI,
          functionName: "forge",
          args: [toBytes32(skillHash), sourceHashes.map(toBytes32)],
          value: parseEther(FORGE_BACKING),
          chainId: monadTestnet.id,
        });
        setWalletTxHash(txHash);
        setPublishNote(
          address
            ? `Forged as ${shortAddress(address)} — confirm in wallet if prompted.`
            : "Forged from your wallet.",
        );
        stashLiveMeta(skillHash);
        setPhase("attested");
        setPublishing(false);
        void refreshSignal(skillHash);
        return;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Wallet publish failed";
        setPublishNote(
          msg.includes("User rejected") || msg.includes("rejected")
            ? "Wallet rejected the transaction — try again or publish via relayer."
            : msg.slice(0, 160),
        );
        if (msg.includes("User rejected") || msg.includes("rejected")) {
          setPublishing(false);
          return;
        }
        // Fall through to relayer so the demo still completes
      }
    }

    try {
      if (skillHash) {
        const res = await Promise.race([
          publishSkill(skillHash, sourceHashes, artifactMeta),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => reject(new Error("timeout")), 6000);
          }),
        ]);
        if (!res.error && res.txHash) {
          setPublishNote(
            isConnected
              ? "Attested via fondof relayer (wallet forge unavailable)."
              : "Attested via fondof relayer on Monad.",
          );
          stashLiveMeta(skillHash);
          setPhase("attested");
          setPublishing(false);
          void refreshSignal(skillHash);
          return;
        }
        setPublishNote(
          res.error?.slice(0, 160) ||
            "Relayer could not publish — skill is still a draft, not on SkillPool.",
        );
      } else {
        setPublishNote(
          "Draft isn’t ready to publish yet — wait for forge to finish.",
        );
      }
    } catch {
      setPublishNote(
        "Couldn’t reach Monad / relayer — this draft is local only. Fix network or wallet, then Publish again. Nothing was attested on SkillPool.",
      );
    }
    setPublishing(false);
  };

  // Peak moment: paper burst + signal count-up when we hit attested.
  useEffect(() => {
    if (phase !== "attested") return;
    setCelebrate(true);
    setAttestKey((k) => k + 1);
  }, [phase]);

  // Poll on-chain signal after publish so growth is visible in the demo.
  useEffect(() => {
    if (phase !== "attested" || !skillHash) return;
    const id = window.setInterval(() => {
      void refreshSignal(skillHash);
    }, 12_000);
    return () => window.clearInterval(id);
  }, [phase, skillHash]);

  useEffect(() => {
    if (walletTxConfirmed && skillHash) {
      void refreshSignal(skillHash);
    }
  }, [walletTxConfirmed, skillHash]);

  const ready = draft.length >= 40 && !composing;
  const draftPreview = skillPreviewFromMarkdown(
    draft,
    forgeTitle ?? ideas[0]?.title,
  );
  const isDelta = ideas.some((i) => gapByIdeaId[i.id]);
  const repoMeta = repos.find((r) => r.fullName === repo);
  const fitResult =
    draft.length > 20
      ? skillFitCheck({
          markdown: draft,
          repo: repo || undefined,
          frameworks: repoMeta?.frameworks,
          isDelta,
        })
      : null;
  const landingHits = whereItLands({
    repoName: repo || undefined,
    frameworks: repoMeta?.frameworks,
    languages: repoMeta?.languages?.map((l) => l.language),
    ideaText: ideas.map((i) => `${i.title} ${i.description}`).join(" "),
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-stretch"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Forge composition"
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            aria-label="Close forge"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden border-ink/10 bg-paper shadow-[var(--shadow-float)] sm:m-4 sm:mt-16 sm:mb-6 sm:h-auto sm:max-h-[min(860px,calc(100dvh-5rem))] sm:rounded-2xl sm:border"
          >
            <header className="flex items-center justify-between border-b border-ink/8 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pt-3.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <Flame size={16} className="shrink-0 text-ember" />
                <div className="min-w-0">
                  <h2 className="font-serif text-xl leading-tight text-ink">
                    Skill for{" "}
                    <span className="text-ember">
                      {repo?.split("/").pop() || "your repo"}
                    </span>
                  </h2>
                  <p className="truncate text-[11px] text-muted">
                    {phrase.object} · {ideas.length} shard
                    {ideas.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2.5 text-muted transition-colors hover:bg-mist hover:text-ink"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </header>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              <AttestationBurst
                active={celebrate}
                onDone={() => setCelebrate(false)}
                label="Attested on Monad"
              />
              <AnimatePresence mode="wait">
                {phase === "ritual" && (
                  <motion.div
                    key="ritual"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-parchment"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <OrigamiRitualCanvas
                      playing={phase === "ritual"}
                      durationMs={RITUAL_MS}
                    />
                    <div className="px-4 text-center">
                      <p className="font-serif text-2xl text-ink">
                        Folding into form
                      </p>
                      <p className="mx-auto mt-1.5 max-w-xs text-xs text-muted">
                        Fitting patterns to {repo || "your repo"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPhase("compose")}
                      className="min-h-9 text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
                    >
                      Skip
                    </button>
                  </motion.div>
                )}

                {forgeBlocked && !forgeBlocked.allowed && (
                  <motion.div
                    key="blocked"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-ember/20 bg-ember/5 p-5 text-center"
                  >
                    <p className="font-medium text-sm text-ember">
                      Free forges used this month
                    </p>
                    <p className="mt-2 text-[12px] text-foreground-secondary">
                      You&apos;ve used all 3 free forges. Share publicly to add
                      attribution and let others re-forge your work.
                    </p>
                    <p className="mt-3 text-[11px] text-muted">
                      Need more private forges? Explore the Pro plan.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        import("@/lib/billing").then(({ getCheckoutUrl }) => {
                          void getCheckoutUrl().then((url) => {
                            if (url) window.location.href = url;
                          });
                        });
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-ink/12 bg-paper px-3 py-1.5 text-xs text-muted hover:text-ink"
                    >
                      Upgrade to Pro
                    </button>
                  </motion.div>
                )}

                {(phase === "compose" || phase === "attested") && (
                  <motion.div
                    key="compose"
                    className="grid h-full min-h-0 grid-rows-[1fr_auto] overflow-y-auto lg:grid-cols-5 lg:grid-rows-1 lg:overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className="flex min-h-0 flex-col border-b border-ink/8 lg:col-span-3 lg:border-r lg:border-b-0">
                      <div className="border-b border-ink/8 px-4 py-3 sm:px-5">
                        <p className="mb-2 text-[11px] uppercase tracking-wider text-muted">
                          Selected ideas
                        </p>
                        <ul className="flex flex-wrap gap-2">
                          {ideas.map((idea) => (
                            <li
                              key={idea.id}
                              className="rounded-full bg-mist px-2.5 py-1 text-xs text-ink"
                            >
                              {idea.title}
                            </li>
                          ))}
                        </ul>
                        {ideas.some((i) => gapByIdeaId[i.id]) && (
                          <p className="mt-2 text-[11px] leading-snug text-ember">
                            Delta forge — filling the gap vs{" "}
                            {ideas
                              .map((i) => gapByIdeaId[i.id]?.title)
                              .find(Boolean)}
                          </p>
                        )}
                      </div>
                      <div className="min-h-[40vh] flex-1 overflow-auto px-4 py-4 pb-6 sm:px-5 lg:min-h-0">
                        {/* Privacy + visibility control */}
                        <div className="mb-4 flex items-center justify-between rounded-lg border border-ink/8 bg-mist/40 px-3 py-2">
                          <div className="text-[11px] text-foreground-secondary">
                            {forgePrivate
                              ? "Private draft — share only when you want attribution and re-forging"
                              : "Public share — appears on your skill and source pages"}
                          </div>
                          {forgePrivate ? (
                            <button
                              type="button"
                              onClick={() => void shareDraft()}
                              disabled={!ready || sharing}
                              className="shrink-0 rounded-full bg-ember px-2.5 py-1 text-[11px] font-medium text-paper transition-colors hover:bg-ember-hot disabled:opacity-40"
                            >
                              {sharing ? "Sharing…" : "Share publicly"}
                            </button>
                          ) : (
                            <span className="shrink-0 rounded-full bg-ink/8 px-2.5 py-1 text-[11px] font-medium text-ink">
                              Public
                            </span>
                          )}
                        </div>

                        <div className="mb-4">
                          <p className="text-[11px] uppercase tracking-wider text-muted">
                            Skill preview
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted">
                            What your agent receives — not a doc to finish reading
                          </p>
                        </div>

                        {composing && !draft ? (
                          <p className="font-mono text-[12px] text-muted">
                            Composing…
                          </p>
                        ) : (
                          <div className="space-y-3">
                            <h3 className="font-serif text-2xl leading-snug tracking-tight text-ink">
                              {draftPreview.title}
                              {composing && (
                                <span className="ember-pulse ml-1.5 inline-block h-3.5 w-1.5 align-middle bg-ember" />
                              )}
                            </h3>
                            <p className="text-sm leading-relaxed text-foreground-secondary">
                              {draftPreview.blurb}
                            </p>
                            <p className="text-[11px] text-muted">
                              Fitted to{" "}
                              <span className="text-ink">{repo || "your repo"}</span>
                              {" · "}
                              {ideas.length} shard
                              {ideas.length === 1 ? "" : "s"}
                            </p>

                            {fitResult && (
                              <SkillFitStrip
                                result={fitResult}
                                ready={ready || draft.length > 80}
                              />
                            )}

                            <WhereItLandsList
                              hits={landingHits}
                              ready={ready || draft.length > 80}
                              repo={repo}
                            />

                            {draftNote && (
                              <p
                                role="status"
                                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-snug text-amber-800"
                              >
                                {draftNote}
                              </p>
                            )}

                            {draft && (
                              <div className="pt-2">
                                <SkillViewer
                                  markdown={draft}
                                  title={draftPreview.title}
                                  repo={repo}
                                  initialMode="magic"
                                  showActions={true}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 bg-parchment-deep/50 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-5 lg:col-span-2">
                      <div className="panel-sm p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <GitFork size={13} className="text-muted" />
                          <h3 className="text-[11px] uppercase tracking-wider text-muted">
                            Fit to repository
                          </h3>
                        </div>
                        <select
                          value={repo}
                          onChange={(e) => {
                            setRepo(e.target.value);
                            setActiveRepo(e.target.value);
                          }}
                          className="min-h-11 w-full rounded-lg border border-ink/10 bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-ember/40"
                        >
                          {repos.map((r) => (
                            <option key={r.fullName} value={r.fullName}>
                              {r.fullName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Primary: Export to agent harness */}
                      <SkillExportPanel
                        draft={draft}
                        title={draftPreview.title}
                        ready={ready || draft.length > 80}
                      />

                      {/* Share panel (public forges only) */}
                      {skillHash && !forgePrivate && (phase === "compose" || phase === "attested") && (
                        <SkillSharePanel
                          skillHash={skillHash}
                          title={draftPreview.title}
                          sourceTitle={sources[0]?.title}
                          repoName={repo || undefined}
                        />
                      )}

                      {/* Secondary: On-chain publish (collapsed) */}
                      <details className="group">
                        <summary className="flex cursor-pointer items-center gap-2 text-[11px] text-muted hover:text-ink">
                          <ChevronDown
                            size={12}
                            className="transition-transform group-open:rotate-180"
                          />
                          Attest on SkillPool (optional)
                        </summary>
                        <div className="mt-3 space-y-3 border-t border-ink/8 pt-3">
                          <p className="text-[10px] leading-snug text-muted">
                            Optional: attest the shared artifact for portable provenance and a contestable quality signal. Wallet or relayer.
                          </p>
                          <WalletButton variant="panel" />

                      {phase === "attested" && skillHash && (
                            <p className="text-[11px] text-emerald-600">
                              Published · score{" "}
                              <span className="tabular-nums">
                                <SignalCountUp
                                  value={liveSignal}
                                  playKey={attestKey}
                                />
                              </span>
                              {(usageCount ?? 0) > 0
                                ? ` · ${usageCount} use${usageCount === 1 ? "" : "s"}`
                                : ""}
                            </p>
                          )}

                          {phase !== "attested" && (
                            <button
                              type="button"
                              onClick={() => void publish()}
                              disabled={!ready || publishing || forgePrivate}
                              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink transition-colors hover:border-ember/35 disabled:opacity-30"
                            >
                              <Shield size={14} />
                              {publishing ? (
                                "Attesting…"
                              ) : forgePrivate ? (
                                "Share publicly first"
                              ) : walletReady ? (
                                <span className="inline-flex items-center gap-1.5">
                                  Publish as{" "}
                                  <IdentityLabel
                                    address={address!}
                                    className="text-ink"
                                  />
                                </span>
                              ) : (
                                "Attest on SkillPool"
                              )}
                            </button>
                          )}
                          {publishNote && (
                            <p className="px-1 text-[11px] leading-snug text-ember">
                              {publishNote}
                            </p>
                          )}
                        </div>
                      </details>

                      <button
                        type="button"
                        onClick={onClose}
                        className="mt-auto min-h-9 text-center text-xs text-muted hover:text-ink"
                      >
                        Back to ideas
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function streamText(
  full: string,
  setDraft: (value: string) => void,
  onDone: () => void,
) {
  let i = 0;
  // Faster stream — craft without making people wait for the whole doc.
  const id = window.setInterval(() => {
    i += 12;
    setDraft(full.slice(0, i));
    if (i >= full.length) {
      window.clearInterval(id);
      onDone();
    }
  }, 12);
  return () => window.clearInterval(id);
}
