"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Flame, X } from "lucide-react";

interface SelectionBarProps {
  count: number;
  onForge: () => void;
  onClear: () => void;
}

export function SelectionBar({ count, onForge, onClear }: SelectionBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
        >
          <div className="panel-float flex items-center gap-3 border border-ink/8 px-3 py-2.5 pl-4">
            <p className="text-sm text-ink">
              <span className="font-medium text-ember">{count}</span> selected
            </p>
            <button
              type="button"
              onClick={onClear}
              className="rounded-full p-1.5 text-muted hover:text-ink hover:bg-mist transition-colors"
              aria-label="Clear selection"
            >
              <X size={14} />
            </button>
            <button
              type="button"
              onClick={onForge}
              className="flex items-center gap-2 rounded-full bg-ember px-4 py-2 text-sm font-medium text-paper hover:bg-ember-hot transition-colors"
            >
              <Flame size={14} />
              Forge skill
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
