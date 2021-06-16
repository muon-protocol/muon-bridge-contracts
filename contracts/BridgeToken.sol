// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BridgeToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint8 immutable private decimals_;

    constructor(
        address _bridge, 
        string memory _name, 
        string memory _symbol, 
        uint8 _decimals
    ) ERC20(_name, _symbol) public {
        // Grant the contract deployer the default admin role: it will be able
        // to grant and revoke any roles
        decimals_ = _decimals;
        _setupRole(MINTER_ROLE, _bridge);
        _setupRole(BURNER_ROLE, _bridge);
    }


    function decimals() public view virtual override returns (uint8) {
        return decimals_;
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) returns (bool) {
        _mint(to, amount);
        return true;
    }

    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE)  returns (bool) {
        _burn(from, amount);
        return true;
    }
}