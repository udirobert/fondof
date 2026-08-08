import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  parseEther,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { SKILL_POOL_ABI } from "./abi.js";

// Monad testnet chain definition
const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" },
  },
});

export interface PoolConfig {
  rpcUrl: string;
  privateKey: Hex;
  contractAddress: Hex;
}

export interface SkillOnChain {
  skillHash: string;
  sourceHashes: string[];
  forger: string;
  backing: bigint;
  usageCount: bigint;
  challengeLosses: bigint;
  createdAt: number;
  signal: bigint;
}

export interface ForgeReceipt {
  txHash: string;
  blockNumber: number;
  skillHash: string;
}

export interface UseReceipt {
  txHash: string;
  blockNumber: number;
}

export interface ChallengeReceipt {
  txHash: string;
  challengeId: number;
}

/**
 * Load pool config from environment.
 */
export function loadPoolConfig(): PoolConfig {
  const rpcUrl = process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz";
  const privateKey = process.env.FONDOF_RELAYER_KEY ?? "";
  const contractAddress = process.env.FONDOF_CONTRACT_ADDRESS ?? "";

  if (!privateKey) {
    throw new Error(
      "FONDOF_RELAYER_KEY is required. This is the relayer wallet's private key."
    );
  }
  if (!contractAddress) {
    throw new Error(
      "FONDOF_CONTRACT_ADDRESS is required. Deploy SkillPool first."
    );
  }

  return {
    rpcUrl,
    privateKey: (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as Hex,
    contractAddress: (contractAddress.startsWith("0x") ? contractAddress : `0x${contractAddress}`) as Hex,
  };
}

function getClients(config: PoolConfig) {
  const chain = monadTestnet;
  const account = privateKeyToAccount(config.privateKey);
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(config.rpcUrl),
  });
  const publicClient = createPublicClient({
    chain,
    transport: http(config.rpcUrl),
  });
  return { walletClient, publicClient, account };
}

function toBytes32(hex: string): Hex {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return `0x${clean.padStart(64, "0")}` as Hex;
}

// --- Write Operations ---

/**
 * Forge a skill into the SkillPool with provenance and backing.
 * Backing is sponsored by the relayer (invisible to user).
 */
export async function forgeSkill(
  skillHash: string,
  sourceHashes: string[],
  config: PoolConfig,
  backingEth = "0.001"
): Promise<ForgeReceipt> {
  const { walletClient, publicClient } = getClients(config);

  const txHash = await walletClient.writeContract({
    address: config.contractAddress,
    abi: SKILL_POOL_ABI,
    functionName: "forge",
    args: [toBytes32(skillHash), sourceHashes.map(toBytes32)],
    value: parseEther(backingEth),
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    txHash,
    blockNumber: Number(receipt.blockNumber),
    skillHash,
  };
}

/**
 * Record that an agent used a skill. Increases signal.
 * Designed to be called frequently (cheap on Monad).
 */
export async function recordUse(
  skillHash: string,
  config: PoolConfig
): Promise<UseReceipt> {
  const { walletClient, publicClient } = getClients(config);

  const txHash = await walletClient.writeContract({
    address: config.contractAddress,
    abi: SKILL_POOL_ABI,
    functionName: "use",
    args: [toBytes32(skillHash)],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    txHash,
    blockNumber: Number(receipt.blockNumber),
  };
}

/**
 * Challenge a skill's quality by staking against it.
 */
export async function challengeSkill(
  skillHash: string,
  config: PoolConfig,
  stakeEth = "0.001"
): Promise<ChallengeReceipt> {
  const { walletClient, publicClient } = getClients(config);

  const txHash = await walletClient.writeContract({
    address: config.contractAddress,
    abi: SKILL_POOL_ABI,
    functionName: "challenge",
    args: [toBytes32(skillHash)],
    value: parseEther(stakeEth),
  });

  const _receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  // Parse challengeId from event logs
  const challengeId = 0; // TODO: decode from receipt logs

  return {
    txHash,
    challengeId,
  };
}

// --- Read Operations ---

/**
 * Get the quality signal for a skill.
 */
export async function getSignal(
  skillHash: string,
  config: Pick<PoolConfig, "rpcUrl" | "contractAddress">
): Promise<bigint> {
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(config.rpcUrl),
  });

  const signal = await publicClient.readContract({
    address: config.contractAddress as Hex,
    abi: SKILL_POOL_ABI,
    functionName: "getSignal",
    args: [toBytes32(skillHash)],
  });

  return signal as bigint;
}

/**
 * Get the top skills by signal.
 */
export async function getTopSkills(
  limit: number,
  config: Pick<PoolConfig, "rpcUrl" | "contractAddress">
): Promise<string[]> {
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(config.rpcUrl),
  });

  const result = await publicClient.readContract({
    address: config.contractAddress as Hex,
    abi: SKILL_POOL_ABI,
    functionName: "topSkills",
    args: [BigInt(limit)],
  });

  return (result as Hex[]).map((h) => h as string);
}

/**
 * Get full skill data from the pool.
 */
export async function getSkillOnChain(
  skillHash: string,
  config: Pick<PoolConfig, "rpcUrl" | "contractAddress">
): Promise<SkillOnChain | null> {
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(config.rpcUrl),
  });

  try {
    const result = await publicClient.readContract({
      address: config.contractAddress as Hex,
      abi: SKILL_POOL_ABI,
      functionName: "getSkill",
      args: [toBytes32(skillHash)],
    }) as {
      skillHash: Hex;
      sourceHashes: Hex[];
      forger: Hex;
      backing: bigint;
      usageCount: bigint;
      challengeLosses: bigint;
      createdAt: bigint;
      exists: boolean;
    };

    if (!result.exists) return null;

    const signal = await getSignal(skillHash, config);

    return {
      skillHash,
      sourceHashes: result.sourceHashes.map((h) => h as string),
      forger: result.forger,
      backing: result.backing,
      usageCount: result.usageCount,
      challengeLosses: result.challengeLosses,
      createdAt: Number(result.createdAt),
      signal,
    };
  } catch {
    return null;
  }
}

// Re-export ABI
export { SKILL_POOL_ABI } from "./abi.js";
