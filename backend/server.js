
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { fork } = require('child_process');
const { simulateTrade } = require('./simulate-manual-trade');
const { executeTrade } = require('./execute-manual-trade');

const app = express();
const port = process.env.PORT || 3001;
const TRADE_HISTORY_FILE = path.join(__dirname, 'trade_history.json');

app.use(cors());
app.use(express.json());

// --- Start the Arbitrage Bot ---
if (process.env.NODE_ENV === 'production') {
    console.log('Starting arbitrage bot in production mode...');
    const botProcess = fork(path.join(__dirname, 'bot.js'));
    botProcess.on('exit', (code) => {
        console.error(`Arbitrage bot exited with code ${code}. Restarting...`);
        // Optional: Implement a more robust restarting mechanism if needed
        fork(path.join(__dirname, 'bot.js'));
    });
} else {
    console.log('Skipping bot startup in development mode.');
}

// Basic status endpoint
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// Endpoint to get trade history
app.get('/api/trade-history', async (req, res) => {
    try {
        const data = await fs.readFile(TRADE_HISTORY_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') {
            // If the file doesn't exist, return an empty array, as no trades have happened yet.
            return res.json([]);
        }
        console.error('Error reading trade history:', error);
        res.status(500).json({ message: 'Failed to read trade history.' });
    }
});

// Endpoint to simulate a manual trade
app.post('/api/simulate-trade', async (req, res) => {
    try {
        const tradeParams = req.body;
        console.log("Simulating trade with params:", tradeParams);
        const result = await simulateTrade(tradeParams);
        res.json(result);
    } catch (error) {
        console.error('Simulation Error:', error);
        res.status(500).json({ message: error.message || 'An unexpected error occurred during simulation.' });
    }
});

// Endpoint to execute a manual trade
app.post('/api/execute-trade', async (req, res) => {
    try {
        const tradeParams = req.body;
        console.log("Executing trade with params:", tradeParams);

        // --- Security Enhancement: Re-simulate before execution ---
        const simulationResult = await simulateTrade(tradeParams);
        if (!simulationResult.isProfitable) {
            console.warn(`[SECURITY] Blocked unprofitable manual trade. Estimated Profit: ${simulationResult.estimatedProfit}`);
            return res.status(400).json({ message: "Trade is not profitable. Execution aborted." });
        }

        const result = await executeTrade(tradeParams);
        res.json(result);
    } catch (error) {
        console.error('Execution Error:', error);
        res.status(500).json({ message: error.message || 'An unexpected error occurred during execution.' });
    }
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});
