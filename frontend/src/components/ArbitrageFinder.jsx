import React, { useState } from 'react';
import { ethers } from 'ethers';
import { usePrivy } from '@privy-io/react-auth';
import { ARBITRAGE_BALANCER_ADDRESS, arbitrageBalancerABI } from '../constants';

const ArbitrageFinder = () => {
  const { ready, authenticated, user, login } = usePrivy();
  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [amount, setAmount] = useState('');
  const [router1, setRouter1] = useState('');
  const [router2, setRouter2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tradeStatus, setTradeStatus] = useState(null);
  const [txHash, setTxHash] = useState('');

  const handleExecuteTrade = async () => {
    if (!ready || !authenticated) {
      login();
      return;
    }
    
    if (!tokenA || !tokenB || !amount || !router1 || !router2) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);
    setTradeStatus(null);
    setTxHash('');

    try {
      // Get an EIP-1193 provider from the user's wallet
      const provider = await user.wallet.getEthersProvider();
      // Get the signer
      const signer = provider.getSigner();

      const contract = new ethers.Contract(ARBITRAGE_BALANCER_ADDRESS, arbitrageBalancerABI, signer);
      
      const parsedAmount = ethers.parseUnits(amount, 18); // Assuming 18 decimals

      // Construct userData
      const path = [tokenA, tokenB];
      const routers = [router1, router2];
      const userData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address[]', 'address[]'],
        [path, routers]
      );

      setTradeStatus('Sending transaction...');
      
      const tx = await contract.startFlashloan(tokenA, parsedAmount, userData);
      
      setTradeStatus('Transaction sent. Waiting for confirmation...');
      setTxHash(tx.hash);

      await tx.wait();

      setTradeStatus('Trade executed successfully!');

    } catch (err) {
      console.error('Error executing trade:', err);
      setError(err.reason || err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Execute Arbitrage Trade</h2>
      <p style={styles.description}>
        This interface allows you to execute a flash loan arbitrage trade. You specify the token pair, the two DEX routers to trade on, and the amount to borrow.
      </p>

      {error && (
        <div style={styles.messageBoxError}>
          <strong>Error:</strong> {error}
        </div>
      )}
      {tradeStatus && (
        <div style={styles.messageBoxSuccess}>
          <strong>Status:</strong> {tradeStatus}
          {txHash && (
            <p style={{margin: '5px 0 0', wordBreak: 'break-all'}}>Tx Hash: {txHash}</p>
          )}
        </div>
      )}

      <div style={styles.inputGroup}>
        <input
          type="text"
          placeholder="Token A Address (to borrow)"
          value={tokenA}
          onChange={(e) => setTokenA(e.target.value)}
          style={styles.input}
          disabled={loading}
        />
        <input
          type="text"
          placeholder="Token B Address"
          value={tokenB}
          onChange={(e) => setTokenB(e.target.value)}
          style={styles.input}
          disabled={loading}
        />
      </div>
      <div style={styles.inputGroup}>
        <input
          type="text"
          placeholder="Router 1 Address (for Token A -> Token B)"
          value={router1}
          onChange={(e) => setRouter1(e.target.value)}
          style={styles.input}
          disabled={loading}
        />
        <input
          type="text"
          placeholder="Router 2 Address (for Token B -> Token A)"
          value={router2}
          onChange={(e) => setRouter2(e.target.value)}
          style={styles.input}
          disabled={loading}
        />
      </div>
      <input
        type="text"
        placeholder="Amount of Token A to borrow"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{...styles.input, ...styles.fullWidthInput}}
        disabled={loading}
      />
      
      <button onClick={handleExecuteTrade} style={styles.button} disabled={loading}>
        {loading ? 'Executing...' : 'Execute Flash Loan Trade'}
      </button>
    </div>
  );
};

const styles = {
    container: { padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', marginBottom: '40px', maxWidth: '600px', margin: 'auto' },
    header: { color: '#333', textAlign: 'center', marginBottom: '10px' },
    description: { color: '#666', textAlign: 'center', marginBottom: '25px', fontSize: '0.9em' },
    inputGroup: { display: 'flex', gap: '15px', marginBottom: '15px' },
    input: { width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' },
    fullWidthInput: { marginBottom: '20px' },
    button: { width: '100%', padding: '12px', fontSize: '18px', fontWeight: 'bold', color: '#fff', backgroundColor: '#007bff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    messageBoxError: { color: 'red', backgroundColor: '#ffeded', padding: '12px', borderRadius: '8px', margin: '20px 0' },
    messageBoxSuccess: { color: 'green', backgroundColor: '#e6ffed', padding: '12px', borderRadius: '8px', margin: '20px 0' },
};

export default ArbitrageFinder;
