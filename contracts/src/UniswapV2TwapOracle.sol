// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IUniswapV2Factory} from "./interfaces/IUniswapV2Factory.sol";
import {IUniswapV2Pair} from "./interfaces/IUniswapV2Pair.sol";
import {UniswapV2Library} from "./libraries/UniswapV2Library.sol";

contract UniswapV2TwapOracle {
    uint32 public constant MIN_UPDATE_DELAY = 10; // 10 seconds

    struct PairData {
        address token0;
        uint32 blockTimestampLast;
        uint price0CumulativeLast;
        uint price1CumulativeLast;
    }

    // factory -> pair -> data
    mapping(address => mapping(address => PairData)) public pairData;

    constructor() {}

    function update(address factory, address tokenA, address tokenB) external {
        address pairAddress = UniswapV2Library.pairFor(factory, tokenA, tokenB);
        PairData storage pair = pairData[factory][pairAddress];

        // require that at least MIN_UPDATE_DELAY has passed since the last update
        require(block.timestamp - pair.blockTimestampLast >= MIN_UPDATE_DELAY, "Oracle: UPDATE_COOLDOWN");

        (uint price0Cumulative, uint price1Cumulative, uint32 blockTimestamp) =
            UniswapV2Library.currentCumulativePrices(pairAddress);
        
        // if the pair has been updated already in the same block, do nothing
        if (pair.blockTimestampLast == blockTimestamp) {
            return;
        }

        pair.price0CumulativeLast = price0Cumulative;
        pair.price1CumulativeLast = price1Cumulative;
        pair.blockTimestampLast = blockTimestamp;

        if (pair.token0 == address(0)) {
            pair.token0 = IUniswapV2Pair(pairAddress).token0();
        }
    }

    function consult(
        address factory,
        address tokenIn,
        uint amountIn,
        address tokenOut
    ) external view returns (uint amountOut) {
        address pairAddress = UniswapV2Library.pairFor(factory, tokenIn, tokenOut);
        PairData memory pair = pairData[factory][pairAddress];

        require(pair.blockTimestampLast != 0, "Oracle: PAIR_NOT_INITIALIZED");

        (uint price0Cumulative, uint price1Cumulative, ) = UniswapV2Library.currentCumulativePrices(pairAddress);
        uint32 timeElapsed = uint32(block.timestamp) - pair.blockTimestampLast;

        // ensure that there is a last observation and it's not in the same block
        require(timeElapsed > 0, "Oracle: NO_NEW_OBSERVATION");

        uint price0Average = (price0Cumulative - pair.price0CumulativeLast) / timeElapsed;
        uint price1Average = (price1Cumulative - pair.price1CumulativeLast) / timeElapsed;

        if (tokenIn == pair.token0) {
            amountOut = (amountIn * price0Average) / price1Average;
        } else {
            amountOut = (amountIn * price1Average) / price0Average;
        }
    }
}
