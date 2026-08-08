// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FondofAttestation
/// @notice Immutable provenance attestations for skills forged by fondof.
/// @dev Designed for minimal gas on Monad. Only hashes and scores stored on-chain.
contract FondofAttestation {
    struct Attestation {
        bytes32 skillHash;
        bytes32[] sourceHashes;
        uint16 overlapScore;    // 0-10000 basis points
        uint16 benchmarkScore;  // 0-10000 basis points
        address creator;
        uint64 timestamp;
    }

    /// @notice Mapping from skill hash to its attestation
    mapping(bytes32 => Attestation) public attestations;

    /// @notice Skills attested by each creator address
    mapping(address => bytes32[]) public creatorSkills;

    /// @notice Total number of attestations
    uint256 public totalAttestations;

    /// @notice Emitted when a new skill is attested
    event SkillAttested(
        bytes32 indexed skillHash,
        address indexed creator,
        bytes32[] sourceHashes,
        uint16 overlapScore,
        uint16 benchmarkScore,
        uint64 timestamp
    );

    /// @notice Attest a newly forged skill with its provenance data
    /// @param skillHash SHA-256 hash of the skill content
    /// @param sourceHashes SHA-256 hashes of source content used to forge the skill
    /// @param overlapScore Semantic overlap with existing skills (0-10000 basis points)
    /// @param benchmarkScore Quality benchmark result (0-10000 basis points)
    function attestSkill(
        bytes32 skillHash,
        bytes32[] calldata sourceHashes,
        uint16 overlapScore,
        uint16 benchmarkScore
    ) external {
        require(attestations[skillHash].timestamp == 0, "FondofAttestation: already attested");
        require(sourceHashes.length > 0, "FondofAttestation: no sources");
        require(sourceHashes.length <= 32, "FondofAttestation: too many sources");

        uint64 ts = uint64(block.timestamp);

        attestations[skillHash] = Attestation({
            skillHash: skillHash,
            sourceHashes: sourceHashes,
            overlapScore: overlapScore,
            benchmarkScore: benchmarkScore,
            creator: msg.sender,
            timestamp: ts
        });

        creatorSkills[msg.sender].push(skillHash);
        totalAttestations++;

        emit SkillAttested(skillHash, msg.sender, sourceHashes, overlapScore, benchmarkScore, ts);
    }

    /// @notice Retrieve the full attestation for a skill
    /// @param skillHash The skill hash to query
    /// @return The attestation struct
    function getAttestation(bytes32 skillHash) external view returns (Attestation memory) {
        require(attestations[skillHash].timestamp != 0, "FondofAttestation: not found");
        return attestations[skillHash];
    }

    /// @notice Get all skill hashes attested by a creator
    /// @param creator The creator address to query
    /// @return Array of skill hashes
    function getCreatorSkills(address creator) external view returns (bytes32[] memory) {
        return creatorSkills[creator];
    }

    /// @notice Check if a skill has been attested
    /// @param skillHash The skill hash to check
    /// @return True if the skill has been attested
    function isAttested(bytes32 skillHash) external view returns (bool) {
        return attestations[skillHash].timestamp != 0;
    }
}
