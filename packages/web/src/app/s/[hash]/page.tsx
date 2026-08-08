"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Dices,
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
import {
  addressExplorer,
  CHALLENGE_STAKE,
  SKILL_POOL_ADDRESS,
  shortAddress,
} from "@/lib/monad-chain";
import { skillPublicPath, skillShareUrl, skillTweetIntent } from "@/lib/skill-share";
import { FondofWordmark } from "@/components/fondof-wordmark";
import { IdentityLabel } from "@/components/identity-label";
import { ReceiptStormButton } from "@/components/receipt-storm-button";
import { SignalStory } from "@/components/signal-story";
import { ProvenanceTree } from "@/components/provenance-tree";
import { ChallengeQueue } from "@/components/challenge-queue";
import { OnChainDetails } from "@/components/on-chain-details";
import {
  stashAcquireNote,
  takeAcquireNote,
} from "@/lib/acquire-note";
import { Tip } from "@/components/tip";
import { EconomicsHonesty } from "@/components/economics-honesty";

/** Public skill identity — quality story first, chain as detail. */
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
    const acquireStory = takeAcquireNote();
    if (acquireStory) setNote(acquireStory);
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
        setNote("Recorded — an agent use just bumped this skill’s proven score.");
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
          `You staked ${CHALLENGE_STAKE} MON to dispute — win and take skin from the skill; lose and you fund its reputation. Demo oracle resolves.`,
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
            ? `Challenge #${challengeId} upheld — challenger takes skin from escrow; score cut. (Demo oracle.)`
            : `Challenge #${challengeId} dismissed — stake funds this skill’s reputation (backing), not the forger’s wallet.`,
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
      const sig = formatSignal(res.skill?.signal);
      stashAcquireNote(
        `Drawn for your agent because this skill has high proven quality (signal ${sig}, weighted random — not search rank).`,
      );
      router.push(skillPublicPath(res.skillHash));
    } catch {
      setNote("Draw unavailable");
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

  const sourceHashes = skill?.sourceHashes ?? [];

  return (
    <div className="atmosphere relative min-h-[calc(100dvh-3.5rem)] pt-14">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10 pb-20">
        <div className="text-center">
          <FondofWordmark size="inline" />
          <p className="mt-2 text-[11px] text-muted">
            Live skill · agents prove what works
            {tick > 0 ? " · updating" : ""}
          </p>
        </div>

        <SignalStory
          signal={skill?.signal}
          backing={skill?.backing}
          usageCount={skill?.usageCount}
          challengeLosses={skill?.challengeLosses}
          loading={loading}
          playKey={`${hash}-${signalPlayKey}`}
          pulseBeat={pulseBeat}
        />

        {skill?.forger && (
          <p className="flex items-center justify-center gap-1.5 text-[12px] text-muted">
            Forged by <IdentityLabel address={skill.forger} avatar />
          </p>
        )}

        <EconomicsHonesty variant="line" />

        {!loading && !skill && (
          <p className="text-center text-sm text-foreground-secondary">
            Not on SkillPool yet — share the link, or forge and publish to mint.
          </p>
        )}

        {(skill || sourceHashes.length > 0) && (
          <ProvenanceTree
            sourceHashes={sourceHashes}
            verifiedHref={
              skill
                ? addressExplorer(SKILL_POOL_ADDRESS)
                : undefined
            }
            verifiedLabel="Verified on Monad · SkillPool"
          />
        )}

        <ChallengeQueue
          challenges={openChallenges}
          resolvingId={resolvingId}
          onResolve={(id, won) => void onResolve(id, won)}
          losses={skill?.challengeLosses}
        />

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void onUse()}
            disabled={using || !skill}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-ember px-4 text-sm font-medium text-paper hover:bg-ember-hot disabled:opacity-40"
          >
            <Zap size={14} />
            {using ? "Recording…" : "I used this — grow the score"}
          </button>
          <Tip tip="challenge" className="w-full">
            <button
              type="button"
              onClick={() => void onChallenge()}
              disabled={challenging || !skill}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink hover:border-ember/35 disabled:opacity-40"
            >
              <Swords size={14} />
              {challenging
                ? "Staking…"
                : `Dispute quality · stake ${CHALLENGE_STAKE} MON`}
            </button>
          </Tip>
          <button
            type="button"
            onClick={() => void onCopy()}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink hover:border-ember/35"
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
          <Tip tip="acquire" className="w-full">
            <button
              type="button"
              onClick={() => void onAcquire()}
              disabled={acquiring}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-ember/25 bg-ember/5 px-4 text-sm text-ember hover:bg-ember/10 disabled:opacity-40"
            >
              {acquiring ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Dices size={14} />
              )}
              {acquiring ? "Drawing…" : "Draw next skill for my agent"}
            </button>
          </Tip>
        </div>

        {skill && (
          <ReceiptStormButton
            skillHash={hash}
            count={12}
            gated
            onComplete={() => {
              setNote(
                "Burst of agent uses landed — watch the proven score climb.",
              );
              setPulseBeat((b) => b + 1);
              setSignalPlayKey((k) => k + 1);
              void refresh();
            }}
          />
        )}

        <OnChainDetails
          skillHash={hash}
          forger={skill?.forger}
          sourceHashes={sourceHashes}
          createdAt={skill?.createdAt}
          explorerLinks={[
            {
              label: "SkillPool contract",
              href: addressExplorer(SKILL_POOL_ADDRESS),
            },
            ...(skill?.forger
              ? [
                  {
                    label: `Forger ${shortAddress(skill.forger)}`,
                    href: addressExplorer(skill.forger),
                  },
                ]
              : []),
          ]}
        />

        {note && (
          <p
            className="rounded-lg bg-mist/60 px-3 py-2 text-center text-[12px] leading-snug text-ink"
            role="status"
          >
            {note}
          </p>
        )}

        {peers.length > 0 && (
          <section className="border-t border-ink/8 pt-6">
            <p className="text-center text-[11px] uppercase tracking-wider text-muted">
              Also proven on SkillPool
            </p>
            <ul className="mt-3 space-y-2">
              {peers.map((p) => (
                <li key={p.skillHash}>
                  <Link
                    href={skillPublicPath(p.skillHash)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-ink/8 bg-paper/60 px-3 py-2 text-sm hover:border-ember/30"
                  >
                    <span className="font-medium text-ink">
                      Score {formatSignal(p.signal)}
                    </span>
                    <span className="text-[11px] text-muted">
                      {p.usageCount} uses
                      {p.challengeLosses > 0
                        ? ` · ${p.challengeLosses} losses`
                        : ""}
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
            Forge your own · extract → select → publish
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
