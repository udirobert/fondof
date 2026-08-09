"use client";

import { useState } from "react";
import { Check, ExternalLink, Share2 } from "lucide-react";
import { recordShare } from "@/lib/billing";
import { track } from "@/lib/track";
import { skillShareUrl } from "@/lib/skill-share";

interface SkillSharePanelProps {
  skillHash: string;
  title: string;
  sourceTitle?: string;
  repoName?: string;
  /** Called after a share is recorded — parent can refresh plan state. */
  onShared?: () => void;
}

/**
 * Share panel shown after forge/publish completion.
 * Pre-composes social posts with attribution. Recording a share
 * unlocks unlimited forges for the month.
 */
export function SkillSharePanel({
  skillHash,
  title,
  sourceTitle,
  repoName,
  onShared,
}: SkillSharePanelProps) {
  const [shared, setShared] = useState<string | null>(null);

  const skillUrl = skillShareUrl(skillHash);
  const shortTitle = title.length > 60 ? title.slice(0, 57) + "…" : title;

  const tweetText = [
    `I just forged "${shortTitle}"`,
    sourceTitle ? `from "${sourceTitle}"` : null,
    repoName ? `fitted for ${repoName}` : null,
    `\n\nTurn what you learn into coding skills for your agent →`,
    skillUrl,
    `\n\nMade with @fondof_dev`,
  ]
    .filter(Boolean)
    .join(" ");

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(skillUrl)}`;

  const handleShare = async (platform: "twitter" | "linkedin") => {
    // Open share window
    const url = platform === "twitter" ? tweetUrl : linkedInUrl;
    window.open(url, "_blank", "width=600,height=400");

    // Record the share
    await recordShare(skillHash, platform);
    track("share_link_copied", { skillHash, platform });
    setShared(platform);
    onShared?.();
  };

  return (
    <div className="rounded-xl border border-ink/8 bg-paper/80 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-ink">
        <Share2 size={14} />
        Share your skill — unlock unlimited forges
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        Share publicly to get unlimited forges this month. Your skill, your
        attribution, your brand.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void handleShare("twitter")}
          className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink transition-colors hover:border-ember/35"
        >
          {shared === "twitter" ? (
            <Check size={14} className="text-emerald-600" />
          ) : (
            <ExternalLink size={14} />
          )}
          {shared === "twitter" ? "Shared — unlimited unlocked!" : "Share on X (Twitter)"}
        </button>
        <button
          type="button"
          onClick={() => void handleShare("linkedin")}
          className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink transition-colors hover:border-ember/35"
        >
          {shared === "linkedin" ? (
            <Check size={14} className="text-emerald-600" />
          ) : (
            <ExternalLink size={14} />
          )}
          {shared === "linkedin" ? "Shared — unlimited unlocked!" : "Share on LinkedIn"}
        </button>
      </div>

      {shared && (
        <p className="mt-2 text-center text-[11px] text-emerald-600">
          You&apos;re now a Sharer — forge as much as you want this month.
        </p>
      )}
    </div>
  );
}
