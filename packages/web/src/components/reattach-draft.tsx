"use client";

import { useState } from "react";
import { Check, Paperclip } from "lucide-react";
import { publishSkillMeta } from "@/lib/api";
import { skillPreviewFromMarkdown } from "@/lib/skill-meta";
import { whereItLands } from "@/lib/where-it-lands";

interface ReattachDraftProps {
  skillHash: string;
  repo?: string | null;
  frameworks?: string[];
  onAttached: (meta: {
    title: string;
    blurb?: string;
    repo?: string;
    markdown: string;
    landings?: Array<{ path: string; why: string }>;
  }) => void;
}

/**
 * Backfill skill body on a live hash — for cleans / older forges without edge markdown.
 */
export function ReattachDraft({
  skillHash,
  repo,
  frameworks,
  onAttached,
}: ReattachDraftProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const submit = async () => {
    const markdown = text.trim();
    if (!markdown || busy) return;
    setBusy(true);
    setNote(null);
    const preview = skillPreviewFromMarkdown(markdown);
    const landings = whereItLands({
      repoName: repo ?? undefined,
      frameworks,
      ideaText: `${preview.title} ${preview.blurb}`,
    });
    try {
      const res = await publishSkillMeta(skillHash, {
        title: preview.title,
        blurb: preview.blurb,
        repo: repo ?? undefined,
        markdown,
        landings,
        frameworks,
      });
      if (res.error) {
        setNote(res.error);
        return;
      }
      onAttached({
        title: preview.title,
        blurb: preview.blurb,
        repo: repo ?? undefined,
        markdown,
        landings,
      });
      setNote("Attached — sections and copy are live for any browser.");
      setOpen(false);
      setText("");
    } catch {
      setNote("Couldn’t attach — try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="rounded-xl border border-dashed border-ink/15 bg-mist/30 px-3 py-3">
        <p className="text-[12px] leading-snug text-foreground-secondary">
          This skill is on SkillPool but the markdown body isn’t attached yet
          (older forge, or a fresh pool).
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-[12px] text-ember hover:underline"
        >
          <Paperclip size={13} />
          Attach skill draft
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-ink/10 bg-paper px-3 py-3">
      <p className="text-[11px] uppercase tracking-wider text-muted">
        Attach draft
      </p>
      <p className="text-[11px] leading-snug text-muted">
        Paste the skill markdown from forge (or your notes). We store title,
        landing map, and body at the edge — still not on-chain.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={"# My skill\n\n## Context\n…\n## Guidance\n…"}
        className="w-full resize-y rounded-lg border border-ink/10 bg-parchment/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ember/40"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || text.trim().length < 40}
          onClick={() => void submit()}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ember px-3 text-[12px] font-medium text-paper hover:bg-ember-hot disabled:opacity-40"
        >
          {busy ? (
            "Attaching…"
          ) : (
            <>
              <Check size={13} />
              Save artifact
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setNote(null);
          }}
          className="min-h-9 px-2 text-[12px] text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
      {note && (
        <p className="text-[11px] leading-snug text-ember" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
