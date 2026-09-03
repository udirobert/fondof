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
  Mic,
  MoreHorizontal,
  Shield,
  Sparkles,
  Swords,
  Volume2,
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
import { SkillViewer } from "@/components/skill-viewer";
import { ReattachDraft } from "@/components/reattach-draft";
import { SkillOutcomePanel } from "@/components/skill-outcome";
import { getSkillMeta } from "@/lib/skill-meta";
import { whereItLands } from "@/lib/where-it-lands";
import { track } from "@/lib/track";
import { useSession } from "@/lib/use-session";
import { fetchSession } from "@/lib/auth";
import { formatTalkToSkillPrompt } from "@/lib/agent-export";
import { SkillAgentPanel } from "@/components/skill-agent-panel";

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
  canResolve: boolean;
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
  canResolve,
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
        <Tip tip="provenance">
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
            <Shield size={13} />
            Provenance & Proof · on-chain
          </span>
        </Tip>
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
            canResolve={canResolve}
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
                {acquiring ? "Picking…" : "Pick a proven skill for my agent"}
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
  const { user } = useSession();
  const hash = decodeURIComponent(params.hash ?? "");
  const [skill, setSkill] = useState<SkillOnChainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [using, setUsing] = useState(false);
  const [attesting, setAttesting] = useState(false);
  const [unlisting, setUnlisting] = useState(false);
  const [receiptConsent, setReceiptConsent] = useState(false);
  const [receiptPrompt, setReceiptPrompt] = useState(false);
  const [viewerLogin, setViewerLogin] = useState<string | null>(null);
  const [viewerResolver, setViewerResolver] = useState(false);
  const [challenging, setChallenging] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [acquiring, setAcquiring] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedTalkPrompt, setCopiedTalkPrompt] = useState(false);
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
  const [agentUrl, setAgentUrl] = useState<string | null>(null);
  // progressive disclosure
  const [metaOpen, setMetaOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"talk" | "copy" | "prove" | null>(null);
  const [ownerToolsOpen, setOwnerToolsOpen] = useState(false);

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
      setViewerResolver(session?.resolver ?? false);
    });
    void getTopSkills(4)
      .then((res) => {
        const list = (res.skills ?? [])
          .filter((s) => !s.error && s.skillHash !== hash)
          .slice(0, 3);
        setPeers(list);
      })
      .catch(() => setPeers([]));
    const id = window.setInterval(() => {
      // Skip polling while the tab is hidden — no point refreshing data
      // nobody is looking at.
      if (document.visibilityState === "hidden") return;
      void refresh();
    }, 12_000);
    return () => window.clearInterval(id);
  }, [hash, refresh]);

  useEffect(() => {
    if (skill?.title) setMetaTitle(skill.title);
    if (skill?.blurb) setMetaBlurb(skill.blurb);
    if (skill?.repo) setMetaRepo(skill.repo);
    if (skill?.agentUrl) setAgentUrl(skill.agentUrl);
  }, [skill?.title, skill?.blurb, skill?.repo, skill?.agentUrl]);

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

  const onCopyTalkPrompt = async () => {
    const prompt = formatTalkToSkillPrompt({
      title: metaTitle ?? skill?.title,
      markdown: skillMarkdown,
      skillUrl: shareUrl || skillShareUrl(hash),
      repo: metaRepo ?? skill?.repo,
      sourceUrls,
    });
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedTalkPrompt(true);
      track("skill_copied", { skillHash: hash, kind: "talk-to-skill" });
      window.setTimeout(() => setCopiedTalkPrompt(false), 1800);
    } catch {
      // ignore
    }
  };

  const onUse = async (afterConsent = false) => {
    const signedIn = Boolean(user);
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
        setNote(res.error || "No public skills are available yet");
        return;
      }
      const sig = formatSignal(res.skill?.signal);
      stashAcquireNote(
        `Picked for your agent because this skill has a strong quality signal (score ${sig}, weighted selection — not search rank).`,
      );
      router.push(skillPublicPath(res.skillHash));
    } catch {
      setNote("Picking a skill is unavailable right now");
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

  const isOwner = Boolean(viewerLogin) && viewerLogin === skill?.ownerLogin;

  const onSaveAgentUrl = (url: string) => {
    setAgentUrl(url);
    setSkill((s) => (s ? { ...s, agentUrl: url } : s));
  };

  return (
    <div className="atmosphere relative min-h-[calc(100dvh-3.5rem)] pt-14">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10 pb-20">

        {/* ── Header ── */}
        <div className="text-center">
          <FondofWordmark size="inline" />
          {metaTitle ? (
            <>
              <h1 className="mt-4 font-serif text-2xl leading-snug tracking-tight text-ink">
                {metaTitle}
              </h1>
              {metaBlurb && (
                <p className="mt-2 text-sm text-foreground-secondary">{metaBlurb}</p>
              )}
            </>
          ) : null}
          <Tip
            tip={
              skill?.onChain === false
                ? "Public off-chain skill — shareable and copyable; the on-chain stamp is optional extra proof."
                : "Live skill — its quality signal updates as agents use it."
            }
            className="mt-2"
          >
            <span className="text-[11px] text-muted">
              {skill?.onChain === false
                ? "Public skill · off-chain"
                : "Live skill · agents prove what works"}
              {tick > 0 ? " · updating" : ""}
            </span>
          </Tip>
        </div>

        {/* ── Collapsed meta strip ── */}
        <div className="text-center">
          {/* Always-visible: source domains & Remix CTA */}
          {sourceDomains.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted">
                Forged from{" "}
                {sourceDomains.map((d, i) => (
                  <span key={d}>
                    {i > 0 && " · "}
                    <Link href={`/from/${encodeURIComponent(d)}`} className="text-ember hover:underline">
                      {d}
                    </Link>
                  </span>
                ))}
              </p>
              {sourceUrls.length > 0 && (
                <div className="flex items-center justify-center pt-1">
                  <Link
                    href={`/?url=${encodeURIComponent(sourceUrls[0])}&studio=1`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-paper/80 px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-ember/40 hover:text-ember shadow-xs"
                  >
                    <Sparkles size={12} className="text-ember" />
                    <span>Adapt for my repo in Studio</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Expandable detail: forger, genres, lineage, canonical */}
          {(skill?.forger || (skill?.genres && skill.genres.length > 0) || skill?.derivedFromSkillHash || canonicalSources.length > 0) && (
            <>
              {metaOpen && (
                <div className="mt-2 space-y-2">
                  {skill?.forger && (
                    <p className="text-[12px] text-muted">
                      Forged by <IdentityLabel address={skill.forger} avatar className="inline" />
                    </p>
                  )}
                  {skill?.genres && skill.genres.length > 0 && (
                    <p className="flex flex-wrap items-center justify-center gap-2">
                      {skill.genres.map((genre) => (
                        <Link
                          key={genre.slug}
                          href={`/discover/${genre.slug}`}
                          className="rounded-full border border-ink/10 bg-paper px-2.5 py-1 text-[11px] text-ember hover:border-ember/35"
                        >
                          {genre.label}
                        </Link>
                      ))}
                    </p>
                  )}
                  {skill?.derivedFromSkillHash && (
                    <p className="text-[11px] text-muted">
                      <Tip tip="delta"><span>Delta forged from </span></Tip>
                      <Link href={skillPublicPath(skill.derivedFromSkillHash)} className="text-ember hover:underline">
                        parent skill
                      </Link>
                    </p>
                  )}
                  {skill && (
                    <p className="text-[11px] text-muted">
                      <Link href={`/remix/${encodeURIComponent(hash)}`} className="text-ember hover:underline">
                        Explore parent and remix lineage
                      </Link>
                    </p>
                  )}
                  {canonicalSources.length > 0 && (
                    <p className="text-[10px] text-muted">
                      Canonical ·{" "}
                      <span className="font-mono" title={canonicalSources.map((s) => s.url).join("\n")}>
                        {canonicalSources[0]!.id}
                      </span>
                    </p>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => setMetaOpen((o) => !o)}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"
              >
                <MoreHorizontal size={13} />
                {metaOpen ? "less" : "more"}
              </button>
            </>
          )}
        </div>

        {/* ── Where it lands ── */}
        {showLanding && (
          <WhereItLandsList
            hits={landingHits}
            ready={!loading}
            repo={metaRepo ?? skill?.repo ?? undefined}
          />
        )}

        {/* ── Skill body ── */}
        {skillMarkdown ? (
          <section className="space-y-2" aria-label="Skill body">
            <p className="text-[11px] uppercase tracking-wider text-muted">Skill for your agent</p>
            <SkillViewer
              markdown={skillMarkdown}
              title={metaTitle ?? skill?.title ?? "Skill"}
              repo={metaRepo ?? skill?.repo ?? undefined}
              initialMode="magic"
              showActions={true}
            />
          </section>
        ) : (
          !loading && skill && (
            <ReattachDraft
              skillHash={hash}
              repo={metaRepo ?? skill.repo}
              frameworks={skill.frameworks}
              onAttached={(meta) => {
                setMetaTitle(meta.title);
                setMetaBlurb(meta.blurb ?? null);
                if (meta.repo) setMetaRepo(meta.repo);
                setSkill((s) =>
                  s ? { ...s, title: meta.title, blurb: meta.blurb, repo: meta.repo ?? s.repo, markdown: meta.markdown, landings: meta.landings } : s,
                );
                setNote("Skill artifact attached — copy ready for agents.");
              }}
            />
          )
        )}

        {/* ── Action tabs ── */}
        {!loading && skill && (
          <div className="space-y-3">
            {/* Tab row — Talk only appears when it has something to do */}
            <div className="flex rounded-full border border-ink/10 bg-paper p-0.5">
              {([
                { id: "talk" as const, label: "Talk", icon: <Mic size={13} />, show: Boolean(agentUrl) || isOwner },
                { id: "copy" as const, label: "Copy", icon: <Copy size={13} />, show: true },
                { id: "prove" as const, label: "Prove", icon: <Zap size={13} />, show: true },
              ])
                .filter(({ show }) => show)
                .map(({ id, label, icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab((t) => (t === id ? null : id))}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-medium transition-colors ${
                    activeTab === id
                      ? "bg-ember text-paper"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {/* Talk panel — only reachable when an agent exists or the owner can attach one */}
            {activeTab === "talk" && (
              <div className="space-y-3 rounded-xl border border-ink/8 bg-paper/70 px-4 py-4">
                <SkillAgentPanel
                  skillHash={hash}
                  titleHint={metaTitle ?? skill.title}
                  agentUrl={agentUrl}
                  isOwner={isOwner}
                  onSaved={onSaveAgentUrl}
                />
                <div className="border-t border-ink/6 pt-3">
                  <p className="mb-2 text-[11px] text-muted">Create your own ElevenAgent from this skill</p>
                  <button
                    type="button"
                    onClick={() => void onCopyTalkPrompt()}
                    className="inline-flex items-center gap-1.5 text-[12px] text-ember hover:underline"
                  >
                    {copiedTalkPrompt ? <Check size={13} /> : <Volume2 size={13} />}
                    {copiedTalkPrompt ? "Prompt copied" : "Copy Talk to a Skill prompt"}
                  </button>
                </div>
              </div>
            )}

            {/* Copy panel */}
            {activeTab === "copy" && (
              <div className="space-y-2 rounded-xl border border-ink/8 bg-paper/70 px-4 py-4">
                {skillMarkdown ? (
                  <button
                    type="button"
                    onClick={() => void onCopyMarkdown()}
                    className="flex w-full min-h-11 items-center justify-center gap-2 rounded-full bg-ember px-4 text-sm font-medium text-paper hover:bg-ember-hot"
                  >
                    {copiedMd ? <Check size={14} /> : <Copy size={14} />}
                    {copiedMd ? "Copied for your agent" : "Copy for your agent"}
                  </button>
                ) : null}
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void onCopy()}
                    className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"
                  >
                    {copied ? <Check size={11} /> : <Copy size={11} />}
                    {copied ? "Link copied" : "Copy share link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onCopyTalkPrompt()}
                    className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"
                  >
                    {copiedTalkPrompt ? <Check size={11} /> : <Volume2 size={11} />}
                    {copiedTalkPrompt ? "Talk prompt copied" : "Copy Talk to a Skill prompt"}
                  </button>
                  <a
                    href={skillTweetIntent({ hash, title: metaTitle ?? undefined })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"
                  >
                    Post to X
                  </a>
                </div>
              </div>
            )}

            {/* Prove panel */}
            {activeTab === "prove" && (
              <div className="space-y-3 rounded-xl border border-ink/8 bg-paper/70 px-4 py-4">
                {/* Receipt consent */}
                {receiptPrompt && !user ? (
                  <div className="space-y-2">
                    <p className="text-[11px] leading-snug text-foreground-secondary">
                      To avoid counting the same browser twice, fondof can store a random receipt key here. No IP or repo contents stored.
                    </p>
                    <div className="flex flex-wrap gap-2">
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
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onUse()}
                    disabled={using}
                    className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full border border-ink/12 bg-paper px-3 text-[12px] text-ink hover:border-ember/35 disabled:opacity-40"
                  >
                    <Zap size={13} />
                    {using ? "Recording…" : "I used this skill"}
                  </button>
                )}

                {/* Outcome */}
                <SkillOutcomePanel
                  skillHash={hash}
                  titleHint={metaTitle ?? skill.title}
                  outcome={skill.outcome}
                  evidence={skill.evidence}
                  onSaved={(outcome, evidence) => {
                    setSkill((s) => s ? { ...s, outcome, evidence: evidence ?? s.evidence } : s);
                    setNote("Outcome attached — quality means it helped.");
                  }}
                />

                {/* Owner tools — collapsed, owner-only */}
                {isOwner && (skill.onChain === false || (skill.visibility === "public" && skill.ownerLogin)) && (
                  <div className="border-t border-ink/6 pt-3">
                    <button
                      type="button"
                      onClick={() => setOwnerToolsOpen((o) => !o)}
                      className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"
                      aria-expanded={ownerToolsOpen}
                    >
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${ownerToolsOpen ? "rotate-180" : ""}`}
                      />
                      Owner tools
                    </button>
                    {ownerToolsOpen && (
                      <div className="mt-3 space-y-3">
                        {skill.onChain === false && (
                          <div className="space-y-1">
                            <p className="text-[11px] leading-snug text-muted">
                              Stamp on-chain to add a contestable quality signal via SkillPool.
                            </p>
                            <button
                              type="button"
                              onClick={() => void onAttest()}
                              disabled={attesting}
                              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink hover:border-ember/35 disabled:opacity-40"
                            >
                              <Shield size={14} />
                              {attesting ? "Stamping…" : "Stamp on-chain (attest)"}
                            </button>
                          </div>
                        )}
                        {skill.visibility === "public" && skill.ownerLogin && (
                          <button
                            type="button"
                            onClick={() => void onUnlist()}
                            disabled={unlisting}
                            className="text-[11px] text-muted hover:text-ink disabled:opacity-40"
                          >
                            {unlisting ? "Hiding…" : "Hide public skill"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Status note ── */}
        {note && (
          <p className="rounded-lg bg-mist/60 px-3 py-2 text-center text-[12px] leading-snug text-ink" role="status">
            {note}
          </p>
        )}

        {/* ── Provenance & Proof ── */}
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
            canResolve={viewerResolver}
            onAcquire={onAcquire}
            onReceiptComplete={() => {
              setNote("Burst of agent uses landed — watch the proven score climb.");
              setPulseBeat((b) => b + 1);
              setSignalPlayKey((k) => k + 1);
              void refresh();
            }}
          />
        )}

        {!loading && !skill && (
          <p className="text-center text-sm text-foreground-secondary">
            Not on SkillPool yet — share the link, or forge and publish to mint.
          </p>
        )}

        {/* ── Peers ── */}
        {peers.length > 0 && (
          <section className="border-t border-ink/8 pt-6">
            <p className="text-center text-[11px] uppercase tracking-wider text-muted">
              Also proven on SkillPool
            </p>
            <ul className="mt-3 space-y-2">
              {peers.map((p) => {
                const peerTitle = p.title || getSkillMeta(p.skillHash)?.title;
                return (
                  <li key={p.skillHash}>
                    <Link
                      href={skillPublicPath(p.skillHash)}
                      className="flex items-center justify-between gap-2 rounded-lg border border-ink/8 bg-paper/60 px-3 py-2 text-sm hover:border-ember/30"
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="min-w-0 truncate font-medium text-ink">
                          {peerTitle || `Score ${formatSignal(p.signal)}`}
                        </span>
                        {p.agentUrl && (
                          <Tip tip="talk">
                            <Mic size={12} className="shrink-0 text-ember" />
                          </Tip>
                        )}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted">
                        {peerTitle ? `Score ${formatSignal(p.signal)} · ` : ""}
                        {p.usageCount} uses
                        {p.challengeLosses > 0 ? ` · ${p.challengeLosses} losses` : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ── Footer ── */}
        <div className="flex flex-col items-center gap-2 border-t border-ink/8 pt-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-ember hover:text-ember-hot">
            <Flame size={14} />
            Forge your own · extract → select → publish
          </Link>
          {reforgePath && (
            <Link href={reforgePath} className="inline-flex items-center gap-2 text-xs text-muted hover:text-ink">
              Re-forge from {sourceDomains[0] ?? "source"} · fit to your repo
            </Link>
          )}
          <p className="text-center text-[10px] text-muted">
            Viral ingest: <span className="font-mono">fondof.netlify.app/?url=…</span>
          </p>
        </div>

      </div>
    </div>
  );
}
