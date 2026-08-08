"use client";

import { motion } from "framer-motion";
import { GitFork, Clock } from "lucide-react";

interface RepoInfo {
  name: string;
  fullName: string;
  languages: { language: string; percentage: number }[];
  frameworks: string[];
  matchCount: number;
  lastIndexed: string;
}

interface RepoPanelProps {
  repos: RepoInfo[];
}

export function RepoPanel({ repos }: RepoPanelProps) {
  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.2 }}
      className="w-64 p-5 overflow-y-auto"
    >
      <h2 className="text-[11px] text-muted uppercase tracking-wider font-medium mb-4">
        Your repositories
      </h2>

      {repos.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-foreground-secondary">No repos connected</p>
          <p className="text-xs text-muted mt-1.5">
            Run <code className="font-mono text-accent">fondof connect</code>
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {repos.map((repo, i) => (
            <motion.div
              key={repo.fullName}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
            >
              <RepoCard repo={repo} />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function RepoCard({ repo }: { repo: RepoInfo }) {
  return (
    <div className="paper-sm p-3.5 transition-shadow hover:shadow-md cursor-pointer group">
      <div className="flex items-center gap-2 mb-1.5">
        <GitFork size={12} className="text-muted" />
        <h3 className="text-[13px] font-medium text-foreground group-hover:text-accent transition-colors truncate">
          {repo.name}
        </h3>
        {repo.matchCount > 0 && (
          <span className="ml-auto text-[10px] font-medium text-forge bg-forge/8 px-1.5 py-0.5 rounded-full">
            {repo.matchCount}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {repo.languages.slice(0, 2).map((lang) => (
          <span
            key={lang.language}
            className="text-[10px] text-muted"
          >
            {lang.language}
          </span>
        ))}
        {repo.frameworks.length > 0 && (
          <>
            <span className="text-[10px] text-muted">·</span>
            {repo.frameworks.slice(0, 2).map((fw) => (
              <span key={fw} className="text-[10px] text-accent">
                {fw}
              </span>
            ))}
          </>
        )}
      </div>

      <div className="flex items-center gap-1 text-[10px] text-muted">
        <Clock size={9} />
        {new Date(repo.lastIndexed).toLocaleDateString()}
      </div>
    </div>
  );
}
