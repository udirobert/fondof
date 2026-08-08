// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/FondofAttestation.sol";

contract FondofAttestationTest is Test {
    FondofAttestation public attestation;
    address public relayer = address(0x1234);

    function setUp() public {
        attestation = new FondofAttestation();
    }

    function test_attestSkill() public {
        bytes32 skillHash = keccak256("test-skill-content");
        bytes32[] memory sourceHashes = new bytes32[](2);
        sourceHashes[0] = keccak256("podcast-transcript");
        sourceHashes[1] = keccak256("blog-post-content");

        vm.prank(relayer);
        attestation.attestSkill(skillHash, sourceHashes, 2500, 8500);

        FondofAttestation.Attestation memory result = attestation.getAttestation(skillHash);
        assertEq(result.skillHash, skillHash);
        assertEq(result.sourceHashes.length, 2);
        assertEq(result.overlapScore, 2500);
        assertEq(result.benchmarkScore, 8500);
        assertEq(result.creator, relayer);
        assertTrue(result.timestamp > 0);
    }

    function test_attestSkill_emitsEvent() public {
        bytes32 skillHash = keccak256("test-skill");
        bytes32[] memory sourceHashes = new bytes32[](1);
        sourceHashes[0] = keccak256("source");

        vm.prank(relayer);
        vm.recordLogs();
        attestation.attestSkill(skillHash, sourceHashes, 1000, 9000);

        Vm.Log[] memory entries = vm.getRecordedLogs();
        // SkillAttested event should be emitted
        assertEq(entries.length, 1);
        // First topic is the event signature
        // Second topic (indexed) is skillHash
        assertEq(entries[0].topics[1], skillHash);
        // Third topic (indexed) is creator address
        assertEq(entries[0].topics[2], bytes32(uint256(uint160(relayer))));
    }

    function test_attestSkill_revertsDuplicate() public {
        bytes32 skillHash = keccak256("test-skill");
        bytes32[] memory sourceHashes = new bytes32[](1);
        sourceHashes[0] = keccak256("source");

        vm.prank(relayer);
        attestation.attestSkill(skillHash, sourceHashes, 0, 0);

        vm.prank(relayer);
        vm.expectRevert("FondofAttestation: already attested");
        attestation.attestSkill(skillHash, sourceHashes, 0, 0);
    }

    function test_attestSkill_revertsNoSources() public {
        bytes32 skillHash = keccak256("test-skill");
        bytes32[] memory sourceHashes = new bytes32[](0);

        vm.prank(relayer);
        vm.expectRevert("FondofAttestation: no sources");
        attestation.attestSkill(skillHash, sourceHashes, 0, 0);
    }

    function test_attestSkill_revertsTooManySources() public {
        bytes32 skillHash = keccak256("test-skill");
        bytes32[] memory sourceHashes = new bytes32[](33);
        for (uint256 i = 0; i < 33; i++) {
            sourceHashes[i] = keccak256(abi.encodePacked(i));
        }

        vm.prank(relayer);
        vm.expectRevert("FondofAttestation: too many sources");
        attestation.attestSkill(skillHash, sourceHashes, 0, 0);
    }

    function test_isAttested() public {
        bytes32 skillHash = keccak256("test-skill");
        bytes32[] memory sourceHashes = new bytes32[](1);
        sourceHashes[0] = keccak256("source");

        assertFalse(attestation.isAttested(skillHash));

        vm.prank(relayer);
        attestation.attestSkill(skillHash, sourceHashes, 5000, 7500);

        assertTrue(attestation.isAttested(skillHash));
    }

    function test_getCreatorSkills() public {
        bytes32[] memory sourceHashes = new bytes32[](1);
        sourceHashes[0] = keccak256("source");

        vm.startPrank(relayer);
        attestation.attestSkill(keccak256("skill-1"), sourceHashes, 0, 0);
        attestation.attestSkill(keccak256("skill-2"), sourceHashes, 0, 0);
        attestation.attestSkill(keccak256("skill-3"), sourceHashes, 0, 0);
        vm.stopPrank();

        bytes32[] memory skills = attestation.getCreatorSkills(relayer);
        assertEq(skills.length, 3);
    }

    function test_totalAttestations() public {
        bytes32[] memory sourceHashes = new bytes32[](1);
        sourceHashes[0] = keccak256("source");

        assertEq(attestation.totalAttestations(), 0);

        vm.prank(relayer);
        attestation.attestSkill(keccak256("skill-1"), sourceHashes, 0, 0);
        assertEq(attestation.totalAttestations(), 1);

        vm.prank(relayer);
        attestation.attestSkill(keccak256("skill-2"), sourceHashes, 0, 0);
        assertEq(attestation.totalAttestations(), 2);
    }
}
