import React, { useEffect, useState, useCallback } from 'react';
import { useActiveAccount } from "thirdweb/react";
import NetworkToggle from './components/NetworkToggle';
import ArbitrageFinder from './components/ArbitrageFinder';
import Profits from './components/Profits';
import TradeAmountInput from './components/TradeAmountInput';
import TransactionStatus from './components/TransactionStatus';
import TradeHistory from './components/TradeHistory';
import Welcome from './components/Welcome';
import { ethers } from 'ethers';

// This is a custom provider that sends RPC requests to our Netlify function proxy.
class ProxiedRpcProvider extends ethers.JsonRpcProvider {
  constructor(network) {
    // The URL here is your proxy endpoint.
    super('/netlify/functions/rpc-proxy', undefined, {
        staticNetwork: true
    });
    this.proxyNetwork = network;
  }

  async _send(payload) {
    // This method intercepts the JSON-RPC payload and wraps it for our proxy.
    const proxyPayload = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: this.proxyNetwork, // Pass the target network to the proxy
        ...payload, // Spread the original ethers.js payload
      }),
    };

    const response = await fetch(this.connection.url, proxyPayload);
    const data = await response.json();

    if (!response.ok) {
        // Create a structured error
        const error = new Error(data.error || 'Proxy request failed');
        error.response = response;
        error.data = data;
        throw error;
    }

    // ethers expects an array of results for batch requests, even if we sent one
    return [data];
  }
}


const getContractAddr = (net) => {
  // Since the contract is not deployed, we will return null
  return null;
};

const getWethAddr = (net) => {
    if (net === 'Base Mainnet' || net === 'Base Sepolia') return '0x4200000000000000000000000000000000000006'; // WETH on Base
    return null;
}

const erc20Abi = [
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)'
];

const uniswapV2RouterAbi = [
    'function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)'
];

const arbitrageBalancerAbi = [
    'function startFlashloan(address token, uint256 amount, bytes calldata userData) external',
    'event FlashLoanExecuted(address indexed token, uint256 loanAmount, int256 netProfit)'
];

