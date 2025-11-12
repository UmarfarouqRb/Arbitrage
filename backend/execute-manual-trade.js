
const { Wallet, Contract, AbiCoder, parseUnits, formatUnits } = require('ethers');
const { getDexConfig, getProvider, getGasPrice } = require('./utils');
const { NETWORKS, BOT_CONFIG } = require('./config');
const ARBITRAGE_BALANCER_ABI = require('./abi.js');
const ERC20_ABI = ["function decimals() external view returns (uint8)"];

const ORACLE_ADDRESS = "0x0000000000000000000000000000000000000000"; // Oracle disabled for manual trades

async function executeTrade(tradeParams) {
    const { network, tokenA, tokenB, dex1, dex2, loanAmount } = tradeParams;

    if (!process.env.PRIVATE_KEY) {
        throw new Error("Server is not configured for execution. Missing PRIVATE_KEY.");
    }

    const provider = getProvider(network, NETWORKS);
    const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
    const arbitrageBot = new Contract(BOT_CONFIG.ARBITRAGE_CONTRACT_ADDRESS, ARBITRAGE_BALANCER_ABI, wallet);

    const dexConfig1 = getDexConfig(dex1);
    const dexConfig2 = getDexConfig(dex2);

    const tokenAContract = new Contract(tokenA, ERC20_ABI, provider);
    const tokenADecimals = await tokenAContract.decimals();
    const loanAmountBigInt = parseUnits(loanAmount, tokenADecimals);
    const profitThresholdAmount = parseUnits('0', tokenADecimals); // We already checked for profit in server.js

    // We are willing to accept any amount back from the first swap in a manual trade.
    // The security is enforced by the re-simulation in server.js.
    const minAmountOutFromFirstSwap = 0; 

    const flashLoanData = {
        inputToken: tokenA,
        middleToken: tokenB,
        routers: [dexConfig1.router, dexConfig2.router],
        paths: [[tokenA, tokenB], [tokenB, tokenA]],
        minProfit: profitThresholdAmount, 
        minAmountOutFromFirstSwap: minAmountOutFromFirstSwap,
        twapMaxDeviationBps: 0, 
        oracleAddress: ORACLE_ADDRESS,
        factory: dexConfig1.factory
    };

    const userData = new AbiCoder().encode(['(address,address,address[],address[][],uint256,uint256,uint256,address,address)'], [Object.values(flashLoanData)]);

    const gasPrice = await getGasPrice(provider, BOT_CONFIG.GAS_PRICE_STRATEGY);

    const tx = await arbitrageBot.startFlashloan(
        tokenA, 
        loanAmountBigInt, 
        userData, 
        {
            gasLimit: BOT_CONFIG.GAS_LIMIT,
            gasPrice: gasPrice
        }
    );

    console.log(`Manual trade transaction sent! Hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

    const eventTopic = arbitrageBot.interface.getEventTopic('FlashLoanExecuted');
    const log = receipt.logs.find(x => x.topics[0] === eventTopic);
    let actualProfit = '0';
    let isProfitable = false;

    if (log) {
        const decodedLog = arbitrageBot.interface.decodeEventLog('FlashLoanExecuted', log.data, log.topics);
        actualProfit = formatUnits(decodedLog.netProfit, tokenADecimals);
        isProfitable = decodedLog.netProfit > 0;
    }

    return {
        isProfitable,
        profit: actualProfit,
        profitToken: tokenA,
        txHash: tx.hash,
    };
}

module.exports = { executeTrade };
