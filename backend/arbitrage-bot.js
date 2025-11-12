
require('dotenv').config();
const { Wallet, Contract, parseUnits, formatUnits } = require('ethers');
const { NETWORKS, TOKENS, DEX_ROUTERS, DEX_FACTORIES, BOT_CONFIG, PRIVATE_KEY } = require('./config');
const { getProvider, getTokenDetails, getGasPrice } = require('./utils');
const { getV2Price } = require('./services');
const fs = require('fs').promises;
const path = require('path');

const ARBITRAGE_ABI = require('../deployments/base-mainnet/ArbitrageBalancer.json').abi;
const TRADE_HISTORY_FILE = path.join(__dirname, 'trade_history.json');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function logTrade(logData) {
    try {
        let history = [];
        try {
            const data = await fs.readFile(TRADE_HISTORY_FILE, 'utf8');
            history = JSON.parse(data);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        const existingIndex = history.findIndex(log => log.txHash === logData.txHash);
        if (existingIndex !== -1) {
            history[existingIndex] = { ...history[existingIndex], ...logData };
        } else {
            history.unshift({ ...logData, timestamp: new Date().toISOString() });
        }
        await fs.writeFile(TRADE_HISTORY_FILE, JSON.stringify(history.slice(0, 100), null, 2));
    } catch (error) {
        console.error("Error writing to trade history file:", error);
    }
}

async function runBot(networkName) {
    if (!NETWORKS[networkName]) {
        console.error(`Unsupported network: ${networkName}.`);
        return;
    }

    console.log(`Initializing bot for ${networkName}...`);

    const provider = getProvider(networkName, NETWORKS);
    const wallet = new Wallet(PRIVATE_KEY, provider);
    const tokenList = TOKENS[networkName];
    const dexRouters = DEX_ROUTERS[networkName];
    const dexFactories = DEX_FACTORIES[networkName];

    console.log(`Bot started on ${networkName}. Wallet: ${wallet.address}`);

    // --- START: Updated Pair Generation Logic ---
    const allTokenSymbols = Object.keys(tokenList);
    const tokenPairs = [];
    const baseTokens = ['WETH', 'USDC'];

    // Pair base tokens with all other tokens
    for (const baseToken of baseTokens) {
        for (const token of allTokenSymbols) {
            if (baseToken === token) continue;

            // Avoid duplicate pairs like [USDC, WETH] if [WETH, USDC] already exists
            const pairExists = tokenPairs.some(p => 
                (p[0] === token && p[1] === baseToken)
            );
            
            if (!pairExists) {
                tokenPairs.push([baseToken, token]);
            }
        }
    }
    // --- END: Updated Pair Generation Logic ---

    console.log(`Scanning ${tokenPairs.length} pairs (WETH/USDC based) across ${Object.keys(dexRouters).length} DEXs...`);

    const scan = async () => {
        try {
            await scanForArbitrage(tokenPairs, tokenList, dexRouters, dexFactories, networkName, wallet, provider);
        } catch (error) {
            console.error("An error occurred during the scan:", error);
        }
        setTimeout(scan, BOT_CONFIG.SCAN_INTERVAL);
    };

    scan();
}

async function scanForArbitrage(tokenPairs, tokenList, dexRouters, dexFactories, networkName, wallet, provider) {
    console.log(`
--- New Scan Started at ${new Date().toLocaleTimeString()} ---`);
    for (const [t1, t2] of tokenPairs) {
        try {
            const tokenA = await getTokenDetails(tokenList[t1], provider);
            const tokenB = await getTokenDetails(tokenList[t2], provider);

            for (const dexName1 in dexRouters) {
                for (const dexName2 in dexRouters) {
                    if (dexName1 === dexName2) continue;

                    await sleep(500);

                    const dex1 = { name: dexName1, router: dexRouters[dexName1], factory: dexFactories[dexName1] };
                    const dex2 = { name: dexName2, router: dexRouters[dexName2], factory: dexFactories[dexName2] };

                    console.log(`Checking ${tokenA.symbol}/${tokenB.symbol} on ${dex1.name} -> ${dex2.name}`);

                    const price1 = await getV2Price(tokenA, tokenB, dex1, networkName, NETWORKS);
                    const price2 = await getV2Price(tokenB, tokenA, dex2, networkName, NETWORKS);

                    if (price1 === 0 || price2 === 0) continue;

                    const loanAmount = parseUnits('1', tokenA.decimals);
                    const amountOut1 = loanAmount * BigInt(Math.floor(price1 * 10000)) / 10000n;
                    const finalAmountOut = amountOut1 * BigInt(Math.floor(price2 * 10000)) / 10000n;
                    const netProfit = finalAmountOut - loanAmount;

                    if (netProfit > parseUnits(BOT_CONFIG.PROFIT_THRESHOLD, tokenA.decimals)) {
                        const gasPrice = await getGasPrice(provider, BOT_CONFIG.GAS_PRICE_STRATEGY);
                        const estimatedGasCost = gasPrice * BigInt(BOT_CONFIG.GAS_LIMIT);
                        const gasCostInToken = await convertGasCostToToken(estimatedGasCost, tokenA, dex1, provider, networkName);

                        console.log(`
--- Potential Opportunity Found! ---`);
                        console.log(`  Pair: ${tokenA.symbol}/${tokenB.symbol}`);
                        console.log(`  Route: ${dex1.name} -> ${dex2.name}`);
                        console.log(`  Estimated Profit: ${formatUnits(netProfit, tokenA.decimals)} ${tokenA.symbol}`);
                        console.log(`  Estimated Gas Cost: ${formatUnits(gasCostInToken, tokenA.decimals)} ${tokenA.symbol}`);

                        if (netProfit > gasCostInToken) {
                            console.log(`  ✅ PROFITABLE! Executing trade...`);
                            await executeArbitrage(wallet, { tokenA, tokenB, dex1, dex2, loanAmount, networkName, netProfit, gasCostInToken });
                        } else {
                            console.log(`  ❌ NOT PROFITABLE after gas. Skipping.`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`
--- ⚠️ Error processing pair ${t1}/${t2} ---`);
            console.error(`  > Addresses: ${tokenList[t1]}, ${tokenList[t2]}`);
            console.error(`  > Error: ${error.message}. Skipping this pair.`);
        }
    }
    console.log(`--- Scan Finished at ${new Date().toLocaleTimeString()} ---`);
}

async function convertGasCostToToken(gasCostInWei, token, dex, provider, networkName) {
    const wethAddress = TOKENS[networkName].WETH;
    if (token.address.toLowerCase() === wethAddress.toLowerCase()) {
        return gasCostInWei;
    }
    const weth = await getTokenDetails(wethAddress, provider);
    const wethPriceInToken = await getV2Price(weth, token, dex, networkName, NETWORKS);
    if (wethPriceInToken === 0) return parseUnits('1000', 18);

    const gasCostInToken = gasCostInWei * BigInt(Math.floor(wethPriceInToken * (10 ** token.decimals))) / (10n ** 18n);
    return gasCostInToken;
}

async function executeArbitrage(wallet, trade) {
    console.log(`
--- EXECUTING ARBITRAGE ---`);
    const { tokenA, tokenB, dex1, dex2, loanAmount, networkName, netProfit, gasCostInToken } = trade;
    const explorerUrl = NETWORKS[networkName].explorerUrl;

    const arbitrageContract = new Contract(BOT_CONFIG.ARBITRAGE_CONTRACT_ADDRESS, ARBITRAGE_ABI, wallet);

    let logData = { txHash: '', pair: `${tokenA.symbol}/${tokenB.symbol}`, route: `${dex1.name} -> ${dex2.name}`, profit: 'Calculating...' };

    try {
        const tx = await arbitrageContract.executeArbitrage(
            tokenA.address, tokenB.address, loanAmount, [dex1.router, dex2.router],
            { gasLimit: BOT_CONFIG.GAS_LIMIT, gasPrice: await getGasPrice(wallet.provider, BOT_CONFIG.GAS_PRICE_STRATEGY) }
        );

        console.log(`  > Transaction Sent! Hash: ${tx.hash}`);
        console.log(`  > View on Explorer: ${explorerUrl}/tx/${tx.hash}`);
        logData.txHash = tx.hash;
        logData.status = 'Pending';
        await logTrade(logData);

        const receipt = await tx.wait();

        if (receipt.status === 1) {
            console.log(`  > ✅ SUCCESS! Transaction confirmed in block ${receipt.blockNumber}`);
            const finalProfit = formatUnits(netProfit - gasCostInToken, tokenA.decimals);
            await logTrade({ ...logData, status: 'Success', profit: `${finalProfit} ${tokenA.symbol}` });
        } else {
            console.error(`  > ❌ FAILED! Transaction reverted.`);
            await logTrade({ ...logData, status: 'Failed', error: 'Transaction reverted' });
        }
    } catch (error) {
        console.error(`  > ❌ EXECUTION FAILED:`, error.reason || error.message);
        await logTrade({ ...logData, status: 'Failed', error: error.reason || error.message });
    }
    console.log(`--- EXECUTION FINISHED ---`);
}

module.exports = { runBot };
