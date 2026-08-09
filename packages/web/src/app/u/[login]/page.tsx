"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ExternalLink, Flame } from "lucide-react";
import { FondofWordmark } from "@/components/fondof-wordmark";
import { fetchPortfolio, type PublishedSkill } from "@/lib/portfolio";
import { skillPublicPath } from "@/lib/skill-share";

/** User portfolio — shows their publicly published skills with attribution. */
export default function PortfolioPage() {
  const params = useParams<{ login: string }>();
  const login = decodeURIComponent(params.login ?? "");
  const [skills, setSkills] = useState<PublishedSkill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!login) return;
    void fetchPortfolio(login).then((res) => {
      setSkills(res.skills);
      setLoading(false);
    });
  }, [login]);

  return (
    <div className="atmosphere relative min-h-[calc(100dvh-3.5rem)] pt-14">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10 pb-20">
        <div className="text-center">
          <FondofWordmark size="inline" />
          <h1 className="mt-4 font-serif text-2xl leading-snug tracking-tight text-ink">
            @{login}
          </h1>
          <p className="mt-2 text-sm text-foreground-secondary">
            Skills forged from real learning — fitted to real repos
          </p>
          <a
            href={`https://github.com/${login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ink"
          >
            <ExternalLink size={12} />
            github.com/{login}
          </a>
        </div>

        {loading ? (
          <p className="text-center text-sm text-muted">Loading skills…</p>
        ) : skills.length === 0 ? (
          <div className="text-center">
            <p className="text-sm text-foreground-secondary">
              No published skills yet.
            </p>
            <Link
              href="/"
              className="mt-3 inline-flex items-center gap-2 text-sm text-ember hover:text-ember-hot"
            >
              <Flame size={14} />
              Forge your first skill
            </Link>
          </div>
        ) : (
          <section>
            <p className="text-[11px] uppercase tracking-wider text-muted">
              Published skills · {skills.length}
            </p>
            <ul className="mt-3 space-y-3">
              {skills.map((skill) => (
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
                    {skill.repo && (
                      <span>Fitted for {skill.repo}</span>
                    )}
                    <span>
                      {new Date(skill.publishedAt).toLocaleDateString()}
                    </span>
                    <a
                      href={skill.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-ember hover:underline"
                    >
                      <ExternalLink size={10} />
                      {skill.type === "gist" ? "Gist" : "Repo"}
                    </a>
                  </div>
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
            Forge your own skill
          </Link>
          <p className="text-center text-[10px] text-muted">
            Skills work with Kiro, Claude, and Cursor
          </p>
        </div>
      </div>
    </div>
  );
}
