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
  onSaved: (agentUrl: string) => void;
}

function isValidAgentUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    // Accept ElevenLabs widget/share URLs and any https link
    return true;
  } catch {
    return false;
  }
}

/**
 * Optional ElevenAgent link panel — paste the share URL after creating the
 * agent via ElevenLabs Hosted MCP. Saves to the skill's edge meta so the
 * link persists on the public skill page.
 */
export function SkillAgentPanel({
  skillHash,
  titleHint,
  agentUrl,
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
      setStatus("Agent link saved — visitors can talk to this skill.");
      setOpen(false);
    } catch {
      setStatus("Couldn't save — try again.");
    } finally {
      setBusy(false);
    }
  };

  // Already have an agent URL — show the talk link + edit button
  if (agentUrl && !open) {
    return (
      <section className="space-y-2" aria-label="Talk to this skill">
        <p className="text-[11px] uppercase tracking-wider text-muted">
          Talk to this skill
        </p>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-paper px-3 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Mic size={14} className="shrink-0 text-ember" />
            <a
              href={agentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 truncate text-[13px] font-medium text-ember hover:underline"
            >
              Open ElevenAgent
              <ExternalLink size={11} className="shrink-0" />
            </a>
          </div>
          <button
            type="button"
            onClick={() => {
              setUrl(agentUrl);
              setOpen(true);
            }}
            className="shrink-0 text-[11px] text-muted hover:text-ink"
          >
            Edit
          </button>
        </div>
        <p className="text-[10px] leading-snug text-muted">
          Created via ElevenLabs Hosted MCP · grounded in this skill
        </p>
      </section>
    );
  }

  // Collapsed prompt to add an agent link
  if (!open) {
    return (
      <div className="rounded-xl border border-dashed border-ink/15 bg-mist/30 px-3 py-3">
        <p className="text-[12px] leading-snug text-foreground-secondary">
          Created the ElevenAgent? Paste its share link here so visitors can
          talk to this skill directly.
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

  // Expanded input form
  return (
    <div className="space-y-2 rounded-xl border border-ink/10 bg-paper px-3 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-muted">
          ElevenAgent share link
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setStatus(null);
          }}
          className="text-muted hover:text-ink"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
      <p className="text-[11px] leading-snug text-foreground-secondary">
        Copy the Talk to a Skill prompt, run it in Claude with ElevenLabs
        Hosted MCP connected, approve the agent, then paste the share URL below.
      </p>
      <label className="block space-y-1">
        <span className="text-[11px] text-muted">Agent share URL</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://elevenlabs.io/app/talk-to…"
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
          {busy ? (
            "Saving…"
          ) : (
            <>
              <Check size={13} />
              Save agent link
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
