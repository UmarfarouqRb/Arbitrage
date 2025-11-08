# Flash Loan Arbitrage Bot

This project is a full-stack decentralized application for executing flash loan-based arbitrage opportunities on EVM-compatible blockchains, with a focus on the Base network. It leverages Balancer for flash loans and Uniswap V2 compatible DEXs for trading.

## Architecture

The project is structured as a monorepo with three main components:

1.  **Smart Contracts (`contracts/`):** The core on-chain logic written in Solidity using the Foundry framework.
    *   `ArbitrageBalancer.sol`: The main contract that receives a flash loan, executes two trades, repays the loan, and sends profits to the initiator.
    *   `UniswapV2TwapOracle.sol`: An on-chain Time-Weighted Average Price (TWAP) oracle to protect against price manipulation during arbitrage execution.
    *   **Security Features:** Includes re-entrancy guards, pausable functionality, ownership control, and strict input validation.

2.  **Frontend (`frontend/`):** A React application built with Vite that provides a user interface for monitoring arbitrage opportunities and interacting with the smart contracts.

3.  **Scripts & Tasks (`tasks/`):** A collection of Javascript scripts for automating interactions with the deployed smart contracts, such as initiating a flash loan or pausing the contract.

## Features

- **Flash Loan Integration:** Utilizes Balancer V2 flash loans as the source of capital for arbitrage.
- **DEX Arbitrage:** Executes trades between two different Uniswap V2 compatible routers.
- **TWAP Oracle Protection:** Safeguards against price manipulation by verifying the trade price against a TWAP before execution.
- **Administrative Controls:** The contract is ownable by a multisig wallet, which can pause/unpause the contract, withdraw profits, and manage whitelisted routers.
- **Flexible Deployment:** Includes deployment scripts for both Foundry (`forge script`) and Javascript (`ethers.js`).
- **User Interface:** A simple dashboard to find and execute arbitrage opportunities.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [Foundry](https://getfoundry.sh/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  **Install Node.js dependencies:**
    This will install dependencies for the frontend and the interaction scripts.
    ```bash
    npm install
    ```

3.  **Install Solidity dependencies:**
    Foundry manages Solidity libraries.
    ```bash
    forge install
    ```

### Configuration

The smart contracts require environment variables for deployment and execution.

1.  Navigate to the contracts directory: `cd contracts`
2.  Create a `.env` file.
3.  Edit the `.env` file with your details:
    ```
    PRIVATE_KEY=<YOUR_ETHEREUM_PRIVATE_KEY>
    MULTISIG_ADDRESS=<YOUR_MULTISIG_WALLET_ADDRESS>
    ```
    **Security Note:** Never commit the `.env` file to version control.

## Usage

### Testing the Contracts

The project uses Foundry for smart contract testing.

```bash
forge test
```

### Deployment

The contracts are intended to be deployed on the Base mainnet.

**Option 1: Using Foundry**
(Requires Foundry to be correctly installed and configured in your environment)
```bash
forge script contracts/script/DeployBase.s.sol:DeployBase --rpc-url https://mainnet.base.org --broadcast
```

**Option 2: Using Javascript (Ethers.js)**
A Javascript-based deployment script is available as an alternative.
```bash
node scripts/deploy.js
```

After deployment, contract addresses and ABIs will be saved to the `deployments/base-mainnet` directory.

### Interacting with the Contracts

The `tasks/` directory contains scripts to interact with the deployed `ArbitrageBalancer` contract. Before running these, ensure you have a `deployments/base-mainnet/ArbitrageBalancer.json` file.

- **Start a Flash Loan:**
  ```bash
  node tasks/start-flash-loan.js --token <TOKEN_ADDRESS> --amount <AMOUNT> ...
  ```
- **Pause the Contract:**
  ```bash
  node tasks/pause-contract.js
  ```
- **Unpause the Contract:**
  ```bash
  node tasks/unpause-contract.js
  ```

### Running the Frontend

Navigate to the `frontend` directory and start the development server.

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`.
