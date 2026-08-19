"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Copy, Check, ExternalLink, Loader2, Lock, Unlock } from "lucide-react";
import { composeSkill } from "@/lib/api";
import { SkillSectionAccordion } from "@/components/skill-section-accordion";
import { Tip } from "@/components/tip";

type Mode = "url" | "need";
type Phase = "idle" | "working" | "done" | "error";

const WORKING_LABELS = [
  "Reading the source…",
  "Extracting ideas…",
  "Fitting to your repo…",
  "Forging the skill…",
];

export function ComposeStudio() {
  const [mode, setMode] = useState<Mode>("url");
  const [source, setSource] = useState("");
  const [repo, setRepo] = useState("");
  const [topShards, setTopShards] = useState(2);
  const [isPrivate, setIsPrivate] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [labelIdx, setLabelIdx] = useState(0);
  const [result, setResult] = useState<Awaited<ReturnType<typeof composeSkill>> | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCompose = async () => {
    const trimmed = source.trim();
    if (!trimmed) return;
    setPhase("working");
    setResult(null);
    setCopied(false);

    let idx = 0;
    setLabelIdx(0);
    const interval = setInterval(() => {
      idx = (idx + 1) % WORKING_LABELS.length;
      setLabelIdx(idx);
    }, 2400);

    try {
      const body: Parameters<typeof composeSkill>[0] = { topShards, private: isPrivate };
      if (mode === "url") body.url = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      else body.need = trimmed;
      if (repo.trim()) body.repo = repo.trim();

      const res = await composeSkill(body);
      clearInterval(interval);

      if (res.error) {
        setResult(res);
        setPhase("error");
      } else {
        setResult(res);
        setPhase("done");
      }
    } catch (e) {
      clearInterval(interval);
      setResult({ error: e instanceof Error ? e.message : "Request failed" });
      setPhase("error");
    }
  };

  const handleCopy = async () => {
    if (!result?.markdown) return;
    try {
      await navigator.clipboard.writeText(result.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="atmosphere relative mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-xl flex-col gap-8 px-4 pb-24 pt-14">
      {/* Input */}
      <div className="space-y-4">
        <div className="flex justify-center gap-1">
          {(["url", "need"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => phase !== "working" && setMode(m)}
              disabled={phase === "working"}
              className={`min-h-9 rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                mode === m
                  ? "bg-ink text-paper"
                  : "text-muted hover:bg-mist hover:text-ink"
              }`}
            >
              {m === "url" ? "URL" : "Need"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-ink/10 bg-paper p-3 shadow-[var(--shadow-lg)]">
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            disabled={phase === "working"}
            rows={mode === "need" ? 3 : 1}
            placeholder={
              mode === "url"
                ? "Paste a YouTube, blog, or podcast URL…"
                : "Describe the technique or problem you want a skill for…"
            }
            className="w-full resize-none bg-transparent text-sm text-ink placeholder:text-muted/60 focus:outline-none disabled:opacity-50"
          />

          <div className="flex flex-wrap items-center gap-2 border-t border-ink/5 pt-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <label htmlFor="repo" className="shrink-0 text-[11px] text-muted">
                Repo
              </label>
              <input
                id="repo"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                disabled={phase === "working"}
                placeholder="owner/name or repo name"
                className="min-w-0 flex-1 rounded-lg border border-ink/8 bg-mist px-2.5 py-1.5 text-xs text-ink placeholder:text-muted/50 focus:border-ember/40 focus:outline-none disabled:opacity-50"
              />
            </div>

            <Tip tip="How many top ideas to forge into the skill">
              <div className="flex items-center gap-1.5">
                <label htmlFor="shards" className="text-[11px] text-muted">
                  Shards
                </label>
                <select
                  id="shards"
                  value={topShards}
                  onChange={(e) => setTopShards(Number(e.target.value))}
                  disabled={phase === "working"}
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
                disabled={phase === "working"}
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

          <button
            type="button"
            onClick={() => void handleCompose()}
            disabled={phase === "working" || !source.trim()}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-ember px-4 text-sm font-medium text-paper transition-colors hover:bg-ember-hot disabled:cursor-not-allowed disabled:opacity-35"
          >
            {phase === "working" ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                {WORKING_LABELS[labelIdx]}
              </>
            ) : (
              <>
                Compose skill
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {phase === "error" && result?.error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {result.error}
        </motion.div>
      )}

      {/* Result */}
      {phase === "done" && result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          <div className="rounded-2xl border border-ink/10 bg-paper p-4 shadow-[var(--shadow-lg)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-lg text-ink">{result.title}</h2>
                {result.fittedTo && (
                  <p className="text-[11px] text-muted">fitted for {result.fittedTo}</p>
                )}
              </div>
              {result.onChain === false && (
                <span className="shrink-0 rounded-full border border-ink/10 px-2 py-0.5 text-[10px] text-muted">
                  off-chain
                </span>
              )}
            </div>

            {result.markdown && <SkillSectionAccordion markdown={result.markdown} />}

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="flex min-h-10 items-center justify-center gap-2 rounded-full bg-ember px-4 text-sm font-medium text-paper hover:bg-ember-hot"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy skill markdown"}
              </button>

              {result.skillUrl && (
                <a
                  href={result.skillUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-9 items-center justify-center gap-2 rounded-full border border-ink/12 px-4 text-xs text-ink hover:border-ember/40 hover:text-ember"
                >
                  <ExternalLink size={13} />
                  Open shared skill page
                </a>
              )}
            </div>
          </div>

          {result.ideas && result.ideas.length > 0 && (
            <details className="rounded-xl border border-ink/8 bg-paper/60 px-4 py-3">
              <summary className="cursor-pointer text-xs font-medium text-muted">
                {result.ideas.length} shard{result.ideas.length !== 1 ? "s" : ""} used
              </summary>
              <ul className="mt-2 space-y-1.5">
                {result.ideas.map((idea) => (
                  <li key={idea.id} className="text-xs text-ink/80">
                    <span className="font-medium">{idea.title}</span>
                    {idea.description ? ` — ${idea.description}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </motion.div>
      )}
    </div>
  );
}
