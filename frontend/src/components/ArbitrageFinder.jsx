import React from 'react';

const ArbitrageFinder = ({ tokenAddress, setTokenAddress, inputDex, setInputDex, outputDex, setOutputDex, tokenSymbol }) => {

  const handleTokenAddressChange = (e) => {
    setTokenAddress(e.target.value);
  };

  const handleInputDexChange = (e) => {
    setInputDex(e.target.value);
  };

  const handleOutputDexChange = (e) => {
    setOutputDex(e.target.value);
  };

  const dexOptions = [
    "Uniswap",
    "Sushiswap",
    "PancakeSwap",
    "QuickSwap",
    "Trader Joe",
    "Balancer",
    "Curve"
  ];

  return (
    <div style={{width: '100%', display: 'flex', flexDirection: 'column', gap: '10px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px', position: 'relative'}}>
            <input
                type="text"
                placeholder="Enter token contract address"
                value={tokenAddress}
                onChange={handleTokenAddressChange}
                style={{padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box'}}
            />
            {tokenSymbol && <span style={{fontWeight: 'bold', color: 'lime', position: 'absolute', right: '10px'}}>{tokenSymbol}</span>}
        </div>
      <select value={inputDex} onChange={handleInputDexChange} style={{padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '100%'}}>
        {dexOptions.map(dex => <option key={dex} value={dex}>{dex}</option>)}
      </select>
      <select value={outputDex} onChange={handleOutputDexChange} style={{padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '100%'}}>
        {dexOptions.map(dex => <option key={dex} value={dex}>{dex}</option>)}
      </select>
    </div>
  );
};

export default ArbitrageFinder;
