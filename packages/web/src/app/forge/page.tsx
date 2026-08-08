"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

/** Forge is an in-canvas mode — deep links land on the tool with the modal open. */
export default function ForgePage() {
  const router = useRouter();
  const { selectedIdeaIds, setForgeOpen } = useAppStore();

  useEffect(() => {
    if (selectedIdeaIds.size > 0) {
      setForgeOpen(true);
      router.replace("/canvas?forge=1");
    } else {
      router.replace("/canvas");
    }
  }, [router, selectedIdeaIds.size, setForgeOpen]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center pt-20">
      <p className="text-sm text-muted">Opening forge…</p>
    </div>
  );
}
