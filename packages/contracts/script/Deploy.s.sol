// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/FondofAttestation.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);
        FondofAttestation attestation = new FondofAttestation();
        vm.stopBroadcast();

        console.log("FondofAttestation deployed at:", address(attestation));
    }
}
