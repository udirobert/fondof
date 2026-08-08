// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SkillPool.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        // For Blitz: resolver = deployer (same wallet acts as oracle)
        address resolver = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);
        SkillPool pool = new SkillPool(resolver);
        vm.stopBroadcast();

        console.log("SkillPool deployed at:", address(pool));
        console.log("Resolver (oracle):", resolver);
    }
}
