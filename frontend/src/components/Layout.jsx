import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { NetworkContext } from '../contexts/NetworkContext';
import { networks } from '../utils/networks';
import './Layout.css';

export default function Layout({ children, isOwner }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { selectedNetwork, setSelectedNetwork } = useContext(NetworkContext);

  const handleNetworkChange = (e) => {
    setSelectedNetwork(e.target.value);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1><Link to="/">Arbitrage Finder</Link></h1>
        <div className="header-controls">
          {isOwner && <Link to="/owner" className="nav-link">Owner</Link>}
          <select value={selectedNetwork} onChange={handleNetworkChange} className="network-select">
            {Object.keys(networks).map(networkKey => (
              <option key={networkKey} value={networkKey}>
                {networks[networkKey].name}
              </option>
            ))}
          </select>
          {ready && (authenticated ? (
            <button onClick={logout} className="button-secondary">Logout</button>
          ) : (
            <button onClick={login} className="button-primary">Login</button>
          ))}
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>
      <footer className="app-footer">
        <p>powered by forge inc</p>
      </footer>
    </div>
  );
}
