/**
 * ABI for the SkillPool contract.
 */
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
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "skillHash", type: "bytes32" },
      { indexed: true, name: "forger", type: "address" },
      { indexed: false, name: "backing", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint64" },
    ],
    name: "SkillForged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "skillHash", type: "bytes32" },
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "timestamp", type: "uint64" },
    ],
    name: "SkillUsed",
    type: "event",
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
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "challengeId", type: "uint256" },
      { indexed: true, name: "skillHash", type: "bytes32" },
      { indexed: false, name: "challengerWon", type: "bool" },
      { indexed: false, name: "payout", type: "uint256" },
    ],
    name: "ChallengeResolved",
    type: "event",
  },
] as const;
