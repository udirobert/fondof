"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ShieldCheck, FileText, Mic } from "lucide-react";
import { API_BASE } from "@/lib/api-base";
import { skillPublicPath } from "@/lib/skill-share";
import { Tip } from "@/components/tip";
import type { EvidenceSummary, GenreFacet, SkillGenre } from "@/lib/api";

type DiscoverySort = "recent" | "impact" | "outcomes" | "adapted";

interface PoolSkill {
  skillHash: string;
  title?: string;
  repo?: string;
  onChain?: boolean;
  sourceUrls?: string[];
  evidenceSummary?: EvidenceSummary;
  genres?: SkillGenre[];
  agentUrl?: string;
}

/**
 * A simple, honest list of public skills (not txs). Pairs with the on-chain
 * draw ritual above — this is the browseable shelf.
 */
export function RecentPublicSkills({
  limit = 8,
  initialGenre = "",
}: {
  limit?: number;
  initialGenre?: string;
}) {
  const [skills, setSkills] = useState<PoolSkill[] | null>(null);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<DiscoverySort>("impact");
  const [domain, setDomain] = useState("");
  const [framework, setFramework] = useState("");
  const [genre, setGenre] = useState(initialGenre);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [facets, setFacets] = useState<{
    domains: string[];
    frameworks: string[];
    languages: string[];
    genres: GenreFacet[];
  }>({ domains: [], frameworks: [], languages: [], genres: [] });

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setSkills(null);
    setError(false);
    const fetchLimit = debouncedSearch ? Math.max(limit, 20) : limit;
    const params = new URLSearchParams({
      limit: String(fetchLimit),
      sort,
      ...(domain ? { domain } : {}),
      ...(framework ? { framework } : {}),
      ...(genre ? { genre } : {}),
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
    });
    fetch(`${API_BASE}/api/skills?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data?.skills)) {
          setSkills(data.skills);
          setFacets({
            domains: Array.isArray(data?.facets?.domains) ? data.facets.domains : [],
            frameworks: Array.isArray(data?.facets?.frameworks) ? data.facets.frameworks : [],
            languages: Array.isArray(data?.facets?.languages) ? data.facets.languages : [],
            genres: Array.isArray(data?.facets?.genres) ? data.facets.genres : [],
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setSkills([]);
          setFacets({ domains: [], frameworks: [], languages: [], genres: [] });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [limit, sort, domain, framework, genre, debouncedSearch]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800">
        Couldn&apos;t load the shelf. Check your connection and retry.
      </div>
    );
  }

  if (skills === null) {
    return (
      <p className="animate-pulse text-center text-[12px] text-muted">
        Loading the shelf…
      </p>
    );
  }

  if (skills.length === 0) {
    return (
      <>
        <div className="relative mb-3">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills, stacks, sources…"
            className="w-full rounded-full border border-ink/10 bg-paper py-2 pr-3 pl-9 text-sm text-ink placeholder:text-muted/60 focus:border-ember/40 focus:outline-none"
          />
        </div>
        <p className="text-center text-[12px] text-muted">
          {debouncedSearch
            ? "No skills match your search."
            : "Nothing public yet — forge or compose your first skill."}
        </p>
      </>
    );
  }

  return (
    <>
      <div className="relative mb-3">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search skills, stacks, sources…"
          className="w-full rounded-full border border-ink/10 bg-paper py-2 pr-3 pl-9 text-sm text-ink placeholder:text-muted/60 focus:border-ember/40 focus:outline-none"
        />
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px]">
        {([
          ["impact", "Evidence signal"],
          ["outcomes", "Outcome-backed"],
          ["adapted", "Most adapted"],
          ["recent", "Recent"],
        ] as const).map(([value, label], index) => (
          <span key={value} className="inline-flex items-center gap-2">
            {index > 0 && <span className="text-ink/20">·</span>}
            <button
              type="button"
              onClick={() => setSort(value)}
              className={sort === value ? "text-ember" : "text-muted hover:text-ink"}
            >
              {label}
            </button>
          </span>
        ))}
      </div>
      {(facets.genres.length > 0 || facets.domains.length > 0 || facets.frameworks.length > 0) && (
        <div className="mb-3 flex flex-wrap justify-center gap-2">
          <label className="sr-only" htmlFor="pool-genre">Genre</label>
          <select
            id="pool-genre"
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
            className="rounded-full border border-ink/10 bg-paper px-2.5 py-1 text-[11px] text-muted"
          >
            <option value="">All genres</option>
            {facets.genres.map((value) => <option key={value.slug} value={value.slug}>{value.label} ({value.count})</option>)}
          </select>
          <label className="sr-only" htmlFor="pool-domain">Topic</label>
          <select
            id="pool-domain"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            className="rounded-full border border-ink/10 bg-paper px-2.5 py-1 text-[11px] text-muted"
          >
            <option value="">All topics</option>
            {facets.domains.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <label className="sr-only" htmlFor="pool-framework">Stack</label>
          <select
            id="pool-framework"
            value={framework}
            onChange={(event) => setFramework(event.target.value)}
            className="rounded-full border border-ink/10 bg-paper px-2.5 py-1 text-[11px] text-muted"
          >
            <option value="">All stacks</option>
            {facets.frameworks.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
      )}
      <ul className="space-y-2">
      {skills.map((s) => {
        const source = s.sourceUrls?.[0];
        return (
          <li key={s.skillHash}>
            <Link
              href={skillPublicPath(s.skillHash)}
              className="flex items-center justify-between gap-3 rounded-lg border border-ink/8 bg-paper/60 px-3 py-2 text-sm hover:border-ember/30"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText size={14} className="shrink-0 text-muted" />
                <span className="min-w-0 truncate font-medium text-ink">
                  {s.title || "Untitled skill"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-[11px] text-muted">
                {s.repo && (
                  <span className="max-w-24 truncate">{s.repo}</span>
                )}
                {s.genres?.[0] && (
                  <span className="max-w-28 truncate text-ink/70">{s.genres[0].label}</span>
                )}
                {s.evidenceSummary && s.evidenceSummary.evidenceScore > 0 && (
                  <span title="Transparent evidence summary; not causal impact">
                    evidence {s.evidenceSummary.evidenceScore}
                  </span>
                )}
                {s.agentUrl && (
                  <Tip tip="talk">
                    <span className="inline-flex items-center gap-1 text-ember">
                      <Mic size={12} />
                      talk
                    </span>
                  </Tip>
                )}
                {s.onChain ? (
                  <span className="inline-flex items-center gap-1 text-ember">
                    <ShieldCheck size={12} />
                    stamped
                  </span>
                ) : (
                  <span>off-chain</span>
                )}
                {source && (
                  <Link
                    href={source}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="max-w-28 truncate underline decoration-ink/20 hover:text-ember"
                    title={source}
                  >
                    source
                  </Link>
                )}
              </span>
            </Link>
          </li>
        );
      })}
      </ul>
      <p className="mt-3 text-center text-[10px] text-muted">
        Rankings are evidence views: claimed uses, outcomes, and lineage—not causal impact or a quality verdict.
      </p>
    </>
  );
}
