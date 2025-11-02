import React from 'react';

const TradeHistory = ({ trades }) => {
  if (!trades || trades.length === 0) {
    return null;
  }

  return (
    <div style={{width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px'}}>
        <h3>Trade History</h3>
        {trades.map((trade, index) => (
            <div key={index} style={{padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box'}}>
                <p>Input: {trade.inputAmount} {trade.inputToken}</p>
                <p>Output: {trade.outputAmount} {trade.outputToken}</p>
                <p>Profit: {trade.profit}</p>
                <p>Status: {trade.status}</p>
            </div>
        ))}
    </div>
  );
};

export default TradeHistory;
