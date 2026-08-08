"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { resolveIngest } from "@/lib/ingest-client";
import { useAppStore } from "@/lib/store";
import { demoIdeas, demoSources } from "@/lib/demo-data";
import type { IdeaFromAPI } from "@/lib/api";

type Mode = "url" | "need";

const EXTRACT_BEATS = [
  "Reading source…",
  "Pulling discrete ideas…",
  "Almost there…",
];

function toApiIdeas(
  ideas: {
    id: string;
    title: string;
    description: string;
    patternType: IdeaFromAPI["patternType"];
    domains: string[];
  }[],
  sourceUrl: string,
  sourceHash: string,
): IdeaFromAPI[] {
  return ideas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    description: idea.description,
    domain: idea.domains,
    applicability: idea.domains,
    patternType: idea.patternType,
    sourceUrl,
    sourceHash,
    embedding: [],
  }));
}

/** Google-simple entry: one box, one primary action, one sample escape hatch. */
export function StartPad({ autofocus = true }: { autofocus?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<Mode>("url");
  const [beat, setBeat] = useState(0);
  const {
    isIngesting,
    setIngesting,
    addSource,
    updateSource,
    addIdeas,
    loadSample,
  } = useAppStore();

  useEffect(() => {
    if (!autofocus || isIngesting) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [autofocus, isIngesting]);

  useEffect(() => {
    if (!isIngesting) {
      setBeat(0);
      return;
    }
    const id = window.setInterval(() => {
      setBeat((b) => Math.min(b + 1, EXTRACT_BEATS.length - 1));
    }, 1400);
    return () => window.clearInterval(id);
  }, [isIngesting]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isIngesting) return;

    setIngesting(true);
    const placeholderUrl =
      mode === "need"
        ? `need://${encodeURIComponent(trimmed.slice(0, 48))}`
        : trimmed;

    addSource({
      url: placeholderUrl,
      title: "Extracting…",
      contentType: mode === "need" ? "text" : "article",
      ideasCount: 0,
      sourceHash: "",
      isProcessing: true,
    });

    try {
      const result = await resolveIngest(
        trimmed,
        mode === "need" ? "need" : "content",
      );
      updateSource(placeholderUrl, {
        title: result.source.title,
        contentType: result.source.type,
        ideasCount: result.ideas.length,
        sourceHash: result.fromApi ? "api" : "demo",
        isProcessing: false,
        url: result.source.url,
      });
      addIdeas(
        toApiIdeas(
          result.ideas,
          result.source.url,
          result.fromApi ? "api" : "demo",
        ),
      );
      setValue("");
    } catch {
      updateSource(placeholderUrl, {
        title: "Couldn’t extract — try the sample",
        isProcessing: false,
      });
    }

    setIngesting(false);
  };

  const trySample = () => {
    loadSample(
      demoSources.map((s) => ({
        url: s.url,
        title: s.title,
        contentType: s.type,
        ideasCount: s.ideasCount ?? 0,
        sourceHash: "demo",
        isProcessing: false,
      })),
      toApiIdeas(demoIdeas, demoSources[0].url, "demo"),
      demoIdeas
        .filter((i) => i.worthiness === "forge-skill")
        .slice(0, 2)
        .map((i) => i.id),
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-xl px-4"
    >
      <p className="mb-2 text-center font-serif text-3xl leading-tight text-ink sm:text-4xl">
        What should become a skill?
      </p>
      <p className="mb-8 text-center text-sm text-foreground-secondary">
        Paste a source. Pick ideas. Forge. Under a minute.
      </p>

      <div className="mb-3 flex justify-center gap-1">
        {(
          [
            ["url", "Paste URL"],
            ["need", "Describe a need"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => !isIngesting && setMode(id)}
            disabled={isIngesting}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              mode === id
                ? "bg-ink text-paper"
                : "text-muted hover:bg-mist hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit}>
        <div
          className={`flex items-stretch gap-2 rounded-2xl border bg-paper p-2 shadow-[var(--shadow-lg)] transition-[border-color,box-shadow] ${
            isIngesting
              ? "border-ember/35 ring-2 ring-ember/10"
              : "border-ink/10 focus-within:border-ember/40 focus-within:ring-2 focus-within:ring-ember/15"
          }`}
        >
          <input
            ref={inputRef}
            type={mode === "url" ? "url" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isIngesting}
            placeholder={
              mode === "url"
                ? "https://… podcast or blog"
                : "e.g. resilient retries for our gateway"
            }
            className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base text-ink placeholder:text-muted/70 focus:outline-none disabled:opacity-50"
            aria-label={mode === "url" ? "Source URL" : "Need description"}
          />
          <button
            type="submit"
            disabled={!value.trim() || isIngesting}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-ember px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ember-hot disabled:cursor-not-allowed disabled:opacity-35"
          >
            {isIngesting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowRight size={16} />
            )}
            <span className="hidden sm:inline">
              {isIngesting ? "Extracting…" : "Extract"}
            </span>
          </button>
        </div>
      </form>

      <AnimatePresence mode="wait">
        {isIngesting ? (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-6 text-center"
            aria-live="polite"
          >
            <div className="mx-auto mb-3 h-0.5 w-40 overflow-hidden rounded-full bg-ink/10">
              <motion.div
                className="h-full bg-ember"
                initial={{ width: "12%" }}
                animate={{ width: ["18%", "55%", "82%"] }}
                transition={{
                  duration: 4.2,
                  ease: "easeInOut",
                  times: [0, 0.45, 1],
                }}
              />
            </div>
            <p className="font-serif text-lg text-ink">{EXTRACT_BEATS[beat]}</p>
            <p className="mt-1 text-[11px] text-muted">
              Stay here — ideas land in place
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="hints"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-5 flex flex-col items-center gap-2"
          >
            <button
              type="button"
              onClick={trySample}
              className="inline-flex items-center gap-2 text-sm text-ember transition-colors hover:text-ember-hot"
            >
              <Sparkles size={14} />
              Try a sample — no URL needed
            </button>
            <p className="max-w-sm text-center text-[11px] text-muted">
              Ideas appear as cards. Click a few, then Forge. Publish is optional.
            </p>
            <p className="mt-2 text-center text-[10px] text-muted/80">
              Podcasts · blogs · articles · YouTube with captions
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
