import type { AttestationRequest, AttestationReceipt } from "@fondof/shared";

export interface RelayerConfig {
  /** URL of the relayer service */
  relayerUrl: string;
}

/**
 * Submit a skill attestation through the relayer service.
 * The relayer handles wallet management and gas — completely invisible to the user.
 */
export async function attest(
  _request: AttestationRequest,
  _config: RelayerConfig
): Promise<AttestationReceipt> {
  // TODO: Implement relayer HTTP call
  throw new Error("Not yet implemented");
}
