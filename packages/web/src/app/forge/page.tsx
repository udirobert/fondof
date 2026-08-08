"use client";

import { motion } from "framer-motion";
import { Flame, GitFork, ArrowRight, Shield } from "lucide-react";

export default function ForgePage() {
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
          Select ideas from your canvas and compose them into a skill fitted to
          your repository.
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
              Selected Ideas
            </h2>
            <div className="flex items-center justify-center py-10 text-center">
              <div>
                <p className="text-foreground-secondary text-sm">
                  No ideas selected yet
                </p>
                <p className="text-muted text-xs mt-1.5">
                  Visit the{" "}
                  <a href="/canvas" className="text-accent hover:underline">
                    Canvas
                  </a>{" "}
                  to select ideas
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="paper p-6"
          >
            <h2 className="text-[11px] text-muted uppercase tracking-wider font-medium mb-4">
              Skill Preview
            </h2>
            <div className="bg-background-subtle rounded-xl p-5 min-h-[160px] flex items-center justify-center">
              <p className="text-sm text-muted text-center">
                The composed skill will preview here before you save it.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Right: Controls */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 space-y-5"
        >
          {/* Target repo */}
          <div className="paper-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <GitFork size={13} className="text-muted" />
              <h3 className="text-[11px] text-muted uppercase tracking-wider font-medium">
                Target Repository
              </h3>
            </div>
            <select className="w-full bg-background-subtle rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/30">
              <option value="" disabled selected>
                Select a repo...
              </option>
              <option value="udirobert/api-gateway">udirobert/api-gateway</option>
              <option value="udirobert/fondof">udirobert/fondof</option>
            </select>
            <p className="text-[10px] text-muted mt-2 leading-relaxed">
              The skill will respect this repo&apos;s stack, conventions, and
              existing patterns.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <button
              disabled
              className="w-full group flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Flame size={14} />
              Forge Skill
              <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 rounded-full bg-background-subtle px-4 py-2.5 text-sm font-medium text-foreground-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-accent-soft hover:text-accent"
            >
              <Shield size={14} />
              Publish with Attestation
            </button>
          </div>

          {/* Provenance note */}
          <div className="bg-accent-soft/50 rounded-xl p-4">
            <p className="text-[11px] text-foreground-secondary leading-relaxed">
              When published, the full lineage — from source content to extracted
              ideas to composed skill — is attested on Monad. No wallet or
              blockchain knowledge needed.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
