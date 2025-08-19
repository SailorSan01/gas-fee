// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Paymaster (EXPERIMENTAL)
 * @dev Experimental EIP-4337 Account Abstraction Paymaster implementation.
 * WARNING: This is a simplified implementation for demonstration purposes.
 * A production paymaster requires more sophisticated validation and gas estimation.
 * 
 * This contract is marked as EXPERIMENTAL and should not be used in production
 * without thorough testing and security audits.
 */
contract Paymaster is Ownable, Pausable {
    
    // EIP-4337 EntryPoint interface (simplified)
    interface IEntryPoint {
        struct UserOperation {
            address sender;
            uint256 nonce;
            bytes initCode;
            bytes callData;
            uint256 callGasLimit;
            uint256 verificationGasLimit;
            uint256 preVerificationGas;
            uint256 maxFeePerGas;
            uint256 maxPriorityFeePerGas;
            bytes paymasterAndData;
            bytes signature;
        }
        
        function getUserOpHash(UserOperation calldata userOp) external view returns (bytes32);
    }
    
    // EntryPoint contract address
    address public immutable entryPoint;
    
    // Mapping to track sponsored users
    mapping(address => bool) public sponsoredUsers;
    
    // Maximum gas cost we're willing to sponsor
    uint256 public maxGasCost = 0.01 ether;
    
    // Events
    event UserSponsored(address indexed user);
    event UserUnsponsored(address indexed user);
    event PaymasterDeposit(uint256 amount);
    event PaymasterWithdraw(uint256 amount);
    
    // Errors
    error NotEntryPoint();
    error UserNotSponsored();
    error GasCostTooHigh();
    error InsufficientDeposit();
    
    constructor(address _entryPoint) Ownable(_msgSender()) {
        entryPoint = _entryPoint;
    }
    
    /**
     * @dev Validate a user operation (EIP-4337)
     * This is called by the EntryPoint to validate if we'll sponsor this operation
     */
    function validatePaymasterUserOp(
        IEntryPoint.UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external whenNotPaused returns (bytes memory context, uint256 validationData) {
        if (_msgSender() != entryPoint) revert NotEntryPoint();
        
        // Check if user is sponsored
        if (!sponsoredUsers[userOp.sender]) revert UserNotSponsored();
        
        // Check gas cost limits
        if (maxCost > maxGasCost) revert GasCostTooHigh();
        
        // Check if we have sufficient deposit
        if (address(this).balance < maxCost) revert InsufficientDeposit();
        
        // Return validation success (0 means valid)
        return ("", 0);
    }
    
    /**
     * @dev Post-operation hook (EIP-4337)
     * Called after the user operation is executed
     */
    function postOp(
        IEntryPoint.PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external {
        if (_msgSender() != entryPoint) revert NotEntryPoint();
        
        // Handle post-operation logic here
        // For now, we just emit an event or update internal accounting
        // In a real implementation, you might want to:
        // - Update user quotas
        // - Log the actual gas cost
        // - Implement refund logic
    }
    
    /**
     * @dev Add a user to the sponsored list
     */
    function sponsorUser(address user) external onlyOwner {
        sponsoredUsers[user] = true;
        emit UserSponsored(user);
    }
    
    /**
     * @dev Remove a user from the sponsored list
     */
    function unsponsorUser(address user) external onlyOwner {
        sponsoredUsers[user] = false;
        emit UserUnsponsored(user);
    }
    
    /**
     * @dev Update maximum gas cost we're willing to sponsor
     */
    function setMaxGasCost(uint256 _maxGasCost) external onlyOwner {
        maxGasCost = _maxGasCost;
    }
    
    /**
     * @dev Deposit ETH to sponsor gas fees
     */
    function deposit() external payable onlyOwner {
        emit PaymasterDeposit(msg.value);
    }
    
    /**
     * @dev Withdraw ETH from the contract
     */
    function withdraw(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        payable(owner()).transfer(amount);
        emit PaymasterWithdraw(amount);
    }
    
    /**
     * @dev Pause the paymaster
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the paymaster
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get the current balance of the paymaster
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Check if a user is sponsored
     */
    function isUserSponsored(address user) external view returns (bool) {
        return sponsoredUsers[user];
    }
    
    // Receive function to accept ETH deposits
    receive() external payable {
        emit PaymasterDeposit(msg.value);
    }
}

/**
 * @dev PostOpMode enum for EIP-4337
 */
enum PostOpMode {
    opSucceeded,
    opReverted,
    postOpReverted
}

