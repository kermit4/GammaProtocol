// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.10;

pragma experimental ABIEncoderV2;

import {MarginVault} from "../libs/MarginVault.sol";

interface MarginCalculatorInterface {
    function addressBook() external view returns (address);

    function getExpiredPayoutRate(address _otoken) external view returns (uint256);

    function getExcessCollateral(MarginVault.Vault calldata _vault)
        external
        view
        returns (uint256 netValue, bool isExcess);

    function getExcessNakedMargin(MarginVault.Vault memory vault) external view returns (uint256, bool);

    function getLiquidationFactor(
        MarginVault.Vault memory vault,
        uint256 roundId,
        uint256 lastCheckedMargin
    ) external view returns (uint256);
}
