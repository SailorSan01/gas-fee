// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title WithdrawManager
 * @dev Manages token and NFT withdrawals with meta-transaction support.
 * Supports ERC-20, ERC-721, and ERC-1155 tokens.
 * Integrates with ERC-2771 for gasless transactions via trusted forwarders.
 */
contract WithdrawManager is ERC2771Context, Ownable, Pausable, ReentrancyGuard {
    
    // Events
    event ERC20Withdrawn(address indexed token, address indexed user, uint256 amount);
    event ERC721Withdrawn(address indexed token, address indexed user, uint256 tokenId);
    event ERC1155Withdrawn(address indexed token, address indexed user, uint256 tokenId, uint256 amount);
    event TrustedForwarderUpdated(address indexed oldForwarder, address indexed newForwarder);
    
    // Errors
    error InvalidAmount();
    error InvalidTokenAddress();
    error TransferFailed();
    error NotTokenOwner();
    error InsufficientBalance();
    
    constructor(address trustedForwarder) ERC2771Context(trustedForwarder) Ownable(_msgSender()) {}
    
    /**
     * @dev Withdraw ERC-20 tokens
     * @param token The ERC-20 token contract address
     * @param amount The amount to withdraw
     */
    function withdrawERC20(address token, uint256 amount) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        if (token == address(0)) revert InvalidTokenAddress();
        if (amount == 0) revert InvalidAmount();
        
        address user = _msgSender();
        IERC20 tokenContract = IERC20(token);
        
        uint256 balance = tokenContract.balanceOf(user);
        if (balance < amount) revert InsufficientBalance();
        
        bool success = tokenContract.transferFrom(user, address(this), amount);
        if (!success) revert TransferFailed();
        
        // Transfer to user's specified destination (for simplicity, back to user)
        success = tokenContract.transfer(user, amount);
        if (!success) revert TransferFailed();
        
        emit ERC20Withdrawn(token, user, amount);
    }
    
    /**
     * @dev Withdraw ERC-721 NFT
     * @param token The ERC-721 token contract address
     * @param tokenId The token ID to withdraw
     */
    function withdrawERC721(address token, uint256 tokenId) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        if (token == address(0)) revert InvalidTokenAddress();
        
        address user = _msgSender();
        IERC721 tokenContract = IERC721(token);
        
        address owner = tokenContract.ownerOf(tokenId);
        if (owner != user) revert NotTokenOwner();
        
        tokenContract.safeTransferFrom(user, address(this), tokenId);
        tokenContract.safeTransferFrom(address(this), user, tokenId);
        
        emit ERC721Withdrawn(token, user, tokenId);
    }
    
    /**
     * @dev Withdraw ERC-1155 tokens
     * @param token The ERC-1155 token contract address
     * @param tokenId The token ID to withdraw
     * @param amount The amount to withdraw
     */
    function withdrawERC1155(address token, uint256 tokenId, uint256 amount) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        if (token == address(0)) revert InvalidTokenAddress();
        if (amount == 0) revert InvalidAmount();
        
        address user = _msgSender();
        IERC1155 tokenContract = IERC1155(token);
        
        uint256 balance = tokenContract.balanceOf(user, tokenId);
        if (balance < amount) revert InsufficientBalance();
        
        tokenContract.safeTransferFrom(user, address(this), tokenId, amount, "");
        tokenContract.safeTransferFrom(address(this), user, tokenId, amount, "");
        
        emit ERC1155Withdrawn(token, user, tokenId, amount);
    }
    
    /**
     * @dev Update the trusted forwarder address (only owner)
     * @param newForwarder The new trusted forwarder address
     */
    function updateTrustedForwarder(address newForwarder) external onlyOwner {
        address oldForwarder = trustedForwarder();
        _setTrustedForwarder(newForwarder);
        emit TrustedForwarderUpdated(oldForwarder, newForwarder);
    }
    
    /**
     * @dev Pause the contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Override _msgSender to support ERC-2771 meta-transactions
     */
    function _msgSender() internal view override(Context, ERC2771Context) returns (address) {
        return ERC2771Context._msgSender();
    }
    
    /**
     * @dev Override _msgData to support ERC-2771 meta-transactions
     */
    function _msgData() internal view override(Context, ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }
    
    /**
     * @dev Override _contextSuffixLength to support ERC-2771 meta-transactions
     */
    function _contextSuffixLength() internal view override(Context, ERC2771Context) returns (uint256) {
        return ERC2771Context._contextSuffixLength();
    }
}

