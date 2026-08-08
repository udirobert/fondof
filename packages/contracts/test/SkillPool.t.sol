// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SkillPool.sol";

contract SkillPoolTest is Test {
    SkillPool public pool;
    address public resolver = address(0xAA);
    address public forger = address(0xBB);
    address public user = address(0xCC);
    address public challenger = address(0xDD);

    function setUp() public {
        pool = new SkillPool(resolver);
        vm.deal(forger, 10 ether);
        vm.deal(challenger, 10 ether);
    }

    // --- Forge tests ---

    function test_forge() public {
        bytes32 skillHash = keccak256("my-skill-content");
        bytes32[] memory sources = new bytes32[](2);
        sources[0] = keccak256("podcast-transcript");
        sources[1] = keccak256("blog-post");

        vm.prank(forger);
        pool.forge{value: 0.01 ether}(skillHash, sources);

        SkillPool.Skill memory skill = pool.getSkill(skillHash);
        assertEq(skill.forger, forger);
        assertEq(skill.backing, 0.01 ether);
        assertEq(skill.usageCount, 0);
        assertEq(skill.sourceHashes.length, 2);
        assertTrue(skill.exists);
        assertEq(pool.totalSkills(), 1);
    }

    function test_forge_revertsDuplicate() public {
        bytes32 skillHash = keccak256("skill");
        bytes32[] memory sources = new bytes32[](1);
        sources[0] = keccak256("src");

        vm.prank(forger);
        pool.forge{value: 0.01 ether}(skillHash, sources);

        vm.prank(forger);
        vm.expectRevert("SkillPool: skill already exists");
        pool.forge{value: 0.01 ether}(skillHash, sources);
    }

    function test_forge_revertsInsufficientBacking() public {
        bytes32 skillHash = keccak256("skill");
        bytes32[] memory sources = new bytes32[](1);
        sources[0] = keccak256("src");

        vm.prank(forger);
        vm.expectRevert("SkillPool: insufficient backing");
        pool.forge{value: 0.0001 ether}(skillHash, sources);
    }

    // --- Use tests ---

    function test_use() public {
        bytes32 skillHash = _forgeSkill("skill-1");

        vm.prank(user);
        pool.use(skillHash);

        SkillPool.Skill memory skill = pool.getSkill(skillHash);
        assertEq(skill.usageCount, 1);

        vm.prank(user);
        pool.use(skillHash);
        skill = pool.getSkill(skillHash);
        assertEq(skill.usageCount, 2);
    }

    function test_use_revertsNotFound() public {
        vm.prank(user);
        vm.expectRevert("SkillPool: skill not found");
        pool.use(keccak256("nonexistent"));
    }

    // --- Signal tests ---

    function test_getSignal_initialBacking() public {
        bytes32 skillHash = _forgeSkill("skill-1");
        uint256 signal = pool.getSignal(skillHash);
        // Signal should be at least the backing (0.01 ether)
        assertEq(signal, 0.01 ether);
    }

    function test_getSignal_increasesWithUsage() public {
        bytes32 skillHash = _forgeSkill("skill-1");
        uint256 initialSignal = pool.getSignal(skillHash);

        vm.prank(user);
        pool.use(skillHash);

        uint256 afterUsage = pool.getSignal(skillHash);
        assertGt(afterUsage, initialSignal);
    }

    // --- Challenge tests ---

    function test_challenge() public {
        bytes32 skillHash = _forgeSkill("skill-1");

        vm.prank(challenger);
        uint256 challengeId = pool.challenge{value: 0.005 ether}(skillHash);
        assertEq(challengeId, 0);
        assertEq(pool.challengeCount(), 1);
    }

    function test_resolve_challengerWins() public {
        bytes32 skillHash = _forgeSkill("skill-1");

        vm.prank(challenger);
        uint256 challengeId = pool.challenge{value: 0.005 ether}(skillHash);

        uint256 challengerBalanceBefore = challenger.balance;

        vm.prank(resolver);
        pool.resolve(challengeId, true);

        // Challenger gets stake + reward from backing
        assertGt(challenger.balance, challengerBalanceBefore);

        // Skill has challenge loss recorded
        SkillPool.Skill memory skill = pool.getSkill(skillHash);
        assertEq(skill.challengeLosses, 1);
    }

    function test_resolve_forgerWins() public {
        bytes32 skillHash = _forgeSkill("skill-1");
        uint256 backingBefore = pool.getSkill(skillHash).backing;

        vm.prank(challenger);
        uint256 challengeId = pool.challenge{value: 0.005 ether}(skillHash);

        vm.prank(resolver);
        pool.resolve(challengeId, false);

        // Skill backing increases (gets challenger's stake)
        SkillPool.Skill memory skill = pool.getSkill(skillHash);
        assertEq(skill.backing, backingBefore + 0.005 ether);
        assertEq(skill.challengeLosses, 0);
    }

    function test_resolve_revertsNotResolver() public {
        bytes32 skillHash = _forgeSkill("skill-1");

        vm.prank(challenger);
        uint256 challengeId = pool.challenge{value: 0.005 ether}(skillHash);

        vm.prank(forger);
        vm.expectRevert("SkillPool: not resolver");
        pool.resolve(challengeId, true);
    }

    // --- topSkills tests ---

    function test_topSkills() public {
        bytes32 skill1 = _forgeSkillWithBacking("skill-1", 0.01 ether);
        bytes32 skill2 = _forgeSkillWithBacking("skill-2", 0.05 ether);
        bytes32 skill3 = _forgeSkillWithBacking("skill-3", 0.02 ether);

        bytes32[] memory top = pool.topSkills(3);
        // Highest backing first
        assertEq(top[0], skill2);
        assertEq(top[1], skill3);
        assertEq(top[2], skill1);
    }

    function test_topSkills_limitedCount() public {
        _forgeSkillWithBacking("skill-1", 0.01 ether);
        _forgeSkillWithBacking("skill-2", 0.05 ether);
        _forgeSkillWithBacking("skill-3", 0.02 ether);

        bytes32[] memory top = pool.topSkills(2);
        assertEq(top.length, 2);
    }

    // --- Acquire tests ---

    function test_acquire_returnsSkill() public {
        _forgeSkill("skill-1");
        _forgeSkill("skill-2");

        bytes32 selected = pool.acquire(keccak256("random-seed"));
        assertTrue(selected != bytes32(0));
    }

    function test_acquire_revertsEmpty() public {
        vm.expectRevert("SkillPool: no skills");
        pool.acquire(keccak256("seed"));
    }

    // --- Helpers ---

    function _forgeSkill(string memory name) internal returns (bytes32) {
        return _forgeSkillWithBacking(name, 0.01 ether);
    }

    function _forgeSkillWithBacking(string memory name, uint256 backing) internal returns (bytes32) {
        bytes32 skillHash = keccak256(bytes(name));
        bytes32[] memory sources = new bytes32[](1);
        sources[0] = keccak256(abi.encodePacked(name, "-source"));

        vm.prank(forger);
        pool.forge{value: backing}(skillHash, sources);
        return skillHash;
    }
}
