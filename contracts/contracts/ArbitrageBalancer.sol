// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IUniswapV2Router.sol";
// Directly import the concrete contract
import "./UniswapV2TwapOracle.sol";

interface IVault {
    function flashLoan(
        address recipient,
        address[] calldata tokens,
        uint256[] calldata amounts,
        bytes calldata userData
    ) external;
}

contract ArbitrageBalancer is ReentrancyGuard, Pausable {
    address public immutable owner;
    IVault public immutable vault;
    // Use the concrete contract type
    UniswapV2TwapOracle public immutable twapOracle;

    event FlashLoanExecuted(address indexed token, uint256 loanAmount, int256 netProfit);
    event ProfitWithdrawal(address indexed token, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(address _vault, address _twapOracle) {
        owner = msg.sender;
        vault = IVault(_vault);
        // Cast to the concrete contract type
        twapOracle = UniswapV2TwapOracle(_twapOracle);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function startFlashloan(
        address token,
        uint256 amount,
        bytes calldata userData
    ) external onlyOwner whenNotPaused {
        address[] memory tokens = new address[](1);
        tokens[0] = token;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        // Before executing the flash loan, we must update the oracle
        // to ensure we have a recent price observation.
        (address inputToken, address middleToken,,,,,) = abi.decode(
            userData,
            (address, address, address[], address[][], uint256, uint256, uint256)
        );
        twapOracle.update(inputToken, middleToken);

        vault.flashLoan(address(this), tokens, amounts, userData);
    }

    function receiveFlashLoan(
        address[] calldata tokens,
        uint256[] calldata amounts,
        uint256[] calldata feeAmounts,
        bytes calldata userData
    ) external nonReentrant {
        require(msg.sender == address(vault), "Only Balancer Vault can call this function");
        require(tokens.length == 1, "This contract only handles single-token flash loans");

        // Decode the updated userData, without twapDuration
        (
            address inputToken,
            address middleToken,
            address[] memory routers,
            address[][] memory paths,
            uint256 minProfit,
            uint256 minAmountOutFromFirstSwap,
            uint256 twapMaxDeviationBps
        ) = abi.decode(
            userData,
            (address, address, address[], address[][], uint256, uint256, uint256)
        );

        require(inputToken != address(0) && middleToken != address(0), "Invalid token address provided");
        require(routers.length == 2 && routers[0] != address(0) && routers[1] != address(0), "Invalid router configuration");
        require(paths.length == 2, "Invalid paths configuration");

        address loanToken = tokens[0];
        uint256 loanAmount = amounts[0];
        uint256 fee = feeAmounts[0];
        uint256 totalRepayment = loanAmount + fee;

        // On-chain price verification using TWAP oracle
        // The new oracle's consult function has a different signature
        uint256 twapAmountOut = twapOracle.consult(inputToken, loanAmount, middleToken);
        uint[] memory amountsFromRouter = IUniswapV2Router(routers[0]).getAmountsOut(loanAmount, paths[0]);
        uint256 spotAmountOut = amountsFromRouter[1];

        // The check remains logically the same, but uses the new variable names for clarity
        uint256 priceDifference = (spotAmountOut > twapAmountOut) ? spotAmountOut - twapAmountOut : twapAmountOut - spotAmountOut;
        require(priceDifference * 10000 / twapAmountOut <= twapMaxDeviationBps, "Price deviates too much from TWAP");

        // 1. First Swap with slippage protection
        IERC20(loanToken).approve(routers[0], loanAmount);
        uint[] memory amountsOut1 = IUniswapV2Router(routers[0]).swapExactTokensForTokens(
            loanAmount,
            minAmountOutFromFirstSwap, // Slippage protection
            paths[0],
            address(this),
            block.timestamp
        );

        // 2. Second Swap
        uint256 amountFromFirstSwap = amountsOut1[amountsOut1.length - 1];
        IERC20(middleToken).approve(routers[1], amountFromFirstSwap);

        uint256 minAmountOutForRepayment = totalRepayment + minProfit;

        uint[] memory amountsOut2 = IUniswapV2Router(routers[1]).swapExactTokensForTokens(
            amountFromFirstSwap,
            minAmountOutForRepayment,
            paths[1],
            address(this),
            block.timestamp
        );
        uint256 amountFromSecondSwap = amountsOut2[amountsOut2.length - 1];

        // 3. Repay Flash Loan
        require(amountFromSecondSwap >= totalRepayment, "Trade was not profitable after fees");

        IERC20(loanToken).transfer(address(vault), totalRepayment);

        // 4. Calculate and send profit to owner
        uint256 profit = amountFromSecondSwap - totalRepayment;
        if (profit > 0) {
            IERC20(loanToken).transfer(owner, profit);
        }

        emit FlashLoanExecuted(loanToken, loanAmount, int256(profit));
    }

    function withdraw(address tokenAddress) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            token.transfer(owner, balance);
            emit ProfitWithdrawal(tokenAddress, balance);
        }
    }
}
