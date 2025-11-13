
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');
const { simulateTrade } = require('./simulate-manual-trade');
const { executeTrade } = require('./execute-manual-trade');

const app = express();
const port = process.env.PORT || 3001;
const TRADE_HISTORY_FILE = path.join(__dirname, 'trade_history.json');
const BOT_LOG_FILE = path.join(__dirname, 'bot.log');

// Create a writable stream for the bot's logs
const logStream = fs.createWriteStream(BOT_LOG_FILE, { flags: 'a' });

app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === 'production') {
    console.log('Starting arbitrage bot in production mode...');
    const botProcess = fork(path.join(__dirname, 'bot.js'), [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });

    // Redirect bot's stdout and stderr to the log file and the console
    botProcess.stdout.pipe(process.stdout);
    botProcess.stderr.pipe(process.stderr);
    botProcess.stdout.pipe(logStream);
    botProcess.stderr.pipe(logStream);

    botProcess.on('exit', (code) => {
        console.error(`Arbitrage bot exited with code ${code}. Restarting...`);
        // You might want to add a delay or a maximum restart count here
        fork(path.join(__dirname, 'bot.js'));
    });
} else {
    console.log('Skipping bot startup in development mode.');
}

app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

app.get('/api/logs', async (req, res) => {
    try {
        const data = await fs.promises.readFile(BOT_LOG_FILE, 'utf8');
        const lines = data.trim().split('\n');
        res.json(lines.slice(-100)); // Return last 100 lines
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.json(['Log file not created yet.']);
        }
        console.error('Error reading log file:', error);
        res.status(500).json({ message: 'Failed to read log file.' });
    }
});

app.get('/api/trade-history', async (req, res) => {
    try {
        const data = await fs.promises.readFile(TRADE_HISTORY_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.json([]);
        }
        console.error('Error reading trade history:', error);
        res.status(500).json({ message: 'Failed to read trade history.' });
    }
});

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

app.post('/api/execute-trade', async (req, res) => {
    try {
        const tradeParams = req.body;
        console.log("Executing trade with params:", tradeParams);

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
