"use client";

import { motion } from "framer-motion";
import { Podcast, FileText, File } from "lucide-react";

interface SourceCardProps {
  type: "podcast" | "blog" | "text";
  title: string;
  author?: string;
  url: string;
  duration?: string;
  ideasCount?: number;
  isProcessing?: boolean;
}

export function SourceCard({
  type,
  title,
  author,
  url,
  duration,
  ideasCount,
  isProcessing,
}: SourceCardProps) {
  const Icon = type === "podcast" ? Podcast : type === "blog" ? FileText : File;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, rotate: -0.5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      whileHover={{ y: -2, rotate: 0.5, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="paper-sm p-4 cursor-pointer transition-shadow hover:shadow-lg"
      style={{ transformOrigin: "center bottom" }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent-soft flex items-center justify-center">
          <Icon size={14} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium leading-snug text-foreground">
            {title}
          </h3>
          {author && (
            <p className="text-xs text-muted mt-0.5">{author}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        {duration && (
          <span className="text-xs text-muted font-mono">{duration}</span>
        )}
        {isProcessing ? (
          <span className="text-xs text-accent flex items-center gap-1.5">
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-accent"
            />
            Reading...
          </span>
        ) : ideasCount !== undefined ? (
          <span className="text-xs text-forge font-medium">
            {ideasCount} idea{ideasCount !== 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-[10px] text-muted truncate font-mono opacity-60">
        {new URL(url).hostname}
      </p>
    </motion.div>
  );
}
