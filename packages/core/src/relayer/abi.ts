/**
 * ABI for the FondofAttestation contract.
 * Only includes the functions we call from the relayer.
 */
export const FONDOF_ATTESTATION_ABI = [
  {
    inputs: [
      { name: "skillHash", type: "bytes32" },
      { name: "sourceHashes", type: "bytes32[]" },
      { name: "overlapScore", type: "uint16" },
      { name: "benchmarkScore", type: "uint16" },
    ],
    name: "attestSkill",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "skillHash", type: "bytes32" }],
    name: "getAttestation",
    outputs: [
      {
        components: [
          { name: "skillHash", type: "bytes32" },
          { name: "sourceHashes", type: "bytes32[]" },
          { name: "overlapScore", type: "uint16" },
          { name: "benchmarkScore", type: "uint16" },
          { name: "creator", type: "address" },
          { name: "timestamp", type: "uint64" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "skillHash", type: "bytes32" }],
    name: "isAttested",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "creator", type: "address" }],
    name: "getCreatorSkills",
    outputs: [{ name: "", type: "bytes32[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAttestations",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "skillHash", type: "bytes32" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "sourceHashes", type: "bytes32[]" },
      { indexed: false, name: "overlapScore", type: "uint16" },
      { indexed: false, name: "benchmarkScore", type: "uint16" },
      { indexed: false, name: "timestamp", type: "uint64" },
    ],
    name: "SkillAttested",
    type: "event",
  },
] as const;
