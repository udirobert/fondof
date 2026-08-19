"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame, GitBranch, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { FondofWordmark } from "@/components/fondof-wordmark";
import { getSkillLineage, type SkillLineageNode } from "@/lib/api";
import { skillPublicPath, sourceReforgePath } from "@/lib/skill-share";

export default function RemixLineagePage() {
  const params = useParams<{ hash: string }>();
  const hash = decodeURIComponent(params.hash ?? "");
  const [skill, setSkill] = useState<SkillLineageNode | null>(null);
  const [parent, setParent] = useState<SkillLineageNode | null>(null);
  const [ancestors, setAncestors] = useState<SkillLineageNode[]>([]);
  const [children, setChildren] = useState<SkillLineageNode[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hash) return;
    void getSkillLineage(hash)
      .then((response) => {
        if (response.error || !response.skill) {
          setNote(response.error ?? "Lineage unavailable");
          return;
        }
        setSkill(response.skill);
        setParent(response.parent ?? null);
        setAncestors(response.ancestors ?? []);
        setChildren(response.children ?? []);
        setNote(response.note ?? null);
      })
      .catch(() => setNote("Lineage unavailable right now."))
      .finally(() => setLoading(false));
  }, [hash]);

  return (
    <div className="atmosphere relative min-h-[calc(100dvh-3.5rem)] pt-14">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10 pb-24">
        <header className="text-center">
          <FondofWordmark size="inline" />
          <p className="mt-5 text-[11px] uppercase tracking-wider text-muted">
            Skill lineage
          </p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink">
            {skill?.title ?? "Parent → remix"}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-foreground-secondary">
            See how a fitted skill was adapted across repositories.
          </p>
        </header>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted">
            <Loader2 size={14} className="animate-spin" />
            Reading the lineage…
          </div>
        )}

        {!loading && skill && (
          <>
            <section className="space-y-3" aria-label="Skill lineage graph">
              {(ancestors.length > 0 || parent) && (
                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-wider text-muted">
                    Ancestor path
                  </p>
                  {(ancestors.length > 0 ? ancestors : [parent!]).map((ancestor, index, path) => (
                    <div key={ancestor.hash}>
                      <LineageCard node={ancestor} muted />
                      {index < path.length - 1 && (
                        <div className="flex justify-center py-2 text-muted">
                          <ArrowRight size={16} className="rotate-90" />
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex justify-center py-2 text-muted">
                    <ArrowRight size={16} className="rotate-90" />
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-[11px] uppercase tracking-wider text-muted">
                  Current skill
                </p>
                <LineageCard node={skill} current />
              </div>

              {sourceReforgePath(skill.sourceUrls) && (
                <Link
                  href={sourceReforgePath(skill.sourceUrls)!}
                  className="flex min-h-10 items-center justify-center rounded-full bg-ember px-4 text-sm font-medium text-paper hover:bg-ember-hot"
                >
                  Re-forge this source for your repo
                </Link>
              )}

              <div className="flex justify-center py-2 text-muted">
                <ArrowRight size={16} className="rotate-90" />
              </div>

              <div>
                <p className="mb-2 text-[11px] uppercase tracking-wider text-muted">
                  Public remixes · {children.length}
                </p>
                {children.length > 0 ? (
                  <ul className="space-y-2">
                    {children.map((child) => (
                      <li key={child.hash}>
                        <LineageCard node={child} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-xl border border-dashed border-ink/15 bg-mist/30 px-3 py-4 text-center text-[12px] text-muted">
                    No public remixes yet. Fit this skill to your repo and make
                    the next branch.
                  </div>
                )}
              </div>
            </section>

            {note && (
              <p className="text-center text-[10px] leading-snug text-muted">
                {note}
              </p>
            )}
          </>
        )}

        {!loading && !skill && (
          <p className="text-center text-sm text-foreground-secondary">
            This skill does not have a public lineage record yet.
          </p>
        )}

        <div className="flex flex-col items-center gap-2 border-t border-ink/8 pt-6">
          {skill && (
            <Link
              href={skillPublicPath(skill.hash)}
              className="inline-flex items-center gap-2 text-sm text-ember hover:text-ember-hot"
            >
              <GitBranch size={14} />
              Open current skill
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-ember hover:text-ember-hot"
          >
            <Flame size={14} />
            Forge your own branch
          </Link>
          <p className="text-center text-[10px] text-muted">
            Lineage shows derivation metadata, not proof of causality.
          </p>
        </div>
      </div>
    </div>
  );
}

function LineageCard({
  node,
  current = false,
  muted = false,
}: {
  node: SkillLineageNode;
  current?: boolean;
  muted?: boolean;
}) {
  return (
    <Link
      href={skillPublicPath(node.hash)}
      className={`block rounded-xl border p-3 transition-colors hover:border-ember/35 ${
        current
          ? "border-ember/30 bg-mist/50"
          : "border-ink/8 bg-paper/60"
      } ${muted ? "opacity-80" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 font-serif text-base leading-snug text-ink">
          {node.title}
        </span>
        {node.repo && (
          <span className="shrink-0 max-w-28 truncate text-[10px] text-muted">
            {node.repo}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {node.genres?.slice(0, 3).map((genre) => (
          <span
            key={genre.slug}
            className="rounded-full bg-parchment px-2 py-0.5 text-[10px] text-muted"
          >
            {genre.label}
          </span>
        ))}
      </div>
    </Link>
  );
}
