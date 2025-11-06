const { task } = require("hardhat/config");

task("pause-contract", "Pauses the ArbitrageBalancer contract")
    .addParam("contract", "The address of the ArbitrageBalancer contract")
    .setAction(async (taskArgs, hre) => {
        const { contract } = taskArgs;

        const ArbitrageBalancer = await hre.ethers.getContractFactory("ArbitrageBalancer");
        const arbitrageBalancer = ArbitrageBalancer.attach(contract);

        const tx = await arbitrageBalancer.pause();
        await tx.wait();

        console.log("Contract has been paused.");
    });
