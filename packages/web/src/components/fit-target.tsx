"use client";

import { Check, GitFork } from "lucide-react";
import type { DemoRepo } from "@/lib/demo-data";
import { useAppStore } from "@/lib/store";

interface FitTargetProps {
  repos: DemoRepo[];
  /** Compact strip for mobile / above ideas */
  variant?: "panel" | "strip";
  selectedIdeaCount?: number;
}

/**
 * Purposeful control: which repo the next forge will fit.
 * Not a fake “connected repos” dashboard.
 */
export function FitTarget({
  repos,
  variant = "panel",
  selectedIdeaCount = 0,
}: FitTargetProps) {
  const activeRepo = useAppStore((s) => s.activeRepo);
  const setActiveRepo = useAppStore((s) => s.setActiveRepo);
  const active = repos.find((r) => r.fullName === activeRepo) ?? repos[0];

  if (variant === "strip") {
    return (
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="radiogroup"
        aria-label="Fit skill to repository"
      >
        <span className="shrink-0 text-[11px] uppercase tracking-wider text-muted">
          Fit to
        </span>
        {repos.map((repo) => {
          const selected = repo.fullName === (active?.fullName ?? "");
          return (
            <button
              key={repo.fullName}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setActiveRepo(repo.fullName)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors ${
                selected
                  ? "bg-ink text-paper"
                  : "bg-mist text-ink hover:bg-ink/10"
              }`}
            >
              {repo.name}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <aside
      className="flex h-full min-h-full w-full flex-col border-ink/8 bg-parchment-deep/30 p-4 lg:w-56 lg:border-l"
      aria-label="Fit target"
    >
      <div className="mb-3 flex items-start gap-2">
        <GitFork size={14} className="mt-0.5 shrink-0 text-ember" />
        <div>
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Fit skill to
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-foreground-secondary">
            Forge composes against this stack. Pick before you forge.
          </p>
        </div>
      </div>

      <div className="space-y-2" role="radiogroup" aria-label="Repositories">
        {repos.map((repo) => {
          const selected = repo.fullName === (active?.fullName ?? "");
          return (
            <button
              key={repo.fullName}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setActiveRepo(repo.fullName)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                selected
                  ? "border-ember/40 bg-paper shadow-sm"
                  : "border-ink/8 bg-transparent hover:border-ink/15 hover:bg-paper/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-medium text-ink">
                  {repo.name}
                </span>
                {selected && (
                  <Check size={12} className="ml-auto shrink-0 text-ember" />
                )}
              </div>
              <p className="mt-1 truncate font-mono text-[10px] text-muted">
                {repo.fullName}
              </p>
              <p className="mt-1.5 text-[10px] text-foreground-secondary">
                {[
                  ...repo.languages.slice(0, 2).map((l) => l.language),
                  ...repo.frameworks.slice(0, 2),
                ].join(" · ")}
              </p>
            </button>
          );
        })}
      </div>

      {selectedIdeaCount > 0 && (
        <p className="mt-4 text-[11px] text-muted">
          {selectedIdeaCount} idea{selectedIdeaCount === 1 ? "" : "s"} →{" "}
          <span className="text-ink">{active?.name}</span>
        </p>
      )}

      <p className="mt-auto pt-6 text-[10px] leading-relaxed text-muted">
        Demo targets for now. Live index:{" "}
        <code className="font-mono text-ember">fondof connect</code>
      </p>
    </aside>
  );
}
