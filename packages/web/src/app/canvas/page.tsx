"use client";

import { motion } from "framer-motion";
import { SourceCard } from "@/components/source-card";
import { IdeaNode } from "@/components/idea-node";
import { RepoPanel } from "@/components/repo-panel";
import { IngestBar } from "@/components/ingest-bar";
import { ConnectionLine, ConnectionLayer } from "@/components/match-beam";

// Demo data — in production, this comes from state/API
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
    description:
      "Wrap errors at each async boundary with context about what operation was being attempted. Creates a debugging trail.",
    patternType: "technique" as const,
    domains: ["error-handling", "debugging"],
    worthiness: "forge-skill" as const,
    worthinessScore: 0.85,
  },
  {
    title: "Partial Prefetching",
    description:
      "Fine-grained control over how much content a link should prefetch for instant navigations without over-fetching.",
    patternType: "technique" as const,
    domains: ["performance", "ux"],
    worthiness: "forge-skill" as const,
    worthinessScore: 0.72,
  },
  {
    title: "Cache Components",
    description:
      "Mark parts of UI as prerenderable with 'use cache' for SPA-like responsiveness in server-rendered apps.",
    patternType: "architecture" as const,
    domains: ["caching", "rendering"],
    worthiness: "apply-directly" as const,
    worthinessScore: 0.45,
  },
  {
    title: "Memory Eviction in Dev",
    description:
      "Disk caching + memory eviction reduces long-session RAM by 90%. Turbopack-specific optimization.",
    patternType: "technique" as const,
    domains: ["dx", "tooling"],
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
    frameworks: ["Hono", "Workers"],
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
    frameworks: ["Next.js", "Tailwind"],
    matchCount: 3,
    lastIndexed: "2026-08-08T14:30:00Z",
  },
];

export default function CanvasPage() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sources — left shelf */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="w-72 p-5 overflow-y-auto border-r border-background-subtle"
      >
        <h2 className="text-[11px] text-muted uppercase tracking-wider font-medium mb-3">
          Sources
        </h2>
        <IngestBar />
        <div className="space-y-3 mt-3">
          {demoSources.map((source) => (
            <SourceCard key={source.url} {...source} />
          ))}
        </div>
      </motion.div>

      {/* Ideas — center canvas */}
      <div className="flex-1 relative overflow-auto bg-background-subtle/50 p-8">
        {/* Connection lines layer */}
        <ConnectionLayer>
          <ConnectionLine x1={0} y1={80} x2={200} y2={120} type="novel" score={0.85} delay={0.5} />
          <ConnectionLine x1={0} y1={200} x2={200} y2={280} type="partial" score={0.45} delay={0.7} />
        </ConnectionLayer>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-[11px] text-muted uppercase tracking-wider font-medium mb-6 relative z-10"
        >
          Extracted ideas
        </motion.h2>

        {/* Ideas laid out organically */}
        <div className="relative z-10 flex flex-wrap gap-5 justify-start">
          {demoIdeas.map((idea, i) => (
            <IdeaNode key={idea.title} {...idea} index={i} />
          ))}
        </div>

        {demoIdeas.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-foreground-secondary text-sm">
              Paste a URL in the source panel to extract ideas
            </p>
          </div>
        )}
      </div>

      {/* Repos — right shelf */}
      <RepoPanel repos={demoRepos} />
    </div>
  );
}
