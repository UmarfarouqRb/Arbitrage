
exports.handler = async function(event, context) {
  // Use public RPCs for Base networks
  const getRpcUrl = (network) => {
    if (network === 'Base Mainnet') return 'https://mainnet.base.org';
    if (network === 'Base Sepolia') return 'https://sepolia.base.org';
    return 'https://sepolia.base.org'; // Default fallback
  };

  try {
    const { network, method, params, id } = JSON.parse(event.body);
    const rpcUrl = getRpcUrl(network);

    const proxyRequest = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: id,
      }),
    };

    const response = await fetch(rpcUrl, proxyRequest);
    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error: ' + error.message })
    };
  }
};
