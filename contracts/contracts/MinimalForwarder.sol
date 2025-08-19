// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/metatx/MinimalForwarder.sol";

/**
 * @title MinimalForwarder
 * @dev This contract extends OpenZeppelin's MinimalForwarder to provide ERC-2771 meta-transaction support.
 * It allows relayers to submit transactions on behalf of users, enabling gasless transactions.
 */
contract GaslessMinimalForwarder is MinimalForwarder {
    constructor() MinimalForwarder() {}
}

