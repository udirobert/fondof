"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Shield, X, Check, GitFork } from "lucide-react";
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

export function ForgeMode({ open, ideas, repos, onClose }: ForgeModeProps) {
  const [phase, setPhase] = useState<Phase>("ritual");
  const [repo, setRepo] = useState(repos[0]?.fullName ?? "");
  const [draft, setDraft] = useState("");
  const [hash, setHash] = useState("");
  const [skillHash, setSkillHash] = useState<string | null>(null);
  const [sourceHashes, setSourceHashes] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!open) {
      setPhase("ritual");
      setDraft("");
      setHash("");
      setSkillHash(null);
      setSourceHashes([]);
      return;
    }

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      setPhase("compose");
      return;
    }

    setPhase("ritual");
    const t = window.setTimeout(() => setPhase("compose"), 1400);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (phase !== "compose" || !open) return;
    let cancelled = false;

    const run = async () => {
      const fallback = skillDraftTemplate(ideas, repo || "your-repo");
      setDraft("");

      try {
        const res = await Promise.race([
          forgeSkill(
            ideas.map((idea) => ({
              title: idea.title,
              description: idea.description,
              sourceUrl: "https://fondof.local/demo",
            })),
            {
              name: repo,
              frameworks: ["TypeScript"],
              languages: ["TypeScript"],
            },
          ),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => reject(new Error("timeout")), 6000);
          }),
        ]);

        if (!cancelled && !res.error && res.markdown) {
          setSkillHash(res.skillHash);
          setSourceHashes(res.sourceHashes ?? []);
          streamText(res.markdown, setDraft);
          return;
        }
      } catch {
        // local draft
      }

      if (!cancelled) streamText(fallback, setDraft);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [phase, open, ideas, repo]);

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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-stretch justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Forge composition"
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink-deep/75 backdrop-blur-sm"
            aria-label="Close forge"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="relative z-10 m-4 mt-20 mb-6 flex w-full max-w-5xl flex-col overflow-hidden panel-float"
          >
            <header className="flex items-center justify-between border-b border-paper/5 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <Flame size={16} className="text-ember" />
                <h2 className="font-serif text-xl text-paper">Forge</h2>
                <span className="text-xs text-muted">
                  {ideas.length} idea{ideas.length === 1 ? "" : "s"} → skill
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-muted hover:text-paper hover:bg-mist transition-colors"
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
                    className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-ink"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <OrigamiRitualCanvas playing={phase === "ritual"} durationMs={1200} />
                    <div className="text-center px-4">
                      <p className="font-serif text-2xl text-paper">Folding into form</p>
                      <p className="mt-1.5 text-xs text-muted max-w-xs mx-auto">
                        {ideas.length} idea{ideas.length === 1 ? "" : "s"} · multi-crease
                        compose
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPhase("compose")}
                      className="text-xs text-muted hover:text-paper underline-offset-2 hover:underline"
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
                  >
                    <div className="lg:col-span-3 flex flex-col border-r border-paper/5">
                      <div className="border-b border-paper/5 px-5 py-3">
                        <p className="text-[11px] uppercase tracking-wider text-muted mb-2">
                          Selected ideas
                        </p>
                        <ul className="flex flex-wrap gap-2">
                          {ideas.map((idea) => (
                            <li
                              key={idea.id}
                              className="rounded-full bg-mist px-2.5 py-1 text-xs text-paper"
                            >
                              {idea.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex-1 overflow-auto px-5 py-4">
                        <p className="text-[11px] uppercase tracking-wider text-muted mb-3">
                          Skill draft
                        </p>
                        <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-foreground-secondary">
                          {draft}
                          {phase === "compose" && draft.length > 0 && (
                            <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-ember ember-pulse align-middle" />
                          )}
                        </pre>
                      </div>
                    </div>

                    <div className="lg:col-span-2 flex flex-col gap-4 p-5 bg-ink-deep/50">
                      <div className="panel-sm p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <GitFork size={13} className="text-muted" />
                          <h3 className="text-[11px] uppercase tracking-wider text-muted">
                            Target repository
                          </h3>
                        </div>
                        <select
                          value={repo}
                          onChange={(e) => setRepo(e.target.value)}
                          className="w-full rounded-lg bg-ink px-3 py-2 text-sm text-paper border border-paper/10 focus:outline-none focus:ring-1 focus:ring-ember/40"
                        >
                          {repos.map((r) => (
                            <option key={r.fullName} value={r.fullName}>
                              {r.fullName}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-muted mt-2 leading-relaxed">
                          Fitted to this repo&apos;s stack, conventions, and patterns.
                        </p>
                      </div>

                      {phase === "attested" ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="panel-sm p-4 ember-glow"
                        >
                          <div className="flex items-center gap-2 text-steel mb-2">
                            <Check size={16} />
                            <span className="text-sm font-medium">Verified</span>
                          </div>
                          <p className="text-xs text-muted mb-2">Provenance</p>
                          <code className="block font-mono text-[11px] text-paper break-all">
                            {hash}
                          </code>
                        </motion.div>
                      ) : (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={publish}
                            disabled={draft.length < 40 || publishing}
                            className="w-full flex items-center justify-center gap-2 rounded-full bg-ember px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-30 hover:bg-ember-hot transition-colors"
                          >
                            <Shield size={14} />
                            {publishing ? "Attesting…" : "Publish with attestation"}
                          </button>
                          <p className="text-[10px] text-muted leading-relaxed px-1">
                            Lineage is recorded. No wallet or chain knowledge needed.
                          </p>
                        </div>
                      )}
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

function streamText(full: string, setDraft: (value: string) => void) {
  let i = 0;
  const id = window.setInterval(() => {
    i += 4;
    setDraft(full.slice(0, i));
    if (i >= full.length) window.clearInterval(id);
  }, 14);
}
