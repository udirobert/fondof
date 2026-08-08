"use client";

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
    <div className="w-72 border-l border-border bg-surface h-full overflow-y-auto p-4">
      <h2 className="text-xs font-mono text-muted uppercase tracking-wider mb-4">
        Your Repos
      </h2>

      {repos.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted">No repos connected</p>
          <p className="text-xs text-muted mt-1">
            Run <code className="font-mono text-accent">fondof connect</code>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {repos.map((repo) => (
            <RepoCard key={repo.fullName} repo={repo} />
          ))}
        </div>
      )}
    </div>
  );
}

function RepoCard({ repo }: { repo: RepoInfo }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 transition-colors hover:border-accent/30">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium truncate">{repo.name}</h3>
        {repo.matchCount > 0 && (
          <span className="text-[10px] font-mono bg-success/20 text-success px-1.5 py-0.5 rounded-full">
            {repo.matchCount} match{repo.matchCount !== 1 ? "es" : ""}
          </span>
        )}
      </div>

      <p className="text-[10px] text-muted font-mono mt-1">{repo.fullName}</p>

      <div className="mt-2 flex flex-wrap gap-1">
        {repo.languages.slice(0, 3).map((lang) => (
          <span
            key={lang.language}
            className="text-[10px] px-1.5 py-0.5 rounded bg-surface-raised text-muted"
          >
            {lang.language} {lang.percentage}%
          </span>
        ))}
      </div>

      {repo.frameworks.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {repo.frameworks.slice(0, 3).map((fw) => (
            <span
              key={fw}
              className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent"
            >
              {fw}
            </span>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted mt-2">
        Indexed {new Date(repo.lastIndexed).toLocaleDateString()}
      </p>
    </div>
  );
}
