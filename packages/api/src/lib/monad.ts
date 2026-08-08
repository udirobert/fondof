import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  parseEther,
  decodeEventLog,
  keccak256,
  stringToHex,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const SKILL_POOL_ABI = [
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
    name: "use",
    outputs: [],
    stateMutability: "nonpayable",
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
    inputs: [
      { name: "challengeId", type: "uint256" },
      { name: "challengerWon", type: "bool" },
    ],
    name: "resolve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "skillHash", type: "bytes32" }],
    name: "getSignal",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "limit", type: "uint256" }],
    name: "topSkills",
    outputs: [{ name: "", type: "bytes32[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "seed", type: "bytes32" }],
    name: "acquire",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "skillHash", type: "bytes32" }],
    name: "getSkill",
    outputs: [
      {
        components: [
          { name: "skillHash", type: "bytes32" },
          { name: "sourceHashes", type: "bytes32[]" },
          { name: "forger", type: "address" },
          { name: "backing", type: "uint256" },
          { name: "usageCount", type: "uint256" },
          { name: "challengeLosses", type: "uint256" },
          { name: "createdAt", type: "uint64" },
          { name: "exists", type: "bool" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getSkillCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "challengeCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "challenges",
    outputs: [
      { name: "skillHash", type: "bytes32" },
      { name: "challenger", type: "address" },
      { name: "stake", type: "uint256" },
      { name: "resolved", type: "bool" },
      { name: "challengerWon", type: "bool" },
      { name: "createdAt", type: "uint64" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "challengeId", type: "uint256" },
      { indexed: true, name: "skillHash", type: "bytes32" },
      { indexed: true, name: "challenger", type: "address" },
      { indexed: false, name: "stake", type: "uint256" },
    ],
    name: "SkillChallenged",
    type: "event",
  },
] as const;

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" },
  },
});

function toBytes32(hex: string): Hex {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]*$/.test(clean)) {
    // Non-hex input → keccak seed (acquire "demo", timestamps, etc.)
    return keccak256(stringToHex(hex));
  }
  return `0x${clean.padStart(64, "0").slice(-64)}` as Hex;
}

/** Normalize bytes32 → 64-char hex (no 0x). Keep leading zeros. */
function normalizeHash(hex: string): string {
  const clean = (hex.startsWith("0x") ? hex.slice(2) : hex).toLowerCase();
  return clean.padStart(64, "0").slice(-64);
}

export function getPublicClient(rpcUrl: string) {
  return createPublicClient({ chain: monadTestnet, transport: http(rpcUrl) });
}

export function getWalletClient(rpcUrl: string, privateKey: string) {
  const account = privateKeyToAccount(
    (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as Hex,
  );
  return createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(rpcUrl),
  });
}

export async function forgeOnChain(
  rpcUrl: string,
  privateKey: string,
  contract: string,
  skillHash: string,
  sourceHashes: string[],
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
  skillHash: string,
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
  skillHash: string,
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

  let challengeId: number | null = null;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: SKILL_POOL_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "SkillChallenged") {
        challengeId = Number(
          (decoded.args as { challengeId: bigint }).challengeId,
        );
        break;
      }
    } catch {
      // not our event
    }
  }

  if (challengeId == null) {
    const count = await pub.readContract({
      address: contract as Hex,
      abi: SKILL_POOL_ABI,
      functionName: "challengeCount",
    });
    challengeId = Number(count) - 1;
  }

  return {
    txHash,
    blockNumber: Number(receipt.blockNumber),
    challengeId,
  };
}

export async function resolveOnChain(
  rpcUrl: string,
  privateKey: string,
  contract: string,
  challengeId: number,
  challengerWon: boolean,
) {
  const wallet = getWalletClient(rpcUrl, privateKey);
  const pub = getPublicClient(rpcUrl);

  const txHash = await wallet.writeContract({
    address: contract as Hex,
    abi: SKILL_POOL_ABI,
    functionName: "resolve",
    args: [BigInt(challengeId), challengerWon],
  });

  const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
  return { txHash, blockNumber: Number(receipt.blockNumber) };
}

/** Weighted random skill by on-chain signal (view — no gas). */
export async function acquireFromChain(
  rpcUrl: string,
  contract: string,
  seed?: string,
) {
  const pub = getPublicClient(rpcUrl);
  const seedBytes = toBytes32(
    seed ||
      `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`,
  );

  const hash = await pub.readContract({
    address: contract as Hex,
    abi: SKILL_POOL_ABI,
    functionName: "acquire",
    args: [seedBytes],
  });

  const skillHash = normalizeHash(hash as string);
  const skill = await getSkillFromChain(rpcUrl, contract, skillHash);
  return { skillHash, skill, seed: seedBytes };
}

export type ChainChallenge = {
  challengeId: number;
  skillHash: string;
  challenger: string;
  stake: string;
  resolved: boolean;
  challengerWon: boolean;
  createdAt: number;
};

export async function getOpenChallengesFromChain(
  rpcUrl: string,
  contract: string,
  opts?: { skillHash?: string; limit?: number },
): Promise<ChainChallenge[]> {
  const pub = getPublicClient(rpcUrl);
  const limit = opts?.limit ?? 12;
  const skillFilter = opts?.skillHash
    ? toBytes32(opts.skillHash).toLowerCase()
    : null;

  const count = Number(
    await pub.readContract({
      address: contract as Hex,
      abi: SKILL_POOL_ABI,
      functionName: "challengeCount",
    }),
  );

  const out: ChainChallenge[] = [];
  for (let i = count - 1; i >= 0 && out.length < limit; i--) {
    const row = await pub.readContract({
      address: contract as Hex,
      abi: SKILL_POOL_ABI,
      functionName: "challenges",
      args: [BigInt(i)],
    });
    const [
      skillHashRaw,
      challenger,
      stake,
      resolved,
      challengerWon,
      createdAt,
    ] = row as unknown as [
      Hex,
      Hex,
      bigint,
      boolean,
      boolean,
      number | bigint,
    ];

    if (resolved) continue;
    if (skillFilter && skillHashRaw.toLowerCase() !== skillFilter) continue;

    out.push({
      challengeId: i,
      skillHash: normalizeHash(skillHashRaw),
      challenger,
      stake: stake.toString(),
      resolved,
      challengerWon,
      createdAt: Number(createdAt),
    });
  }

  return out;
}

export async function getSkillFromChain(
  rpcUrl: string,
  contract: string,
  skillHash: string,
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
      skillHash: normalizeHash((skill.skillHash as string) || skillHash),
      forger: skill.forger,
      backing: skill.backing.toString(),
      usageCount: Number(skill.usageCount),
      challengeLosses: Number(skill.challengeLosses),
      createdAt: Number(skill.createdAt),
      signal: signal.toString(),
      sourceHashes: (skill.sourceHashes as Hex[]).map(normalizeHash),
    };
  } catch {
    return null;
  }
}

export async function getTopSkillsFromChain(
  rpcUrl: string,
  contract: string,
  limit: number,
) {
  const pub = getPublicClient(rpcUrl);
  const hashes = await pub.readContract({
    address: contract as Hex,
    abi: SKILL_POOL_ABI,
    functionName: "topSkills",
    args: [BigInt(limit)],
  });
  return (hashes as Hex[])
    .filter((h) => h !== "0x" + "0".repeat(64))
    .map(normalizeHash);
}
