"use client";

import { motion } from "framer-motion";
import { GitFork, Clock } from "lucide-react";
import type { DemoRepo } from "@/lib/demo-data";

interface RepoPanelProps {
  repos: DemoRepo[];
  dimmed?: boolean;
}

export function RepoPanel({ repos, dimmed = false }: RepoPanelProps) {
  return (
    <motion.aside
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: dimmed ? 0.4 : 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.2 }}
      className="w-full lg:w-64 shrink-0 p-5 overflow-y-auto border-t lg:border-t-0 lg:border-l border-paper/5 bg-ink-deep/40 max-h-[40vh] lg:max-h-none"
      aria-label="Repositories"
    >
      <h2 className="text-[11px] text-muted uppercase tracking-wider font-medium mb-4">
        Your repositories
      </h2>

      {repos.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-foreground-secondary">No repos connected</p>
          <p className="text-xs text-muted mt-1.5">
            Run <code className="font-mono text-ember">fondof connect</code>
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
    </motion.aside>
  );
}

function RepoCard({ repo }: { repo: DemoRepo }) {
  return (
    <div className="panel-sm p-3.5 transition-shadow hover:shadow-md cursor-pointer group focus-within:ring-1 focus-within:ring-ember/30">
      <div className="flex items-center gap-2 mb-1.5">
        <GitFork size={12} className="text-muted" />
        <h3 className="text-[13px] font-medium text-paper group-hover:text-ember transition-colors truncate">
          {repo.name}
        </h3>
        {repo.matchCount > 0 && (
          <span className="ml-auto text-[10px] font-medium text-ember bg-ember/15 px-1.5 py-0.5 rounded-full">
            {repo.matchCount}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {repo.languages.slice(0, 2).map((lang) => (
          <span key={lang.language} className="text-[10px] text-muted">
            {lang.language}
          </span>
        ))}
        {repo.frameworks.length > 0 && (
          <>
            <span className="text-[10px] text-muted">·</span>
            {repo.frameworks.slice(0, 2).map((fw) => (
              <span key={fw} className="text-[10px] text-steel">
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
