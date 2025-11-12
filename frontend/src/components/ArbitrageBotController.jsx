
import React, { useState, useEffect } from 'react';

// This is the status component for the automated arbitrage bot.
// It replaces the old controller that dangerously asked for private keys.
const AutomatedBotStatus = () => {
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [statusColor, setStatusColor] = useState('gray');

  useEffect(() => {
    // Fetch the status of the backend server to let the user know it's online.
    const fetchStatus = async () => {
      try {
        // The /api/status endpoint is proxied by Netlify to the Render backend.
        const response = await fetch('/api/status');
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        const data = await response.json();

        if (data.status === 'ok') {
          setBackendStatus('Online');
          setStatusColor('green');
        } else {
          setBackendStatus('Error');
          setStatusColor('red');
        }
      } catch (error) {
        console.error('Failed to fetch backend status:', error);
        setBackendStatus('Offline');
        setStatusColor('red');
      }
    };

    fetchStatus();
  }, []);

  return (
    <div className="arbitrage-bot-controller-centered">
      <div className="bot-container" style={{ textAlign: 'center' }}>
        <div className="controller-header">
          <h3>Automated Arbitrage Bot</h3>
        </div>

        <div className="status-section">
          <p>The automated arbitrage bot runs 24/7 on our secure backend server.</p>
          <p>You do not need to start, stop, or configure anything here.</p>
        </div>

        <div className="status-indicator">
          <h4>Backend Server Status: 
            <span style={{ color: statusColor, marginLeft: '10px' }}>
              {backendStatus}
            </span>
          </h4>
        </div>

        <div className="log-info">
          <p>
            All trading activity and profit reports are logged securely on the server.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutomatedBotStatus;
