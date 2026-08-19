"use client";

import { useState } from "react";
import { Check, ExternalLink, Mic, X } from "lucide-react";
import { publishSkillMeta } from "@/lib/api";
import { track } from "@/lib/track";

interface SkillAgentPanelProps {
  skillHash: string;
  titleHint?: string | null;
  /** Existing agent URL if already saved */
  agentUrl?: string | null;
  /** Only show the attach form if the viewer owns this skill */
  isOwner?: boolean;
  onSaved: (agentUrl: string) => void;
}

function isValidAgentUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * ElevenAgent link panel.
 *
 * - agentUrl present → shows a prominent "Talk to this skill" button (visible to all)
 * - agentUrl absent + isOwner → shows collapsed "Attach agent link" prompt
 * - agentUrl absent + !isOwner → renders nothing
 */
export function SkillAgentPanel({
  skillHash,
  titleHint,
  agentUrl,
  isOwner,
  onSaved,
}: SkillAgentPanelProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(agentUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = url.trim();
    if (!isValidAgentUrl(trimmed) || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await publishSkillMeta(skillHash, {
        title: titleHint?.trim() || undefined,
        agentUrl: trimmed,
      });
      if (res.error) {
        setStatus(res.error);
        return;
      }
      onSaved(trimmed);
      track("agent_url_attached", { skillHash });
      setStatus("Agent link saved.");
      setOpen(false);
    } catch {
      setStatus("Couldn't save — try again.");
    } finally {
      setBusy(false);
    }
  };

  // Agent exists — prominent button visible to everyone
  if (agentUrl) {
    return (
      <div className="space-y-1">
        <a
          href={agentUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("agent_link_clicked", { skillHash })}
          className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-ember/40 bg-paper px-4 text-sm font-medium text-ember hover:bg-ember/5"
        >
          <Mic size={15} />
          Talk to this skill
          <ExternalLink size={12} className="opacity-60" />
        </a>
        <p className="text-center text-[10px] text-muted">
          ElevenAgent · grounded in this skill via fondof
        </p>
        {isOwner && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setUrl(agentUrl);
                setOpen(true);
              }}
              className="text-[10px] text-muted hover:text-ink"
            >
              Edit agent link
            </button>
            {open && (
              <div className="mt-2 space-y-2 rounded-xl border border-ink/10 bg-paper px-3 py-3 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-wider text-muted">Update agent link</p>
                  <button type="button" onClick={() => { setOpen(false); setStatus(null); }} aria-label="Close">
                    <X size={14} className="text-muted" />
                  </button>
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://elevenlabs.io/app/talk-to-agent/…"
                  className="w-full rounded-lg border border-ink/10 bg-parchment/40 px-3 py-2 font-mono text-[11px] text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ember/40"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy || !isValidAgentUrl(url.trim())}
                    onClick={() => void submit()}
                    className="inline-flex min-h-9 items-center gap-1 rounded-full bg-ember px-3 text-[12px] font-medium text-paper hover:bg-ember-hot disabled:opacity-40"
                  >
                    {busy ? "Saving…" : <><Check size={12} /> Save</>}
                  </button>
                  <button type="button" onClick={() => { setOpen(false); setStatus(null); }} className="min-h-9 px-2 text-[12px] text-muted hover:text-ink">
                    Cancel
                  </button>
                </div>
                {status && <p className="text-[11px] text-ember" role="status">{status}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // No agent yet — only show attach form to owner
  if (!isOwner) return null;

  if (!open) {
    return (
      <div className="rounded-xl border border-dashed border-ink/15 bg-mist/30 px-3 py-3">
        <p className="text-[12px] leading-snug text-foreground-secondary">
          Created an ElevenAgent from this skill? Paste the share link to add a{" "}
          <span className="font-medium text-ink">Talk to this skill</span> button.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-[12px] text-ember hover:underline"
        >
          <Mic size={13} />
          Attach agent link
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-ink/10 bg-paper px-3 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-muted">ElevenAgent share link</p>
        <button type="button" onClick={() => { setOpen(false); setStatus(null); }} aria-label="Close">
          <X size={14} className="text-muted" />
        </button>
      </div>
      <p className="text-[11px] leading-snug text-foreground-secondary">
        Copy the <span className="font-medium text-ink">Talk to a Skill</span> prompt below, run it in an MCP-capable agent with ElevenLabs connected, then paste the share URL here.
      </p>
      <label className="block space-y-1">
        <span className="text-[11px] text-muted">Agent share URL</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://elevenlabs.io/app/talk-to-agent/…"
          className="w-full rounded-lg border border-ink/10 bg-parchment/40 px-3 py-2 font-mono text-[11px] text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ember/40"
          autoFocus
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !isValidAgentUrl(url.trim())}
          onClick={() => void submit()}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ember px-3 text-[12px] font-medium text-paper hover:bg-ember-hot disabled:opacity-40"
        >
          {busy ? "Saving…" : <><Check size={13} /> Save agent link</>}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setStatus(null); }}
          className="min-h-9 px-2 text-[12px] text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
      {status && <p className="text-[11px] leading-snug text-ember" role="status">{status}</p>}
    </div>
  );
}
