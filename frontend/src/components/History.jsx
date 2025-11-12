
import React, { useState, useEffect } from 'react';

const TradeHistory = () => {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/trade-history');
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setHistory(data);
        setError('');
      } catch (err) {
        console.error("Error fetching trade history:", err);
        setError('Could not load trade history. The backend may be offline or starting up.');
      }
      finally {
        setLoading(false);
      }
    };

    fetchHistory();

    const intervalId = setInterval(fetchHistory, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const renderStatus = (status) => {
    const statusClassName = status === 'Success' ? 'status-success' : 'status-failed';
    return <span className={statusClassName}>{status}</span>;
  };

  if (loading) {
      return <div className="loading-message">Loading history...</div>;
  }

  if (error) {
      return <div className="error-message">{error}</div>;
  }

  return (
    <div className="trade-history-container">
      <h3>Automated Bot Trade History</h3>
      <p>This table shows the latest trade attempts from the automated arbitrage bot. The data automatically refreshes every 30 seconds.</p>
      
      {history.length === 0 ? (
        <div className="empty-state">
          <h3>No Trades Yet</h3>
          <p>No trade history found. The bot may not have executed any trades yet.</p>
        </div>
      ) : (
        <div className="table-responsive">
            <table>
                <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Status</th>
                    <th>Pair</th>
                    <th>Route</th>
                    <th>Details</th>
                </tr>
                </thead>
                <tbody>
                {history.map((trade, index) => (
                    <tr key={index}>
                    <td>{new Date(trade.timestamp).toLocaleString()}</td>
                    <td>{renderStatus(trade.status)}</td>
                    <td>{trade.pair}</td>
                    <td>{trade.route}</td>
                    <td>
                        {trade.status === 'Success' ? (
                        `Profit: ${trade.actualProfit}`
                        ) : (
                        `Error: ${trade.error || 'N/A'}`
                        )}
                        <br/>
                        <small>Loan: {trade.loanAmount}</small>
                        {trade.txHash && <><br/><a href={`https://basescan.org/tx/${trade.txHash}`} target="_blank" rel="noopener noreferrer">View Tx</a></>}
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
};

export default TradeHistory;
