import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';

// Lazy load the components
const ArbitrageFinder = lazy(() => import('./components/ArbitrageFinder'));
const ArbitrageOpportunities = lazy(() => import('./components/ArbitrageOpportunities'));
const TradeHistory = lazy(() => import('./components/TradeHistory'));

export default function App() {
  const account = useActiveAccount();
  const address = account?.address;
  const activeChain = account?.chain;

  const [tokenAddress, setTokenAddress] = useState('');
  const [inputDex, setInputDex] = useState('');
  const [outputDex, setOutputDex] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navLinkStyle = ({ isActive }) => ({
    display: 'block',
    padding: '10px 15px',
    margin: '5px 0',
    borderRadius: '5px',
    textDecoration: 'none',
    color: isActive ? '#fff' : '#333',
    backgroundColor: isActive ? '#007bff' : 'transparent',
  });

  const handleCheckTrade = async () => {
    setLoading(true);
    try {
      setError(null);
      if (!tokenAddress || !inputDex || !outputDex) {
        throw new Error("Please fill in all fields before checking a trade.");
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert(`Checking trade for ${tokenSymbol || tokenAddress} between ${inputDex} and ${outputDex}`);
    } catch (err) {
      console.error('Error checking trade:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
        {/* Side Navigation */}
        <div style={{ width: '200px', backgroundColor: '#fff', padding: '20px', borderRight: '1px solid #ddd' }}>
          <img src="/logo.png" alt="Forge Inc. Logo" style={{ height: '50px', marginBottom: '20px' }} />
          <nav>
            <NavLink to="/" style={navLinkStyle}>Arbitrage Finder</NavLink>
            <NavLink to="/opportunities" style={navLinkStyle}>Opportunities</NavLink>
            <NavLink to="/history" style={navLinkStyle}>Trade History</NavLink>
          </nav>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '20px' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #ddd' }}>
            <div>
              {address && <p>Connected as: <strong>{address}</strong></p>}
              {activeChain && <p>Connected to: <strong>{activeChain.name}</strong></p>}
            </div>
            <ConnectButton />
          </header>

          {loading && <div style={{ textAlign: 'center', padding: '20px' }}><strong>Loading...</strong></div>}
          {error && (
            <div style={{ color: 'red', backgroundColor: '#ffdede', padding: '10px', borderRadius: '5px', margin: '20px 0' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          <Suspense fallback={<div style={{ textAlign: 'center', padding: '20px' }}><strong>Loading Page...</strong></div>}>
            <Routes>
              <Route path="/" element={
                <ArbitrageFinder 
                  tokenAddress={tokenAddress}
                  setTokenAddress={setTokenAddress}
                  inputDex={inputDex}
                  setInputDex={setInputDex}
                  outputDex={outputDex}
                  setOutputDex={setOutputDex}
                  onCheckTrade={handleCheckTrade}
                  tokenSymbol={tokenSymbol}
                  disabled={loading}
                />
              } />
              <Route path="/opportunities" element={<ArbitrageOpportunities tokenAddress={tokenAddress} />} />
              <Route path="/history" element={<TradeHistory />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </Router>
  );
}
