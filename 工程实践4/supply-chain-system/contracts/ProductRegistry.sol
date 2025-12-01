// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./RoleManager.sol";

contract ProductRegistry {
    RoleManager public roleManager;

    struct Product {
        uint256 id;
        string name;
        string category;
        address manufacturer;
        uint256 timestamp;
        bool exists;
    }

    uint256 private _productCounter;
    mapping(uint256 => Product) public products;
    uint256[] public productIds;

    event ProductRegistered(uint256 indexed productId, string name, address indexed manufacturer);

    constructor(address _roleManager) {
        roleManager = RoleManager(_roleManager);
    }

    function registerProduct(string memory name, string memory category) external returns (uint256) {
        require(
            roleManager.hasRole(roleManager.MANUFACTURER_ROLE(), msg.sender),
            "Only manufacturers can register products"
        );

        _productCounter++;
        uint256 productId = _productCounter;

        products[productId] = Product({
            id: productId,
            name: name,
            category: category,
            manufacturer: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        productIds.push(productId);

        emit ProductRegistered(productId, name, msg.sender);
        return productId;
    }

    function getProduct(uint256 productId) external view returns (Product memory) {
        require(products[productId].exists, "Product does not exist");
        return products[productId];
    }

    function getProductCount() external view returns (uint256) {
        return _productCounter;
    }

    function getAllProductIds() external view returns (uint256[] memory) {
        return productIds;
    }
}
