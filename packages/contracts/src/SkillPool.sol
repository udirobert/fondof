// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SkillPool
/// @notice On-chain skill quality discovery protocol for fondof.
/// @dev Skills are forged with provenance + backing. Usage receipts and challenges
///      create a living quality signal that discovery reads from.
///      Designed for Monad's 10K TPS — per-use tracking is economical.
contract SkillPool {
    struct Skill {
        bytes32 skillHash;
        bytes32[] sourceHashes;
        address forger;
        uint256 backing;
        uint256 usageCount;
        uint256 challengeLosses;
        uint64 createdAt;
        bool exists;
    }

    struct Challenge {
        bytes32 skillHash;
        address challenger;
        uint256 stake;
        bool resolved;
        bool challengerWon;
        uint64 createdAt;
    }

    // --- Storage ---
    mapping(bytes32 => Skill) public skills;
    mapping(uint256 => Challenge) public challenges;
    bytes32[] public skillIndex;
    uint256 public challengeCount;
    uint256 public totalSkills;

    /// @notice Address authorized to resolve challenges (oracle/relayer)
    address public resolver;

    /// @notice Minimum backing required to forge a skill
    uint256 public constant MIN_BACKING = 0.001 ether;

    /// @notice Minimum stake required to challenge
    uint256 public constant MIN_CHALLENGE_STAKE = 0.001 ether;

    // --- Events ---
    event SkillForged(
        bytes32 indexed skillHash,
        address indexed forger,
        uint256 backing,
        uint64 timestamp
    );

    event SkillUsed(
        bytes32 indexed skillHash,
        address indexed user,
        uint64 timestamp
    );

    event SkillChallenged(
        uint256 indexed challengeId,
        bytes32 indexed skillHash,
        address indexed challenger,
        uint256 stake
    );

    event ChallengeResolved(
        uint256 indexed challengeId,
        bytes32 indexed skillHash,
        bool challengerWon,
        uint256 payout
    );

    // --- Constructor ---
    constructor(address _resolver) {
        resolver = _resolver;
    }

    // --- Modifiers ---
    modifier onlyResolver() {
        require(msg.sender == resolver, "SkillPool: not resolver");
        _;
    }

    // --- Core Functions ---

    /// @notice Forge a new skill into the pool with provenance and backing.
    /// @param skillHash SHA-256 hash of the skill content
    /// @param sourceHashes Provenance: hashes of source content used to forge
    function forge(
        bytes32 skillHash,
        bytes32[] calldata sourceHashes
    ) external payable {
        require(!skills[skillHash].exists, "SkillPool: skill already exists");
        require(msg.value >= MIN_BACKING, "SkillPool: insufficient backing");
        require(sourceHashes.length > 0, "SkillPool: no sources");
        require(sourceHashes.length <= 32, "SkillPool: too many sources");

        skills[skillHash] = Skill({
            skillHash: skillHash,
            sourceHashes: sourceHashes,
            forger: msg.sender,
            backing: msg.value,
            usageCount: 0,
            challengeLosses: 0,
            createdAt: uint64(block.timestamp),
            exists: true
        });

        skillIndex.push(skillHash);
        totalSkills++;

        emit SkillForged(skillHash, msg.sender, msg.value, uint64(block.timestamp));
    }

    /// @notice Record that an agent used a skill. Increases signal.
    /// @dev Designed to be called frequently on Monad (cheap, fast).
    /// @param skillHash The skill that was used
    function use(bytes32 skillHash) external {
        require(skills[skillHash].exists, "SkillPool: skill not found");
        skills[skillHash].usageCount++;
        emit SkillUsed(skillHash, msg.sender, uint64(block.timestamp));
    }

    /// @notice Challenge a skill's quality by staking against it.
    /// @param skillHash The skill being challenged
    /// @return challengeId The ID of the created challenge
    function challenge(bytes32 skillHash) external payable returns (uint256 challengeId) {
        require(skills[skillHash].exists, "SkillPool: skill not found");
        require(msg.value >= MIN_CHALLENGE_STAKE, "SkillPool: insufficient stake");

        challengeId = challengeCount++;
        challenges[challengeId] = Challenge({
            skillHash: skillHash,
            challenger: msg.sender,
            stake: msg.value,
            resolved: false,
            challengerWon: false,
            createdAt: uint64(block.timestamp)
        });

        emit SkillChallenged(challengeId, skillHash, msg.sender, msg.value);
    }

    /// @notice Resolve a challenge. Called by the oracle/resolver after benchmarking.
    /// @param challengeId The challenge to resolve
    /// @param challengerWon Whether the challenger proved the skill is low quality
    function resolve(uint256 challengeId, bool challengerWon) external onlyResolver {
        Challenge storage c = challenges[challengeId];
        require(!c.resolved, "SkillPool: already resolved");

        c.resolved = true;
        c.challengerWon = challengerWon;

        Skill storage skill = skills[c.skillHash];
        uint256 payout;

        if (challengerWon) {
            // Challenger wins: gets their stake back + portion of skill backing
            skill.challengeLosses++;
            uint256 reward = skill.backing > c.stake ? c.stake : skill.backing;
            skill.backing -= reward;
            payout = c.stake + reward;
            payable(c.challenger).transfer(payout);
        } else {
            // Skill forger wins: gets the challenger's stake
            payout = c.stake;
            skill.backing += c.stake;
        }

        emit ChallengeResolved(challengeId, c.skillHash, challengerWon, payout);
    }

    // --- View Functions ---

    /// @notice Get the quality signal for a skill.
    /// @dev signal = backing + (usageCount * 1e15) - (challengeLosses * 5e15)
    ///      This weights usage heavily and penalizes lost challenges.
    function getSignal(bytes32 skillHash) public view returns (uint256) {
        Skill storage skill = skills[skillHash];
        if (!skill.exists) return 0;

        uint256 usageSignal = skill.usageCount * 1e15;
        uint256 penalty = skill.challengeLosses * 5e15;
        uint256 raw = skill.backing + usageSignal;

        if (raw <= penalty) return 0;
        return raw - penalty;
    }

    /// @notice Get the top skills by signal, up to `limit`.
    /// @dev Simple O(n*k) selection. Fine for <1000 skills. Use off-chain indexing at scale.
    function topSkills(uint256 limit) external view returns (bytes32[] memory) {
        uint256 count = skillIndex.length;
        if (count == 0) return new bytes32[](0);
        if (limit > count) limit = count;

        // Build signal array
        bytes32[] memory result = new bytes32[](limit);
        uint256[] memory signals = new uint256[](limit);

        for (uint256 i = 0; i < count; i++) {
            bytes32 hash = skillIndex[i];
            uint256 sig = getSignal(hash);

            // Insert into sorted top-k
            if (sig > signals[limit - 1]) {
                signals[limit - 1] = sig;
                result[limit - 1] = hash;
                // Bubble up
                for (uint256 j = limit - 1; j > 0; j--) {
                    if (signals[j] > signals[j - 1]) {
                        (signals[j], signals[j - 1]) = (signals[j - 1], signals[j]);
                        (result[j], result[j - 1]) = (result[j - 1], result[j]);
                    } else {
                        break;
                    }
                }
            }
        }

        return result;
    }

    /// @notice Weighted random selection — higher signal = higher probability of being chosen.
    /// @dev Uses block.prevrandao for randomness (good enough for skill selection, not financial).
    /// @param seed Additional entropy from the caller
    function acquire(bytes32 seed) external view returns (bytes32) {
        uint256 count = skillIndex.length;
        require(count > 0, "SkillPool: no skills");

        // Sum total signal
        uint256 totalSignal;
        for (uint256 i = 0; i < count; i++) {
            totalSignal += getSignal(skillIndex[i]) + 1; // +1 so even zero-signal skills have a chance
        }

        // Pick weighted random
        uint256 random = uint256(keccak256(abi.encodePacked(block.prevrandao, seed, msg.sender))) % totalSignal;
        uint256 cumulative;

        for (uint256 i = 0; i < count; i++) {
            cumulative += getSignal(skillIndex[i]) + 1;
            if (random < cumulative) {
                return skillIndex[i];
            }
        }

        return skillIndex[count - 1];
    }

    /// @notice Get full skill data
    function getSkill(bytes32 skillHash) external view returns (Skill memory) {
        require(skills[skillHash].exists, "SkillPool: not found");
        return skills[skillHash];
    }

    /// @notice Get the number of skills in the pool
    function getSkillCount() external view returns (uint256) {
        return skillIndex.length;
    }

    // --- Admin ---

    /// @notice Transfer resolver role
    function setResolver(address _resolver) external onlyResolver {
        resolver = _resolver;
    }
}
