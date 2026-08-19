"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Copy,
  Dices,
  Flame,
  Loader2,
  Shield,
  Swords,
  Zap,
} from "lucide-react";
import {
  acquireSkill,
  challengeSkill,
  getSkillSignal,
  getTopSkills,
  listOpenChallenges,
  publishSkill,
  recordUsage,
  unlistSkill,
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
import {
  skillPublicPath,
  skillShareUrl,
  skillTweetIntent,
  sourceReforgePath,
} from "@/lib/skill-share";
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
import { WhereItLandsList } from "@/components/where-it-lands";
import { SkillSectionAccordion } from "@/components/skill-section-accordion";
import { ReattachDraft } from "@/components/reattach-draft";
import { SkillOutcomePanel } from "@/components/skill-outcome";
import { getSkillMeta } from "@/lib/skill-meta";
import { whereItLands } from "@/lib/where-it-lands";
import { track } from "@/lib/track";
import { fetchSession, getToken } from "@/lib/auth";

const RECEIPT_CONSENT_KEY = "fondof_receipt_consent";
const RECEIPT_KEY = "fondof_receipt_key";

function getBrowserReceiptKey(): string {
  const existing = localStorage.getItem(RECEIPT_KEY);
  if (existing) return existing;
  const next =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(RECEIPT_KEY, next);
  return next;
}

/* ─── Collapsible on-chain provenance section ─── */
interface ProvenanceDisclosureProps {
  skill: SkillOnChainResponse;
  hash: string;
  sourceHashes: string[];
  openChallenges: OnChainChallenge[];
  resolvingId: number | null;
  signalPlayKey: number;
  pulseBeat: number;
  challenging: boolean;
  acquiring: boolean;
  onChallenge: () => Promise<void>;
  onResolve: (id: number, won: boolean) => Promise<void>;
  onAcquire: () => Promise<void>;
  onReceiptComplete: () => void;
}

function ProvenanceDisclosure({
  skill,
  hash,
  sourceHashes,
  openChallenges,
  resolvingId,
  signalPlayKey,
  pulseBeat,
  challenging,
  acquiring,
  onChallenge,
  onResolve,
  onAcquire,
  onReceiptComplete,
}: ProvenanceDisclosureProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="border-t border-ink/8 pt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
          <Shield size={13} />
          Provenance & Proof · on-chain
        </span>
        <ChevronDown
          size={14}
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {!open && (
        <p className="mt-1.5 text-[11px] text-muted">
          Signal {formatSignal(skill.signal)} · {skill.usageCount ?? 0} uses
          {skill.challengeLosses ? ` · ${skill.challengeLosses} losses` : ""} ·
          verified on Monad
        </p>
      )}
      {open && (
        <div className="mt-4 space-y-6">
          <SignalStory
            signal={skill.signal}
            backing={skill.backing}
            usageCount={skill.usageCount}
            challengeLosses={skill.challengeLosses}
            loading={false}
            playKey={`${hash}-${signalPlayKey}`}
            pulseBeat={pulseBeat}
          />

          {skill.forger && (
            <p className="flex items-center justify-center gap-1.5 text-[12px] text-muted">
              Forged by <IdentityLabel address={skill.forger} avatar />
            </p>
          )}

          <EconomicsHonesty variant="line" />

          {(sourceHashes.length > 0) && (
            <ProvenanceTree
              sourceHashes={sourceHashes}
              verifiedHref={addressExplorer(SKILL_POOL_ADDRESS)}
              verifiedLabel="Verified on Monad · SkillPool"
            />
          )}

          <ChallengeQueue
            challenges={openChallenges}
            resolvingId={resolvingId}
            onResolve={(id, won) => void onResolve(id, won)}
            losses={skill.challengeLosses}
          />

          <div className="flex flex-col gap-2">
            <Tip tip="challenge" className="w-full">
              <button
                type="button"
                onClick={() => void onChallenge()}
                disabled={challenging}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink hover:border-ember/35 disabled:opacity-40"
              >
                <Swords size={14} />
                {challenging
                  ? "Staking…"
                  : `Dispute quality · stake ${CHALLENGE_STAKE} MON`}
              </button>
            </Tip>
            <Tip tip="acquire" className="w-full">
              <button
                type="button"
                onClick={() => void onAcquire()}
                disabled={acquiring}
                className="flex min-h-10 w-full items-center justify-center gap-2 text-xs text-ember hover:underline disabled:opacity-40"
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

          <ReceiptStormButton
            skillHash={hash}
            count={12}
            gated
            onComplete={onReceiptComplete}
          />

          <OnChainDetails
            skillHash={hash}
            forger={skill.forger}
            sourceHashes={sourceHashes}
            createdAt={skill.createdAt}
            explorerLinks={[
              {
                label: "SkillPool contract",
                href: addressExplorer(SKILL_POOL_ADDRESS),
              },
              ...(skill.forger
                ? [
                    {
                      label: `Forger ${shortAddress(skill.forger)}`,
                      href: addressExplorer(skill.forger),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      )}
    </section>
  );
}

/** Public skill identity — quality story first, chain as detail. */
export default function SkillPublicPage() {
  const params = useParams<{ hash: string }>();
  const router = useRouter();
  const hash = decodeURIComponent(params.hash ?? "");
  const [skill, setSkill] = useState<SkillOnChainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [using, setUsing] = useState(false);
  const [attesting, setAttesting] = useState(false);
  const [unlisting, setUnlisting] = useState(false);
  const [receiptConsent, setReceiptConsent] = useState(false);
  const [receiptPrompt, setReceiptPrompt] = useState(false);
  const [viewerLogin, setViewerLogin] = useState<string | null>(null);
  const [challenging, setChallenging] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [acquiring, setAcquiring] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [tick, setTick] = useState(0);
  const [peers, setPeers] = useState<SkillOnChainResponse[]>([]);
  const [challenges, setChallenges] = useState<OnChainChallenge[]>([]);
  const [lastChallengeId, setLastChallengeId] = useState<number | null>(null);
  const [pulseBeat, setPulseBeat] = useState(0);
  const [signalPlayKey, setSignalPlayKey] = useState(0);
  const [metaTitle, setMetaTitle] = useState<string | null>(null);
  const [metaBlurb, setMetaBlurb] = useState<string | null>(null);
  const [metaRepo, setMetaRepo] = useState<string | null>(null);

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
    const meta = getSkillMeta(hash);
    setMetaTitle(meta?.title ?? null);
    setMetaBlurb(meta?.blurb ?? null);
    setMetaRepo(meta?.repo ?? null);
    setReceiptConsent(
      typeof window !== "undefined" &&
        localStorage.getItem(RECEIPT_CONSENT_KEY) === "yes",
    );
    const acquireStory = takeAcquireNote();
    if (acquireStory) setNote(acquireStory);
    void refresh();
    void fetchSession().then((session) => {
      setViewerLogin(session?.user?.login ?? null);
    });
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

  useEffect(() => {
    if (skill?.title) setMetaTitle(skill.title);
    if (skill?.blurb) setMetaBlurb(skill.blurb);
    if (skill?.repo) setMetaRepo(skill.repo);
  }, [skill?.title, skill?.blurb, skill?.repo]);

  const landingHits =
    skill?.landings && skill.landings.length > 0
      ? skill.landings
      : whereItLands({
          repoName: metaRepo ?? skill?.repo ?? undefined,
          frameworks: skill?.frameworks,
          ideaText: [metaTitle, metaBlurb].filter(Boolean).join(" "),
        });

  const skillMarkdown = skill?.markdown?.trim() || "";
  const showLanding = Boolean(metaRepo || skill?.repo || landingHits.length);

  // Prefer durable public-record sources; keep preamble parsing for legacy artifacts.
  const legacySourceUrls = (() => {
    const match = skillMarkdown.match(
      /<!-- Forged with fondof[^]*?Sources:\n([\s\S]*?)-->/,
    );
    if (!match) return [];
    return match[1]
      .split("\n")
      .map((line) => line.replace(/^\s*-\s*/, "").trim())
      .filter((url) => url.startsWith("http"));
  })();
  const sourceUrls =
    skill?.sourceUrls && skill.sourceUrls.length > 0
      ? skill.sourceUrls
      : legacySourceUrls;
  const canonicalSources = skill?.canonicalSources ?? [];
  const sourceDomains = (() => {
    const domains = new Set<string>();
    for (const source of canonicalSources) domains.add(source.domain);
    if (domains.size === 0) {
      for (const sourceUrl of sourceUrls) {
        try {
          domains.add(new URL(sourceUrl).hostname.replace(/^www\./, ""));
        } catch {
          // Ignore direct-need and malformed provenance values.
        }
      }
    }
    return [...domains];
  })();
  const reforgePath = sourceReforgePath(
    canonicalSources.length > 0
      ? canonicalSources.map((source) => source.url)
      : sourceUrls,
  );

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl || skillShareUrl(hash));
      setCopied(true);
      track("share_link_copied", { skillHash: hash });
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  const onCopyMarkdown = async () => {
    if (!skillMarkdown) return;
    try {
      await navigator.clipboard.writeText(skillMarkdown);
      setCopiedMd(true);
      track("skill_copied", { skillHash: hash });
      window.setTimeout(() => setCopiedMd(false), 1600);
    } catch {
      // ignore
    }
  };

  const onUse = async (afterConsent = false) => {
    const signedIn = Boolean(getToken());
    if (!signedIn && !receiptConsent && !afterConsent) {
      setReceiptPrompt(true);
      return;
    }

    setUsing(true);
    setNote(null);
    try {
      const res = await recordUsage(
        hash,
        signedIn
          ? undefined
          : { receiptKey: getBrowserReceiptKey(), consented: true },
      );
      if (res.error) setNote(res.error);
      else {
        setReceiptPrompt(false);
        setNote(
          res.note ??
            (res.txHash
              ? "Claimed use recorded — the optional on-chain receipt also landed."
              : "Claimed use recorded off-chain — this is not verified project impact."),
        );
        track("skill_used_claimed", { skillHash: hash });
        if (res.evidence) {
          setSkill((s) => (s ? { ...s, evidence: res.evidence } : s));
        }
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

  const onUnlist = async () => {
    setUnlisting(true);
    setNote(null);
    try {
      const res = await unlistSkill(hash);
      if (res.error) {
        setNote(res.error);
      } else {
        setNote("Hidden from public discovery. Any on-chain attestation remains part of the public chain history.");
        track("skill_unlisted", { skillHash: hash });
        router.push("/");
      }
    } catch {
      setNote("Couldn’t change visibility right now.");
    } finally {
      setUnlisting(false);
    }
  };

  const onAttest = async () => {
    setAttesting(true);
    setNote(null);
    try {
      const res = await publishSkill(hash, skill?.sourceHashes ?? []);
      if (res.error) setNote(res.error);
      else
        setNote(
          "Stamped on-chain — attested on the Monad SkillPool (contestable quality signal).",
        );
      void refresh();
    } catch {
      setNote("Stamp unavailable right now.");
    } finally {
      setAttesting(false);
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
          {metaTitle ? (
            <>
              <h1 className="mt-4 font-serif text-2xl leading-snug tracking-tight text-ink">
                {metaTitle}
              </h1>
              {metaBlurb && (
                <p className="mt-2 text-sm text-foreground-secondary">
                  {metaBlurb}
                </p>
              )}
              <p className="mt-2 text-[11px] text-muted">
                {skill?.onChain === false
                  ? "Public skill · off-chain (not yet stamped on-chain)"
                  : "Live skill · agents prove what works"}
                {tick > 0 ? " · updating" : ""}
              </p>
            </>
          ) : (
            <p className="mt-2 text-[11px] text-muted">
              {skill?.onChain === false
                ? "Public skill · off-chain (not yet stamped on-chain)"
                : "Live skill · agents prove what works"}
              {tick > 0 ? " · updating" : ""}
            </p>
          )}
        </div>

        {/* Forger attribution + Fork */}
        {skill?.forger && (
          <p className="text-center text-[12px] text-muted">
            Forged by <IdentityLabel address={skill.forger} avatar className="inline" />
          </p>
        )}

        {sourceDomains.length > 0 && (
          <p className="text-center text-[11px] text-muted">
            Forged from{" "}
            {sourceDomains.map((d, i) => (
              <span key={d}>
                {i > 0 && " · "}
                <Link
                  href={`/from/${encodeURIComponent(d)}`}
                  className="text-ember hover:underline"
                >
                  {d}
                </Link>
              </span>
            ))}
          </p>
        )}

        {skill?.genres && skill.genres.length > 0 && (
          <p className="flex flex-wrap items-center justify-center gap-2 text-center text-[11px] text-muted">
            {skill.genres.map((genre) => (
              <Link
                key={genre.slug}
                href={`/discover/${genre.slug}`}
                className="rounded-full border border-ink/10 bg-paper px-2.5 py-1 text-ember hover:border-ember/35"
              >
                {genre.label}
              </Link>
            ))}
          </p>
        )}

        {skill?.derivedFromSkillHash && (
          <p className="text-center text-[11px] text-muted">
            Delta forged from{" "}
            <Link
              href={skillPublicPath(skill.derivedFromSkillHash)}
              className="text-ember hover:underline"
            >
              parent skill
            </Link>
          </p>
        )}

        {skill && (
          <p className="text-center text-[11px] text-muted">
            <Link
              href={`/remix/${encodeURIComponent(hash)}`}
              className="text-ember hover:underline"
            >
              Explore parent and remix lineage
            </Link>
          </p>
        )}

        {canonicalSources.length > 0 && (
          <p className="text-center text-[10px] text-muted">
            Canonical source identity ·{" "}
            <span className="font-mono" title={canonicalSources.map((s) => s.url).join("\n")}>
              {canonicalSources[0]!.id}
            </span>
          </p>
        )}

        {showLanding && (
          <WhereItLandsList
            hits={landingHits}
            ready={!loading}
            repo={metaRepo ?? skill?.repo ?? undefined}
          />
        )}

        {skillMarkdown ? (
          <section className="space-y-2" aria-label="Skill body">
            <p className="text-[11px] uppercase tracking-wider text-muted">
              Skill for your agent
            </p>
            <SkillSectionAccordion markdown={skillMarkdown} />
          </section>
        ) : (
          !loading &&
          skill && (
            <ReattachDraft
              skillHash={hash}
              repo={metaRepo ?? skill.repo}
              frameworks={skill.frameworks}
              onAttached={(meta) => {
                setMetaTitle(meta.title);
                setMetaBlurb(meta.blurb ?? null);
                if (meta.repo) setMetaRepo(meta.repo);
                setSkill((s) =>
                  s
                    ? {
                        ...s,
                        title: meta.title,
                        blurb: meta.blurb,
                        repo: meta.repo ?? s.repo,
                        markdown: meta.markdown,
                        landings: meta.landings,
                      }
                    : s,
                );
                setNote("Skill artifact attached — copy ready for agents.");
              }}
            />
          )
        )}

        {!loading && skill && (
          <SkillOutcomePanel
            skillHash={hash}
            titleHint={metaTitle ?? skill.title}
            outcome={skill.outcome}
            evidence={skill.evidence}
            onSaved={(outcome, evidence) => {
              setSkill((s) =>
                s ? { ...s, outcome, evidence: evidence ?? s.evidence } : s,
              );
              setNote("Outcome attached — quality means it helped.");
            }}
          />
        )}

        {skill?.visibility === "public" &&
          skill.ownerLogin &&
          viewerLogin === skill.ownerLogin && (
            <section className="rounded-xl border border-ink/8 bg-mist/30 p-3">
              <p className="text-[11px] leading-snug text-muted">
                You own this public share. Hiding it removes it from the pool and source pages; any attestation history remains immutable.
              </p>
              <button
                type="button"
                onClick={() => void onUnlist()}
                disabled={unlisting}
                className="mt-2 min-h-9 rounded-full border border-ink/12 px-3 text-xs text-muted hover:border-ember/35 hover:text-ink disabled:opacity-40"
              >
                {unlisting ? "Hiding…" : "Hide public skill"}
              </button>
            </section>
          )}

        {/* Primary actions — skill usage */}
        {receiptPrompt && !getToken() && (
          <section className="rounded-xl border border-ink/10 bg-mist/40 p-3">
            <p className="text-[11px] leading-snug text-foreground-secondary">
              To avoid counting the same anonymous browser repeatedly, fondof can
              store a random receipt key in this browser. It never stores your IP
              address or repository contents.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem(RECEIPT_CONSENT_KEY, "yes");
                  setReceiptConsent(true);
                  void onUse(true);
                }}
                className="min-h-9 rounded-full bg-ember px-3 text-[11px] font-medium text-paper hover:bg-ember-hot"
              >
                Allow browser receipt
              </button>
              <button
                type="button"
                onClick={() => setReceiptPrompt(false)}
                className="min-h-9 px-2 text-[11px] text-muted hover:text-ink"
              >
                Not now
              </button>
            </div>
          </section>
        )}

        <div className="flex flex-col gap-2">
          {skillMarkdown ? (
            <button
              type="button"
              onClick={() => void onCopyMarkdown()}
              className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-ember px-4 text-sm font-medium text-paper hover:bg-ember-hot"
            >
              {copiedMd ? <Check size={14} /> : <Copy size={14} />}
              {copiedMd
                ? "Copied for your agent"
                : "Copy for your agent"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void onCopy()}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium ${
              skillMarkdown
                ? "border border-ink/12 bg-paper text-ink hover:border-ember/35"
                : "bg-ember text-paper hover:bg-ember-hot"
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Link copied" : "Copy share link"}
          </button>
          <button
            type="button"
            onClick={() => void onUse()}
            disabled={using || !skill}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink hover:border-ember/35 disabled:opacity-40"
          >
            <Zap size={14} />
            {using ? "Recording…" : "I used this — record a claimed use"}
          </button>
          <a
            href={skillTweetIntent({ hash, title: metaTitle ?? undefined })}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-10 items-center justify-center gap-2 text-xs text-muted hover:text-ink"
          >
            Post to X
          </a>
        </div>

        {/* Provenance & Proof — collapsible on-chain detail */}
        {!loading && skill && skill.onChain !== false && (
          <ProvenanceDisclosure
            skill={skill}
            hash={hash}
            sourceHashes={sourceHashes}
            openChallenges={openChallenges}
            resolvingId={resolvingId}
            signalPlayKey={signalPlayKey}
            pulseBeat={pulseBeat}
            challenging={challenging}
            acquiring={acquiring}
            onChallenge={onChallenge}
            onResolve={onResolve}
            onAcquire={onAcquire}
            onReceiptComplete={() => {
              setNote(
                "Burst of agent uses landed — watch the proven score climb.",
              );
              setPulseBeat((b) => b + 1);
              setSignalPlayKey((k) => k + 1);
              void refresh();
            }}
          />
        )}

        {/* Off-chain public skill — the thing is the markdown; attestation is a second click */}
        {!loading && skill && skill.onChain === false && (
          <section className="flex flex-col gap-2" aria-label="On-chain attestation">
            <p className="text-[11px] leading-snug text-muted">
              This is a public off-chain skill — already shareable and copyable
              above. Stamping it on-chain is optional and adds a contestable
              quality signal.
            </p>
            <button
              type="button"
              onClick={() => void onAttest()}
              disabled={attesting}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink hover:border-ember/35 disabled:opacity-40"
            >
              <Shield size={14} />
              {attesting ? "Stamping…" : "Stamp on-chain (attest)"}
            </button>
          </section>
        )}

        {!loading && !skill && (
          <p className="text-center text-sm text-foreground-secondary">
            Not on SkillPool yet — share the link, or forge and publish to mint.
          </p>
        )}

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
              {peers.map((p) => {
                const peerTitle =
                  p.title || getSkillMeta(p.skillHash)?.title;
                return (
                  <li key={p.skillHash}>
                    <Link
                      href={skillPublicPath(p.skillHash)}
                      className="flex items-center justify-between gap-2 rounded-lg border border-ink/8 bg-paper/60 px-3 py-2 text-sm hover:border-ember/30"
                    >
                      <span className="min-w-0 truncate font-medium text-ink">
                        {peerTitle || `Score ${formatSignal(p.signal)}`}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted">
                        {peerTitle
                          ? `Score ${formatSignal(p.signal)} · `
                          : ""}
                        {p.usageCount} uses
                        {p.challengeLosses > 0
                          ? ` · ${p.challengeLosses} losses`
                          : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
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
          {reforgePath && (
            <Link
              href={reforgePath}
              className="inline-flex items-center gap-2 text-xs text-muted hover:text-ink"
            >
              Re-forge from {sourceDomains[0] ?? "source"} · fit to your repo
            </Link>
          )}
          <p className="text-center text-[10px] text-muted">
            Viral ingest:{" "}
            <span className="font-mono">fondof.netlify.app/?url=…</span>
          </p>
        </div>
      </div>
    </div>
  );
}
