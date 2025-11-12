
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// --- Network Configuration ---
const NETWORKS = {
    base: {
        chainId: 8453, // Base Mainnet Chain ID
        rpcUrl: `https://base-mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
        explorerUrl: 'https://basescan.org',
    }
};

// --- Token Configuration ---
const TOKENS = {
    base: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        OP: '0x4200000000000000000000000000000000000042',
        DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
        DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed',
        AERO: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
        TOSHI: '0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4',
        CBETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
        SEAM: '0x1C7a460413dD4e964f96D8dFC56E7223cE88CD85',
        BALD: '0x27D2DECb47DDe3C93B22f8a4a511394315246851',
        TN100x: '0x553c2f73A4d3244AcA206893c5a89423b3658933',
        NORMIE: '0x7F12d13B34f5F4f0a9449c16Bcd42f0da47AF200',
        mfer: '0xE3e3D88a775f28b74a17A206103541b373562688',
        DOG: '0x593a1923153358c0352A23B44365E295a755c483',
        HIGHER: '0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe',
        Mochi: '0x4200000000000000000000000000000000000042',
        TYBG: '0x0d97F261b1e88845184f678e2d1e7a965450f342',
        SPEC: '0x335147D3A4425A82939A730d2dD19aA977e2F56b',
        BPS: '0x485083693213567A17a3A579a3979b625b1f33A5',
        UNI: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1'
    }
};

// --- DEX Configuration (Uniswap V2-compatible) ---
const DEX_ROUTERS = {
    base: {
        'SushiSwapV2': '0x8cde23bfcc333490347344f2A14a60C803275f4D',
        'BaseSwapV2': '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
        'AerodromeV2': '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
        'SynthswapV2': '0x00A35213a37d2C4a9424d5B6A8E192534a6F53C1',
        'ShezmuV2': '0x2649bB9582A55531d04139e36A1C4e04Af62f928'
    }
};

const DEX_FACTORIES = {
    base: {
        'SushiSwapV2': '0x42E928bB6327c2B328f2347386d2581d52865230',
        'BaseSwapV2': '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
        'AerodromeV2': '0x420DD3817f369d7A95c2d3534e676B34ce444444',
        'SynthswapV2': '0x21203494575ac39922265937471578345524628f',
        'ShezmuV2': '0x7b8AdfA933E034301a18B3f148440333d8bC961a'
    }
}

// --- Bot Configuration ---
const BOT_CONFIG = {
    ARBITRAGE_CONTRACT_ADDRESS: '0x7Af71A0700380Ffb51c1fB15c2cf71e6551630B2', // Your contract address
    PROFIT_THRESHOLD: '0.01', // Minimum profit in native token (e.g., ETH)
    GAS_PRICE_STRATEGY: 'fast', // 'standard', 'fast'
    GAS_LIMIT: 800000,
    SLIPPAGE_TOLERANCE: 50, // Slippage in basis points (50 = 0.5%)
    SCAN_INTERVAL: 600000,       // 10 minutes
    DYNAMIC_LOAN_PERCENTAGE: 5, // 5% of the pool's liquidity for the loan amount
};

module.exports = {
    NETWORKS,
    TOKENS,
    DEX_ROUTERS,
    DEX_FACTORIES,
    BOT_CONFIG,
    PRIVATE_KEY,
    INFURA_PROJECT_ID
};
