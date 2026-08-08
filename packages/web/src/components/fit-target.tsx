"use client";

import { useEffect, useState } from "react";
import { Check, GitFork, KeyRound, Loader2, Plus } from "lucide-react";
import type { ConnectedRepo } from "@/lib/github-repo";
import {
  fetchGitHubRepo,
  getGitHubToken,
  setGitHubToken,
} from "@/lib/github-repo";
import { useAppStore } from "@/lib/store";

interface FitTargetProps {
  repos: ConnectedRepo[];
  variant?: "panel" | "strip";
  selectedIdeaCount?: number;
  /** How many shards fit the active repo */
  fitCount?: number;
  onRepoAdded?: (repo: ConnectedRepo) => void;
}

/**
 * Fit target — demo repos + paste your GitHub repo (public or private w/ token).
 */
export function FitTarget({
  repos,
  variant = "panel",
  selectedIdeaCount = 0,
  fitCount = 0,
  onRepoAdded,
}: FitTargetProps) {
  const activeRepo = useAppStore((s) => s.activeRepo);
  const setActiveRepo = useAppStore((s) => s.setActiveRepo);
  const addUserRepo = useAppStore((s) => s.addUserRepo);
  const active = repos.find((r) => r.fullName === activeRepo) ?? repos[0];
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [token, setToken] = useState("");
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const t = getGitHubToken();
    setHasToken(!!t);
    if (t) setToken(t);
  }, []);

  const saveToken = () => {
    setGitHubToken(token.trim() || null);
    setHasToken(!!token.trim());
    setTokenOpen(false);
  };

  const addRepo = async () => {
    const value = input.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    try {
      const repo = await fetchGitHubRepo(value, getGitHubToken());
      addUserRepo(repo);
      setActiveRepo(repo.fullName);
      setInput("");
      onRepoAdded?.(repo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t add repo");
    } finally {
      setBusy(false);
    }
  };

  if (variant === "strip") {
    return (
      <div className="space-y-2">
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
                {repo.source === "github" ? (repo.private ? " · private" : " · you") : ""}
              </button>
            );
          })}
        </div>
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void addRepo();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="owner/repo"
            className="min-h-9 min-w-0 flex-1 rounded-full border border-ink/10 bg-paper px-3 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ember/40"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-mist px-3 text-xs text-ink disabled:opacity-40"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Add
          </button>
        </form>
        <button
          type="button"
          onClick={() => setTokenOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-ink"
        >
          <KeyRound size={10} />
          {hasToken ? "GitHub token saved (private OK)" : "Private repo? Add token"}
        </button>
        {tokenOpen && (
          <div className="flex gap-1.5">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_… stays in this browser"
              className="min-h-9 min-w-0 flex-1 rounded-full border border-ink/10 bg-paper px-3 text-xs"
            />
            <button
              type="button"
              onClick={saveToken}
              className="rounded-full bg-mist px-3 text-xs"
            >
              Save
            </button>
          </div>
        )}
        {error && <p className="text-[10px] text-ember">{error}</p>}
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
            Your repo
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-foreground-secondary">
            Public GitHub — or private with a token stored only in this browser.
          </p>
        </div>
      </div>

      <form
        className="mb-3 space-y-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          void addRepo();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="owner/repo or github.com/…"
          className="min-h-10 w-full rounded-lg border border-ink/10 bg-paper px-3 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ember/40"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full bg-ink px-3 text-xs font-medium text-paper disabled:opacity-40"
        >
          {busy ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Plus size={12} />
          )}
          {busy ? "Reading repo…" : "Add repo"}
        </button>
        {error && <p className="text-[10px] text-ember">{error}</p>}
      </form>

      <button
        type="button"
        onClick={() => setTokenOpen((v) => !v)}
        className="mb-3 inline-flex items-center gap-1.5 text-[10px] text-muted hover:text-ink"
      >
        <KeyRound size={11} />
        {hasToken ? "Token on · private repos enabled" : "Add GitHub token for private"}
      </button>
      {tokenOpen && (
        <div className="mb-3 space-y-1.5">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_… or github_pat_…"
            className="min-h-9 w-full rounded-lg border border-ink/10 bg-paper px-3 text-xs"
          />
          <button
            type="button"
            onClick={saveToken}
            className="w-full rounded-full bg-mist py-2 text-xs text-ink"
          >
            Save token locally
          </button>
          <p className="text-[9px] leading-snug text-muted">
            Never sent to fondof — only to api.github.com from your browser.
          </p>
        </div>
      )}

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
                {repo.source === "github" && (
                  <span className="rounded bg-ember/10 px-1 py-0.5 font-mono text-[9px] text-ember">
                    {repo.private ? "private" : "you"}
                  </span>
                )}
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

      {active && fitCount > 0 && (
        <p className="mt-4 text-[11px] leading-snug text-foreground-secondary">
          <span className="font-medium text-ink">{fitCount}</span> shard
          {fitCount === 1 ? "" : "s"} look relevant to{" "}
          <span className="font-medium text-ink">{active.name}</span>
        </p>
      )}

      {selectedIdeaCount > 0 && (
        <p className="mt-2 text-[11px] text-muted">
          {selectedIdeaCount} selected → forge fitted to{" "}
          <span className="text-ink">{active?.name}</span>
        </p>
      )}
    </aside>
  );
}
