import React, { useState, useEffect } from 'react';

const ArbitrageOpportunities = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true); // Add loading state
  const [error, setError] = useState(null); // Add error state
  const [investment, setInvestment] = useState({});

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        const response = await fetch('/.netlify/functions/get-arbitrage-opportunities');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setOpportunities(data.opportunities || []);
      } catch (e) {
        console.error("Failed to fetch opportunities:", e);
        setError("Failed to load opportunities. The service may be temporarily unavailable. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunities();
    const interval = setInterval(fetchOpportunities, 60000); // Refreshes every 60 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  const handleInvestmentChange = (id, value) => {
    setInvestment(prev => ({ ...prev, [id]: value }));
  };

  if (loading) {
    return <div className="text-center"><h2>Loading Opportunities...</h2></div>;
  }

  if (error) {
    return <div className="text-center text-danger"><h2>Error</h2><p>{error}</p></div>;
  }

  return (
    <div className="arbitrage-opportunities-container">
      <h2>Arbitrage Opportunities</h2>
      {opportunities.length > 0 ? (
        <table className="opportunities-table">
          <thead>
            <tr>
              <th>Path</th>
              <th>Estimated Profit</th>
              <th>DEXs</th>
              <th>Investment</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map(op => {
              const currentInvestment = investment[op.id] || '1.0';
              const estimatedReturn = (parseFloat(op.profit) * parseFloat(currentInvestment)).toFixed(5);

              return (
                <tr key={op.id}>
                  <td data-label="Path">{op.path.join(' -> ')}</td>
                  <td data-label="Est. Profit" className={op.profit > 0 ? 'text-success' : 'text-danger'}>
                    {`${(op.profit * 100).toFixed(3)}%`}
                  </td>
                  <td data-label="DEXs">{op.dexs.join(', ')}</td>
                  <td data-label="Investment">
                    <input 
                      type="number" 
                      value={currentInvestment} 
                      onChange={e => handleInvestmentChange(op.id, e.target.value)} 
                      min="0.1"
                    />
                    <span> Est. Return: {estimatedReturn}</span>
                  </td>
                  <td data-label="Action"><button className="action-button">Execute</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-center">No arbitrage opportunities found at the moment.</p>
      )}
    </div>
  );
};

export default ArbitrageOpportunities;
