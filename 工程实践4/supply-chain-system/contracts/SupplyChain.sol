// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./RoleManager.sol";

contract SupplyChain {
    RoleManager public roleManager;

    enum Stage { Manufactured, InTransit, Delivered, Sold }

    struct SupplyChainStep {
        address actor;
        Stage stage;
        string location;
        uint256 timestamp;
    }

    mapping(uint256 => SupplyChainStep[]) public productSteps;

    event StepAdded(uint256 indexed productId, Stage stage, address indexed actor);

    constructor(address _roleManager) {
        roleManager = RoleManager(_roleManager);
    }

    function addStep(uint256 productId, Stage stage, string memory location) external {
        bytes32 requiredRole;
        
        if (stage == Stage.Manufactured) {
            requiredRole = roleManager.MANUFACTURER_ROLE();
        } else if (stage == Stage.InTransit) {
            requiredRole = roleManager.DISTRIBUTOR_ROLE();
        } else if (stage == Stage.Delivered) {
            requiredRole = roleManager.DISTRIBUTOR_ROLE();
        } else if (stage == Stage.Sold) {
            requiredRole = roleManager.RETAILER_ROLE();
        }

        require(roleManager.hasRole(requiredRole, msg.sender), "Unauthorized role");

        productSteps[productId].push(SupplyChainStep({
            actor: msg.sender,
            stage: stage,
            location: location,
            timestamp: block.timestamp
        }));

        emit StepAdded(productId, stage, msg.sender);
    }

    function getSteps(uint256 productId) external view returns (SupplyChainStep[] memory) {
        return productSteps[productId];
    }

    function getStepCount(uint256 productId) external view returns (uint256) {
        return productSteps[productId].length;
    }
}
