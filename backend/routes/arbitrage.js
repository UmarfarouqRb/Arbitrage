const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/opportunities', async (req, res) => {
  try {
    // I'll replace this with the actual DEX Screener API call
    const response = await axios.get('https://api.dexscreener.com/latest/dex/pairs/base/weth-usdc'); 
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching arbitrage opportunities' });
  }
});

module.exports = router;
