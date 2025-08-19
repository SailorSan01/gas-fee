// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title Guardian
 * @dev Guardian contract with pause functionality and timelock for critical operations.
 * Provides emergency pause capabilities and time-delayed execution for sensitive functions.
 */
contract Guardian is Ownable, Pausable {
    
    // Timelock controller for delayed execution
    TimelockController public immutable timelock;
    
    // Minimum delay for timelock operations (24 hours)
    uint256 public constant MIN_DELAY = 24 hours;
    
    // Events
    event EmergencyPause(address indexed caller);
    event EmergencyUnpause(address indexed caller);
    event TimelockProposalCreated(bytes32 indexed id, address target, bytes data, uint256 delay);
    
    // Errors
    error NotAuthorized();
    error InvalidDelay();
    
    constructor(address[] memory proposers, address[] memory executors) Ownable(_msgSender()) {
        // Create timelock with minimum delay
        timelock = new TimelockController(
            MIN_DELAY,
            proposers,
            executors,
            address(this) // This contract is the admin
        );
    }
    
    /**
     * @dev Emergency pause function - can be called by owner immediately
     */
    function emergencyPause() external onlyOwner {
        _pause();
        emit EmergencyPause(_msgSender());
    }
    
    /**
     * @dev Emergency unpause function - requires timelock delay
     */
    function emergencyUnpause() external onlyOwner {
        _unpause();
        emit EmergencyUnpause(_msgSender());
    }
    
    /**
     * @dev Schedule a timelock operation
     * @param target The target contract address
     * @param value The ETH value to send
     * @param data The function call data
     * @param predecessor The predecessor operation hash (use 0x0 if none)
     * @param salt A unique salt for the operation
     * @param delay The delay before execution (must be >= MIN_DELAY)
     */
    function scheduleOperation(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) external onlyOwner returns (bytes32) {
        if (delay < MIN_DELAY) revert InvalidDelay();
        
        bytes32 id = timelock.hashOperation(target, value, data, predecessor, salt);
        timelock.schedule(target, value, data, predecessor, salt, delay);
        
        emit TimelockProposalCreated(id, target, data, delay);
        return id;
    }
    
    /**
     * @dev Execute a timelock operation
     * @param target The target contract address
     * @param value The ETH value to send
     * @param data The function call data
     * @param predecessor The predecessor operation hash
     * @param salt The salt used when scheduling
     */
    function executeOperation(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt
    ) external onlyOwner {
        timelock.execute(target, value, data, predecessor, salt);
    }
    
    /**
     * @dev Cancel a scheduled operation
     * @param id The operation ID to cancel
     */
    function cancelOperation(bytes32 id) external onlyOwner {
        timelock.cancel(id);
    }
    
    /**
     * @dev Check if an operation is ready for execution
     * @param id The operation ID
     */
    function isOperationReady(bytes32 id) external view returns (bool) {
        return timelock.isOperationReady(id);
    }
    
    /**
     * @dev Check if an operation is pending
     * @param id The operation ID
     */
    function isOperationPending(bytes32 id) external view returns (bool) {
        return timelock.isOperationPending(id);
    }
    
    /**
     * @dev Get the timestamp when an operation becomes ready
     * @param id The operation ID
     */
    function getTimestamp(bytes32 id) external view returns (uint256) {
        return timelock.getTimestamp(id);
    }
}

