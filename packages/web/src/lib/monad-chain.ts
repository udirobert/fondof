import { defineChain, type Hex } from "viem";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "MonadVision",
      url: "https://testnet.monadvision.com",
    },
  },
});

export const SKILL_POOL_ADDRESS = (process.env
  .NEXT_PUBLIC_FONDOF_CONTRACT_ADDRESS ??
  "0x75545e2C450897914df416d0D24aeB33a89a8b19") as Hex;

export const SKILL_POOL_ABI = [
  {
    inputs: [
      { name: "skillHash", type: "bytes32" },
      { name: "sourceHashes", type: "bytes32[]" },
    ],
    name: "forge",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "skillHash", type: "bytes32" }],
    name: "challenge",
    outputs: [{ name: "challengeId", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "skillHash", type: "bytes32" }],
    name: "getSignal",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const FORGE_BACKING = "0.001";
export const CHALLENGE_STAKE = "0.001";

export function toBytes32(hex: string): Hex {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return `0x${clean.padStart(64, "0")}` as Hex;
}

export function shortAddress(addr: string): string {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function txExplorer(txHash: string): string {
  return `https://testnet.monadvision.com/tx/${txHash}`;
}

export function addressExplorer(address: string): string {
  return `https://testnet.monadvision.com/address/${address}`;
}
