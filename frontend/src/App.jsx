import React, { useEffect, useState, useCallback } from 'react';
import NetworkToggle from './components/NetworkToggle';
import ConnectWallet from './components/ConnectWallet';
import ArbitrageFinder from './components/ArbitrageFinder';
import Profits from './components/Profits';
import TradeAmountInput from './components/TradeAmountInput';
import TransactionStatus from './components/TransactionStatus';
import TradeHistory from './components/TradeHistory';
import { ethers } from 'ethers';

const getRpc = (net) => {
  if (net === 'mainnet') return import.meta.env.VITE_BASE_MAINNET_RPC;
  if (net === 'sepolia') return import.meta.env.VITE_BASE_SEPOLIA_RPC;
  if (net === 'polygon') return 'https://polygon-rpc.com';
  if (net === 'arbitrum') return 'https://arb1.arbitrum.io/rpc';
  if (net === 'optimism') return 'https://mainnet.optimism.io';
  if (net === 'avalanche') return 'https://api.avax.network/ext/bc/C/rpc';
  return import.meta.env.VITE_BASE_SEPOLIA_RPC;
};

const getContractAddr = (net) => {
  if (net === 'mainnet') return import.meta.env.VITE_BASE_MAINNET_CONTRACT;
  if (net === 'sepolia') return import.meta.env.VITE_BASE_SEPOLIA_CONTRACT;
  return null;
};

const getWethAddr = (net) => {
    if (net === 'mainnet' || net === 'sepolia') return '0x4200000000000000000000000000000000000006'; // WETH on Base
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
  const [network, setNetwork] = useState(localStorage.getItem('network') || import.meta.env.VITE_DEFAULT_NETWORK || 'sepolia');
  const [provider, setProvider] = useState(null);
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

  useEffect(()=> {
    const rpc = getRpc(network);
    if (rpc) {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(web3Provider);
        web3Provider.getSigner().then(setSigner);
    }
    setContractAddr(getContractAddr(network));
    localStorage.setItem('network', network);
  }, [network]);

  useEffect(() => {
    const fetchTokenInfo = async () => {
        if (ethers.isAddress(tokenAddress) && provider) {
            try {
                const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
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
  }, [tokenAddress, provider]);

  const handleNetworkChange = (newNetwork) => {
    setNetwork(newNetwork);
  };
  
  const handlePriceCheck = useCallback(async () => {
    if (!contractAddr || !ethers.isAddress(tokenAddress)) {
      alert('Please enter a valid token address.');
      return;
    }

    const wethAddr = getWethAddr(network);
    if (!wethAddr) {
        alert('WETH not available on this network.');
        return;
    }

    const arbitrageContract = new ethers.Contract(contractAddr, ['function getDexRouter(string) view returns (address)'], provider);
    const amountIn = ethers.parseUnits('1', tokenDecimals);
    const path = [tokenAddress, wethAddr];

    try {
        const routers = await Promise.all([
            arbitrageContract.getDexRouter(inputDex),
            arbitrageContract.getDexRouter(outputDex)
        ]);

        const prices = await Promise.all(routers.map(routerAddress => {
            const routerContract = new ethers.Contract(routerAddress, uniswapV2RouterAbi, provider);
            return routerContract.getAmountsOut(amountIn, path);
        }));

        const inputPrice = ethers.formatEther(prices[0][1]);
        const outputPrice = ethers.formatEther(prices[1][1]);

        setInputPrice(inputPrice);
        setOutputPrice(outputPrice);
        setProfit(outputPrice - inputPrice);

    } catch (error) {
        console.error("Error during price check:", error);
        alert("Failed to fetch prices from the DEX routers.");
    }
  }, [contractAddr, tokenAddress, tokenDecimals, inputDex, outputDex, provider, network]);

  const handleArbitrage = async () => {
    if (!contractAddr || !signer || !tradeAmount || !profit) {
        alert("Please connect wallet, enter a trade amount, and check prices.");
        return;
    }

    setTransactionStatus('pending');

    try {
        const arbitrageContract = new ethers.Contract(contractAddr, arbitrageBalancerAbi, signer);
        const wethAddr = getWethAddr(network);
        const amountIn = ethers.parseUnits(tradeAmount, tokenDecimals);

        const arbitrageContractForRouters = new ethers.Contract(contractAddr, ['function getDexRouter(string) view returns (address)'], provider);
        const router1 = await arbitrageContractForRouters.getDexRouter(inputDex);
        const router2 = await arbitrageContractForRouters.getDexRouter(outputDex);
        
        const deadline = Math.floor(Date.now() / 1000) + 60 * 5; // 5 minutes from now
        const slippage = 0.01; // 1%
        const minAmountOut1 = ethers.parseUnits((parseFloat(tradeAmount) * (1 - slippage)).toString(), tokenDecimals);

        const userData = ethers.AbiCoder.defaultAbiCoder().encode(
            ['address', 'address', 'address', 'address', 'uint256', 'uint256'],
            [router1, router2, tokenAddress, wethAddr, minAmountOut1, deadline]
        );

        const tx = await arbitrageContract.startFlashloan(tokenAddress, amountIn, userData);
        const receipt = await tx.wait();

        const event = receipt.events.find(e => e.event === 'FlashLoanExecuted');
        const netProfit = event.args.netProfit;

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
    } catch (error) {
        console.error("Error during arbitrage execution:", error);
        setTransactionStatus('failed');
    }
  };

  return (
    <div style={{padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#00008b', color: 'white', minHeight: '100vh'}}>
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h1 style={{margin: 0}}>Arbitrage App</h1>
        <NetworkToggle network={network} onNetworkChange={handleNetworkChange} />
      </header>
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
          <ConnectWallet />
          <div style={{marginTop: '20px', width: '100%', maxWidth: '500px'}}>
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
          <div style={{marginTop: 'auto', paddingTop: '20px', display: 'flex', gap: '10px'}}>
            <button onClick={handlePriceCheck} style={{padding: '10px 20px', background: 'orange', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '16px'}}>
              Check Price
            </button>
            <button onClick={handleArbitrage} disabled={!tradeAmount || !profit} style={{padding: '10px 20px', background: 'green', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '16px'}}>
              Execute Trade
            </button>
          </div>
          <TransactionStatus status={transactionStatus} />
          <TradeHistory trades={trades} />
      </div>
      <div style={{position: 'fixed', bottom: 10, right: 10}}>
          <p>Connected network: <strong>{network}</strong></p>
          <p>RPC: {getRpc(network)}</p>
          <p>Contract: {contractAddr || 'N/A'}</p>
          <button onClick={async ()=> {
              try{
                const block = await provider.getBlockNumber();
                alert('RPC OK - block: '+block);
              }catch(e){
                alert('RPC error: '+e.message);
              }
            }} style={{padding: '8px', background: 'orange', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer'}}>
                Test RPC
          </button>
      </div>
    </div>
  );
}
