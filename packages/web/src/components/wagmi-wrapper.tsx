"use client";

import type { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi-config";

/**
 * Isolated wagmi provider — loaded lazily so the main bundle stays light.
 * This module pulls in wagmi + viem only when actually rendered.
 */
export default function WagmiWrapper({ children }: { children: ReactNode }) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
