"use client";

import { useState } from "react";
import { Check, ExternalLink, Sparkles } from "lucide-react";
import {
  publishSkillMeta,
  verifySkillPr,
  type SkillEvidence,
  type SkillOutcome,
} from "@/lib/api";
import { track } from "@/lib/track";

interface SkillOutcomePanelProps {
  skillHash: string;
  titleHint?: string | null;
  outcome?: SkillOutcome | null;
  evidence?: SkillEvidence | null;
  onSaved: (outcome: SkillOutcome, evidence?: SkillEvidence) => void;
}

/**
 * Optional outcome receipt — what the skill resulted in (not fake metrics).
 */
export function SkillOutcomePanel({
  skillHash,
  titleHint,
  outcome,
  evidence,
  onSaved,
}: SkillOutcomePanelProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(outcome?.note ?? "");
  const [prUrl, setPrUrl] = useState(outcome?.prUrl ?? "");
  const [screenshotUrl, setScreenshotUrl] = useState(
    outcome?.screenshotUrl ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = note.trim();
    if (trimmed.length < 8 || busy) return;
    setBusy(true);
    setStatus(null);
    const next: SkillOutcome = {
      note: trimmed,
      prUrl: prUrl.trim() || undefined,
      screenshotUrl: screenshotUrl.trim() || undefined,
    };
    try {
      const res = await publishSkillMeta(skillHash, {
        title: titleHint?.trim() || undefined,
        outcome: next,
      });
      if (res.error) {
        setStatus(res.error);
        return;
      }
      onSaved(next, res.evidence);
      track("outcome_attached", { skillHash });
      setStatus("Outcome attached — visible on this skill and the pool.");
      setOpen(false);
    } catch {
      setStatus("Couldn’t save — try again.");
    } finally {
      setBusy(false);
    }
  };

  const verifyPr = async () => {
    if (!outcome?.prUrl || verifyBusy) return;
    setVerifyBusy(true);
    setStatus(null);
    try {
      const res = await verifySkillPr(skillHash);
      if (res.error) {
        setStatus(res.error);
      } else if (res.evidence?.outcome) {
        onSaved(res.evidence.outcome, res.evidence);
        setStatus(
          "GitHub confirmed the PR exists — that still does not prove the skill caused the change.",
        );
      }
    } catch {
      setStatus("Couldn’t check GitHub right now.");
    } finally {
      setVerifyBusy(false);
    }
  };

  const evidenceLabel =
    evidence?.level === "verified-pr"
      ? "GitHub-confirmed PR · causality not verified"
      : evidence?.level === "linked-pr"
        ? "Linked PR · not independently verified"
        : evidence?.level === "outcome-attached"
        ? "Outcome attached"
        : evidence?.level === "claimed-use"
          ? "Claimed use · not verified impact"
          : null;

  if (outcome && !open) {
    return (
      <section className="space-y-2" aria-label="What this skill resulted in">
        <p className="text-[11px] uppercase tracking-wider text-muted">
          What it resulted in
        </p>
        <div className="rounded-xl border border-ink/10 bg-paper px-3 py-3">
          <p className="text-[13px] leading-snug text-ink">{outcome.note}</p>
          {evidenceLabel && (
            <p className="mt-2 text-[10px] uppercase tracking-wide text-muted">
              {evidenceLabel}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
            {outcome.prUrl && (
              <>
                <a
                  href={outcome.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-ember hover:underline"
                >
                  PR <ExternalLink size={11} />
                </a>
                {outcome.prStatus === "github-confirmed" ? (
                  <span className="text-muted">
                    GitHub confirmed{outcome.githubMerged ? " · merged" : ""}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void verifyPr()}
                    disabled={verifyBusy}
                    className="text-muted hover:text-ink disabled:opacity-40"
                  >
                    {verifyBusy ? "Checking…" : "Check on GitHub"}
                  </button>
                )}
              </>
            )}
            {outcome.screenshotUrl && (
              <a
                href={outcome.screenshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-ember hover:underline"
              >
                Screenshot <ExternalLink size={11} />
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                setNote(outcome.note);
                setPrUrl(outcome.prUrl ?? "");
                setScreenshotUrl(outcome.screenshotUrl ?? "");
                setOpen(true);
              }}
              className="text-muted hover:text-ink"
            >
              Edit
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!open) {
    return (
      <div className="rounded-xl border border-dashed border-ink/15 bg-mist/30 px-3 py-3">
        {evidenceLabel && (
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted">
            {evidenceLabel}
          </p>
        )}
        <p className="text-[12px] leading-snug text-foreground-secondary">
          Used this skill on a real repo? Attach what improved — a short note,
          optional PR or screenshot link. No fake metrics.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-[12px] text-ember hover:underline"
        >
          <Sparkles size={13} />
          Attach outcome
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-ink/10 bg-paper px-3 py-3">
      <p className="text-[11px] uppercase tracking-wider text-muted">
        Outcome receipt
      </p>
      <label className="block space-y-1">
        <span className="text-[11px] text-muted">What improved</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="e.g. Cut hero CLS; PR cleaned retry helper for fetch clients"
          className="w-full resize-y rounded-lg border border-ink/10 bg-parchment/40 px-3 py-2 text-[12px] leading-relaxed text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ember/40"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] text-muted">PR URL (optional)</span>
        <input
          type="url"
          value={prUrl}
          onChange={(e) => setPrUrl(e.target.value)}
          placeholder="https://github.com/…/pull/…"
          className="w-full rounded-lg border border-ink/10 bg-parchment/40 px-3 py-2 font-mono text-[11px] text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ember/40"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] text-muted">Screenshot URL (optional)</span>
        <input
          type="url"
          value={screenshotUrl}
          onChange={(e) => setScreenshotUrl(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-lg border border-ink/10 bg-parchment/40 px-3 py-2 font-mono text-[11px] text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ember/40"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || note.trim().length < 8}
          onClick={() => void submit()}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ember px-3 text-[12px] font-medium text-paper hover:bg-ember-hot disabled:opacity-40"
        >
          {busy ? (
            "Saving…"
          ) : (
            <>
              <Check size={13} />
              Save outcome
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setStatus(null);
          }}
          className="min-h-9 px-2 text-[12px] text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
      {status && (
        <p className="text-[11px] leading-snug text-ember" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
