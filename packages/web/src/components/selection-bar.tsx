"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, X } from "lucide-react";
import { Tip } from "@/components/tip";
import { checkForgeEntitlement, type ForgeEntitlementResponse } from "@/lib/api";
import { loginWithGitHub } from "@/lib/auth";

interface SelectionBarProps {
  count: number;
  onForge: () => void;
  onClear: () => void;
  /** e.g. "the pod" — brand object from sources */
  fondObject?: string;
  /** Titles of selected ideas for the tray */
  selectedTitles?: string[];
  /** Why combining these ideas is useful */
  composeHint?: string;
}

/** Forge tray — selected ideas gather here before composition. */
export function SelectionBar({
  count,
  onForge,
  onClear,
  fondObject,
  selectedTitles = [],
  composeHint,
}: SelectionBarProps) {
  const readyToForge = count >= 1;
  const [entitlement, setEntitlement] = useState<ForgeEntitlementResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkForgeEntitlement().then((res) => {
      if (!cancelled) setEntitlement(res);
    });
    return () => {
      cancelled = true;
    };
  }, [count]);

  const quotaBlocked = entitlement !== null && !entitlement.allowed;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 28, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="pointer-events-auto forge-tray flex w-full max-w-lg flex-col gap-2.5 px-3.5 py-3 sm:max-w-xl">
            <div className="flex items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {selectedTitles.slice(0, 4).map((title, i) => (
                <motion.span
                  key={`${title}-${i}`}
                  initial={{ opacity: 0, y: 6, rotate: i % 2 === 0 ? -2 : 2 }}
                  animate={{ opacity: 1, y: 0, rotate: i % 2 === 0 ? -1 : 1 }}
                  className="forge-tray__chip shrink-0"
                >
                  {title}
                </motion.span>
              ))}
              {count > 4 && (
                <span className="shrink-0 text-[11px] text-muted">
                  +{count - 4}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] leading-snug text-ink/80">
                {composeHint ??
                  (count === 1
                    ? "Fit this single technique directly to your repo"
                    : `Combine ${count} ideas into one unified skill`)}
              </p>
              <p className="shrink-0 text-[10px] font-medium text-novel">
                {count === 1 ? "1 idea ready" : `${count} ideas ready`}
              </p>
            </div>

            {entitlement &&
              entitlement.plan !== "pro" &&
              entitlement.plan !== "sharer" &&
              entitlement.remaining !== null &&
              entitlement.remaining !== undefined && (
                <div className="flex items-center justify-between gap-2 text-[10px] text-muted">
                  <span className={quotaBlocked ? "text-amber-700" : ""}>
                    {entitlement.remaining} of {entitlement.limit ?? 3} free{" "}
                    {entitlement.remaining === 1 ? "forge" : "forges"} left this month
                  </span>
                  {quotaBlocked && entitlement.plan === "anonymous" && (
                    <button
                      type="button"
                      onClick={() =>
                        loginWithGitHub(
                          typeof window !== "undefined" ? window.location.pathname : "/",
                        )
                      }
                      className="text-ember hover:underline"
                    >
                      Sign in for unlimited
                    </button>
                  )}
                </div>
              )}

            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 text-sm text-ink">
                <span className="font-medium text-ember">{count}</span>
                {fondObject ? (
                  <>
                    {" "}
                    from{" "}
                    <span className="font-serif text-ember/90">{fondObject}</span>
                  </>
                ) : (
                  count === 1 ? " idea selected" : " ideas selected"
                )}
              </p>
              <button
                type="button"
                onClick={onClear}
                className="rounded-full p-2 text-muted transition-colors hover:bg-mist hover:text-ink"
                aria-label="Clear selection"
              >
                <X size={16} />
              </button>
              <Tip tip="forge" className="min-w-0 flex-1 sm:flex-none">
                <button
                  type="button"
                  onClick={onForge}
                  disabled={!readyToForge || quotaBlocked}
                  className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-ember px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ember-hot disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Flame size={14} />
                  {count === 1 ? "Fit 1 idea to repo" : `Forge ${count} ideas`}
                </button>
              </Tip>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
