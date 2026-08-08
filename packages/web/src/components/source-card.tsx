"use client";

import { motion } from "framer-motion";
import { Podcast, FileText, File } from "lucide-react";

interface SourceCardProps {
  type: "podcast" | "blog" | "text" | "youtube";
  title: string;
  author?: string;
  url: string;
  duration?: string;
  ideasCount?: number;
  textLength?: number;
  isProcessing?: boolean;
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
}: SourceCardProps) {
  const Icon =
    type === "podcast"
      ? Podcast
      : type === "youtube"
        ? FileText
        : type === "blog"
          ? FileText
          : File;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="panel-sm p-4 cursor-pointer transition-shadow hover:shadow-lg focus-within:ring-1 focus-within:ring-ember/40"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-ember-soft/60 flex items-center justify-center">
          <Icon size={14} className="text-ember" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium leading-snug text-ink">
            {title}
          </h3>
          {author && <p className="text-xs text-muted mt-0.5">{author}</p>}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        {duration && (
          <span className="text-xs text-muted font-mono">{duration}</span>
        )}
        {isProcessing ? (
          <span className="text-xs text-ember flex items-center gap-1.5">
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-ember"
            />
            Reading...
          </span>
        ) : ideasCount !== undefined ? (
          <span className="text-xs text-ember font-medium">
            {ideasCount} idea{ideasCount !== 1 ? "s" : ""}
            {textLength && textLength > 0
              ? ` · ${(textLength / 1000).toFixed(0)}k chars`
              : ""}
          </span>
        ) : null}
      </div>

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
