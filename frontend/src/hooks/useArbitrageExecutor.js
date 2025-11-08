import { useContext, useState } from 'react';
import { Contract, formatEther, parseUnits } from 'ethers';
import { usePrivy } from '@privy-io/react-auth';
import { NetworkContext } from '../contexts/NetworkContext';
import { arbitrageBalancerABI } from '../utils/abi';

export const useArbitrageExecutor = () => {
  const { user } = usePrivy();
  const { networkConfig } = useContext(NetworkContext);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState(null);

  const estimateGas = async (opportunity, amount) => {
    if (!user || !networkConfig) {
      return null;
    }

    try {
      const provider = await user.wallet.getEthersProvider();
      const arbitrageBalancer = new Contract(networkConfig.arbitrageBalancerAddress, arbitrageBalancerABI, provider);
      const amountInWei = parseUnits(amount, 18);

      const gasEstimate = await arbitrageBalancer.estimateGas.arbitrage(
        opportunity.tokenA,
        opportunity.tokenB,
        amountInWei,
        opportunity.routerA,
        opportunity.routerB
      );

      const gasPrice = await provider.getGasPrice();
      const gasCost = gasEstimate.mul(gasPrice);
      return formatEther(gasCost);
    } catch (err) {
      console.error("Error estimating gas:", err);
      return null;
    }
  };

  const executeTrade = async (opportunity, amount) => {
    if (!user || !networkConfig) {
      setError("User not authenticated or network not configured.");
      return;
    }

    setIsExecuting(true);
    setError(null);

    try {
      const provider = await user.wallet.getEthersProvider();
      const signer = provider.getSigner();
      const arbitrageBalancer = new Contract(networkConfig.arbitrageBalancerAddress, arbitrageBalancerABI, signer);

      const amountInWei = parseUnits(amount, 18);

      const tx = await arbitrageBalancer.arbitrage(
        opportunity.tokenA,
        opportunity.tokenB,
        amountInWei,
        opportunity.routerA,
        opportunity.routerB
      );

      await tx.wait();
      console.log("Arbitrage executed successfully!");
    } catch (err) {
      console.error("Error executing arbitrage:", err);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setIsExecuting(false);
    }
  };

  return { executeTrade, isExecuting, error, estimateGas };
};
