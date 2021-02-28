// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.10;

import {OracleInterface} from "../interfaces/OracleInterface.sol";

contract MockPricer {
    OracleInterface public oracle;

    uint256 internal price;
    address public asset;

    constructor(address _asset, address _oracle) public {
        asset = _asset;
        oracle = OracleInterface(_oracle);
    }

    function setPrice(uint256 _price) external {
        price = _price;
    }

    function getPrice() external view returns (uint256) {
        return price;
    }

    function setExpiryPriceInOracle(uint256 _expiryTimestamp, uint256 _price) external {
        oracle.setExpiryPrice(asset, _expiryTimestamp, _price);
    }

    mapping(uint256 => uint256) public historicalPrice;
    mapping(uint256 => uint256) public historicalPriceTimestamp;

    function getHistoricalPrice(uint256 _roundId) external view returns (uint256, uint256) {
        return (historicalPrice[_roundId], historicalPriceTimestamp[_roundId]);
    }

    function setHistoricalPrice(
        uint256 _roundId,
        uint256 _price,
        uint256 _timestamp
    ) external {
        historicalPrice[_roundId] = _price;
        historicalPriceTimestamp[_roundId] = _timestamp;
    }
}
