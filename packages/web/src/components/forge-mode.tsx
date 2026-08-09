"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Flame,
  GitFork,
  Shield,
  Swords,
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
  challengeSkill,
  forgeSkill,
  getSkillSignal,
  publishSkill,
  publishSkillMeta,
} from "@/lib/api";
import {
  CHALLENGE_STAKE,
  FORGE_BACKING,
  SKILL_POOL_ABI,
  SKILL_POOL_ADDRESS,
  monadTestnet,
  shortAddress,
  toBytes32,
  txExplorer,
} from "@/lib/monad-chain";
import {
  skillPublicPath,
  skillShareUrl,
  skillTweetIntent,
} from "@/lib/skill-share";
import { OrigamiRitualCanvas } from "@/components/experience/origami-ritual-canvas";
import { AttestationBurst } from "@/components/experience/attestation-burst";
import { SignalCountUp } from "@/components/experience/signal-count-up";
import { ReceiptStormButton } from "@/components/receipt-storm-button";
import { IdentityLabel } from "@/components/identity-label";
import { WalletButton } from "@/components/wallet-button";
import { SkillPoolLoop } from "@/components/skill-pool-loop";
import { SkillSectionAccordion } from "@/components/skill-section-accordion";
import { SkillFitStrip } from "@/components/skill-fit-strip";
import { SkillSharePanel } from "@/components/skill-share-panel";
import { WhereItLandsList } from "@/components/where-it-lands";
import { useAppStore } from "@/lib/store";
import { fondofPhrase } from "@/lib/fondof-phrase";
import {
  rememberSkillMeta,
  skillPreviewFromMarkdown,
} from "@/lib/skill-meta";
import { skillFitCheck } from "@/lib/skill-fit-check";
import { parseSkillSections } from "@/lib/skill-sections";
import { whereItLands } from "@/lib/where-it-lands";
import { track } from "@/lib/track";
import { checkForge, recordForge, type ForgeCheck } from "@/lib/billing";
import Link from "next/link";

type Phase = "ritual" | "compose" | "attested";

interface ForgeModeProps {
  open: boolean;
  ideas: DemoIdea[];
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
  const [skillHash, setSkillHash] = useState<string | null>(null);
  const [sourceHashes, setSourceHashes] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [composing, setComposing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [explorer, setExplorer] = useState<string | null>(null);
  const [liveSignal, setLiveSignal] = useState<string | null>(null);
  const [usageCount, setUsageCount] = useState<number | null>(null);
  const [challenging, setChallenging] = useState(false);
  const [challengeNote, setChallengeNote] = useState<string | null>(null);
  const [publishNote, setPublishNote] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [attestKey, setAttestKey] = useState(0);
  const [showFullDraft, setShowFullDraft] = useState(false);
  const [forgeTitle, setForgeTitle] = useState<string | null>(null);
  const [showPoolMore, setShowPoolMore] = useState(false);
  const [forgeBlocked, setForgeBlocked] = useState<ForgeCheck | null>(null);
  const [forgePrivate, setForgePrivate] = useState(false);
  const setPublished = useAppStore((s) => s.setPublished);
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
      const res = await Promise.race([
        forgeSkill(
          ideas.map((idea) => ({
            title: idea.title,
            description: idea.description,
            sourceUrl: "https://fondof.local/demo",
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
          { private: forgePrivate },
        ),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("timeout")), 6000);
        }),
      ]);

