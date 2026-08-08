"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
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
} from "@/lib/api";
import { formatSignal } from "@/lib/idea-insights";
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
import { WalletButton } from "@/components/wallet-button";
import { useAppStore } from "@/lib/store";
import { fondofPhrase } from "@/lib/fondof-phrase";
import Link from "next/link";

type Phase = "ritual" | "compose" | "attested";

interface ForgeModeProps {
  open: boolean;
  ideas: DemoIdea[];
  repos: { fullName: string; name: string }[];
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
  const sources = useAppStore((s) => s.sources);
  const phrase = fondofPhrase(sources);
  const [phase, setPhase] = useState<Phase>("ritual");
  const [repo, setRepo] = useState(activeRepo || repos[0]?.fullName || "");
  const [draft, setDraft] = useState("");
  const [hash, setHash] = useState("");
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
    const fallback = skillDraftTemplate(ideas, targetRepo || "your-repo");
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
            frameworks: ["TypeScript"],
            languages: ["TypeScript"],
          },
        ),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("timeout")), 6000);
        }),
      ]);

      if (signal.cancelled) return;
      if (!res.error && res.markdown) {
        setSkillHash(res.skillHash);
        setSourceHashes(res.sourceHashes ?? []);
        pendingMarkdown.current = res.markdown;
        return;
      }
    } catch {
      // local draft
    }
    if (!signal.cancelled) pendingMarkdown.current = fallback;
  };

  // Open → ritual covers latency; API starts immediately (not gated on fold).
  useEffect(() => {
    if (!open) {
      setPhase("ritual");
      setDraft("");
      setHash("");
      setSkillHash(null);
      setSourceHashes([]);
      setComposing(false);
      setExplorer(null);
      setLiveSignal(null);
      setUsageCount(null);
      setChallengeNote(null);
      setPublishNote(null);
      setLinkCopied(false);
      setWalletTxHash(undefined);
      pendingMarkdown.current = null;
      streamCancel.current?.();
      streamCancel.current = null;
      return;
    }

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
  }, [open, ideas]);

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

  const publish = async () => {
    setPublishing(true);
    setPublishNote(null);

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
        setHash(txHash);
        setExplorer(txExplorer(txHash));
        setPublishNote(
          address
            ? `Forged as ${shortAddress(address)} — confirm in wallet if prompted.`
            : "Forged from your wallet.",
        );
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
        // Fall through to relayer so the demo still completes
      }
    }

    try {
      if (skillHash) {
        const res = await Promise.race([
          publishSkill(skillHash, sourceHashes),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => reject(new Error("timeout")), 6000);
          }),
        ]);
        if (!res.error && res.txHash) {
          setHash(res.txHash);
          setExplorer(res.explorer ?? txExplorer(res.txHash));
          setPublishNote(
            isConnected
              ? "Published via fondof relayer (wallet forge unavailable)."
              : "Published via fondof relayer on Monad.",
          );
          setPhase("attested");
          setPublishing(false);
          void refreshSignal(skillHash);
          return;
        }
      }
    } catch {
      // local attest
    }
    const localHash =
      skillHash ??
      `0x${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
    if (!skillHash) setSkillHash(localHash);
    setHash(
      `0x${localHash.replace(/^0x/, "").slice(0, 10)}…${Date.now().toString(16).slice(-4)}`,
    );
    setLiveSignal("1.0");
    setUsageCount(0);
    setPublished(localHash, "1.0");
    setPublishNote("Local attest — chain unavailable.");
    setPhase("attested");
    setPublishing(false);
  };

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
            ? `Challenge from ${shortAddress(address)} submitted.`
            : "Challenge submitted from your wallet.",
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
        setChallengeNote("Challenge submitted on Monad (relayer).");
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
                <h2 className="font-serif text-xl text-ink">Forge</h2>
                <span className="hidden truncate text-xs text-muted sm:inline">
                  {phrase.object} · {ideas.length} shard
                  {ideas.length === 1 ? "" : "s"}
                </span>
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
                      </div>
                      <div className="min-h-[40vh] flex-1 overflow-auto px-4 py-4 pb-6 sm:px-5 lg:min-h-0">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <p className="text-[11px] uppercase tracking-wider text-muted">
                            Your skill draft
                          </p>
                          <button
                            type="button"
                            onClick={copyDraft}
                            disabled={!draft}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs text-muted transition-colors hover:bg-mist hover:text-ink disabled:opacity-30"
                          >
                            {copied ? (
                              <Check size={13} className="text-ember" />
                            ) : (
                              <Copy size={13} />
                            )}
                            {copied ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <pre className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-foreground-secondary">
                          {draft || (composing ? "Composing…" : "")}
                          {composing && draft.length > 0 && (
                            <span className="ember-pulse ml-0.5 inline-block h-3.5 w-1.5 align-middle bg-ember" />
                          )}
                        </pre>
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

                      <WalletButton variant="panel" />

                      {phase === "attested" ? (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-3"
                        >
                          <div className="panel-sm p-4">
                            <div className="mb-2 flex items-center gap-2 text-steel">
                              <Check size={16} />
                              <span className="text-sm font-medium">
                                Published to SkillPool
                              </span>
                            </div>
                            <div className="mb-3 flex items-end justify-between gap-3">
                              <div>
                                <p className="text-[11px] uppercase tracking-wider text-muted">
                                  Signal
                                </p>
                                <p className="font-serif text-3xl text-ink tabular-nums">
                                  {formatSignal(liveSignal)}
                                </p>
                              </div>
                              <p className="pb-1 text-right text-[11px] text-muted">
                                {usageCount ?? 0} uses
                                <br />
                                grows with adoption
                              </p>
                            </div>
                            <p className="mb-3 text-xs text-foreground-secondary">
                              Share — others use it, signal grows; challenges cut
                              it.
                            </p>
                            <code className="block break-all font-mono text-[11px] text-ink">
                              {skillHash ?? hash}
                            </code>
                            {publishNote && (
                              <p className="mt-2 text-[11px] text-muted">
                                {publishNote}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {skillHash && (
                              <>
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
                                  className="flex min-h-10 items-center justify-center gap-2 rounded-full bg-ember px-4 text-sm font-medium text-paper hover:bg-ember-hot"
                                >
                                  {linkCopied ? (
                                    <Check size={14} />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                  {linkCopied ? "Link copied" : "Copy skill link"}
                                </button>
                                <a
                                  href={skillTweetIntent({
                                    hash: skillHash,
                                    title: ideas[0]?.title,
                                  })}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink hover:border-ember/35"
                                >
                                  Post to X
                                </a>
                                <Link
                                  href={skillPublicPath(skillHash)}
                                  className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink hover:border-ember/35"
                                  onClick={onClose}
                                >
                                  Open public page
                                </Link>
                              </>
                            )}
                            {explorer && (
                              <a
                                href={explorer}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex min-h-10 items-center justify-center gap-2 text-xs text-muted hover:text-ink"
                              >
                                <ExternalLink size={12} />
                                Tx on Monad
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => void onChallenge()}
                              disabled={challenging || !skillHash}
                              className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink hover:border-ember/35 disabled:opacity-40"
                            >
                              <Swords size={14} />
                              {challenging
                                ? "Challenging…"
                                : walletReady
                                  ? "Challenge from wallet"
                                  : "Challenge quality"}
                            </button>
                            {challengeNote && (
                              <p className="px-1 text-[11px] text-muted">
                                {challengeNote}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ) : (
                        <div className="space-y-3">
                          <button
                            type="button"
                            onClick={copyDraft}
                            disabled={!draft}
                            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ember/35 disabled:opacity-30"
                          >
                            {copied ? (
                              <Check size={14} className="text-ember" />
                            ) : (
                              <Copy size={14} />
                            )}
                            {copied ? "Copied to clipboard" : "Copy draft"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void publish()}
                            disabled={!ready || publishing}
                            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ember px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ember-hot disabled:opacity-30"
                          >
                            <Shield size={14} />
                            {publishing
                              ? "Publishing…"
                              : walletReady
                                ? `Publish as ${shortAddress(address!)}`
                                : "Publish skill"}
                          </button>
                          {publishNote && (
                            <p className="px-1 text-[11px] text-ember">
                              {publishNote}
                            </p>
                          )}
                          <p className="px-1 font-mono text-[10px] leading-relaxed tracking-wide text-muted">
                            {walletReady
                              ? `${FORGE_BACKING} MON from you · signal grows with use`
                              : "Relayer publishes if no wallet · signal = backing + use − challenges"}
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
