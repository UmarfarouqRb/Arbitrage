import React, { useEffect, useState, useRef } from 'react';

const ArbitrageOpportunities = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tokenAddress, setTokenAddress] = useState('');
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const fetchAndRankOpportunities = async () => {
    if (!tokenAddress) {
      setOpportunities([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${tokenAddress}`);
      if (!response.ok) {
        throw new Error('API Error: Could not fetch arbitrage opportunities.');
      }
      const data = await response.json();

      if (data.pairs) {
        const pairsBySymbol = data.pairs.reduce((acc, pair) => {
          if (!pair.baseToken.symbol || !pair.quoteToken.symbol || !pair.priceNative) return acc;
          const key = `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(pair);
          return acc;
        }, {});

        const rankedOpportunities = Object.values(pairsBySymbol)
          .map(group => {
            if (group.length < 2) return null;

            let lowestPricePair = group[0];
            let highestPricePair = group[0];

            group.forEach(pair => {
              const price = parseFloat(pair.priceNative);
              if (price < parseFloat(lowestPricePair.priceNative)) lowestPricePair = pair;
              if (price > parseFloat(highestPricePair.priceNative)) highestPricePair = pair;
            });

            const minPrice = parseFloat(lowestPricePair.priceNative);
            const maxPrice = parseFloat(highestPricePair.priceNative);

            if (minPrice === 0) return null;

            const percentageDiff = ((maxPrice - minPrice) / minPrice) * 100;

            return {
              groupInfo: group[0],
              lowestPricePair,
              highestPricePair,
              percentageDiff,
            };
          })
          .filter(Boolean)
          .sort((a, b) => b.percentageDiff - a.percentageDiff);

        setOpportunities(rankedOpportunities.slice(0, 10));
        if (rankedOpportunities.length === 0) {
          setError('No significant arbitrage opportunities found for this token.');
        }
      }
    } catch (error) {
      console.error('Error fetching and ranking arbitrage opportunities:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      if(entries[0]) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });
    if(containerRef.current) {
      observer.observe(containerRef.current);
    }

    const handler = setTimeout(() => {
      fetchAndRankOpportunities();
    }, 500);

    return () => {
        clearTimeout(handler);
        if(containerRef.current) {
            observer.unobserve(containerRef.current);
        }
    };
  }, [tokenAddress]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Contract address copied to clipboard!');
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  };
  
  const isSmallScreen = containerWidth < 480;

  const styles = {
      container: { marginTop: '30px', padding: '15px', backgroundColor: '#f4f6f8', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
      header: { 
          color: '#2c3e50', 
          textAlign: 'center', 
          marginBottom: '20px',
          fontSize: isSmallScreen ? '1.2em' : '1.5em' 
      },
      searchContainer: { marginBottom: '20px', display: 'flex' },
      tokenInput: { flex: 1, padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' },
      grid: { 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '15px' 
      },
      card: { 
          backgroundColor: '#ffffff', 
          border: '1px solid #e1e5eb', 
          borderRadius: '8px', 
          padding: '12px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          fontSize: isSmallScreen ? '0.85em' : '1em'
      },
      cardHeader: { 
          marginTop: 0, 
          marginBottom: '8px', 
          color: '#34495e', 
          borderBottom: '1px solid #f0f0f0', 
          paddingBottom: '8px',
          fontSize: '1.1em'
      },
      tokenContract: { 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '12px', 
          fontSize: '0.7em',
          wordBreak: 'break-all'
      },
      copyButton: { 
          marginLeft: '8px', 
          padding: '3px 7px', 
          fontSize: '0.8em', 
          cursor: 'pointer', 
          border: '1px solid #bdc3c7', 
          borderRadius: '4px', 
          backgroundColor: '#f8f9fa'
      },
      opportunityDetails: { 
          paddingTop: '12px', 
          marginBottom: '12px' 
      },
      buyText: { color: '#27ae60', margin: '4px 0', fontSize: '0.95em' },
      sellText: { color: '#c0392b', margin: '4px 0', fontSize: '0.95em' },
      arbitrageInfo: { 
          backgroundColor: '#ecf0f1', 
          padding: '8px', 
          borderRadius: '4px', 
          fontSize: '0.9em', 
          textAlign: 'center', 
          marginTop: 'auto' 
      },
      error: {
          color: 'red',
          textAlign: 'center',
          padding: '20px'
      }
  };

  return (
    <div ref={containerRef} style={styles.container}>
      <h2 style={styles.header}>Top 10 Arbitrage Opportunities</h2>
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Enter token contract address to find opportunities"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          style={styles.tokenInput}
        />
      </div>
      {loading ? (
        <p style={{textAlign: 'center'}}>Finding the best opportunities...</p>
      ) : error ? (
        <p style={styles.error}>{error}</p>
      ) : opportunities.length > 0 ? (
        <div style={styles.grid}>
          {opportunities.map((opp, index) => (
            <div key={index} style={styles.card}>
              <h4 style={styles.cardHeader}>{opp.groupInfo.baseToken.symbol}/{opp.groupInfo.quoteToken.symbol}</h4>
              <div style={styles.tokenContract}>
                <span>{opp.groupInfo.baseToken.address}</span>
                <button onClick={() => copyToClipboard(opp.groupInfo.baseToken.address)} style={styles.copyButton}>Copy</button>
              </div>
              <div style={styles.opportunityDetails}>
                <p style={styles.buyText}><strong>Buy on {opp.lowestPricePair.dexId}:</strong> {parseFloat(opp.lowestPricePair.priceNative).toPrecision(5)}</p>
                <p style={styles.sellText}><strong>Sell on {opp.highestPricePair.dexId}:</strong> {parseFloat(opp.highestPricePair.priceNative).toPrecision(5)}</p>
              </div>
              <div style={styles.arbitrageInfo}>
                <p><strong>Potential Profit:</strong> {opp.percentageDiff.toFixed(2)}%</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{textAlign: 'center'}}>Enter a token address to find opportunities.</p>
      )}
    </div>
  );
};

export default ArbitrageOpportunities;
