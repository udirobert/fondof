import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AttestationRequest, AttestationReceipt, Attestation } from "@fondof/shared";
import { FONDOF_ATTESTATION_ABI } from "./abi.js";

// Define Monad chain (not yet in viem's built-in chains)
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

export interface RelayerConfig {
  /** RPC URL for Monad (defaults to testnet) */
  rpcUrl: string;
  /** Private key of the relayer wallet (hex, with 0x prefix) */
  privateKey: Hex;
  /** Deployed contract address */
  contractAddress: Hex;
  /** Chain ID (defaults to Monad testnet) */
  chainId?: number;
}

/**
 * Load relayer config from environment variables.
 */
export function loadRelayerConfig(): RelayerConfig {
  const rpcUrl = process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz";
  const privateKey = process.env.FONDOF_RELAYER_KEY ?? "";
  const contractAddress = process.env.FONDOF_CONTRACT_ADDRESS ?? "";

  if (!privateKey) {
    throw new Error(
      "FONDOF_RELAYER_KEY environment variable is required for attestation.\n" +
        "This is the relayer wallet's private key (never the user's)."
    );
  }
  if (!contractAddress) {
    throw new Error(
      "FONDOF_CONTRACT_ADDRESS environment variable is required.\n" +
        "Deploy the contract first: cd packages/contracts && forge script script/Deploy.s.sol"
    );
  }

  return {
    rpcUrl,
    privateKey: (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as Hex,
    contractAddress: (contractAddress.startsWith("0x") ? contractAddress : `0x${contractAddress}`) as Hex,
  };
}

/**
 * Submit a skill attestation to Monad.
 * Uses viem for proper transaction signing — completely invisible to the user.
 */
export async function attest(
  request: AttestationRequest,
  config: RelayerConfig
): Promise<AttestationReceipt> {
  const chain = config.chainId
    ? defineChain({ ...monadTestnet, id: config.chainId })
    : monadTestnet;

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

  // Convert hashes to bytes32
  const skillHash = toBytes32(request.skillHash);
  const sourceHashes = request.sourceHashes.map(toBytes32);

  // Send the transaction
  const txHash = await walletClient.writeContract({
    address: config.contractAddress,
    abi: FONDOF_ATTESTATION_ABI,
    functionName: "attestSkill",
    args: [
      skillHash,
      sourceHashes,
      request.overlapScore,
      request.benchmarkScore,
    ],
  });

  // Wait for receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    txHash,
    blockNumber: Number(receipt.blockNumber),
    attestation: {
      skillHash: request.skillHash,
      sourceHashes: request.sourceHashes,
      overlapScore: request.overlapScore,
      benchmarkScore: request.benchmarkScore,
      creator: account.address,
      timestamp: Math.floor(Date.now() / 1000),
    },
  };
}

/**
 * Query an attestation from the chain (read-only, no gas needed).
 */
export async function queryAttestation(
  skillHash: string,
  config: Pick<RelayerConfig, "rpcUrl" | "contractAddress">
): Promise<Attestation | null> {
  const chain = monadTestnet;

  const publicClient = createPublicClient({
    chain,
    transport: http(config.rpcUrl),
  });

  // Check if attested
  const isAttested = await publicClient.readContract({
    address: config.contractAddress as Hex,
    abi: FONDOF_ATTESTATION_ABI,
    functionName: "isAttested",
    args: [toBytes32(skillHash)],
  });

  if (!isAttested) return null;

  // Get the full attestation
  const result = await publicClient.readContract({
    address: config.contractAddress as Hex,
    abi: FONDOF_ATTESTATION_ABI,
    functionName: "getAttestation",
    args: [toBytes32(skillHash)],
  }) as {
    skillHash: Hex;
    sourceHashes: Hex[];
    overlapScore: number;
    benchmarkScore: number;
    creator: Hex;
    timestamp: bigint;
  };

  return {
    skillHash,
    sourceHashes: result.sourceHashes.map((h) => h as string),
    overlapScore: result.overlapScore,
    benchmarkScore: result.benchmarkScore,
    creator: result.creator,
    timestamp: Number(result.timestamp),
  };
}

/**
 * Convert a hex string to a proper bytes32 value.
 */
function toBytes32(hex: string): Hex {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return `0x${clean.padStart(64, "0")}` as Hex;
}

// Re-export
export { FONDOF_ATTESTATION_ABI } from "./abi.js";
