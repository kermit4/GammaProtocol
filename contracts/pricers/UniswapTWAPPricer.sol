// SPDX-License-Identifier: UNLICENSED

// this file is a mashup of https://github.com/Uniswap/uniswap-v2-periphery/blob/master/contracts/examples/ExampleOracleSimple.sol and ChainlinkPricer.sol
pragma solidity 0.6.10;

import {OracleInterface} from "../interfaces/OracleInterface.sol";
import {OpynPricerInterface} from "../interfaces/OpynPricerInterface.sol";
import {SafeMath} from "../packages/oz/SafeMath.sol";

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import '@uniswap/lib/contracts/libraries/FixedPoint.sol';

import '../libs/uniswap/v2-periphery/UniswapV2OracleLibrary.sol';
import '../libs/uniswap/v2-periphery/UniswapV2Library.sol';

// fixed window oracle that recomputes the average price for the entire period once every period
// note that the price average is only guaranteed to be over at least 1 period, but may be over a longer period


/**
 * @notice A Pricer contract for one asset as reported by UniswapTWAP
 */
contract UniswapTWAPPricer is OpynPricerInterface {
    using FixedPoint for *;
    using SafeMath for uint256;

    uint public constant PERIOD = 24 hours;

    IUniswapV2Pair immutable pair;
    address public immutable token0;
    address public immutable token1;

    uint    public price0CumulativeLast;
    uint    public price1CumulativeLast;
    uint32  public blockTimestampLast;
    FixedPoint.uq112x112 public price0Average;
    FixedPoint.uq112x112 public price1Average;

    /// @notice the opyn oracle address
    OracleInterface public oracle;
    IUniswapV2Factory public factory;

    /// @notice asset that this pricer will a get price for
    address public asset;
    /// @notice bot address that is allowed to call setExpiryPriceInOracle
    address public bot;

    /**
     * @param _bot priveleged address that can call setExpiryPriceInOracle
     * @param _asset asset that this pricer will get a price for
     * @param _factory UniswapTWAP factory contract for the asset
     * @param _oracle Opyn Oracle address
     */

    constructor(
        address _bot,
        address _asset,
        address _factory,
        address _oracle
    ) public {
        require(_bot != address(0), "UniswapTWAPPricer: Cannot set 0 address as bot");
        require(_oracle != address(0), "UniswapTWAPPricer: Cannot set 0 address as oracle");
        require(_factory != address(0), "UniswapTWAPPricer: Cannot set 0 address as factory");

        bot = _bot;
        oracle = OracleInterface(_oracle);
        factory = IUniswapV2Factory(_factory);
        asset = _asset;
        IUniswapV2Pair _pair = IUniswapV2Pair(
			UniswapV2Library.pairFor(
				_factory, 
				address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) // WETH address .. will need to convert to USD, and this is probably wrong for test nets
				, _asset
			)
		);
        pair = _pair;
        token0 = _pair.token0();
        token1 = _pair.token1();
        price0CumulativeLast = _pair.price0CumulativeLast(); // fetch the current accumulated price value (1 / 0)
        price1CumulativeLast = _pair.price1CumulativeLast(); // fetch the current accumulated price value (0 / 1)
        uint112 reserve0;
        uint112 reserve1;
        (reserve0, reserve1, blockTimestampLast) = _pair.getReserves();
        require(reserve0 != 0 && reserve1 != 0, 'ExampleOracleSimple: NO_RESERVES'); // ensure that there's liquidity in the pair
    }

    function update() external {
        (uint price0Cumulative, uint price1Cumulative, uint32 blockTimestamp) =
            UniswapV2OracleLibrary.currentCumulativePrices(address(pair));
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired

        // ensure that at least one full period has passed since the last update
        require(timeElapsed >= PERIOD, 'ExampleOracleSimple: PERIOD_NOT_ELAPSED');

        // overflow is desired, casting never truncates
        // cumulative price is in (uq112x112 price * seconds) units so we simply wrap it after division by time elapsed
        price0Average = FixedPoint.uq112x112(uint224((price0Cumulative - price0CumulativeLast) / timeElapsed));
        price1Average = FixedPoint.uq112x112(uint224((price1Cumulative - price1CumulativeLast) / timeElapsed));

        price0CumulativeLast = price0Cumulative;
        price1CumulativeLast = price1Cumulative;
        blockTimestampLast = blockTimestamp;
    }
    /**
     * @notice modifier to check if sender address is equal to bot address
     */
    modifier onlyBot() {
        require(msg.sender == bot, "UniswapTWAPPricer: unauthorized sender");

        _;
    }

    /**
     * @notice get the live price for the asset
     * @dev overides the getPrice function in OpynPricerInterface
     * @return price of the asset in USD, scaled by 1e8
     */
    function getPrice() external override view returns (uint256) {
		//this.update(); // an error about payable/nonpayable here. where/how to call update?
        int256 answer = price1Average.muli(1);
        require(answer > 0, "UniswapTWAPPricer: price is lower than 0");
        return uint256(answer);
    }

    /**
     * @notice set the expiry price in the oracle, can only be called by Bot address
     * @dev a roundId must be provided to confirm price validity, which is the first UniswapTWAP price provided after the expiryTimestamp
     * @param _expiryTimestamp expiry to set a price for
     */
    function setExpiryPriceInOracle(uint256 _expiryTimestamp) external onlyBot {
        uint256 roundTimestamp = blockTimestampLast;
	

        require(_expiryTimestamp <= roundTimestamp, "UniswapTWAPPricer: invalid roundId");

        uint256 price = uint256(price1Average.muli(1));
        oracle.setExpiryPrice(asset, _expiryTimestamp, price);
    }
}
