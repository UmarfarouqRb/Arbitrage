import React from 'react';

const networks = ['mainnet', 'sepolia', 'polygon', 'arbitrum', 'optimism', 'avalanche'];

export default function NetworkToggle({ network, onNetworkChange }) {
  return (
    <select value={network} onChange={(e) => onNetworkChange(e.target.value)} style={{padding:8, background:'#0366d6', color:'#fff', borderRadius:6}}>
      {networks.map(net => (
        <option key={net} value={net}>{net.charAt(0).toUpperCase() + net.slice(1)}</option>
      ))}
    </select>
  );
}
