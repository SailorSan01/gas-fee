// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestERC20
 * @dev Simple ERC-20 token for testing purposes
 */
contract TestERC20 is ERC20, Ownable {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) Ownable(_msgSender()) {
        // Mint initial supply to deployer
        _mint(_msgSender(), 1000000 * 10**decimals());
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

/**
 * @title TestERC721
 * @dev Simple ERC-721 NFT for testing purposes
 */
contract TestERC721 is ERC721, Ownable {
    uint256 private _nextTokenId = 1;
    
    constructor(string memory name, string memory symbol) ERC721(name, symbol) Ownable(_msgSender()) {}
    
    function mint(address to) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        return tokenId;
    }
    
    function batchMint(address to, uint256 amount) external onlyOwner returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](amount);
        for (uint256 i = 0; i < amount; i++) {
            uint256 tokenId = _nextTokenId++;
            _mint(to, tokenId);
            tokenIds[i] = tokenId;
        }
        return tokenIds;
    }
}

/**
 * @title TestERC1155
 * @dev Simple ERC-1155 multi-token for testing purposes
 */
contract TestERC1155 is ERC1155, Ownable {
    constructor() ERC1155("https://api.example.com/token/{id}.json") Ownable(_msgSender()) {}
    
    function mint(address to, uint256 tokenId, uint256 amount, bytes memory data) external onlyOwner {
        _mint(to, tokenId, amount, data);
    }
    
    function batchMint(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyOwner {
        _mintBatch(to, tokenIds, amounts, data);
    }
    
    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }
}

