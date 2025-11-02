import React from 'react';

const TradeAmountInput = ({ tradeAmount, setTradeAmount }) => {

  const handleTradeAmountChange = (e) => {
    setTradeAmount(e.target.value);
  };

  return (
    <div style={{width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px'}}>
      <input
        type="number"
        placeholder="Enter trade amount"
        value={tradeAmount}
        onChange={handleTradeAmountChange}
        style={{padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box'}}
      />
    </div>
  );
};

export default TradeAmountInput;
