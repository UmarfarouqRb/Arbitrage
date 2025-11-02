import React from 'react';

const Profits = ({ inputPrice, outputPrice, profit }) => {
  return (
    <div style={{width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px'}}>
      <div style={{padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box'}}>
        <p>Input DEX Price: {inputPrice}</p>
        <p>Output DEX Price: {outputPrice}</p>
        <p>Profit: {profit}</p>
      </div>
    </div>
  );
};

export default Profits;
