import { SourceCard } from "@/components/source-card";
import { IdeaNode } from "@/components/idea-node";
import { RepoPanel } from "@/components/repo-panel";
import { IngestBar } from "@/components/ingest-bar";

// Demo data — in production, this comes from the API/state
const demoSources = [
  {
    type: "podcast" as const,
    title: "Error Handling in Async Systems",
    author: "Software Engineering Daily",
    url: "https://podcast.example/ep-42.mp3",
    duration: "48:12",
    ideasCount: 3,
  },
  {
    type: "blog" as const,
    title: "Next.js 16.3",
    author: "Vercel",
    url: "https://nextjs.org/blog/next-16-3",
    ideasCount: 5,
  },
];

const demoIdeas = [
  {
    title: "Contextual Error Propagation",
    description: "Wrap errors at each async boundary with context about what operation was being attempted.",
    patternType: "technique" as const,
    domains: ["error-handling", "debugging"],
    worthiness: "forge-skill" as const,
    worthinessScore: 0.85,
  },
  {
    title: "Partial Prefetching",
    description: "Fine-grained control over how much content a link should prefetch for instant navigations.",
    patternType: "technique" as const,
    domains: ["performance", "ux"],
    worthiness: "forge-skill" as const,
    worthinessScore: 0.72,
  },
  {
    title: "Cache Components Pattern",
    description: "Use 'use cache' directive to mark parts of UI as prerenderable for SPA-like responsiveness.",
    patternType: "architecture" as const,
    domains: ["caching", "rendering"],
    worthiness: "apply-directly" as const,
    worthinessScore: 0.45,
  },
  {
    title: "Disk Caching for Dev Server",
    description: "Turbopack disk caching reduces memory usage by 90% during long dev sessions.",
    patternType: "technique" as const,
    domains: ["dx", "performance"],
    worthiness: "skip" as const,
    worthinessScore: 0.2,
  },
];

const demoRepos = [
  {
    name: "api-gateway",
    fullName: "udirobert/api-gateway",
    languages: [
      { language: "TypeScript", percentage: 78 },
      { language: "Go", percentage: 22 },
    ],
    frameworks: ["Hono", "Cloudflare Workers"],
    matchCount: 2,
    lastIndexed: "2026-08-07T10:00:00Z",
  },
  {
    name: "fondof",
    fullName: "udirobert/fondof",
    languages: [
      { language: "TypeScript", percentage: 85 },
      { language: "Solidity", percentage: 15 },
    ],
    frameworks: ["Next.js", "Tailwind CSS"],
    matchCount: 3,
    lastIndexed: "2026-08-08T14:30:00Z",
  },
];

export default function CanvasPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sources Column */}
      <div className="w-72 border-r border-border bg-background overflow-y-auto p-4 flex flex-col gap-4">
        <h2 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">
          Sources
        </h2>
        <IngestBar />
        {demoSources.map((source) => (
          <SourceCard key={source.url} {...source} />
        ))}
      </div>

      {/* Ideas Canvas (center) */}
      <div className="flex-1 relative overflow-auto p-8">
        <h2 className="text-xs font-mono text-muted uppercase tracking-wider mb-6">
          Extracted Ideas
        </h2>

        {/* Ideas grid — in production this would be spatially positioned with drag */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
          {demoIdeas.map((idea) => (
            <IdeaNode key={idea.title} {...idea} />
          ))}
        </div>

        {/* Empty state */}
        {demoIdeas.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted text-sm">
              Paste a URL in the source panel to extract ideas
            </p>
          </div>
        )}
      </div>

      {/* Repo Panel (right) */}
      <RepoPanel repos={demoRepos} />
    </div>
  );
}
