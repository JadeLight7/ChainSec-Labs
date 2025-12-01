// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract RoleManager {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    bytes32 public constant QUALITY_INSPECTOR_ROLE = keccak256("QUALITY_INSPECTOR_ROLE");

    mapping(address => mapping(bytes32 => bool)) private _roles;
    mapping(address => bool) public isRegistered;
    address[] public registeredUsers;

    event RoleGranted(bytes32 indexed role, address indexed account);
    event RoleRevoked(bytes32 indexed role, address indexed account);

    constructor() {
        _roles[msg.sender][ADMIN_ROLE] = true;
        isRegistered[msg.sender] = true;
        registeredUsers.push(msg.sender);
    }

    function grantRole(bytes32 role, address account) external {
        require(_roles[msg.sender][ADMIN_ROLE], "Only admin can grant roles");
        _roles[account][role] = true;
        
        if (!isRegistered[account]) {
            isRegistered[account] = true;
            registeredUsers.push(account);
        }
        
        emit RoleGranted(role, account);
    }

    function revokeRole(bytes32 role, address account) external {
        require(_roles[msg.sender][ADMIN_ROLE], "Only admin can revoke roles");
        _roles[account][role] = false;
        emit RoleRevoked(role, account);
    }

    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[account][role];
    }

    function getUserCount() public view returns (uint256) {
        return registeredUsers.length;
    }
}