      if (signal.cancelled) return;
      if (!res.error && res.markdown) {
        setSkillHash(res.skillHash);
        setSourceHashes(res.sourceHashes ?? []);
        if (res.title) setForgeTitle(res.title);
        pendingMarkdown.current = res.markdown;
        track("forge_completed", { repo: targetRepo, hasHash: !!res.skillHash });
        void recordForge();
        return;
      }
    } catch {
      // local draft
    }
    if (!signal.cancelled) pendingMarkdown.current = fallback;
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
        setExplorer(null);
        setLiveSignal(null);
        setUsageCount(null);
        setChallengeNote(null);
        setPublishNote(null);
        setLinkCopied(false);
        setCelebrate(false);
        setWalletTxHash(undefined);
        setShowFullDraft(false);
        setForgeTitle(null);
        setShowPoolMore(false);
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
    void runForge(repo, signal).then(() => {
      if (signal.cancelled || !pendingMarkdown.current) return;
      setDraft(pendingMarkdown.current);
      setComposing(false);
    });
    return () => {
      signal.cancelled = true;
    };
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
        setPublished(hashToRead, onChain.signal);
        return;
      }
    } catch {
      // demo fallback below
    }
    setLiveSignal("1.0");
    setUsageCount(0);
    setPublished(hashToRead, "1.0");
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
        setExplorer(txExplorer(txHash));
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
          setExplorer(res.explorer ?? txExplorer(res.txHash));
          setPublishNote(
            isConnected
              ? "Published via fondof relayer (wallet forge unavailable)."
              : "Published via fondof relayer on Monad.",
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

  const onChallenge = async () => {
    if (!skillHash) return;
    setChallenging(true);
    setChallengeNote(null);

    if (isConnected) {
      try {
        if (!(await ensureMonadChain())) {
          setChallenging(false);
          return;
        }
        const txHash = await writeContractAsync({
          address: SKILL_POOL_ADDRESS,
          abi: SKILL_POOL_ABI,
          functionName: "challenge",
          args: [toBytes32(skillHash)],
          value: parseEther(CHALLENGE_STAKE),
          chainId: monadTestnet.id,
        });
        setExplorer(txExplorer(txHash));
        setChallengeNote(
          address
            ? `Dispute from ${shortAddress(address)} — stake locked until the demo oracle resolves.`
            : "Dispute submitted — win takes skin from the skill; lose funds its reputation.",
        );
        void refreshSignal(skillHash);
        setChallenging(false);
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Challenge failed";
        if (msg.includes("User rejected") || msg.includes("rejected")) {
          setChallengeNote("Wallet rejected the challenge.");
          setChallenging(false);
          return;
        }
        // fall through to API
      }
    }

    try {
      const res = await challengeSkill(skillHash);
      if (res.error) {
        setChallengeNote(res.error);
      } else if (res.txHash) {
        setChallengeNote(
          typeof res.challengeId === "number"
            ? `Dispute #${res.challengeId} — open the skill page; demo oracle resolves (not decentralized yet).`
            : "Dispute submitted via relayer — demo oracle settles the score.",
        );
        if (res.explorer) setExplorer(res.explorer);
        void refreshSignal(skillHash);
      }
    } catch {
      setChallengeNote("Challenge endpoint unavailable — try again later.");
    } finally {
      setChallenging(false);
    }
  };

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
  const sectionCount = draft ? parseSkillSections(draft).length : 0;

  const copyDraft = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

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
                      You've used all 3 free forges. Share a skill publicly to
                      unlock unlimited forges — build your brand while you build
                      skills.
                    </p>
                    <p className="mt-3 text-[11px] text-muted">
                      Or upgrade to Pro for unlimited private forges.
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
                        <div className="mb-4">
                          <p className="text-[11px] uppercase tracking-wider text-muted">
                            Skill preview
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted">
                            What goes live when you publish — not a doc to finish
                            reading
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
                              {" · "}
                              <button
                                type="button"
                                onClick={() => setForgePrivate((p) => !p)}
                                className={`inline-flex items-center gap-0.5 transition-colors ${forgePrivate ? "text-ember" : "text-muted hover:text-ink"}`}
                              >
                                {forgePrivate ? "private" : "public"}
                              </button>
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

                            {draft && (
                              <div className="pt-1">
                                <p className="mb-2 text-[11px] uppercase tracking-wider text-muted">
                                  Sections
                                </p>
                                <SkillSectionAccordion markdown={draft} />
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => setShowFullDraft((v) => !v)}
                              className="inline-flex min-h-9 items-center gap-1.5 text-[11px] text-muted hover:text-ink"
                              aria-expanded={showFullDraft}
                            >
                              <ChevronDown
                                size={13}
                                className={`transition-transform ${showFullDraft ? "rotate-180" : ""}`}
                              />
                              {showFullDraft
                                ? "Hide raw markdown"
                                : "View raw markdown"}
                            </button>

                            {showFullDraft && (
                              <div className="rounded-xl border border-ink/8 bg-paper/60 p-3">
                                <div className="mb-2 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={copyDraft}
                                    disabled={!draft}
                                    className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2 text-[11px] text-muted hover:bg-mist hover:text-ink disabled:opacity-30"
                                  >
                                    {copied ? (
                                      <Check size={12} className="text-ember" />
                                    ) : (
                                      <Copy size={12} />
                                    )}
                                    {copied ? "Copied" : "Copy markdown"}
                                  </button>
                                </div>
                                <pre className="max-h-48 overflow-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-foreground-secondary">
                                  {draft}
                                </pre>
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

                      <p className="px-0.5 text-[10px] leading-snug text-muted">
                        Optional:{" "}
                        <span className="text-ink">forge as you</span> with a
                        wallet — else the relayer publishes.
                      </p>
                      <WalletButton variant="panel" />

                      {phase === "attested" ? (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                          className="space-y-3"
                        >
                          <div className="pool-skill-card relative overflow-hidden p-4">
                            <span className="pool-skill-card__crease" aria-hidden />
                            <p className="text-[10px] uppercase tracking-wider text-muted">
                              Your skill · ready for agents
                            </p>
                            <h3 className="mt-1 font-serif text-xl leading-snug text-ink">
                              {draftPreview.title}
                            </h3>
                            <p className="mt-1.5 text-[12px] leading-snug text-foreground-secondary">
                              {draftPreview.blurb}
                            </p>
                            <p className="mt-2 text-[11px] text-muted">
                              {repo || "your repo"}
                              {sectionCount > 0
                                ? ` · ${sectionCount} section${sectionCount === 1 ? "" : "s"}`
                                : ""}
                              {" · "}
                              Live · score{" "}
                              <span className="tabular-nums text-ink">
                                <SignalCountUp
                                  value={liveSignal}
                                  playKey={attestKey}
                                />
                              </span>
                              {(usageCount ?? 0) > 0
                                ? ` · ${usageCount} use${usageCount === 1 ? "" : "s"}`
                                : ""}
                            </p>
                            {publishNote && (
                              <p className="mt-2 text-[10px] text-muted">
                                {publishNote}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={copyDraft}
                            disabled={!draft}
                            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ember px-4 text-sm font-medium text-paper hover:bg-ember-hot disabled:opacity-30"
                          >
                            {copied ? (
                              <Check size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                            {copied
                              ? "Copied for your agent"
                              : "Copy for Cursor / Claude / Kiro"}
                          </button>

                          {skillHash && !forgePrivate && (
                            <SkillSharePanel
                              skillHash={skillHash}
                              title={draftPreview.title}
                              sourceTitle={sources[0]?.title}
                              repoName={repo || undefined}
                            />
                          )}

                          {skillHash && (
                            <Link
                              href={skillPublicPath(skillHash)}
                              className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink hover:border-ember/35"
                              onClick={onClose}
                            >
                              <Flame size={14} />
                              Open skill · Proof on SkillPool
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => setShowPoolMore((v) => !v)}
                            className="flex w-full items-center justify-between gap-2 text-left text-[11px] text-muted hover:text-ink"
                            aria-expanded={showPoolMore}
                          >
                            <span>More on SkillPool</span>
                            <ChevronDown
                              size={13}
                              className={`transition-transform ${showPoolMore ? "rotate-180" : ""}`}
                            />
                          </button>

                          {showPoolMore && (
                            <div className="space-y-2 border-t border-ink/8 pt-2">
                              <SkillPoolLoop stage="live" />
                              {skillHash && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(
                                        skillShareUrl(skillHash),
                                      );
                                      setLinkCopied(true);
                                      window.setTimeout(
                                        () => setLinkCopied(false),
                                        1600,
                                      );
                                    } catch {
                                      // ignore
                                    }
                                  }}
                                  className="flex min-h-9 w-full items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-3 text-xs text-ink"
                                >
                                  {linkCopied ? "Link copied" : "Copy skill link"}
                                </button>
                              )}
                              {skillHash && (
                                <a
                                  href={skillTweetIntent({
                                    hash: skillHash,
                                    title: draftPreview.title,
                                  })}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex min-h-9 items-center justify-center gap-2 text-xs text-muted hover:text-ink"
                                >
                                  Post to X
                                </a>
                              )}
                              {explorer && (
                                <a
                                  href={explorer}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex min-h-9 items-center justify-center gap-2 text-xs text-muted hover:text-ink"
                                >
                                  <ExternalLink size={12} />
                                  Tx on Monad
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => void onChallenge()}
                                disabled={challenging || !skillHash}
                                className="flex min-h-9 w-full items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-3 text-xs text-ink disabled:opacity-40"
                              >
                                <Swords size={12} />
                                {challenging ? "Staking…" : "Dispute quality"}
                              </button>
                              {challengeNote && (
                                <p className="px-1 text-[11px] text-muted">
                                  {challengeNote}
                                </p>
                              )}
                              {skillHash && (
                                <ReceiptStormButton
                                  skillHash={skillHash}
                                  count={12}
                                  variant="panel"
                                  gated
                                  onComplete={(r) => {
                                    if (r.signal) setLiveSignal(r.signal);
                                    if (typeof r.usageCount === "number") {
                                      setUsageCount(r.usageCount);
                                    }
                                    setAttestKey((k) => k + 1);
                                    void refreshSignal(skillHash);
                                  }}
                                />
                              )}
                            </div>
                          )}
                        </motion.div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-[12px] leading-snug text-foreground-secondary">
                            Publish when the preview fits — then copy the skill
                            for your agent. SkillPool scores what gets used.
                          </p>

                          <button
                            type="button"
                            onClick={() => void publish()}
                            disabled={!ready || publishing}
                            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ember px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ember-hot disabled:opacity-30"
                          >
                            <Shield size={14} />
                            {publishing ? (
                              "Publishing…"
                            ) : walletReady ? (
                              <span className="inline-flex items-center gap-1.5">
                                Publish as{" "}
                                <IdentityLabel
                                  address={address!}
                                  className="text-paper"
                                />
                              </span>
                            ) : (
                              "Publish to SkillPool"
                            )}
                          </button>
                          {publishNote && (
                            <p className="px-1 text-[11px] leading-snug text-ember">
                              {publishNote}
                            </p>
                          )}
                          <p className="px-1 text-[10px] leading-snug text-muted">
                            Skin in escrow enables scoring — signaling, not a
                            listing fee you earn back.
                          </p>
                        </div>
                      )}

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
