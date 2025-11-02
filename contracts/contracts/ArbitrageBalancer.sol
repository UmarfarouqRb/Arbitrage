// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IVault {
    function flashLoan(
        address recipient,
        address[] calldata tokens,
        uint256[] calldata amounts,
        bytes calldata userData
    ) external;
}

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

contract ArbitrageBalancer is ReentrancyGuard {
    using SafeERC20 for IERC20;
    address public immutable owner;
    IVault public immutable vault;

    event FlashLoanExecuted(address indexed token, uint256 loanAmount, int256 netProfit);

    modifier onlyOwner() { require(msg.sender == owner, "only owner"); _; }

    constructor(address _vault) {
        owner = msg.sender;
        vault = IVault(_vault);
    }

    function startFlashloan(address token, uint256 amount, bytes calldata userData) external onlyOwner {
        address[] memory tokens = new address[](1);
        tokens[0] = token;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        vault.flashLoan(address(this), tokens, amounts, userData);
    }

    // This is the function called by the Vault contract
    function receiveFlashLoan(
        address[] calldata tokens,
        uint256[] calldata amounts,
        uint256[] calldata feeAmounts,
        bytes calldata userData
    ) external nonReentrant {
        require(msg.sender == address(vault), "only vault");
        require(tokens.length == 1, "only single token flash loans");

        (
            address router1,
            address router2,
            address token1,
            address token2,
            uint256 minAmountOut1,
            uint256 deadline
        ) = abi.decode(userData, (address, address, address, address, uint256, uint256));

        require(block.timestamp <= deadline, "Deadline has passed");

        address loanToken = tokens[0];
        uint256 loanAmount = amounts[0];
        uint256 fee = feeAmounts[0];
        uint256 totalRepayment = loanAmount + fee;

        // 1. First Swap
        IERC20(loanToken).safeApprove(router1, loanAmount);
        address[] memory path1 = new address[](2);
        path1[0] = token1;
        path1[1] = token2;
        uint[] memory amountsOut1 = IUniswapV2Router(router1).swapExactTokensForTokens(
            loanAmount,
            minAmountOut1,
            path1,
            address(this),
            deadline
        );

        // 2. Second Swap
        uint amountFromFirstSwap = amountsOut1[1];
        IERC20(token2).safeApprove(router2, amountFromFirstSwap);
        address[] memory path2 = new address[](2);
        path2[0] = token2;
        path2[1] = token1;
        
        // For the second swap, the minimum output must be enough to repay the loan + fee
        uint[] memory amountsOut2 = IUniswapV2Router(router2).swapExactTokensForTokens(
            amountFromFirstSwap,
            totalRepayment,
            path2,
            address(this),
            deadline
        );
        uint amountFromSecondSwap = amountsOut2[1];

        // 3. Repay Flash Loan
        require(amountFromSecondSwap >= totalRepayment, "Not profitable");

        IERC20(loanToken).safeTransfer(address(vault), totalRepayment);

        // 4. Calculate profit
        int256 netProfit = int256(amountFromSecondSwap - totalRepayment);

        emit FlashLoanExecuted(loanToken, loanAmount, netProfit);
    }
    
    function withdraw(address tokenAddress) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            token.safeTransfer(owner, balance);
        }
    }
}
