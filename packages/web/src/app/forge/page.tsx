"use client";

import { motion } from "framer-motion";
import { Flame, ArrowRight, Shield, Check, ExternalLink, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { forgeSkill, publishSkill } from "@/lib/api";

export default function ForgePage() {
  const {
    ideas,
    selectedIdeaIds,
    forgedSkill,
    setForgedSkill,
    isForging,
    setForging,
    isPublishing,
    setPublishing,
    publishedTxHash,
    publishedSignal,
    setPublished,
  } = useAppStore();

  const selectedIdeas = ideas.filter((i) => selectedIdeaIds.has(i.id));

  const handleForge = async () => {
    if (selectedIdeas.length === 0) return;
    setForging(true);
    try {
      const result = await forgeSkill(
        selectedIdeas.map((i) => ({
          title: i.title,
          description: i.description,
          sourceUrl: i.sourceUrl,
        }))
      );
      if (!result.error) {
        setForgedSkill(result);
      }
    } catch {
      // Handle error
    }
    setForging(false);
  };

  const handlePublish = async () => {
    if (!forgedSkill) return;
    setPublishing(true);
    try {
      const result = await publishSkill(forgedSkill.skillHash, forgedSkill.sourceHashes);
      if (result.success) {
        setPublished(result.txHash, "1000000000000000");
      }
    } catch {
      // Handle error
    }
    setPublishing(false);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Flame size={20} className="text-accent" />
          <h1 className="text-2xl font-semibold">Forge a Skill</h1>
        </div>
        <p className="text-foreground-secondary mb-10">
          Compose selected ideas into a skill fitted to your environment.
        </p>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left: Ideas + Preview */}
        <div className="lg:col-span-3 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="paper p-6"
          >
            <h2 className="text-[11px] text-muted uppercase tracking-wider font-medium mb-4">
              Selected Ideas ({selectedIdeas.length})
            </h2>
            {selectedIdeas.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-foreground-secondary text-sm">
                  No ideas selected
                </p>
                <p className="text-muted text-xs mt-1.5">
                  Go to the{" "}
                  <a href="/canvas" className="text-accent hover:underline">
                    Canvas
                  </a>{" "}
                  and click ideas to select them
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedIdeas.map((idea) => (
                  <div key={idea.id} className="flex items-start gap-2 py-2">
                    <Check size={12} className="text-accent mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{idea.title}</p>
                      <p className="text-xs text-muted line-clamp-1">{idea.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Skill preview */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="paper p-6"
          >
            <h2 className="text-[11px] text-muted uppercase tracking-wider font-medium mb-4">
              {forgedSkill ? forgedSkill.title : "Skill Preview"}
            </h2>
            {forgedSkill ? (
              <div className="bg-background-subtle rounded-xl p-5 max-h-[400px] overflow-y-auto">
                <pre className="text-xs text-foreground-secondary whitespace-pre-wrap font-mono leading-relaxed">
                  {forgedSkill.markdown}
                </pre>
              </div>
            ) : (
              <div className="bg-background-subtle rounded-xl p-5 min-h-[120px] flex items-center justify-center">
                <p className="text-sm text-muted text-center">
                  {isForging
                    ? "Composing your skill..."
                    : "Click 'Forge Skill' to compose"}
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right: Controls */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 space-y-5"
        >
          <div className="space-y-2.5">
            <button
              onClick={handleForge}
              disabled={selectedIdeas.length === 0 || isForging}
              className="w-full group flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:opacity-90"
            >
              {isForging ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Flame size={14} />
              )}
              {isForging ? "Forging..." : "Forge Skill"}
              {!isForging && (
                <ArrowRight
                  size={12}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
              )}
            </button>

            <button
              onClick={handlePublish}
              disabled={!forgedSkill || isPublishing || !!publishedTxHash}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-background-subtle px-4 py-2.5 text-sm font-medium text-foreground-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-accent-soft hover:text-accent"
            >
              {isPublishing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : publishedTxHash ? (
                <Check size={14} className="text-accent" />
              ) : (
                <Shield size={14} />
              )}
              {isPublishing
                ? "Publishing (~300ms)..."
                : publishedTxHash
                  ? "Published on Monad"
                  : "Publish to SkillPool"}
            </button>
          </div>

          {/* Published confirmation */}
          {publishedTxHash && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-accent-soft/50 rounded-xl p-4 space-y-2"
            >
              <p className="text-xs font-medium text-accent">Live on Monad</p>
              <p className="text-[10px] text-foreground-secondary font-mono break-all">
                TX: {publishedTxHash}
              </p>
              <p className="text-[10px] text-foreground-secondary">
                Signal: {publishedSignal} (grows with usage)
              </p>
              <a
                href={`https://testnet.monadexplorer.com/tx/${publishedTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-accent hover:underline"
              >
                View on explorer <ExternalLink size={9} />
              </a>
            </motion.div>
          )}

          {/* Info */}
          <div className="bg-background-subtle rounded-xl p-4">
            <p className="text-[11px] text-foreground-secondary leading-relaxed">
              Publishing records the skill&apos;s provenance (source → ideas → skill) on
              Monad&apos;s SkillPool. Signal starts at backing amount and grows as
              agents use it. Others can challenge quality — if your skill wins,
              your backing grows.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
