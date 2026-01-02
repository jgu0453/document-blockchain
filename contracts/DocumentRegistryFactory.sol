// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./DocumentRegistry.sol";

contract DocumentRegistryFactory {
    address[] public registries;
    mapping(address => address[]) public registriesByOwner;

    event RegistryDeployed(address indexed registry, address indexed owner, string label);

    function deployRegistry(string calldata label) external returns (address registry) {
        DocumentRegistry reg = new DocumentRegistry();
        registry = address(reg);
        registries.push(registry);
        registriesByOwner[msg.sender].push(registry);
        emit RegistryDeployed(registry, msg.sender, label);
    }

    function getRegistries() external view returns (address[] memory) {
        return registries;
    }

    function getRegistriesByOwner(address owner) external view returns (address[] memory) {
        return registriesByOwner[owner];
    }
}