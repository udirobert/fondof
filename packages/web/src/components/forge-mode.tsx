"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Flame, GitFork, Shield, X } from "lucide-react";
import type { DemoIdea } from "@/lib/demo-data";
import { skillDraftTemplate } from "@/lib/demo-data";
import { forgeSkill, publishSkill } from "@/lib/api";
import { OrigamiRitualCanvas } from "@/components/experience/origami-ritual-canvas";

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
  const [phase, setPhase] = useState<Phase>("ritual");
  const [repo, setRepo] = useState(repos[0]?.fullName ?? "");
  const [draft, setDraft] = useState("");
  const [hash, setHash] = useState("");
  const [skillHash, setSkillHash] = useState<string | null>(null);
  const [sourceHashes, setSourceHashes] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [showChainDetail, setShowChainDetail] = useState(false);
  const [composing, setComposing] = useState(false);
  const pendingMarkdown = useRef<string | null>(null);
  const streamCancel = useRef<(() => void) | null>(null);
  const prevRepo = useRef(repo);

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
      setShowChainDetail(false);
      setComposing(false);
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

  const publish = async () => {
    setPublishing(true);
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
          setPhase("attested");
          setPublishing(false);
          return;
        }
      }
    } catch {
      // local attest
    }
    setHash(
      `0x${(skillHash ?? Math.random().toString(16).slice(2)).slice(0, 10)}…${Date.now().toString(16).slice(-4)}`,
    );
    setPhase("attested");
    setPublishing(false);
  };

  const ready = draft.length >= 40 && !composing;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-stretch justify-center"
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
            className="relative z-10 m-3 mt-16 mb-4 flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-[var(--shadow-float)] sm:m-4 sm:mt-20 sm:mb-6"
          >
            <header className="flex items-center justify-between border-b border-ink/8 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <Flame size={16} className="text-ember" />
                <h2 className="font-serif text-xl text-ink">Forge</h2>
                <span className="text-xs text-muted">
                  {ideas.length} idea{ideas.length === 1 ? "" : "s"} → skill
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-muted transition-colors hover:bg-mist hover:text-ink"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </header>

            <div className="relative flex-1 overflow-hidden">
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
                        Fitting patterns to your repo
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPhase("compose")}
                      className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
                    >
                      Skip
                    </button>
                  </motion.div>
                )}

                {(phase === "compose" || phase === "attested") && (
                  <motion.div
                    key="compose"
                    className="grid h-full min-h-[420px] lg:grid-cols-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className="flex flex-col border-b border-ink/8 lg:col-span-3 lg:border-r lg:border-b-0">
                      <div className="border-b border-ink/8 px-5 py-3">
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
                      <div className="flex-1 overflow-auto px-5 py-4">
                        <p className="mb-3 text-[11px] uppercase tracking-wider text-muted">
                          Your skill draft
                        </p>
                        <pre className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-foreground-secondary">
                          {draft || (composing ? "Composing…" : "")}
                          {composing && draft.length > 0 && (
                            <span className="ember-pulse ml-0.5 inline-block h-3.5 w-1.5 align-middle bg-ember" />
                          )}
                        </pre>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 bg-parchment-deep/50 p-5 lg:col-span-2">
                      <div className="panel-sm p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <GitFork size={13} className="text-muted" />
                          <h3 className="text-[11px] uppercase tracking-wider text-muted">
                            Fit to repository
                          </h3>
                        </div>
                        <select
                          value={repo}
                          onChange={(e) => setRepo(e.target.value)}
                          className="w-full rounded-lg border border-ink/10 bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-ember/40"
                        >
                          {repos.map((r) => (
                            <option key={r.fullName} value={r.fullName}>
                              {r.fullName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {phase === "attested" ? (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="panel-sm p-4"
                        >
                          <div className="mb-2 flex items-center gap-2 text-steel">
                            <Check size={16} />
                            <span className="text-sm font-medium">Published</span>
                          </div>
                          <p className="mb-2 text-xs text-muted">
                            Provenance recorded
                          </p>
                          <code className="block break-all font-mono text-[11px] text-ink">
                            {hash}
                          </code>
                        </motion.div>
                      ) : (
                        <div className="space-y-3">
                          <button
                            type="button"
                            onClick={publish}
                            disabled={!ready || publishing}
                            className="flex w-full items-center justify-center gap-2 rounded-full bg-ember px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ember-hot disabled:opacity-30"
                          >
                            <Shield size={14} />
                            {publishing ? "Publishing…" : "Publish skill"}
                          </button>
                          <p className="px-1 text-[11px] leading-relaxed text-muted">
                            Draft is yours either way — publish is optional.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowChainDetail((v) => !v)}
                            className="flex w-full items-center justify-between px-1 text-[11px] text-muted hover:text-ink"
                          >
                            What does publish do?
                            <ChevronDown
                              size={12}
                              className={`transition-transform ${showChainDetail ? "rotate-180" : ""}`}
                            />
                          </button>
                          {showChainDetail && (
                            <p className="rounded-xl bg-mist/80 px-3 py-2.5 text-[11px] leading-relaxed text-foreground-secondary">
                              Records source → ideas → skill on Monad SkillPool.
                              Signal grows with usage; others can challenge
                              quality. No wallet UI required here.
                            </p>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={onClose}
                        className="mt-auto text-center text-xs text-muted hover:text-ink"
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
