import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://fondof-api.trustfall.workers.dev";

interface SourceMeta {
  author?: string;
  siteName?: string;
  show?: string;
  publishedAt?: string;
  feedUrl?: string;
}

interface SourceEntity {
  id: string;
  url: string;
  domain: string;
  meta?: SourceMeta;
  createdAt: string;
}

interface SourceSkillEntry {
  skillHash: string;
  title: string;
  sourceUrl: string;
  fittedTo: string;
  forgedAt: string;
  canonicalSourceId?: string;
  sourceMeta?: SourceMeta;
  derivedFromSkillHash?: string;
}

interface SourceImpactSummary {
  skillCount: number;
  skillsWithEvidence: number;
  remixCount: number;
  fittedRepoCount: number;
  claimedUseCount: number;
  outcomeCount: number;
  linkedPrCount: number;
  githubConfirmedPrCount: number;
  mergedPrCount: number;
  evidenceScore: number;
}

interface SourceApiResponse {
  source: SourceEntity;
  domain: string;
  skills: SourceSkillEntry[];
  count: number;
  impact: SourceImpactSummary;
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const source = await fetchSource(id);
  const meta = source?.source.meta;
  const title = meta?.show || meta?.siteName || source?.source.domain || id;
  return {
    title: `Forged from ${title} — fondof`,
    description: `${source?.count ?? 0} coding skill${
      (source?.count ?? 0) === 1 ? "" : "s"
    } forged from ${title} with fondof`,
  };
}

async function fetchSource(id: string): Promise<SourceApiResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/source/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as SourceApiResponse;
  } catch {
    return null;
  }
}

export default async function SourceEntityPage({ params }: Props) {
  const { id } = await params;
  const data = await fetchSource(id);
  if (!data) notFound();

  const { source, skills, count, impact } = data;
  const meta = source.meta;
  const heading = meta?.show || meta?.siteName || source.domain;
  const subHeading = meta?.author
    ? `by ${meta.author}`
    : `Canonical source · ${source.domain}`;

  return (
    <div className="atmosphere relative min-h-[calc(100dvh-3.5rem)] pt-14">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10 pb-20">
        <div className="text-center">
          <h1 className="font-serif text-2xl leading-snug tracking-tight text-ink">
            {heading}
          </h1>
          <p className="mt-2 text-sm text-foreground-secondary">{subHeading}</p>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-[12px] text-ember hover:underline"
          >
            {source.url}
          </a>
          <p className="mt-2 text-[11px] text-muted">
            {count} skill{count === 1 ? "" : "s"} forged from this source
            {impact.outcomeCount > 0
              ? ` · ${impact.outcomeCount} outcome${
                  impact.outcomeCount === 1 ? "" : "s"
                }`
              : ""}
          </p>
        </div>

        <ul className="space-y-4">
          {skills.map((skill) => (
            <li
              key={skill.skillHash}
              className="rounded-xl border border-ink/8 bg-paper/60 p-4"
            >
              <Link
                href={`/s/${encodeURIComponent(skill.skillHash)}`}
                className="font-serif text-lg leading-snug text-ink hover:text-ember"
              >
                {skill.title}
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                <span>Fitted for {skill.fittedTo}</span>
                <span>{new Date(skill.forgedAt).toLocaleDateString()}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
