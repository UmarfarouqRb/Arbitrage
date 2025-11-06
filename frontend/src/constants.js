export const arbitrageBalancerABI = [
    "constructor(address,address)",
    "event FlashLoanExecuted(address indexed,uint256,int256)",
    "event ProfitWithdrawal(address indexed,uint256)",
    "function owner() view returns (address)",
    "function pause()",
    "function paused() view returns (bool)",
    "function receiveFlashLoan(address[],uint256[],uint256[],bytes)",
    "function startFlashloan(address,uint256,bytes)",
    "function twapOracle() view returns (address)",
    "function unpause()",
    "function vault() view returns (address)",
    "function withdraw(address)"
];
