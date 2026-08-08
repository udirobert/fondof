import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  parseEther,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const SKILL_POOL_ABI = [
  { inputs: [{ name: "skillHash", type: "bytes32" }, { name: "sourceHashes", type: "bytes32[]" }], name: "forge", outputs: [], stateMutability: "payable", type: "function" },
  { inputs: [{ name: "skillHash", type: "bytes32" }], name: "use", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "skillHash", type: "bytes32" }], name: "challenge", outputs: [{ name: "challengeId", type: "uint256" }], stateMutability: "payable", type: "function" },
  { inputs: [{ name: "skillHash", type: "bytes32" }], name: "getSignal", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "limit", type: "uint256" }], name: "topSkills", outputs: [{ name: "", type: "bytes32[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "skillHash", type: "bytes32" }], name: "getSkill", outputs: [{ components: [{ name: "skillHash", type: "bytes32" }, { name: "sourceHashes", type: "bytes32[]" }, { name: "forger", type: "address" }, { name: "backing", type: "uint256" }, { name: "usageCount", type: "uint256" }, { name: "challengeLosses", type: "uint256" }, { name: "createdAt", type: "uint64" }, { name: "exists", type: "bool" }], name: "", type: "tuple" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getSkillCount", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  blockExplorers: { default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" } },
});

function toBytes32(hex: string): Hex {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return `0x${clean.padStart(64, "0")}` as Hex;
}

export function getPublicClient(rpcUrl: string) {
  return createPublicClient({ chain: monadTestnet, transport: http(rpcUrl) });
}

export function getWalletClient(rpcUrl: string, privateKey: string) {
  const account = privateKeyToAccount(
    (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as Hex
  );
  return createWalletClient({ account, chain: monadTestnet, transport: http(rpcUrl) });
}

export async function forgeOnChain(
  rpcUrl: string,
  privateKey: string,
  contract: string,
  skillHash: string,
  sourceHashes: string[]
) {
  const wallet = getWalletClient(rpcUrl, privateKey);
  const pub = getPublicClient(rpcUrl);

  const txHash = await wallet.writeContract({
    address: contract as Hex,
    abi: SKILL_POOL_ABI,
    functionName: "forge",
    args: [toBytes32(skillHash), sourceHashes.map(toBytes32)],
    value: parseEther("0.001"),
  });

  const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
  return { txHash, blockNumber: Number(receipt.blockNumber) };
}

export async function useOnChain(
  rpcUrl: string,
  privateKey: string,
  contract: string,
  skillHash: string
) {
  const wallet = getWalletClient(rpcUrl, privateKey);
  const pub = getPublicClient(rpcUrl);

  const txHash = await wallet.writeContract({
    address: contract as Hex,
    abi: SKILL_POOL_ABI,
    functionName: "use",
    args: [toBytes32(skillHash)],
  });

  const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
  return { txHash, blockNumber: Number(receipt.blockNumber) };
}

export async function challengeOnChain(
  rpcUrl: string,
  privateKey: string,
  contract: string,
  skillHash: string
) {
  const wallet = getWalletClient(rpcUrl, privateKey);
  const pub = getPublicClient(rpcUrl);

  const txHash = await wallet.writeContract({
    address: contract as Hex,
    abi: SKILL_POOL_ABI,
    functionName: "challenge",
    args: [toBytes32(skillHash)],
    value: parseEther("0.001"),
  });

  const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
  return { txHash, blockNumber: Number(receipt.blockNumber) };
}

export async function getSkillFromChain(
  rpcUrl: string,
  contract: string,
  skillHash: string
) {
  const pub = getPublicClient(rpcUrl);

  try {
    const skill = await pub.readContract({
      address: contract as Hex,
      abi: SKILL_POOL_ABI,
      functionName: "getSkill",
      args: [toBytes32(skillHash)],
    });

    if (!skill.exists) return null;

    const signal = await pub.readContract({
      address: contract as Hex,
      abi: SKILL_POOL_ABI,
      functionName: "getSignal",
      args: [toBytes32(skillHash)],
    });

    return {
      skillHash,
      forger: skill.forger,
      backing: skill.backing.toString(),
      usageCount: Number(skill.usageCount),
      challengeLosses: Number(skill.challengeLosses),
      createdAt: Number(skill.createdAt),
      signal: signal.toString(),
    };
  } catch {
    return null;
  }
}

export async function getTopSkillsFromChain(rpcUrl: string, contract: string, limit: number) {
  const pub = getPublicClient(rpcUrl);
  const hashes = await pub.readContract({
    address: contract as Hex,
    abi: SKILL_POOL_ABI,
    functionName: "topSkills",
    args: [BigInt(limit)],
  });
  return (hashes as Hex[]).filter((h) => h !== "0x" + "0".repeat(64));
}
