import React from 'react';
import ConnectWallet from './ConnectWallet';

const Welcome = ({ network }) => {
    return (
        <div style={{ textAlign: 'center', marginTop: '10rem' }}>
            <h1>Welcome to the Arbitrage DEX</h1>
            <p>Please connect your wallet to continue.</p>
            <ConnectWallet network={network} />
        </div>
    );
};

export default Welcome;
