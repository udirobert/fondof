export interface Attestation {
  /** SHA-256 hash of the skill content */
  skillHash: string;
  /** SHA-256 hashes of the source content */
  sourceHashes: string[];
  /** Overlap score (0-10000 basis points, maps to 0-100%) */
  overlapScore: number;
  /** Benchmark score (0-10000 basis points, maps to 0-100%) */
  benchmarkScore: number;
  /** Address of the creator (relayer address on behalf of user) */
  creator: string;
  /** Unix timestamp of attestation */
  timestamp: number;
}

export interface AttestationRequest {
  /** SHA-256 hash of the skill content */
  skillHash: string;
  /** SHA-256 hashes of source content used */
  sourceHashes: string[];
  /** Overlap score (0-10000) */
  overlapScore: number;
  /** Benchmark score (0-10000) */
  benchmarkScore: number;
}

export interface AttestationReceipt {
  /** Transaction hash on Monad */
  txHash: string;
  /** Block number */
  blockNumber: number;
  /** The attestation data */
  attestation: Attestation;
}
