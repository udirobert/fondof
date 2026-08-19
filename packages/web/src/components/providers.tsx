"use client";

import { lazy, Suspense, type ReactNode } from "react";

/**
 * Lazy-load WagmiProvider — wagmi + viem are heavy (~100KB+) and only needed
 * when users interact with wallet features (pool page, forge publish).
 * Most users never touch crypto, so we defer the cost.
 */
const WagmiWrapper = lazy(() => import("@/components/wagmi-wrapper"));

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <WagmiWrapper>{children}</WagmiWrapper>
    </Suspense>
  );
}
