"use client";

import { Suspense } from "react";
import { FondFloor } from "@/components/fond-floor";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center pt-20">
          <p className="text-sm text-muted">Opening fondof…</p>
        </div>
      }
    >
      <FondFloor showFrame />
    </Suspense>
  );
}
