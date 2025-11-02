import React from 'react';

const TransactionStatus = ({ status }) => {
  if (!status) {
    return null;
  }

  return (
    <div style={{width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px'}}>
      <div style={{padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box'}}>
        <p>Transaction Status: {status}</p>
      </div>
    </div>
  );
};

export default TransactionStatus;
