"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Lock,
  Sparkles,
  Unlock,
} from "lucide-react";
import { SkillViewer } from "@/components/skill-viewer";
import { downloadSkillMarkdown } from "@/lib/download";
import { loginWithGitHub } from "@/lib/auth";
import { Tip } from "@/components/tip";
import type { ComposeResponse } from "@/lib/api";

export type QuickComposeInput =
  | { url: string; repo?: string; shards: number; isPrivate: boolean }
  | { need: string; repo?: string; shards: number; isPrivate: boolean };

interface QuickPadProps {
  busy: boolean;
  result: ComposeResponse | null;
  /** User's connected GitHub repos (full names) — live from the store. */
  repos: string[];
  /** Currently active fit target repo. */
  activeRepo: string;
  /** Sync a picked repo back to the store (studio fit target follows). */
  onSelectRepo?: (fullName: string) => void;
  onCompose: (input: QuickComposeInput) => void;
  onGoDeeper: (source: string, isNeed: boolean) => void;
  onNewSource: () => void;
}

const WORKING_LABELS = [
  "Reading the source…",
  "Extracting ideas…",
  "Fitting to your repo…",
  "Forging the skill…",
];

/**
 * Quick mode of the fond floor — one-shot compose, inline result.
 * No shard plane, no theater: paste → Compose → skill appears below.
 */
