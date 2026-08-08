import { createConfig, http, injected } from "wagmi";
import { monadTestnet } from "@/lib/monad-chain";

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
      // Prefer EIP-6963 announced wallets (MetaMask, Rabby, etc.)
      unstable_shimAsyncInject: 2_000,
    }),
  ],
  transports: {
    [monadTestnet.id]: http("https://testnet-rpc.monad.xyz"),
  },
  multiInjectedProviderDiscovery: true,
  ssr: true,
});
