"use client";

import { motion } from "framer-motion";
import { File, FileText, Podcast, ScrollText } from "lucide-react";
import { Tip } from "@/components/tip";

interface SourceCardProps {
  type: "podcast" | "blog" | "text" | "youtube";
  title: string;
  author?: string;
  url: string;
  duration?: string;
  ideasCount?: number;
  textLength?: number;
  isProcessing?: boolean;
  /** Session body available for inspect */
  hasBodyText?: boolean;
  onViewText?: () => void;
}

export function SourceCard({
  type,
  title,
  author,
  url,
  duration,
  ideasCount,
  textLength,
  isProcessing,
  hasBodyText,
  onViewText,
}: SourceCardProps) {
  const Icon =
    type === "podcast"
      ? Podcast
      : type === "youtube"
        ? FileText
        : type === "blog"
          ? FileText
          : File;

  const textLabel =
    type === "youtube" || type === "podcast" ? "View transcript" : "View source text";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="panel-sm p-4 transition-shadow hover:shadow-lg focus-within:ring-1 focus-within:ring-ember/40"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-ember-soft/60">
          <Icon size={14} className="text-ember" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium leading-snug text-ink">{title}</h3>
          {author && <p className="mt-0.5 text-xs text-muted">{author}</p>}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        {duration && (
          <span className="font-mono text-xs text-muted">{duration}</span>
        )}
        {isProcessing ? (
          <span className="flex items-center gap-1.5 text-xs text-ember">
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="h-1.5 w-1.5 rounded-full bg-ember"
            />
            Reading...
          </span>
        ) : ideasCount !== undefined ? (
          <Tip tip="shard">
            <span className="text-xs font-medium text-ember">
              {ideasCount} idea{ideasCount !== 1 ? "s" : ""}
              {textLength && textLength > 0
                ? ` · ${(textLength / 1000).toFixed(0)}k chars`
                : ""}
            </span>
          </Tip>
        ) : null}
      </div>

      {(onViewText && !isProcessing && (hasBodyText || (textLength && textLength > 0))) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewText();
          }}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-ember"
        >
          <ScrollText size={12} />
          {hasBodyText ? textLabel : `${textLabel} (reload source)`}
        </button>
      )}

      <a
        href={url.startsWith("http") ? url : undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block truncate font-mono text-[10px] text-muted opacity-60 hover:text-ember hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {hostname(url)}
      </a>
    </motion.article>
  );
}

function hostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
