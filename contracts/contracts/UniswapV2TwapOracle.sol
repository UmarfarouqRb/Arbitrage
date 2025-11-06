// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IUniswapV2Factory.sol";

library UniswapV2Library {
    // returns sorted token addresses, used to handle return values from pairs sorted in this order
    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, 'UniswapV2Library: IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }

    // calculates the CREATE2 address for a pair without making any external calls
    function pairFor(address factory, address tokenA, address tokenB) internal pure returns (address pair) {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        pair = address(uint160(uint(keccak256(abi.encodePacked(
                hex'ff',
                factory,
                keccak256(abi.encodePacked(token0, token1)),
                hex'96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f' // init code hash
            )))));
    }

    // fetches and sorts the reserves for a pair
    function getReserves(address factory, address tokenA, address tokenB) internal view returns (uint reserveA, uint reserveB) {
        (address token0,) = sortTokens(tokenA, tokenB);
        (uint reserve0, uint reserve1,) = IUniswapV2Pair(pairFor(factory, tokenA, tokenB)).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    // given some amount of an asset and pair reserves, returns an equivalent amount of the other asset
    function quote(uint amountA, uint reserveA, uint reserveB) internal pure returns (uint amountB) {
        require(amountA > 0, 'UniswapV2Library: INSUFFICIENT_AMOUNT');
        require(reserveA > 0 && reserveB > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        amountB = amountA * reserveB / reserveA;
    }
}

contract UniswapV2TwapOracle {

    address public immutable factory;
    
    // Period over which to measure the TWAP.
    uint24 public constant PERIOD = 10 minutes;

    struct Observation {
        uint32 blockTimestamp;
        uint price0Cumulative;
        uint price1Cumulative;
    }

    mapping(address => Observation) public pairObservations;

    constructor(address _factory) {
        factory = _factory;
    }

    // update the cumulative price for the observation at the current timestamp
    function update(address tokenA, address tokenB) external {
        address pair = UniswapV2Library.pairFor(factory, tokenA, tokenB);

        // get the cumulative prices
        (uint price0Cumulative, uint price1Cumulative) = 
            (IUniswapV2Pair(pair).price0CumulativeLast(), IUniswapV2Pair(pair).price1CumulativeLast());
        
        // get the last observation
        Observation storage lastObservation = pairObservations[pair];
        
        // if this is the first observation, we can't compute a TWAP, so just store the current values
        if (lastObservation.blockTimestamp == 0) {
            pairObservations[pair] = Observation({
                blockTimestamp: uint32(block.timestamp),
                price0Cumulative: price0Cumulative,
                price1Cumulative: price1Cumulative
            });
            return;
        }

        // if the observation is already up to date, there's nothing to do
        if (lastObservation.blockTimestamp == block.timestamp) {
            return;
        }

        // update the observation
        pairObservations[pair] = Observation({
            blockTimestamp: uint32(block.timestamp),
            price0Cumulative: price0Cumulative,
            price1Cumulative: price1Cumulative
        });
    }

    // consult the oracle for the TWAP of a pair
    function consult(address tokenIn, uint amountIn, address tokenOut) external view returns (uint amountOut) {
        address pair = UniswapV2Library.pairFor(factory, tokenIn, tokenOut);
        Observation memory lastObservation = pairObservations[pair];
        require(lastObservation.blockTimestamp != 0, "Oracle: NO_OBSERVATION");

        // get the current cumulative prices
        (uint price0Cumulative, uint price1Cumulative) = 
            (IUniswapV2Pair(pair).price0CumulativeLast(), IUniswapV2Pair(pair).price1CumulativeLast());

        // calculate the time elapsed since the last observation
        uint32 timeElapsed = uint32(block.timestamp) - lastObservation.blockTimestamp;
        require(timeElapsed >= PERIOD, "Oracle: NOT_ENOUGH_TIME_ELAPSED");

        // calculate the TWAP
        (address token0, ) = UniswapV2Library.sortTokens(tokenIn, tokenOut);
        uint priceCumulative;

        if (tokenIn == token0) {
            priceCumulative = price1Cumulative - lastObservation.price1Cumulative;
        } else {
            priceCumulative = price0Cumulative - lastObservation.price0Cumulative;
        }
        
        // The division by timeElapsed is the TWAP.
        // We can then multiply by the amountIn to get the amountOut.
        amountOut = (priceCumulative * amountIn) / timeElapsed;
    }
}