export function QuickPad({
  busy,
  result,
  repos,
  activeRepo,
  onSelectRepo,
  onCompose,
  onGoDeeper,
  onNewSource,
}: QuickPadProps) {
  const [isNeed, setIsNeed] = useState(false);
  const [source, setSource] = useState("");
  const [manual, setManual] = useState(false);
  const [manualRepo, setManualRepo] = useState("");
  const [shards, setShards] = useState(2);
  const [isPrivate, setIsPrivate] = useState(true);
  const [copied, setCopied] = useState(false);
  const [labelIdx, setLabelIdx] = useState(0);
  const [submitted, setSubmitted] = useState<{ source: string; isNeed: boolean } | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

  // Live from props: connected repo selection, or manual text when none picked.
  const composedRepo =
    repos.length === 0 || manual
      ? manualRepo.trim() || undefined
      : repos.includes(activeRepo)
        ? activeRepo
        : repos[0];

  // Rotate the working label while composing
  useEffect(() => {
    if (!busy) return;
    let idx = 0;
    setLabelIdx(0);
    const interval = window.setInterval(() => {
      idx = (idx + 1) % WORKING_LABELS.length;
      setLabelIdx(idx);
    }, 2400);
    return () => window.clearInterval(interval);
  }, [busy]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = source.trim();
    if (!trimmed || busy) return;
    setSubmitted({ source: trimmed, isNeed });
    const base = { repo: composedRepo, shards, isPrivate };
    if (isNeed) onCompose({ need: trimmed, ...base });
    else onCompose({ url: trimmed, ...base });
  };

  const handleCopy = async () => {
    if (!result?.markdown) return;
    try {
      await navigator.clipboard.writeText(result.markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const handleNewSource = () => {
    setSource("");
    setSubmitted(null);
    setCopied(false);
    onNewSource();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-xl px-4"
    >
      <form onSubmit={submit}>
        <div className="flex flex-col gap-2 rounded-2xl border border-ink/10 bg-paper p-3 shadow-[var(--shadow-lg)]">
          {/* URL / Need tabs */}
          <div className="flex justify-center gap-1">
            {(["url", "need"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => !busy && setIsNeed(m === "need")}
                disabled={busy}
                className={`min-h-9 rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                  (m === "need") === isNeed
                    ? "bg-ink text-paper"
                    : "text-muted hover:bg-mist hover:text-ink"
                }`}
              >
                {m === "url" ? "URL" : "Need"}
              </button>
            ))}
          </div>

          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            disabled={busy}
            rows={isNeed ? 3 : 1}
            placeholder={
              isNeed
                ? "Describe the technique or problem you want a skill for…"
                : "Paste a YouTube, blog, or podcast URL…"
            }
            className="w-full resize-none bg-transparent text-sm text-ink placeholder:text-muted/60 focus:outline-none disabled:opacity-50"
          />

          {/* Fit repo — always visible; power knobs behind Options */}
          <div className="border-t border-ink/5 pt-3">
            <div className="flex min-w-0 items-center gap-2">
              <Tip tip="Your connected GitHub repos — or type any owner/name." className="shrink-0">
                <label htmlFor="quick-repo" className="text-[11px] text-muted">
                  Fit repo
                </label>
              </Tip>
              {repos.length > 0 ? (
                <select
                  id="quick-repo"
                  value={
                    manual
                      ? "manual"
                      : repos.includes(activeRepo)
                        ? activeRepo
                        : repos[0]
                  }
                  onChange={(e) => {
                    if (e.target.value === "manual") {
                      setManual(true);
                    } else {
                      setManual(false);
                      onSelectRepo?.(e.target.value);
                    }
                  }}
                  disabled={busy}
                  className="min-w-0 flex-1 rounded-lg border border-ink/8 bg-mist px-2 py-1.5 text-xs text-ink focus:outline-none disabled:opacity-50"
                >
                  {repos.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                  <option value="manual">Type a repo name…</option>
                </select>
              ) : (
                <input
                  id="quick-repo"
                  value={manualRepo}
                  onChange={(e) => setManualRepo(e.target.value)}
                  disabled={busy}
                  placeholder="owner/name or repo name"
                  className="min-w-0 flex-1 rounded-lg border border-ink/8 bg-mist px-2.5 py-1.5 text-xs text-ink placeholder:text-muted/50 focus:border-ember/40 focus:outline-none disabled:opacity-50"
                />
              )}
            </div>
            {repos.length > 0 && manual && (
              <input
                id="quick-repo-manual"
                value={manualRepo}
                onChange={(e) => setManualRepo(e.target.value)}
                disabled={busy}
                placeholder="owner/name or repo name"
                autoFocus
                className="mt-1.5 w-full rounded-lg border border-ink/8 bg-mist px-2.5 py-1.5 text-xs text-ink placeholder:text-muted/50 focus:border-ember/40 focus:outline-none disabled:opacity-50"
              />
            )}

            <button
              type="button"
              onClick={() => setOptionsOpen((o) => !o)}
              disabled={busy}
              aria-expanded={optionsOpen}
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink disabled:opacity-50"
            >
              <ChevronDown
                size={12}
                className={`transition-transform ${optionsOpen ? "rotate-180" : ""}`}
              />
              Options
            </button>
            {optionsOpen && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Tip tip="How many top ideas to forge into the skill">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="quick-shards" className="text-[11px] text-muted">
                      Shards
                    </label>
                    <select
                      id="quick-shards"
                      value={shards}
                      onChange={(e) => setShards(Number(e.target.value))}
                      disabled={busy}
                      className="rounded-lg border border-ink/8 bg-mist px-2 py-1.5 text-xs text-ink focus:outline-none disabled:opacity-50"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </Tip>

                <Tip tip="Private drafts stay local to this flow. Share publicly only when you want attribution and re-forging.">
                  <button
                    type="button"
                    onClick={() => setIsPrivate((p) => !p)}
                    disabled={busy}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] transition-colors disabled:opacity-50 ${
                      isPrivate
                        ? "border-ink/20 bg-mist text-ink"
                        : "border-ember/30 bg-ember/5 text-ember"
                    }`}
                  >
                    {isPrivate ? <Lock size={11} /> : <Unlock size={11} />}
                    {isPrivate ? "Private draft" : "Share publicly"}
                  </button>
                </Tip>
              </div>
            )}
          </div>
          {repos.length === 0 && (
            <p className="text-[10px] leading-snug text-muted">
              Public repos work without sign-in. {" "}
              <button
                type="button"
                onClick={() => loginWithGitHub(window.location.pathname)}
                className="text-ember hover:underline"
              >
                Sign in with GitHub
              </button>{" "}
              to save ownership and share outcomes.
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !source.trim()}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-ember px-4 text-sm font-medium text-paper transition-colors hover:bg-ember-hot disabled:cursor-not-allowed disabled:opacity-35"
          >
            {busy ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                {WORKING_LABELS[labelIdx]}
              </>
            ) : (
              <>
                Forge skill
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error */}
      {result?.error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {result.error}
        </motion.div>
      )}

      {/* Result */}
      {result && !result.error && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-4"
        >
          <div className="rounded-2xl border border-ink/10 bg-paper p-4 shadow-[var(--shadow-lg)]">
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-novel/15 bg-novel/5 px-3 py-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-novel/15 text-novel">
                <Check size={12} />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">Skill ready</p>
                <p className="mt-0.5 text-xs leading-snug text-foreground-secondary">
                  Copy it now, or review the ideas behind it in Studio.
                </p>
              </div>
            </div>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-lg text-ink">{result.title}</h2>
                {result.fittedTo && (
                  <Tip tip="Written for this repo’s stack, conventions, and paths.">
                    <span className="text-[11px] text-muted">
                      fitted for {result.fittedTo}
                    </span>
                  </Tip>
                )}
              </div>
              {result.onChain === false && (
                <Tip tip="Public off-chain share — no on-chain stamp, fully copyable either way.">
                  <span className="shrink-0 rounded-full border border-ink/10 px-2 py-0.5 text-[10px] text-muted">
                    off-chain
                  </span>
                </Tip>
              )}
            </div>

            {result.markdown && (
              <SkillViewer
                markdown={result.markdown}
                title={result.title}
                repo={result.fittedTo}
                initialMode="magic"
                showActions={true}
                className="mt-3"
              />
            )}

            <div className="mt-4 flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="flex-1 flex min-h-10 items-center justify-center gap-2 rounded-full bg-ember px-4 text-sm font-medium text-paper hover:bg-ember-hot transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied markdown" : "Copy skill markdown"}
                </button>
                {result.markdown && (
                  <button
                    type="button"
                    onClick={() => downloadSkillMarkdown(result.title, result.markdown!)}
                    className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm font-medium text-ink hover:border-ember/40 hover:bg-mist/60 transition-colors"
                  >
                    <Download size={14} className="text-muted" />
                    Download .md
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2">
                {result.skillUrl && (
                  <a
                    href={result.skillUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"
                  >
                    <ExternalLink size={11} />
                    Open shared skill page
                  </a>
                )}
                <button
                  type="button"
                  onClick={() =>
                    submitted && onGoDeeper(submitted.source, submitted.isNeed)
                  }
                  className="inline-flex items-center gap-1 text-[11px] text-ember hover:underline"
                >
                  <Sparkles size={11} />
                  Review ideas in Studio
                </button>
                <button
                  type="button"
                  onClick={handleNewSource}
                  className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"
                >
                  New source
                </button>
              </div>
            </div>
          </div>

          {result.ideas && result.ideas.length > 0 && (
            <details className="rounded-xl border border-ink/8 bg-paper/60 px-4 py-3">
              <summary className="cursor-pointer text-xs font-medium text-muted hover:text-ink transition-colors">
                {result.allIdeas && result.allIdeas.length > result.ideas.length ? (
                  <span>
                    Forged from <strong className="text-ink">{result.ideas.length}</strong> of{" "}
                    <strong className="text-ink">{result.allIdeas.length} ideas</strong> found · Click to inspect mix
                  </span>
                ) : (
                  <span>{result.ideas.length} shard{result.ideas.length !== 1 ? "s" : ""} used in this skill</span>
                )}
              </summary>

              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ember">
                    Forged in this skill ({result.ideas.length})
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {result.ideas.map((idea) => (
                      <li key={idea.id} className="text-xs text-ink/90 flex items-start gap-1.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
                        <div>
                          <span className="font-medium">{idea.title}</span>
                          {idea.description ? <span className="text-muted"> — {idea.description}</span> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {result.allIdeas && result.allIdeas.length > result.ideas.length && (
                  <div className="border-t border-ink/6 pt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Other candidate ideas in source ({result.allIdeas.length - result.ideas.length})
                    </p>
                    <ul className="mt-1.5 space-y-1.5">
                      {result.allIdeas
                        .filter((cand) => !result.ideas?.some((used) => used.id === cand.id || used.title === cand.title))
                        .map((idea) => (
                          <li key={idea.id} className="text-xs text-muted flex items-start gap-1.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink/20" />
                            <div>
                              <span className="font-medium text-foreground-secondary">{idea.title}</span>
                              {idea.description ? <span> — {idea.description}</span> : null}
                            </div>
                          </li>
                        ))}
                    </ul>
                    <div className="mt-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          submitted && onGoDeeper(submitted.source, submitted.isNeed)
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-ember hover:underline"
                      >
                        <Sparkles size={11} />
                        Open Studio to customize and re-forge mix
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </details>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
