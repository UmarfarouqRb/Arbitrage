import { useState, useContext, useEffect } from 'react';
import { NetworkContext } from '../contexts/NetworkContext';
import { networks } from '../utils/networks';
import { tokens } from '../utils/tokens';

const TradeExecutor = ({ onFindOpportunities }) => {
  const { networkConfig } = useContext(NetworkContext);
  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [dex1, setDex1] = useState('');
  const [dex2, setDex2] = useState('');
  const [dexOptions, setDexOptions] = useState([]);
  const [tokenOptions, setTokenOptions] = useState([]);

  useEffect(() => {
    if (networkConfig && networkConfig.slug) {
      setDexOptions(networks[networkConfig.slug].dexRouters);
      const networkTokens = tokens[networkConfig.slug];
      if (networkTokens) {
        const symbols = Object.keys(networkTokens);
        setTokenOptions(symbols);
        if (symbols.length > 0) {
          setTokenA(networkTokens[symbols[0]]); // Default to the first token
        }
        if (networkTokens.WETH) {
          setTokenB(networkTokens.WETH); // Default Token B to WETH
        }
      }
    }
  }, [networkConfig]);

  const handleFind = () => {
    if (!tokenA || !tokenB || !dex1 || !dex2) {
      alert('Please fill in all fields.');
      return;
    }
    onFindOpportunities({ tokenA, tokenB, dex1, dex2 });
  };

  const handleTokenAChange = (e) => {
    const selectedTokenSymbol = e.target.value;
    if (networkConfig && tokens[networkConfig.slug]) {
      setTokenA(tokens[networkConfig.slug][selectedTokenSymbol]);
    }
  };

  // Find the symbol for the current tokenA address to set the dropdown value correctly
  const selectedTokenASymbol = networkConfig && tokens[networkConfig.slug] ? 
    Object.keys(tokens[networkConfig.slug]).find(key => tokens[networkConfig.slug][key] === tokenA) : '';


  return (
    <div className="arbitrage-finder-container">
      <h2>Find Arbitrage Opportunities</h2>
      <p>
        Select a token pair and two DEXs to compare prices and find arbitrage opportunities.
      </p>

      <div className="input-group">
        <select
          value={selectedTokenASymbol || ''}
          onChange={handleTokenAChange}
          className="select"
        >
          <option value="">Select Token A</option>
          {tokenOptions.map(symbol => (
            <option key={symbol} value={symbol}>{symbol}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Token B Address"
          value={tokenB}
          onChange={(e) => setTokenB(e.target.value)}
          className="input"
        />
      </div>
      <div className="input-group">
        <select
          value={dex1}
          onChange={(e) => setDex1(e.target.value)}
          className="select"
        >
          <option value="">Select DEX 1</option>
          {dexOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select
          value={dex2}
          onChange={(e) => setDex2(e.target.value)}
          className="select"
        >
          <option value="">Select DEX 2</option>
          {dexOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      
      <button onClick={handleFind} className="button-primary">
        Find Opportunities
      </button>
    </div>
  );
};

export default TradeExecutor;
