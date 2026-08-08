"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Loader2 } from "lucide-react";

export function IngestBar() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    // TODO: Call ingest API
    setTimeout(() => {
      setIsLoading(false);
      setUrl("");
    }, 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="relative mb-2">
      <div className="paper-sm px-3 py-2.5 flex items-center gap-2">
        <Link2 size={14} className="text-muted flex-shrink-0" />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a podcast or blog URL..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/60 focus:outline-none"
        />
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Loader2 size={14} className="text-accent animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
