"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Copy, ExternalLink, Flame, Swords, Zap } from "lucide-react";
import {
  challengeSkill,
  getSkillSignal,
  recordUsage,
  type SkillOnChainResponse,
} from "@/lib/api";
import { formatSignal } from "@/lib/idea-insights";
import { addressExplorer, shortAddress } from "@/lib/monad-chain";
import { skillShareUrl, skillTweetIntent } from "@/lib/skill-share";
import { FondofWordmark } from "@/components/fondof-wordmark";

/** Public skill identity — share, use (grow signal), challenge. */
export default function SkillPublicPage() {
  const params = useParams<{ hash: string }>();
  const hash = decodeURIComponent(params.hash ?? "");
  const [skill, setSkill] = useState<SkillOnChainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [using, setUsing] = useState(false);
  const [challenging, setChallenging] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const refresh = useCallback(async () => {
    if (!hash) return;
    try {
      const res = await getSkillSignal(hash);
      if (!res.error) setSkill(res);
      else setSkill(null);
    } catch {
      setSkill(null);
    } finally {
      setLoading(false);
    }
  }, [hash]);

  useEffect(() => {
    setShareUrl(skillShareUrl(hash));
    void refresh();
    const id = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(id);
  }, [hash, refresh]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl || skillShareUrl(hash));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  const onUse = async () => {
    setUsing(true);
    setNote(null);
    try {
      const res = await recordUsage(hash);
      if (res.error) setNote(res.error);
      else {
        setNote("Usage recorded — signal ticks up.");
        void refresh();
      }
    } catch {
      setNote("Couldn’t record usage right now.");
    } finally {
      setUsing(false);
    }
  };

  const onChallenge = async () => {
    setChallenging(true);
    setNote(null);
    try {
      const res = await challengeSkill(hash);
      if (res.error) setNote(res.error);
      else {
        setNote("Challenge submitted on Monad.");
        void refresh();
      }
    } catch {
      setNote("Challenge unavailable.");
    } finally {
      setChallenging(false);
    }
  };

  return (
    <div className="atmosphere relative min-h-[calc(100dvh-3.5rem)] pt-14">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10 pb-20">
        <div className="text-center">
          <FondofWordmark size="inline" />
          <p className="mt-2 font-mono text-[10px] tracking-wide text-muted">
            SkillPool · Monad
          </p>
        </div>

        <section className="text-center">
          <p className="text-[11px] uppercase tracking-wider text-muted">
            Signal
          </p>
          <p className="mt-1 font-serif text-5xl text-ink tabular-nums">
            {loading ? "…" : formatSignal(skill?.signal)}
          </p>
          <p className="mt-2 text-sm text-foreground-secondary">
            {skill
              ? `${skill.usageCount} uses · ${skill.challengeLosses} challenge losses`
              : loading
                ? "Reading chain…"
                : "Not on SkillPool yet — share the link, forge to mint."}
          </p>
          {skill?.forger && (
            <p className="mt-1 font-mono text-[11px] text-muted">
              Forger {shortAddress(skill.forger)}
            </p>
          )}
        </section>

        <code className="block break-all rounded-xl border border-ink/8 bg-paper/80 px-3 py-2.5 text-center font-mono text-[11px] text-ink">
          {hash}
        </code>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void onCopy()}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-ember px-4 text-sm font-medium text-paper hover:bg-ember-hot"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Link copied" : "Copy share link"}
          </button>
          <a
            href={skillTweetIntent({ hash })}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink hover:border-ember/35"
          >
            Post to X
          </a>
          <button
            type="button"
            onClick={() => void onUse()}
            disabled={using || !skill}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink hover:border-ember/35 disabled:opacity-40"
          >
            <Zap size={14} />
            {using ? "Recording…" : "I used this — grow signal"}
          </button>
          <button
            type="button"
            onClick={() => void onChallenge()}
            disabled={challenging || !skill}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink hover:border-ember/35 disabled:opacity-40"
          >
            <Swords size={14} />
            {challenging ? "Challenging…" : "Challenge quality"}
          </button>
          {skill?.forger && (
            <a
              href={addressExplorer(skill.forger)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-10 items-center justify-center gap-2 text-xs text-muted hover:text-ink"
            >
              <ExternalLink size={12} />
              Forger on Monad
            </a>
          )}
        </div>

        {note && <p className="text-center text-[11px] text-muted">{note}</p>}

        <div className="flex flex-col items-center gap-2 border-t border-ink/8 pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-ember hover:text-ember-hot"
          >
            <Flame size={14} />
            Forge your own
          </Link>
          <p className="text-center text-[10px] text-muted">
            Viral ingest:{" "}
            <span className="font-mono">fondof.app/?url=…</span>
          </p>
        </div>
      </div>
    </div>
  );
}
