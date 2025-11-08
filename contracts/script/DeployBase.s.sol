// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {ArbitrageBalancer} from "../src/ArbitrageBalancer.sol";
import {UniswapV2TwapOracle} from "../src/UniswapV2TwapOracle.sol";

contract DeployBase is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address multiSig = vm.envAddress("MULTISIG_ADDRESS");
        vm.startBroadcast(deployerPrivateKey);

        // Address of the Balancer V2 Vault on Base Mainnet
        address vault = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

        // Deploy the UniswapV2TwapOracle
        UniswapV2TwapOracle oracle = new UniswapV2TwapOracle();

        // Deploy the ArbitrageBalancer
        ArbitrageBalancer arbitrageBalancer = new ArbitrageBalancer(vault, multiSig);

        vm.stopBroadcast();

        console2.log("ArbitrageBalancer deployed to:", address(arbitrageBalancer));
        console2.log("UniswapV2TwapOracle deployed to:", address(oracle));
    }
}
