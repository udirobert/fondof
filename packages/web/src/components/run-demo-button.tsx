"use client";

import { motion } from "framer-motion";
import { Play, Loader2 } from "lucide-react";

interface RunDemoButtonProps {
  running: boolean;
  onClick: () => void;
}

export function RunDemoButton({ running, onClick }: RunDemoButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={running}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-[4.25rem] right-5 z-40 flex items-center gap-2 rounded-full border border-ink/10 bg-paper/95 px-3.5 py-2 text-xs font-medium text-ink backdrop-blur-md hover:border-ember/40 hover:text-ember disabled:opacity-60 transition-colors shadow-sm"
    >
      {running ? (
        <Loader2 size={13} className="animate-spin text-ember" />
      ) : (
        <Play size={13} className="text-ember" />
      )}
      {running ? "Running demo…" : "Run demo"}
    </motion.button>
  );
}
