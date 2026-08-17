"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { liveExamples } from "@/lib/demo-data";

type Mode = "url" | "need";

interface StartPadProps {
  busy?: boolean;
  autofocus?: boolean;
  onSubmitUrl: (url: string) => void;
  onSubmitNeed: (need: string) => void;
  onTrySample: () => void;
}

/** Minimal entry point — input dominates, everything else recedes. */
export function StartPad({
  busy = false,
  autofocus = true,
  onSubmitUrl,
  onSubmitNeed,
  onTrySample,
}: StartPadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<Mode>("url");

  useEffect(() => {
    if (!autofocus || busy) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [autofocus, busy]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    if (mode === "need") onSubmitNeed(trimmed);
    else {
      const url = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      onSubmitUrl(url);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-xl px-4"
    >
      <div className="mb-3 flex justify-center gap-1">
        {(
          [
            ["url", "URL"],
            ["need", "Need"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => !busy && setMode(id)}
            disabled={busy}
            className={`min-h-10 rounded-full px-3.5 py-1.5 text-xs transition-colors ${
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
        <div className="flex flex-col gap-2 rounded-2xl border border-ink/10 bg-paper p-2 shadow-[var(--shadow-lg)] transition-[border-color,box-shadow] focus-within:border-ember/40 focus-within:ring-2 focus-within:ring-ember/15 sm:flex-row sm:items-stretch">
          <input
            ref={inputRef}
            type={mode === "url" ? "url" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
            inputMode={mode === "url" ? "url" : "text"}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder={
              mode === "url"
                ? "Paste a podcast, blog, or YouTube link"
                : "Describe what you need a skill for"
            }
            className="min-h-12 min-w-0 flex-1 bg-transparent px-3 py-3 text-base text-ink placeholder:text-muted/70 focus:outline-none disabled:opacity-50"
            aria-label={mode === "url" ? "Source URL" : "Need description"}
          />
          <button
            type="submit"
            disabled={!value.trim() || busy}
            className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-ember px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ember-hot disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ArrowRight size={16} />
            Extract
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {liveExamples.map((ex) => (
          <button
            key={ex.id}
            type="button"
            disabled={busy}
            onClick={() => {
              setMode("url");
              setValue(ex.url);
              inputRef.current?.focus();
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-ink/10 bg-paper px-3 py-1.5 text-[11px] text-muted transition-colors hover:border-ember/40 hover:text-ember disabled:opacity-40"
          >
            <span aria-hidden className="text-[10px]">
              {ex.kind === "youtube" ? "▶" : ex.kind === "podcast" ? "🎙" : "📝"}
            </span>
            {ex.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onTrySample}
          disabled={busy}
          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-ink/10 bg-paper px-3 py-1.5 text-[11px] text-ember transition-colors hover:border-ember/40 disabled:opacity-40"
        >
          <Sparkles size={10} />
          Sample
        </button>
      </div>
    </motion.div>
  );
}
