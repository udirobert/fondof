"use client";

/* The badge is an externally hosted SVG intended for README/show-note embedding. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, ChevronDown, Copy, ExternalLink, Flame, Share2 } from "lucide-react";
import { FondofWordmark } from "@/components/fondof-wordmark";
import {
  claimSource,
  createSourceClaimChallenge,
  fetchSourceSkills,
  type SourceClaim,
  type SourceImpactSummary,
  type SourceSkillEntry,
  verifySourceClaim,
} from "@/lib/sources";
import {
  skillPublicPath,
  sourceImpactShareUrl,
  sourceImpactTweetIntent,
  sourceReforgePath,
} from "@/lib/skill-share";
import { track } from "@/lib/track";
import { fetchSession, loginWithGitHub } from "@/lib/auth";

/** One forged skill — title and fit visible, the rest behind a toggle. */
function SourceSkillCard({ skill }: { skill: SourceSkillEntry }) {
  const [open, setOpen] = useState(false);
  const reforgePath = sourceReforgePath([skill.sourceUrl]);
  const hasMore = Boolean(
    skill.derivedFromSkillHash || reforgePath || skill.evidence?.evidenceScore,
  );

  return (
    <li className="rounded-xl border border-ink/8 bg-paper/60 p-4">
      <Link
        href={skillPublicPath(skill.skillHash)}
        className="font-serif text-lg leading-snug text-ink hover:text-ember"
      >
        {skill.title}
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
        <span>Fitted for {skill.fittedTo}</span>
        <span>{new Date(skill.forgedAt).toLocaleDateString()}</span>
        {hasMore && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-muted hover:text-ink"
            aria-expanded={open}
          >
            <ChevronDown
              size={12}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
            {open ? "less" : "more"}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-ink/6 pt-2 text-[11px] text-muted">
          {skill.evidence && skill.evidence.evidenceScore > 0 && (
            <span className="text-ink/70">
              Evidence {skill.evidence.evidenceScore}
            </span>
          )}
          {skill.derivedFromSkillHash && (
            <Link
              href={skillPublicPath(skill.derivedFromSkillHash)}
              className="text-ember hover:underline"
            >
              Remix of parent skill
            </Link>
          )}
          <a
            href={skill.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-ember hover:underline"
          >
            <ExternalLink size={10} />
            Source
          </a>
          {reforgePath && (
            <Link href={reforgePath} className="text-ember hover:underline">
              Re-forge this source
            </Link>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * /from/[source] — shows all skills forged from a content source.
 * Auto-populated from forge data. Creators can share this page as proof
 * that their content is being turned into actionable skills.
 */
export default function SourcePage() {
  const params = useParams<{ source: string }>();
  const domain = decodeURIComponent(params.source ?? "");
  const [skills, setSkills] = useState<SourceSkillEntry[]>([]);
  const [impact, setImpact] = useState<SourceImpactSummary | null>(null);
  const [claim, setClaim] = useState<SourceClaim | null>(null);
  const [viewerLogin, setViewerLogin] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [verifyingClaim, setVerifyingClaim] = useState(false);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [claimInstructions, setClaimInstructions] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [claimNote, setClaimNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedImpact, setCopiedImpact] = useState(false);

  useEffect(() => {
    if (!domain) return;
    void fetchSourceSkills(domain).then((res) => {
      setSkills(res.skills);
      setImpact(res.impact);
      setClaim(res.claim ?? null);
      setLoading(false);
    });
  }, [domain]);

  useEffect(() => {
    void fetchSession().then((session) => {
      setViewerLogin(session?.user?.login ?? null);
    });
  }, []);

  const onStartVerification = async () => {
    if (verifyingClaim) return;
    setVerifyingClaim(true);
    setClaimNote(null);
    try {
      const response = await createSourceClaimChallenge(domain);
      if (response.error) setClaimNote(response.error);
      else {
        setClaimToken(response.token ?? null);
        setClaimInstructions(response.instructions ?? null);
      }
    } catch {
      setClaimNote("Couldn’t create a verification challenge right now.");
    } finally {
      setVerifyingClaim(false);
    }
  };

  const onVerifyClaim = async () => {
    if (verifyingClaim || !proofUrl.trim()) return;
    setVerifyingClaim(true);
    setClaimNote(null);
    try {
      const response = await verifySourceClaim(domain, proofUrl.trim());
      if (response.error) setClaimNote(response.error);
      else if (response.claim) {
        setClaim(response.claim);
        setClaimToken(null);
        setClaimInstructions(null);
        setClaimNote(response.note ?? "Domain control verified.");
      }
    } catch {
      setClaimNote("Couldn’t verify the source page right now.");
    } finally {
      setVerifyingClaim(false);
    }
  };

  const onClaim = async () => {
    if (claiming) return;
    if (!viewerLogin) {
      loginWithGitHub(window.location.pathname);
      return;
    }
    setClaiming(true);
    setClaimNote(null);
    try {
      const response = await claimSource(domain);
      if (response.error) setClaimNote(response.error);
      else if (response.claim) {
        setClaim(response.claim);
        setClaimNote("Self-claim saved. It is not independent proof of authorship.");
      }
    } catch {
      setClaimNote("Couldn’t save the source claim right now.");
    } finally {
      setClaiming(false);
    }
  };

  const badgeUrl = `https://fondof-api.trustfall.workers.dev/api/sources/${encodeURIComponent(domain)}/badge.svg`;
  const impactUrl = sourceImpactShareUrl(domain);
  const tweetUrl = sourceImpactTweetIntent({
    domain,
    skillCount: skills.length,
    outcomeCount: impact?.outcomeCount,
  });

  const copyImpactLink = async () => {
    try {
      await navigator.clipboard.writeText(impactUrl);
      setCopiedImpact(true);
      track("source_impact_shared", { domain, kind: "copy" });
      window.setTimeout(() => setCopiedImpact(false), 1600);
    } catch {
      // ignore clipboard failures
    }
  };

  return (
    <div className="atmosphere relative min-h-[calc(100dvh-3.5rem)] pt-14">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10 pb-20">
        <div className="text-center">
          <FondofWordmark size="inline" />
          <h1 className="mt-4 font-serif text-2xl leading-snug tracking-tight text-ink">
            Forged from {domain}
          </h1>
          <p className="mt-2 text-sm text-foreground-secondary">
            {loading
              ? "Loading…"
              : skills.length === 0
                ? "No skills forged from this source yet."
                : `${skills.length} skill${skills.length === 1 ? "" : "s"} forged by developers from this content`}
          </p>
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ink"
          >
            <ExternalLink size={12} />
            {domain}
          </a>
        </div>

        {claim ? (
          <section className="rounded-xl border border-ink/8 bg-mist/30 px-3 py-3 text-center">
            <p className="text-[11px] text-muted">
              {claim.status === "domain-verified" ? "Domain control verified for" : "Self-claimed by"}{" "}
              <Link href={`/u/${encodeURIComponent(claim.login)}`} className="text-ember hover:underline">
                @{claim.login}
              </Link>
              {claim.status === "domain-verified" ? " · authorship not independently verified" : " · not independently verified"}
            </p>
            {claim.status === "domain-verified" && claim.proofUrl ? (
              <a
                href={claim.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-[10px] text-ember hover:underline"
              >
                View domain proof
              </a>
            ) : (
              <>
                {!claimToken && (
                  <button
                    type="button"
                    onClick={() => void onStartVerification()}
                    disabled={verifyingClaim}
                    className="mt-2 min-h-8 rounded-full border border-ink/12 px-3 text-[11px] text-ink hover:border-ember/35 disabled:opacity-40"
                  >
                    {verifyingClaim ? "Preparing…" : "Verify domain control"}
                  </button>
                )}
                {claimInstructions && claimToken && (
                  <div className="mt-3 space-y-2 text-left">
                    <p className="text-[10px] leading-snug text-muted">{claimInstructions}</p>
                    <code className="block overflow-x-auto rounded bg-paper px-2 py-1.5 font-mono text-[10px] text-ink">
                      {claimToken}
                    </code>
                    <input
                      type="url"
                      value={proofUrl}
                      onChange={(event) => setProofUrl(event.target.value)}
                      placeholder={`https://${domain}/proof`}
                      className="w-full rounded-lg border border-ink/10 bg-paper px-2.5 py-2 text-[11px] text-ink placeholder:text-muted"
                    />
                    <button
                      type="button"
                      onClick={() => void onVerifyClaim()}
                      disabled={verifyingClaim || !proofUrl.trim()}
                      className="min-h-8 rounded-full bg-ember px-3 text-[11px] font-medium text-paper disabled:opacity-40"
                    >
                      {verifyingClaim ? "Checking…" : "Check proof page"}
                    </button>
                  </div>
                )}
              </>
            )}
            {claimNote && <p className="mt-2 text-[10px] text-ember">{claimNote}</p>}
          </section>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
            <p className="text-[11px] text-muted">
              Is this your source? Self-claim it — not verified authorship.
            </p>
            <button
              type="button"
              onClick={() => void onClaim()}
              disabled={claiming}
              className="inline-flex min-h-8 items-center text-[11px] text-ember hover:underline disabled:opacity-40"
            >
              {claiming ? "Saving…" : viewerLogin ? "Claim source identity" : "Sign in to claim"}
            </button>
            {claimNote && <p className="w-full text-[10px] text-ember">{claimNote}</p>}
          </div>
        )}

        {!loading && skills.length > 0 && (
          <>
            {impact && (
              <section className="rounded-xl border border-ink/8 bg-mist/40 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted">
                    Source impact snapshot
                  </p>
                  <span className="font-mono text-[11px] text-ember">
                    signal {impact.evidenceScore}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="font-serif text-xl text-ink">{impact.claimedUseCount}</p>
                    <p className="text-[10px] text-muted">claimed uses</p>
                  </div>
                  <div>
                    <p className="font-serif text-xl text-ink">{impact.outcomeCount}</p>
                    <p className="text-[10px] text-muted">outcomes</p>
                  </div>
                  <div>
                    <p className="font-serif text-xl text-ink">{impact.githubConfirmedPrCount}</p>
                    <p className="text-[10px] text-muted">GitHub-confirmed PRs</p>
                  </div>
                </div>
                <p className="mt-3 text-[10px] leading-snug text-muted">
                  {impact.fittedRepoCount} repo{impact.fittedRepoCount === 1 ? "" : "s"} · {impact.remixCount} lineage remix{impact.remixCount === 1 ? "" : "es"}. Evidence summary only — it does not prove this source caused any change.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyImpactLink()}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-ink/10 bg-paper px-3 text-[11px] text-ink hover:border-ember/35"
                  >
                    {copiedImpact ? <Check size={12} /> : <Copy size={12} />}
                    {copiedImpact ? "Impact link copied" : "Copy impact card"}
                  </button>
                  <a
                    href={tweetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track("source_impact_shared", { domain, kind: "x" })}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-ink/10 bg-paper px-3 text-[11px] text-ink hover:border-ember/35"
                  >
                    <Share2 size={12} />
                    Share on X
                  </a>
                </div>
              </section>
            )}

            <section>
              <p className="text-[11px] uppercase tracking-wider text-muted">
                Skills forged · {skills.length}
              </p>
              <ul className="mt-3 space-y-3">
                {skills.map((skill) => (
                  <SourceSkillCard key={skill.skillHash} skill={skill} />
                ))}
              </ul>
            </section>

            {/* Embed badge for creators — collapsed by default */}
            <details className="group rounded-xl border border-ink/8 bg-mist/40 p-4">
              <summary className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-ink">
                <ChevronDown
                  size={13}
                  className="text-muted transition-transform group-open:rotate-180"
                />
                Embed this badge in your show notes or README
              </summary>
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={badgeUrl}
                  alt={`${skills.length} skills forged from ${domain}`}
                  height={20}
                />
              </div>
              <code className="mt-2 block overflow-x-auto rounded bg-paper px-2 py-1.5 font-mono text-[10px] text-muted">
                {`![forged from](${badgeUrl})`}
              </code>
              <p className="mt-2 text-[10px] text-muted">
                Badge updates automatically as more developers forge skills from
                your content.
              </p>
            </details>
          </>
        )}

        {!loading && skills.length === 0 && (
          <div className="text-center">
            <p className="text-sm text-foreground-secondary">
              Be the first to forge a skill from this source.
            </p>
            <Link
              href={`/?url=https://${domain}`}
              className="mt-3 inline-flex items-center gap-2 text-sm text-ember hover:text-ember-hot"
            >
              <Flame size={14} />
              Forge from {domain}
            </Link>
          </div>
        )}

        <div className="flex flex-col items-center gap-2 border-t border-ink/8 pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-ember hover:text-ember-hot"
          >
            <Flame size={14} />
            Forge your own skill
          </Link>
          <p className="text-center text-[10px] text-muted">
            Turn what you learn into coding skills for your agent
          </p>
        </div>
      </div>
    </div>
  );
}
