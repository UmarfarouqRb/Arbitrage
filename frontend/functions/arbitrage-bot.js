
const { JsonRpcProvider, Contract, AbiCoder, parseUnits, formatUnits, isAddress } = require('ethers');

// Combine the imported ABI with the factory method we need.
const routerABI = [
    ...require('../../frontend/src/utils/abi').uniswapV2RouterABI,
    'function factory() external view returns (address)'
];

const pairABI = [
    'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    'function token0() external view returns (address)'
];
const factoryABI = [
    'function getPair(address tokenA, address tokenB) external view returns (address pair)'
];

// A more conservative gas limit for the arbitrage transaction.
// On-chain estimation is too slow for a discovery function. This provides a safer buffer.
const GAS_LIMIT_ESTIMATE = 450000; 
const DYNAMIC_LOAN_PERCENTAGE = 5; // Use 0.5% of the shallower pool's liquidity

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    let body;
    try { 
        body = JSON.parse(event.body); 
    } catch (e) { 
        return { statusCode: 400, body: JSON.stringify({ message: 'Invalid JSON format' }) }; 
    }

    const { 
        infuraProjectId, tokenA, tokenB, dex1, dex2, oracleAddress, 
        profitThreshold, useDynamicLoan, manualLoanAmount, gasStrategy 
    } = body;

    // --- Input Validation ---
    if (!infuraProjectId) {
         return { statusCode: 400, body: JSON.stringify({ message: 'Missing Infura Project ID.' }) };
    }
    for (const addr of [tokenA, tokenB, dex1, dex2, oracleAddress]) {
        if (!isAddress(addr)) {
            return { statusCode: 400, body: JSON.stringify({ message: `Invalid Ethereum address provided: ${addr}` }) };
        }
    }

    const provider = new JsonRpcProvider(`https://base-mainnet.infura.io/v3/${infuraProjectId}`);
    let loanAmount;

    try {
        if (useDynamicLoan) {
            // Correctly get factory for each DEX and then the pair
            const router1 = new Contract(dex1, routerABI, provider);
            const factory1Address = await router1.factory();
            const factory1 = new Contract(factory1Address, factoryABI, provider);
            const pair1Address = await factory1.getPair(tokenA, tokenB);

            const router2 = new Contract(dex2, routerABI, provider);
            const factory2Address = await router2.factory();
            const factory2 = new Contract(factory2Address, factoryABI, provider);
            const pair2Address = await factory2.getPair(tokenA, tokenB);

            if (pair1Address === '0x0000000000000000000000000000000000000000' || pair2Address === '0x0000000000000000000000000000000000000000') {
                return { statusCode: 200, body: JSON.stringify({ isProfitable: false, message: 'Pair does not exist on one or both DEXs.' }) };
            }

            const pair1 = new Contract(pair1Address, pairABI, provider);
            const pair2 = new Contract(pair2Address, pairABI, provider);

            const [reserves1, token0_1] = await Promise.all([pair1.getReserves(), pair1.token0()]);
            const [reserves2, token0_2] = await Promise.all([pair2.getReserves(), pair2.token0()]);

            const reserveA_1 = tokenA.toLowerCase() === token0_1.toLowerCase() ? reserves1[0] : reserves1[1];
            const reserveA_2 = tokenA.toLowerCase() === token0_2.toLowerCase() ? reserves2[0] : reserves2[1];

            const smallerReserveA = reserveA_1.lt(reserveA_2) ? reserveA_1 : reserveA_2;
            loanAmount = smallerReserveA.mul(DYNAMIC_LOAN_PERCENTAGE).div(1000);

        } else {
            loanAmount = parseUnits(manualLoanAmount || '1', 18);
        }

        if (loanAmount.isZero()) {
             return { statusCode: 200, body: JSON.stringify({ isProfitable: false, message: 'Calculated loan amount is zero.' }) };
        }

        const dex1Router = new Contract(dex1, routerABI, provider);
        const dex2Router = new Contract(dex2, routerABI, provider);

        const [amountsOut1, amountsOut2] = await Promise.all([
            dex1Router.getAmountsOut(loanAmount, [tokenA, tokenB]),
            dex2Router.getAmountsOut(loanAmount, [tokenA, tokenB])
        ]);

        const buyOnDex = amountsOut1[1].gt(amountsOut2[1]) ? dex1 : dex2;
        const sellOnDex = amountsOut1[1].gt(amountsOut2[1]) ? dex2 : dex1;
        const amountB_received = amountsOut1[1].gt(amountsOut2[1]) ? amountsOut1[1] : amountsOut2[1];
        
        const finalAmountsOut = await (buyOnDex === dex1 ? dex2Router : dex1Router).getAmountsOut(amountB_received, [tokenB, tokenA]);
        const finalAmountA = finalAmountsOut[1];
        
        const feeData = await provider.getFeeData();
        let recommendedGasPrice = feeData.gasPrice;
        if (gasStrategy === 'fast') recommendedGasPrice = feeData.maxPriorityFeePerGas.add(feeData.lastBaseFeePerGas);
        else if (gasStrategy === 'urgent') recommendedGasPrice = feeData.maxPriorityFeePerGas.add(feeData.lastBaseFeePerGas).mul(12).div(10);

        const estimatedGasCost = recommendedGasPrice.mul(GAS_LIMIT_ESTIMATE);
        const parsedProfitThreshold = parseUnits(profitThreshold, 18);

        if (finalAmountA.gt(loanAmount.add(parsedProfitThreshold).add(estimatedGasCost))) {
            const grossProfit = finalAmountA.sub(loanAmount);
            // This is still incomplete in the original file, but the logic stands
            const userData = "0x"; // Placeholder

            return { 
                statusCode: 200, 
                body: JSON.stringify({ 
                    isProfitable: true, 
                    grossProfit: formatUnits(grossProfit, 18), 
                    loanAmount: loanAmount.toString(), 
                    tokenA, 
                    tokenB, 
                    userData, 
                    recommendedGasPrice: recommendedGasPrice.toString() 
                }) 
            };
        } else {
            return { statusCode: 200, body: JSON.stringify({ isProfitable: false, message: 'No profitable opportunity found after accounting for gas.' }) };
        }
    } catch (err) {
        console.error('Bot execution error:', err);
        return { statusCode: 500, body: JSON.stringify({ message: 'An internal error occurred during the arbitrage check.', error: err.reason || err.message }) };
    }
};
