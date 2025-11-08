import { useState, useEffect, useContext } from 'react';
import { JsonRpcProvider, Contract, parseUnits, formatUnits } from 'ethers';
import { NetworkContext } from '../contexts/NetworkContext';
import { uniswapV2RouterABI } from '../utils/abi';

export const useArbitrageOpportunities = (arbitrageParams) => {
  const [opportunities, setOpportunities] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { networkConfig } = useContext(NetworkContext);

  useEffect(() => {
    const findOpportunities = async () => {
      if (!networkConfig || !arbitrageParams) return;

      try {
        setLoading(true);
        const provider = new JsonRpcProvider(networkConfig.rpcUrl);
        const { tokenA, tokenB, dex1, dex2 } = arbitrageParams;

        const dex1Router = new Contract(dex1, uniswapV2RouterABI, provider);
        const dex2Router = new Contract(dex2, uniswapV2RouterABI, provider);

        const amountIn = parseUnits('1', 18); // 1 TokenA

        // Get prices from DEX1
        const amountsOut1 = await dex1Router.getAmountsOut(amountIn, [tokenA, tokenB]);
        const price1 = formatUnits(amountsOut1[1], 18);

        // Get prices from DEX2
        const amountsOut2 = await dex2Router.getAmountsOut(amountIn, [tokenA, tokenB]);
        const price2 = formatUnits(amountsOut2[1], 18);

        const newOpportunities = [];

        // Compare prices and identify opportunities
        if (price1 !== price2) {
          const buyOnName = price1 < price2 ? 'DEX 1' : 'DEX 2';
          const sellOnName = price1 < price2 ? 'DEX 2' : 'DEX 1';
          const buyPrice = Math.min(price1, price2);
          const sellPrice = Math.max(price1, price2);
          const profit = sellPrice - buyPrice;
          const routerA = price1 < price2 ? dex1 : dex2; // Router to buy from
          const routerB = price1 < price2 ? dex2 : dex1; // Router to sell to

          newOpportunities.push({
            id: 1,
            tokenA,
            tokenB,
            buyOn: buyOnName,
            sellOn: sellOnName,
            routerA,
            routerB,
            buyPrice,
            sellPrice,
            profit: profit,
            potentialGain: `${((profit / buyPrice) * 100).toFixed(2)}%`,
            lastUpdated: new Date().toLocaleTimeString(),
          });
        }

        setOpportunities(newOpportunities);
        setError(null);
      } catch (err) {
        console.error("Error fetching opportunities:", err);
        setError("Failed to fetch arbitrage opportunities. See console for details.");
      } finally {
        setLoading(false);
      }
    };

    findOpportunities();
    const interval = setInterval(findOpportunities, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [networkConfig, arbitrageParams]);

  return { opportunities, loading, error };
};
