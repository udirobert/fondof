import { createHash } from "node:crypto";
import type { AttestationRequest, AttestationReceipt, Attestation } from "@fondof/shared";

export interface RelayerConfig {
  /** RPC URL for Monad */
  rpcUrl: string;
  /** Private key of the relayer wallet (server-side, never exposed to user) */
  privateKey: string;
  /** Deployed contract address */
  contractAddress: string;
}

/**
 * Load relayer config from environment variables.
 * In production, these would be in a Cloudflare Worker's secrets.
 * For CLI/dev, they come from env vars.
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
        "Deploy the contract first with: forge script Deploy.s.sol"
    );
  }

  return { rpcUrl, privateKey, contractAddress };
}

/**
 * Submit a skill attestation to the Monad blockchain.
 * Uses raw JSON-RPC calls to avoid heavy dependencies (no ethers/viem needed at runtime).
 *
 * The relayer wallet pays gas — the user never sees blockchain interactions.
 */
export async function attest(
  request: AttestationRequest,
  config: RelayerConfig
): Promise<AttestationReceipt> {
  const { rpcUrl, privateKey, contractAddress } = config;

  // Encode the function call data
  const calldata = encodeAttestSkill(request);

  // Get the relayer's nonce
  const from = privateKeyToAddress(privateKey);
  const nonce = await rpcCall(rpcUrl, "eth_getTransactionCount", [from, "latest"]);

  // Estimate gas
  const gasEstimate = await rpcCall(rpcUrl, "eth_estimateGas", [
    { from, to: contractAddress, data: calldata },
  ]);

  // Get gas price
  const gasPrice = await rpcCall(rpcUrl, "eth_gasPrice", []);

  // Build and sign transaction
  const tx = {
    nonce,
    gasPrice,
    gasLimit: gasEstimate,
    to: contractAddress,
    value: "0x0",
    data: calldata,
  };

  const signedTx = await signTransaction(tx, privateKey, rpcUrl);

  // Send transaction
  const txHash = await rpcCall(rpcUrl, "eth_sendRawTransaction", [signedTx]);

  // Wait for receipt
  const receipt = await waitForReceipt(rpcUrl, txHash as string);

  return {
    txHash: txHash as string,
    blockNumber: parseInt(receipt.blockNumber, 16),
    attestation: {
      skillHash: request.skillHash,
      sourceHashes: request.sourceHashes,
      overlapScore: request.overlapScore,
      benchmarkScore: request.benchmarkScore,
      creator: from,
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
  const { rpcUrl, contractAddress } = config;

  // Encode isAttested call
  const isAttestedData = encodeFunctionCall("isAttested", [padBytes32(skillHash)]);
  const isAttestedResult = await rpcCall(rpcUrl, "eth_call", [
    { to: contractAddress, data: isAttestedData },
    "latest",
  ]);

  // Check if attested (result is a bool encoded as uint256)
  const isAttested = isAttestedResult !== "0x" + "0".repeat(64);
  if (!isAttested) return null;

  // Encode getAttestation call
  const getAttestData = encodeFunctionCall("getAttestation", [padBytes32(skillHash)]);
  const result = await rpcCall(rpcUrl, "eth_call", [
    { to: contractAddress, data: getAttestData },
    "latest",
  ]);

  // Decode the attestation struct from the ABI-encoded response
  return decodeAttestation(result as string, skillHash);
}

// --- Low-level encoding helpers ---

/**
 * Encode the attestSkill function call.
 */
function encodeAttestSkill(request: AttestationRequest): string {
  // Function selector: keccak256("attestSkill(bytes32,bytes32[],uint16,uint16)")
  const selector = "0x" + keccak256Selector("attestSkill(bytes32,bytes32[],uint16,uint16)");

  // ABI encode params
  // bytes32 skillHash - static
  // bytes32[] sourceHashes - dynamic (offset pointer)
  // uint16 overlapScore - static
  // uint16 benchmarkScore - static

  const skillHash = padBytes32(request.skillHash);
  const overlapScore = padUint256(request.overlapScore);
  const benchmarkScore = padUint256(request.benchmarkScore);

  // Dynamic array: offset points to where the array data starts
  // 4 params × 32 bytes = offset 128 = 0x80
  const arrayOffset = padUint256(128);

  // Array data: length + elements
  const arrayLength = padUint256(request.sourceHashes.length);
  const arrayElements = request.sourceHashes.map((h) => padBytes32(h)).join("");

  return selector + skillHash + arrayOffset + overlapScore + benchmarkScore + arrayLength + arrayElements;
}

function encodeFunctionCall(name: string, params: string[]): string {
  let signature: string;
  if (name === "isAttested") {
    signature = "isAttested(bytes32)";
  } else if (name === "getAttestation") {
    signature = "getAttestation(bytes32)";
  } else {
    throw new Error(`Unknown function: ${name}`);
  }

  const selector = "0x" + keccak256Selector(signature);
  return selector + params.join("");
}

function keccak256Selector(signature: string): string {
  // Simple keccak256 for function selectors using Node.js crypto
  // Note: Ethereum uses keccak256, not SHA-3. We approximate with SHA-256 for the selector.
  // In production, use a proper keccak256 implementation.
  // For now, we hardcode the known selectors.
  const knownSelectors: Record<string, string> = {
    "attestSkill(bytes32,bytes32[],uint16,uint16)": "a1b2c3d4", // Placeholder - computed at deploy
    "isAttested(bytes32)": "e5f6a7b8", // Placeholder
    "getAttestation(bytes32)": "c9d0e1f2", // Placeholder
  };

  if (knownSelectors[signature]) {
    return knownSelectors[signature];
  }

  // Fallback: use first 4 bytes of sha256 (will be replaced with proper keccak in production)
  const hash = createHash("sha256").update(signature).digest("hex");
  return hash.slice(0, 8);
}

function padBytes32(hex: string): string {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return clean.padStart(64, "0");
}

function padUint256(value: number): string {
  return value.toString(16).padStart(64, "0");
}

function privateKeyToAddress(privateKey: string): string {
  // Simplified: in production use proper secp256k1 derivation
  // For the relayer, the address is typically known and can be configured
  const _pk = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  // Return a placeholder - in real impl, derive from private key
  return process.env.FONDOF_RELAYER_ADDRESS ?? "0x0000000000000000000000000000000000000000";
}

async function signTransaction(
  _tx: Record<string, unknown>,
  _privateKey: string,
  _rpcUrl: string
): Promise<string> {
  // In production: use eth_signTransaction or local signing with secp256k1
  // For the Blitz demo: use eth_sendTransaction with an unlocked account
  // or integrate viem/ethers for proper signing
  throw new Error(
    "Transaction signing requires viem or ethers integration. " +
      "For Blitz demo, use a pre-funded unlocked account with eth_sendTransaction."
  );
}

async function rpcCall(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  const data = (await response.json()) as { result?: unknown; error?: { message: string } };
  if (data.error) {
    throw new Error(`RPC error (${method}): ${data.error.message}`);
  }
  return data.result;
}

async function waitForReceipt(
  rpcUrl: string,
  txHash: string,
  maxAttempts = 30
): Promise<{ blockNumber: string; status: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    const receipt = (await rpcCall(rpcUrl, "eth_getTransactionReceipt", [txHash])) as {
      blockNumber: string;
      status: string;
    } | null;

    if (receipt) {
      if (receipt.status === "0x0") {
        throw new Error("Transaction reverted on-chain");
      }
      return receipt;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Transaction receipt timeout");
}

function decodeAttestation(hexData: string, skillHash: string): Attestation {
  // Simplified ABI decode for the attestation struct
  // In production, use a proper ABI decoder
  const data = hexData.startsWith("0x") ? hexData.slice(2) : hexData;

  // The struct is returned as: offset to tuple, then tuple fields
  // For simplicity, extract what we can
  return {
    skillHash,
    sourceHashes: [], // Would decode from dynamic array
    overlapScore: 0,
    benchmarkScore: 0,
    creator: "0x" + data.slice(64 * 4 + 24, 64 * 4 + 64),
    timestamp: parseInt(data.slice(64 * 5, 64 * 6), 16) || Math.floor(Date.now() / 1000),
  };
}

// Re-export ABI for external use
export { FONDOF_ATTESTATION_ABI } from "./abi.js";
