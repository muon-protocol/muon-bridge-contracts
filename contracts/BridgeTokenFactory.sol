// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./BridgeToken.sol";

contract BridgeTokenFactory{

    address bridge;
    
    event New(address addr, string name, string symbol);

    constructor(address _bridge) public {
        bridge = _bridge;
    }

    function create(string calldata _name, string calldata _symbol, uint8 _decimals) external returns(address created){
        created = address(new BridgeToken(bridge, _name, _symbol, _decimals));
        emit New(created, _name, _symbol);
    }
}