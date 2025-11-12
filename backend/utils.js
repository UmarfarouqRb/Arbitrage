
const { JsonRpcProvider, Contract } = require('ethers');
const { DEX_ROUTERS, DEX_FACTORIES } = require('./config'); // Import DEX configs

const ERC20_ABI = [
    "function decimals() external view returns (uint8)",
    "function symbol() external view returns (string)",
];

const providerCache = {};

function getProvider(networkName, NETWORKS) {
    if (!providerCache[networkName]) {
        const rpcUrl = NETWORKS[networkName]?.rpcUrl;
        if (!rpcUrl) throw new Error(`RPC URL for network ${networkName} not found.`);
        providerCache[networkName] = new JsonRpcProvider(rpcUrl);
    }
    return providerCache[networkName];
}

// --- NEWLY ADDED FUNCTION ---
function getDexConfig(dexName) {
    const network = 'base'; // Assuming 'base' for now, this can be parameterized if needed
    const router = DEX_ROUTERS[network][dexName];
    const factory = DEX_FACTORIES[network][dexName]; // Factory might be needed later

    if (!router) {
        throw new Error(`Router for ${dexName} on network ${network} not found.`);
    }

    return { router, factory };
}

async function getTokenDetails(tokenAddress, provider) {
    const contract = new Contract(tokenAddress, ERC20_ABI, provider);
    const [decimals, symbol] = await Promise.all([
        contract.decimals(),
        contract.symbol()
    ]);
    return { address: tokenAddress, decimals: Number(decimals), symbol };
}

async function getGasPrice(provider, strategy) {
    const feeData = await provider.getFeeData();
    if (!feeData.maxFeePerGas) {
        // Fallback for non-EIP-1559 networks
        return feeData.gasPrice;
    }

    switch (strategy) {
        case 'fast':
            return feeData.maxFeePerGas * 12n / 10n;
        default:
            return feeData.maxFeePerGas;
    }
}

module.exports = {
    getProvider,
    getDexConfig, // Export the new function
    getTokenDetails,
    getGasPrice,
};
