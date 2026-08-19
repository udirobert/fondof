"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Copy, ExternalLink, Flame, Share2 } from "lucide-react";
import { FondofWordmark } from "@/components/fondof-wordmark";
import {
  fetchSourceSkills,
  type SourceImpactSummary,
  type SourceSkillEntry,
} from "@/lib/sources";
import {
  skillPublicPath,
  sourceImpactShareUrl,
  sourceImpactTweetIntent,
  sourceReforgePath,
} from "@/lib/skill-share";
import { track } from "@/lib/track";

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
  const [loading, setLoading] = useState(true);
  const [copiedImpact, setCopiedImpact] = useState(false);

  useEffect(() => {
    if (!domain) return;
    void fetchSourceSkills(domain).then((res) => {
      setSkills(res.skills);
      setImpact(res.impact);
      setLoading(false);
    });
  }, [domain]);

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
                {skills.map((skill) => {
                  const reforgePath = sourceReforgePath([skill.sourceUrl]);
                  return (
                    <li
                      key={skill.skillHash}
                      className="rounded-xl border border-ink/8 bg-paper/60 p-4"
                    >
                      <Link
                        href={skillPublicPath(skill.skillHash)}
                        className="font-serif text-lg leading-snug text-ink hover:text-ember"
                      >
                        {skill.title}
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                        <span>Fitted for {skill.fittedTo}</span>
                        <span>
                          {new Date(skill.forgedAt).toLocaleDateString()}
                        </span>
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
                          <Link
                            href={reforgePath}
                            className="text-ember hover:underline"
                          >
                            Re-forge this source
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Embed badge for creators */}
            <section className="rounded-xl border border-ink/8 bg-mist/40 p-4">
              <p className="text-[12px] font-medium text-ink">
                Embed this badge in your show notes or README
              </p>
              <div className="mt-2 flex items-center gap-3">
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
            </section>
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
