require('@nomicfoundation/hardhat-toolbox');
require("dotenv").config();
require("./tasks/start-flash-loan");
require("./tasks/pause-contract");
require("./tasks/unpause-contract");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY]
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY]
    },
    base_sepolia: {
      url: 'https://sepolia.base.org',
      accounts: [process.env.PRIVATE_KEY],
      chainId: 84532
    }
  }
};
