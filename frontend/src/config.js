
// API Configuration
// =================
// This file centralizes the API endpoints for the application.
// By defining them here, we can easily update them for different environments
// (e.g., local development, staging, production) without changing the component code.

const API_BASE_URL = 'https://arbitrage-app1.fly.dev';

export const GET_ARBITRAGE_OPPORTUNITIES_URL = `${API_BASE_URL}/api/trade-history`;
export const EXECUTE_ARBITRAGE_URL = `${API_BASE_URL}/api/execute-trade`;
