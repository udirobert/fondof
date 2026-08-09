"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Flame, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center px-4 pt-14 text-center">
      <p className="text-sm font-medium text-ember">Something went wrong</p>
      <p className="mt-2 max-w-sm text-[13px] text-foreground-secondary">
        An unexpected error occurred. Try again or head back to the forge.
      </p>
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/12 bg-paper px-4 text-sm text-ink hover:border-ember/35"
        >
          <RefreshCw size={14} />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ember px-4 text-sm font-medium text-paper hover:bg-ember-hot"
        >
          <Flame size={14} />
          Back to forge
        </Link>
      </div>
    </div>
  );
}
