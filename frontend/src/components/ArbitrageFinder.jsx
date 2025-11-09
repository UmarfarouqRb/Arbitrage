import { useState, useCallback } from 'react';
import TradeExecutor from './TradeExecutor';

const ArbitrageFinder = () => {
  const [opportunity, setOpportunity] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleFindOpportunities = useCallback((data) => {
    // For now, we'll just simulate finding an opportunity.
    // In a real application, you would have a more complex logic here
    // to calculate the potential profit and other details.
    const simulatedOpportunity = {
      ...data,
      profit: '0.5 ETH', // This is just a placeholder
    };
    setOpportunity(simulatedOpportunity);
  }, []);

  const handleExecuteTrade = async () => {
    if (opportunity) {
      setIsExecuting(true);
      try {
        const response = await fetch('/.netlify/functions/execute-trade', {
          method: 'POST',
          body: JSON.stringify(opportunity),
        });

        const result = await response.json();

        if (response.ok) {
          alert('Trade executed successfully!');
          console.log('Trade execution result:', result);
        } else {
          alert(`Error executing trade: ${result.error}`);
          console.error('Trade execution error:', result);
        }
      } catch (error) {
        alert('An unexpected error occurred while executing the trade.');
        console.error('Unexpected trade execution error:', error);
      } finally {
        setIsExecuting(false);
      }
    }
  };

  return (
    <div>
      <TradeExecutor onFindOpportunities={handleFindOpportunities} />
      {opportunity && (
        <div className="opportunity-container">
          <h3>Opportunity Found!</h3>
          <p>Token A: {opportunity.tokenA}</p>
          <p>Token B: {opportunity.tokenB}</p>
          <p>DEX 1: {opportunity.dex1}</p>
          <p>DEX 2: {opportunity.dex2}</p>
          <p>Estimated Profit: {opportunity.profit}</p>
          <button onClick={handleExecuteTrade} className="button-primary" disabled={isExecuting}>
            {isExecuting ? 'Executing...' : 'Execute Trade'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ArbitrageFinder;
