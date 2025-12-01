// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./RoleManager.sol";

contract QualityControl {
    RoleManager public roleManager;

    struct QualityReport {
        uint256 productId;
        address inspector;
        bool passed;
        string comments;
        uint256 timestamp;
    }

    mapping(uint256 => QualityReport[]) public productReports;
    uint256 public totalReports;
    uint256 public passedReports;

    event QualityReportAdded(uint256 indexed productId, address indexed inspector, bool passed);

    constructor(address _roleManager) {
        roleManager = RoleManager(_roleManager);
    }

    function addReport(uint256 productId, bool passed, string memory comments) external {
        require(
            roleManager.hasRole(roleManager.QUALITY_INSPECTOR_ROLE(), msg.sender),
            "Only quality inspectors can add reports"
        );

        productReports[productId].push(QualityReport({
            productId: productId,
            inspector: msg.sender,
            passed: passed,
            comments: comments,
            timestamp: block.timestamp
        }));

        totalReports++;
        if (passed) {
            passedReports++;
        }

        emit QualityReportAdded(productId, msg.sender, passed);
    }

    function getReports(uint256 productId) external view returns (QualityReport[] memory) {
        return productReports[productId];
    }

    function getReportCount(uint256 productId) external view returns (uint256) {
        return productReports[productId].length;
    }

    function getPassRate() external view returns (uint256) {
        if (totalReports == 0) return 0;
        return (passedReports * 100) / totalReports;
    }
}
