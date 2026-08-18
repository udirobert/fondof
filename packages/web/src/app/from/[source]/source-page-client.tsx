"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ExternalLink, Flame } from "lucide-react";
import { FondofWordmark } from "@/components/fondof-wordmark";
import { fetchSourceSkills, type SourceSkillEntry } from "@/lib/sources";
import { skillPublicPath, sourceReforgePath } from "@/lib/skill-share";

/**
 * /from/[source] — shows all skills forged from a content source.
 * Auto-populated from forge data. Creators can share this page as proof
 * that their content is being turned into actionable skills.
 */
export default function SourcePage() {
  const params = useParams<{ source: string }>();
  const domain = decodeURIComponent(params.source ?? "");
  const [skills, setSkills] = useState<SourceSkillEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!domain) return;
    void fetchSourceSkills(domain).then((res) => {
      setSkills(res.skills);
      setLoading(false);
    });
  }, [domain]);

  const badgeUrl = `https://fondof-api.trustfall.workers.dev/api/sources/${encodeURIComponent(domain)}/badge.svg`;

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
