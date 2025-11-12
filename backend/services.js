
const { Contract, formatUnits, parseUnits } = require('ethers');
const { getProvider } = require('./utils');

const V2_ROUTER_ABI = [
    'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
];

const V2_FACTORY_ABI = [
    'function getPair(address tokenA, address tokenB) external view returns (address pair)'
];

/**
 * Fetches the price for a token pair from a Uniswap V2-compatible DEX.
 *
 * @param {object} tokenIn - The input token details.
 * @param {object} tokenOut - The output token details.
 * @param {object} dex - The DEX to check, including router and factory addresses.
 * @param {string} network - The network name.
 * @param {object} NETWORKS - The networks configuration.
 * @returns {Promise<number>} - The price.
 */
async function getV2Price(tokenIn, tokenOut, dex, network, NETWORKS) {
    const provider = getProvider(network, NETWORKS);
    const factory = new Contract(dex.factory, V2_FACTORY_ABI, provider);

    try {
        // First, check if the pair exists
        const pairAddress = await factory.getPair(tokenIn.address, tokenOut.address);
        if (pairAddress === '0x0000000000000000000000000000000000000000') {
            // console.log(`Pair ${tokenIn.symbol}/${tokenOut.symbol} does not exist on ${dex.name}`);
            return 0;
        }

        // If pair exists, get the price from the router
        const router = new Contract(dex.router, V2_ROUTER_ABI, provider);
        const amountIn = parseUnits('1', tokenIn.decimals);
        const amountsOut = await router.getAmountsOut(amountIn, [tokenIn.address, tokenOut.address]);
        return parseFloat(formatUnits(amountsOut[1], tokenOut.decimals));

    } catch (error) {
        // console.error(`Error fetching price from ${dex.name} for ${tokenIn.symbol}/${tokenOut.symbol}:`, error.reason || error.message);
        return 0;
    }
}

module.exports = { getV2Price };