export default function App(){
  const account = useActiveAccount();
  const [network, setNetwork] = useState(localStorage.getItem('network') || 'Base Sepolia');
  // Separate provider for read-only operations via our proxy
  const [readProvider, setReadProvider] = useState(() => new ProxiedRpcProvider(network));
  const [contractAddr, setContractAddr] = useState(getContractAddr(network));
  const [tokenAddress, setTokenAddress] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [inputDex, setInputDex] = useState('Uniswap');
  const [outputDex, setOutputDex] = useState('Sushiswap');
  const [inputPrice, setInputPrice] = useState(null);
  const [outputPrice, setOutputPrice] = useState(null);
  const [profit, setProfit] = useState(null);
  const [tradeAmount, setTradeAmount] = useState('');
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [trades, setTrades] = useState([]);
  const [signer, setSigner] = useState(null);

  // Effect for handling network changes
  useEffect(()=> {
    // Create a new read-only provider when the network changes
    setReadProvider(new ProxiedRpcProvider(network));
    setContractAddr(getContractAddr(network));
    localStorage.setItem('network', network);

    // Also update the signer from the browser wallet
    if (window.ethereum) {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        web3Provider.getSigner().then(setSigner);
    }
  }, [network]);

  // Effect for fetching token info using the read-only provider
  useEffect(() => {
    const fetchTokenInfo = async () => {
        if (ethers.isAddress(tokenAddress) && readProvider) {
            try {
                const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, readProvider);
                const symbol = await tokenContract.symbol();
                const decimals = await tokenContract.decimals();
                setTokenSymbol(symbol);
                setTokenDecimals(decimals);
            } catch (error) {
                console.error("Error fetching token info:", error);
                setTokenSymbol('');
                setTokenDecimals(18);
            }
        }
    };

    fetchTokenInfo();
  }, [tokenAddress, readProvider]);

  const handleNetworkChange = (newNetwork) => {
    setNetwork(newNetwork);
  };
  
  const handlePriceCheck = useCallback(async () => {
    if (!contractAddr || !ethers.isAddress(tokenAddress)) {
      alert('The arbitrage contract is not deployed yet. This feature is disabled.');
      return;
    }

    const wethAddr = getWethAddr(network);
    if (!wethAddr) {
        alert('WETH not available on this network.');
        return;
    }

    const arbitrageContract = new ethers.Contract(contractAddr, ['function getDexRouter(string) view returns (address)'], readProvider);
    const amountIn = ethers.parseUnits('1', tokenDecimals);
    const path = [tokenAddress, wethAddr];

    try {
        const routers = await Promise.all([
            arbitrageContract.getDexRouter(inputDex),
            arbitrageContract.getDexRouter(outputDex)
        ]);

        const prices = await Promise.all(routers.map(routerAddress => {
            const routerContract = new ethers.Contract(routerAddress, uniswapV2RouterAbi, readProvider);
            return routerContract.getAmountsOut(amountIn, path);
        }));

        const inputPrice = ethers.formatEther(prices[0][1]);
        const outputPrice = ethers.formatEther(prices[1][1]);

        setInputPrice(inputPrice);
        setOutputPrice(outputPrice);
        setProfit(outputPrice - inputPrice);

    } catch (error) {
        console.error("Error during price check:", error);
        alert("Failed to fetch prices from the DEX routers. Check console for details.");
    }
  }, [contractAddr, tokenAddress, tokenDecimals, inputDex, outputDex, readProvider, network]);

  const handleArbitrage = async () => {
    if (!contractAddr || !signer || !tradeAmount || !profit) {
        alert("The arbitrage contract is not deployed yet. This feature is disabled.");
        return;
    }

    setTransactionStatus('pending');

    try {
        // Write operations require the signer
        const arbitrageContract = new ethers.Contract(contractAddr, arbitrageBalancerAbi, signer);
        const wethAddr = getWethAddr(network);
        const amountIn = ethers.parseUnits(tradeAmount, tokenDecimals);

        // Read operations can still use the readProvider
        const arbitrageContractForRouters = new ethers.Contract(contractAddr, ['function getDexRouter(string) view returns (address)'], readProvider);
        const router1 = await arbitrageContractForRouters.getDexRouter(inputDex);
        const router2 = await arbitrageContractForRouters.getDexRouter(outputDex);
        
        const deadline = Math.floor(Date.now() / 1000) + 60 * 5; // 5 minutes from now
        
        const userData = ethers.AbiCoder.defaultAbiCoder().encode(
            ['address', 'address', 'address', 'address', 'uint256'],
            [router1, router2, tokenAddress, wethAddr, deadline]
        );

        const tx = await arbitrageContract.startFlashloan(tokenAddress, amountIn, userData);
        const receipt = await tx.wait();

        const executedEvent = receipt.logs.map(log => arbitrageContract.interface.parseLog(log)).find(event => event.name === 'FlashLoanExecuted');

        if(executedEvent){
            const netProfit = executedEvent.args.netProfit;
            const newTrade = {
                inputToken: tokenSymbol,
                outputToken: tokenSymbol,
                inputAmount: tradeAmount,
                outputAmount: ethers.formatUnits(amountIn + netProfit, tokenDecimals),
                profit: ethers.formatUnits(netProfit, tokenDecimals),
                status: 'success'
            };
            setTrades([...trades, newTrade]);
            setTransactionStatus('success');
        } else {
            throw new Error("FlashLoanExecuted event not found.");
        }
    } catch (error) {
        console.error("Error during arbitrage execution:", error);
        setTransactionStatus('failed');
    }
  };

  if (!account) {
    return <Welcome network={network} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Arbitrage App</h1>
        <NetworkToggle network={network} onNetworkChange={handleNetworkChange} />
      </header>
      <div className="main-content">
          <div className="finder-container">
            <ArbitrageFinder 
                tokenAddress={tokenAddress}
                setTokenAddress={setTokenAddress}
                inputDex={inputDex}
                setInputDex={setInputDex}
                outputDex={outputDex}
                setOutputDex={setOutputDex}
                tokenSymbol={tokenSymbol}
            />
            <TradeAmountInput tradeAmount={tradeAmount} setTradeAmount={setTradeAmount} />
          </div>
          {(inputPrice !== null && outputPrice !== null && profit !== null) &&
            <Profits inputPrice={inputPrice} outputPrice={outputPrice} profit={profit} />
          }
          <div className="actions">
            <button onClick={handlePriceCheck} className="btn btn-secondary">
              Check Price
            </button>
            <button onClick={handleArbitrage} disabled={!tradeAmount || !profit} className="btn btn-primary">
              Execute Trade
            </button>
          </div>
          <TransactionStatus status={transactionStatus} />
          <TradeHistory trades={trades} />
      </div>
      <div className="debug-info">
          <p>Connected network: <strong>{network}</strong></p>
          <p>Contract: {contractAddr || 'N/A'}</p>
          <button onClick={async ()=> {
              try{
                const block = await readProvider.getBlockNumber();
                alert('RPC OK - block: '+block);
              }catch(e){
                alert('RPC error: '+e.message);
              }
            }} className="btn btn-secondary">
                Test RPC
          </button>
      </div>
    </div>
  );
}
