import React from 'react';

const networks = ['Base Mainnet', 'Base Sepolia'];

export default function NetworkToggle({ network, onNetworkChange }) {
  return (
    <select value={network} onChange={(e) => onNetworkChange(e.target.value)} className="network-toggle">
      {networks.map(net => (
        <option key={net} value={net}>{net}</option>
      ))}
    </select>
  );
}
