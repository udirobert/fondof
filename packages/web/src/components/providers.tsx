"use client";

import { lazy, Suspense, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WebMCPProvider } from "@/components/webmcp-provider";

/**
 * Lazy-load WagmiProvider — wagmi + viem are heavy (~100KB+) and only needed
 * when users interact with wallet features (pool page, forge publish).
 * Most users never touch crypto, so we defer the cost.
 */
const WagmiWrapper = lazy(() => import("@/components/wagmi-wrapper"));

export function Providers({ children }: { children: ReactNode }) {
  // Wagmi v3 uses React Query internally for connection and transaction state.
  // The app does not otherwise use React Query directly, but Wagmi still needs
  // one stable client above its hooks.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WebMCPProvider />
      <Suspense fallback={children}>
        <WagmiWrapper>{children}</WagmiWrapper>
      </Suspense>
    </QueryClientProvider>
  );
}
