"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Eye,
  EyeOff,
  Flame,
  GitFork,
  KeyRound,
  Loader2,
  Plus,
} from "lucide-react";
import type { ConnectedRepo } from "@/lib/github-repo";
import {
  fetchGitHubRepo,
  getGitHubToken,
  setGitHubToken,
} from "@/lib/github-repo";
import { useAppStore } from "@/lib/store";

export interface FitPreview {
  id: string;
  title: string;
  why: string;
}

interface FitTargetProps {
  repos: ConnectedRepo[];
  variant?: "panel" | "strip";
  selectedIdeaCount?: number;
  /** How many shards fit the active repo */
  fitCount?: number;
  /** Top fits for teaching + navigation */
  fitPreviews?: FitPreview[];
  fitFilterActive?: boolean;
  onShowFit?: () => void;
  onClearFit?: () => void;
  onSelectFit?: () => void;
  onFocusShard?: (id: string) => void;
  onRepoAdded?: (repo: ConnectedRepo) => void;
}

/**
 * Fit target — connect a repo, then act on which shards fit it.
 */
export function FitTarget({
  repos,
  variant = "panel",
  selectedIdeaCount = 0,
  fitCount = 0,
  fitPreviews = [],
  fitFilterActive = false,
  onShowFit,
  onClearFit,
  onSelectFit,
  onFocusShard,
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
  const [addOpen, setAddOpen] = useState(false);
  const [token, setToken] = useState("");
  const [hasToken, setHasToken] = useState(false);

  const hasFit = fitCount > 0 && !!active;

  useEffect(() => {
    const t = getGitHubToken();
    setHasToken(!!t);
    if (t) setToken(t);
  }, []);

  // Fit moment → collapse add; no fits → keep connect path open
  useEffect(() => {
    setAddOpen(!hasFit);
  }, [hasFit, active?.fullName]);

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
      setAddOpen(false);
      onRepoAdded?.(repo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t add repo");
    } finally {
      setBusy(false);
    }
  };

  const fitActions = hasFit ? (
    <div className="rounded-xl border border-ember/25 bg-paper/80 p-3 shadow-sm">
      <p className="text-[12px] leading-snug text-ink">
        <span className="font-medium tabular-nums">{fitCount}</span> shard
        {fitCount === 1 ? "" : "s"} fit{" "}
        <span className="font-medium">{active?.name}</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => (fitFilterActive ? onClearFit?.() : onShowFit?.())}
          className="inline-flex min-h-8 items-center gap-1 rounded-full border border-ember/35 bg-ember/8 px-2.5 text-[11px] font-medium text-ember hover:bg-ember/14"
        >
          {fitFilterActive ? (
            <>
              <EyeOff size={11} />
              Show all
            </>
          ) : (
            <>
              <Eye size={11} />
              Show fits
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelectFit?.()}
          className="inline-flex min-h-8 items-center gap-1 rounded-full border border-ink/10 bg-mist px-2.5 text-[11px] text-ink hover:border-ember/30"
        >
          <Flame size={11} className="text-ember" />
          Select fits
        </button>
      </div>
      {fitPreviews.length > 0 && (
        <ul className="mt-2.5 space-y-2 border-t border-ink/6 pt-2">
          {fitPreviews.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onFocusShard?.(p.id)}
                className="w-full text-left"
              >
                <span className="block text-[12px] font-medium leading-snug text-ink hover:text-ember">
                  {p.title}
                </span>
                <span className="mt-0.5 block text-[10px] leading-snug text-muted">
                  {p.why}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedIdeaCount > 0 && (
        <p className="mt-2 text-[10px] text-muted">
          {selectedIdeaCount} selected → forge for {active?.name}
        </p>
      )}
    </div>
  ) : active ? (
    <div className="rounded-xl border border-ink/10 bg-mist/50 p-3">
      <p className="text-[12px] leading-snug text-ink">
        No strong stack matches for{" "}
        <span className="font-medium">{active.name}</span> yet
      </p>
      <p className="mt-1 text-[10px] leading-snug text-muted">
        Forge any shards you like — fit chips appear when language or frameworks
        overlap.
      </p>
    </div>
  ) : null;

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
                {repo.source === "github"
                  ? repo.private
                    ? " · private"
                    : " · you"
                  : ""}
              </button>
            );
          })}
        </div>
        {hasFit && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => (fitFilterActive ? onClearFit?.() : onShowFit?.())}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-ember/30 bg-ember/8 px-2.5 text-[11px] text-ember"
            >
              {fitFilterActive ? "Show all" : `Show ${fitCount} fits`}
            </button>
            <button
              type="button"
              onClick={() => onSelectFit?.()}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-ink/10 px-2.5 text-[11px] text-ink"
            >
              Select fits
            </button>
          </div>
        )}
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
            {busy ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Plus size={12} />
            )}
            Add
          </button>
        </form>
        <button
          type="button"
          onClick={() => setTokenOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-ink"
        >
          <KeyRound size={10} />
          {hasToken
            ? "GitHub token saved (private OK)"
            : "Private repo? Add token"}
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

  const otherRepos = repos.filter((r) => r.fullName !== active?.fullName);

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
            {hasFit
              ? `Fitting shards to ${active?.name}`
              : active
                ? "No strong stack matches yet — forge broadly or switch repo."
                : "Add a GitHub repo to see which shards fit."}
          </p>
        </div>
      </div>

      {active && (
        <div className="mb-3 rounded-xl border border-ember/40 bg-paper px-3 py-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-medium text-ink">
              {active.name}
            </span>
            {active.source === "github" && (
              <span className="rounded bg-ember/10 px-1 py-0.5 font-mono text-[9px] text-ember">
                {active.private ? "private" : "you"}
              </span>
            )}
            <Check size={12} className="ml-auto shrink-0 text-ember" />
          </div>
          <p className="mt-1 truncate font-mono text-[10px] text-muted">
            {active.fullName}
          </p>
          <p className="mt-1.5 text-[10px] text-foreground-secondary">
            {[
              ...active.languages.slice(0, 2).map((l) => l.language),
              ...active.frameworks.slice(0, 2),
            ].join(" · ")}
          </p>
        </div>
      )}

      {fitActions && <div className="mb-3">{fitActions}</div>}

      {otherRepos.length > 0 && (
        <div className="mb-3 space-y-1.5" role="radiogroup" aria-label="Other repositories">
          <p className="text-[10px] uppercase tracking-wider text-muted">
            Switch repo
          </p>
          {otherRepos.map((repo) => (
            <button
              key={repo.fullName}
              type="button"
              role="radio"
              aria-checked={false}
              onClick={() => setActiveRepo(repo.fullName)}
              className="w-full rounded-lg border border-ink/8 px-2.5 py-2 text-left transition-colors hover:border-ink/15 hover:bg-paper/60"
            >
              <div className="flex items-center gap-2">
                <span className="truncate text-[12px] font-medium text-ink">
                  {repo.name}
                </span>
                {repo.source === "github" && (
                  <span className="rounded bg-mist px-1 py-0.5 font-mono text-[9px] text-muted">
                    {repo.private ? "private" : "you"}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate font-mono text-[9px] text-muted">
                {repo.fullName}
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="mt-auto space-y-2 border-t border-ink/8 pt-3">
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          className="inline-flex w-full items-center justify-between gap-2 text-[11px] text-muted hover:text-ink"
          aria-expanded={addOpen}
        >
          <span className="inline-flex items-center gap-1.5">
            <Plus size={12} />
            Add another repo
          </span>
        </button>
        {addOpen && (
          <form
            className="space-y-1.5"
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
        )}

        <button
          type="button"
          onClick={() => setTokenOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[10px] text-muted hover:text-ink"
        >
          <KeyRound size={11} />
          {hasToken
            ? "Token on · private repos enabled"
            : "Add GitHub token for private"}
        </button>
        {tokenOpen && (
          <div className="space-y-1.5">
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
      </div>
    </aside>
  );
}
