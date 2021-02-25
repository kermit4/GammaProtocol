// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.10;

interface HistoricalPricerInterface {
    // function getPrice() external view returns (uint256);

    function getHistoricalPrice(uint256 roundId) external view returns (uint256, uint256);
}
