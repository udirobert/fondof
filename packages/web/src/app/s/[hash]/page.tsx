"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Dices,
  ExternalLink,
  Flame,
  Loader2,
  Swords,
  Zap,
} from "lucide-react";
import {
  acquireSkill,
  challengeSkill,
  getSkillSignal,
  getTopSkills,
  listOpenChallenges,
  recordUsage,
  resolveChallenge,
  type OnChainChallenge,
  type SkillOnChainResponse,
} from "@/lib/api";
import { formatSignal } from "@/lib/idea-insights";
import { addressExplorer, shortAddress } from "@/lib/monad-chain";
import { skillPublicPath, skillShareUrl, skillTweetIntent } from "@/lib/skill-share";
import { FondofWordmark } from "@/components/fondof-wordmark";
import { IdentityLabel } from "@/components/identity-label";
import { SignalCountUp } from "@/components/experience/signal-count-up";
import { SignalPulse } from "@/components/experience/signal-pulse";

/** Public skill identity — share, use, challenge, resolve, acquire. */
export default function SkillPublicPage() {
  const params = useParams<{ hash: string }>();
  const router = useRouter();
  const hash = decodeURIComponent(params.hash ?? "");
  const [skill, setSkill] = useState<SkillOnChainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [using, setUsing] = useState(false);
  const [challenging, setChallenging] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [acquiring, setAcquiring] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [tick, setTick] = useState(0);
  const [peers, setPeers] = useState<SkillOnChainResponse[]>([]);
  const [challenges, setChallenges] = useState<OnChainChallenge[]>([]);
  const [lastChallengeId, setLastChallengeId] = useState<number | null>(null);
  const [pulseBeat, setPulseBeat] = useState(0);
  const [signalPlayKey, setSignalPlayKey] = useState(0);

  const refreshChallenges = useCallback(async () => {
    if (!hash) return;
    try {
      const res = await listOpenChallenges(hash);
      if (!res.error) setChallenges(res.challenges ?? []);
    } catch {
      // ignore
    }
  }, [hash]);

  const refresh = useCallback(async () => {
    if (!hash) return;
    try {
      const res = await getSkillSignal(hash);
      if (!res.error) {
        setSkill(res);
        setTick((t) => t + 1);
      } else setSkill(null);
    } catch {
      setSkill(null);
    } finally {
      setLoading(false);
    }
    void refreshChallenges();
  }, [hash, refreshChallenges]);

  useEffect(() => {
    setShareUrl(skillShareUrl(hash));
    void refresh();
    void getTopSkills(4)
      .then((res) => {
        const list = (res.skills ?? [])
          .filter((s) => !s.error && s.skillHash !== hash)
          .slice(0, 3);
        setPeers(list);
      })
      .catch(() => setPeers([]));
    const id = window.setInterval(() => void refresh(), 12_000);
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
        setPulseBeat((b) => b + 1);
        setSignalPlayKey((k) => k + 1);
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
        if (typeof res.challengeId === "number") {
          setLastChallengeId(res.challengeId);
        }
        setNote(
          typeof res.challengeId === "number"
            ? `Challenge #${res.challengeId} on Monad — resolve to settle signal.`
            : "Challenge submitted on Monad — resolve to settle signal.",
        );
        void refresh();
      }
    } catch {
      setNote("Challenge unavailable.");
    } finally {
      setChallenging(false);
    }
  };

  const onResolve = async (challengeId: number, challengerWon: boolean) => {
    setResolvingId(challengeId);
    setNote(null);
    try {
      const res = await resolveChallenge(challengeId, challengerWon);
      if (res.error) setNote(res.error);
      else {
        setNote(
          challengerWon
            ? `Resolved #${challengeId}: challenger won — signal cut.`
            : `Resolved #${challengeId}: forger wins — stake adds to backing.`,
        );
        setLastChallengeId(null);
        setPulseBeat((b) => b + 1);
        setSignalPlayKey((k) => k + 1);
        void refresh();
      }
    } catch {
      setNote("Resolve failed — is relayer the contract resolver?");
    } finally {
      setResolvingId(null);
    }
  };

  const onAcquire = async () => {
    setAcquiring(true);
    setNote(null);
    try {
      const res = await acquireSkill();
      if (res.error || !res.skillHash) {
        setNote(res.error || "Pool empty");
        return;
      }
      router.push(skillPublicPath(res.skillHash));
    } catch {
      setNote("Acquire unavailable");
    } finally {
      setAcquiring(false);
    }
  };

  const openChallenges =
    challenges.length > 0
      ? challenges
      : lastChallengeId != null
        ? [
            {
              challengeId: lastChallengeId,
              skillHash: hash,
              challenger: "",
              stake: "",
              resolved: false,
              challengerWon: false,
              createdAt: 0,
            },
          ]
        : [];

  return (
    <div className="atmosphere relative min-h-[calc(100dvh-3.5rem)] pt-14">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10 pb-20">
        <div className="text-center">
          <FondofWordmark size="inline" />
          <p className="mt-2 font-mono text-[10px] tracking-wide text-muted">
            SkillPool · Monad · live{tick > 0 ? ` · refreshed` : ""}
          </p>
        </div>

        <section className="relative text-center">
          <SignalPulse beat={pulseBeat} />
          <p className="text-[11px] uppercase tracking-wider text-muted">
            Signal
          </p>
          <p className="mt-1 font-serif text-5xl text-ink">
            {loading ? (
              "…"
            ) : (
              <SignalCountUp
                value={skill?.signal}
                playKey={`${hash}-${signalPlayKey}`}
              />
            )}
          </p>
          <p className="mt-3 text-sm text-foreground-secondary">
            {skill
              ? "Backing + uses − challenge losses"
              : loading
                ? "Reading chain…"
                : "Not on SkillPool yet — share the link, forge to mint."}
          </p>
          {skill && (
            <dl className="mx-auto mt-4 grid max-w-xs grid-cols-3 gap-2 text-center font-mono text-[10px]">
              <div className="rounded-lg border border-ink/8 bg-paper/60 px-2 py-2">
                <dt className="text-muted">Backing</dt>
                <dd className="mt-0.5 text-ink tabular-nums">
                  {formatSignal(skill.backing)}
                </dd>
              </div>
              <div className="rounded-lg border border-ink/8 bg-paper/60 px-2 py-2">
                <dt className="text-muted">Uses</dt>
                <dd className="mt-0.5 text-ink tabular-nums">
                  {skill.usageCount}
                </dd>
              </div>
              <div className="rounded-lg border border-ink/8 bg-paper/60 px-2 py-2">
                <dt className="text-muted">Losses</dt>
                <dd className="mt-0.5 text-ink tabular-nums">
                  {skill.challengeLosses}
                </dd>
              </div>
            </dl>
          )}
          {skill?.forger && (
            <p className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[11px] text-muted">
              Forger <IdentityLabel address={skill.forger} avatar />
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
          <button
            type="button"
            onClick={() => void onAcquire()}
            disabled={acquiring}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-ember/25 bg-ember/5 px-4 text-sm text-ember hover:bg-ember/10 disabled:opacity-40"
          >
            {acquiring ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Dices size={14} />
            )}
            {acquiring ? "Acquiring…" : "Acquire another by signal"}
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

        {openChallenges.length > 0 && (
          <section className="rounded-xl border border-ink/10 bg-paper/70 p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted">
              Open challenges · resolve to settle
            </p>
            <ul className="mt-3 space-y-3">
              {openChallenges.map((ch) => (
                <li key={ch.challengeId} className="space-y-2">
                  <p className="font-mono text-[11px] text-ink">
                    #{ch.challengeId}
                    {ch.challenger
                      ? ` · ${shortAddress(ch.challenger)}`
                      : ""}
                    {ch.stake
                      ? ` · stake ${formatSignal(ch.stake)}`
                      : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={resolvingId === ch.challengeId}
                      onClick={() => void onResolve(ch.challengeId, true)}
                      className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-full border border-ink/12 px-3 text-[11px] text-ink hover:border-ember/35 disabled:opacity-40"
                    >
                      {resolvingId === ch.challengeId ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : null}
                      Challenger wins
                    </button>
                    <button
                      type="button"
                      disabled={resolvingId === ch.challengeId}
                      onClick={() => void onResolve(ch.challengeId, false)}
                      className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-full border border-ink/12 px-3 text-[11px] text-ink hover:border-ember/35 disabled:opacity-40"
                    >
                      Forger wins
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-muted">
              Demo resolve via relayer (contract resolver). Challenger win →
              losses++ and signal drops.
            </p>
          </section>
        )}

        {note && <p className="text-center text-[11px] text-muted">{note}</p>}

        {peers.length > 0 && (
          <section className="border-t border-ink/8 pt-6">
            <p className="text-center text-[11px] uppercase tracking-wider text-muted">
              Also live on SkillPool
            </p>
            <ul className="mt-3 space-y-2">
              {peers.map((p) => (
                <li key={p.skillHash}>
                  <Link
                    href={skillPublicPath(p.skillHash)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-ink/8 bg-paper/60 px-3 py-2 text-sm hover:border-ember/30"
                  >
                    <span className="font-medium text-ink">
                      sig {formatSignal(p.signal)}
                    </span>
                    <span className="font-mono text-[10px] text-muted">
                      {p.usageCount} uses · challenge
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-col items-center gap-2 border-t border-ink/8 pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-ember hover:text-ember-hot"
          >
            <Flame size={14} />
            Forge your own · extract → compare → attest
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
