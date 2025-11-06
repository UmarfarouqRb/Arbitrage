const { task } = require("hardhat/config");

task("start-flash-loan", "Starts a flash loan arbitrage")
    .addParam("contract", "The address of the ArbitrageBalancer contract")
    .addParam("token", "The address of the token to loan")
    .addParam("amount", "The amount of the token to loan")
    .addParam("inputtoken", "The address of the input token for the arbitrage")
    .addParam("middletoken", "The address of the middle token for the arbitrage")
    .addParam("router0", "The address of the first router")
    .addParam("router1", "The address of the second router")
    .addParam("path0", "The path for the first swap, as a comma-separated list of token addresses")
    .addParam("path1", "The path for the second swap, as a comma-separated list of token addresses")
    .addParam("minprofit", "The minimum expected profit from the arbitrage")
    .addParam("minamountout", "The minimum amount out from the first swap")
    .addParam("twapmaxdeviation", "The maximum allowed deviation from the TWAP, in basis points")
    .setAction(async (taskArgs, hre) => {
        const { contract, token, amount, inputtoken, middletoken, router0, router1, path0, path1, minprofit, minamountout, twapmaxdeviation } = taskArgs;

        const ArbitrageBalancer = await hre.ethers.getContractFactory("ArbitrageBalancer");
        const arbitrageBalancer = ArbitrageBalancer.attach(contract);

        const paths = [path0.split(','), path1.split(',')];
        const routers = [router0, router1];

        const userData = hre.ethers.utils.defaultAbiCoder.encode(
            ["address", "address", "address[]", "address[][]", "uint256", "uint256", "uint256"],
            [inputtoken, middletoken, routers, paths, minprofit, minamountout, twapmaxdeviation]
        );

        const tx = await arbitrageBalancer.startFlashloan(token, amount, userData);
        await tx.wait();

        console.log("Flash loan started!");
    });
