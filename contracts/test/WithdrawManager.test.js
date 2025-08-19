const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WithdrawManager", function () {
  let withdrawManager;
  let forwarder;
  let testERC20;
  let testERC721;
  let testERC1155;
  let owner;
  let user;
  let relayer;

  beforeEach(async function () {
    [owner, user, relayer] = await ethers.getSigners();

    // Deploy MinimalForwarder
    const MinimalForwarder = await ethers.getContractFactory("GaslessMinimalForwarder");
    forwarder = await MinimalForwarder.deploy();
    await forwarder.waitForDeployment();

    // Deploy WithdrawManager
    const WithdrawManager = await ethers.getContractFactory("WithdrawManager");
    withdrawManager = await WithdrawManager.deploy(await forwarder.getAddress());
    await withdrawManager.waitForDeployment();

    // Deploy test tokens
    const TestERC20 = await ethers.getContractFactory("TestERC20");
    testERC20 = await TestERC20.deploy("Test Token", "TEST");
    await testERC20.waitForDeployment();

    const TestERC721 = await ethers.getContractFactory("TestERC721");
    testERC721 = await TestERC721.deploy("Test NFT", "TNFT");
    await testERC721.waitForDeployment();

    const TestERC1155 = await ethers.getContractFactory("TestERC1155");
    testERC1155 = await TestERC1155.deploy();
    await testERC1155.waitForDeployment();
  });

  describe("ERC20 Withdrawals", function () {
    it("Should withdraw ERC20 tokens successfully", async function () {
      const amount = ethers.parseEther("100");
      
      // Transfer tokens to user
      await testERC20.transfer(user.address, amount);
      
      // User approves WithdrawManager
      await testERC20.connect(user).approve(await withdrawManager.getAddress(), amount);
      
      // User withdraws tokens
      await expect(withdrawManager.connect(user).withdrawERC20(await testERC20.getAddress(), amount))
        .to.emit(withdrawManager, "ERC20Withdrawn")
        .withArgs(await testERC20.getAddress(), user.address, amount);
    });

    it("Should revert on insufficient balance", async function () {
      const amount = ethers.parseEther("100");
      
      await expect(withdrawManager.connect(user).withdrawERC20(await testERC20.getAddress(), amount))
        .to.be.revertedWithCustomError(withdrawManager, "InsufficientBalance");
    });

    it("Should revert on zero amount", async function () {
      await expect(withdrawManager.connect(user).withdrawERC20(await testERC20.getAddress(), 0))
        .to.be.revertedWithCustomError(withdrawManager, "InvalidAmount");
    });

    it("Should revert on zero address", async function () {
      await expect(withdrawManager.connect(user).withdrawERC20(ethers.ZeroAddress, 100))
        .to.be.revertedWithCustomError(withdrawManager, "InvalidTokenAddress");
    });
  });

  describe("ERC721 Withdrawals", function () {
    it("Should withdraw ERC721 token successfully", async function () {
      // Mint NFT to user
      const tokenId = await testERC721.connect(owner).mint.staticCall(user.address);
      await testERC721.connect(owner).mint(user.address);
      
      // User approves WithdrawManager
      await testERC721.connect(user).approve(await withdrawManager.getAddress(), tokenId);
      
      // User withdraws NFT
      await expect(withdrawManager.connect(user).withdrawERC721(await testERC721.getAddress(), tokenId))
        .to.emit(withdrawManager, "ERC721Withdrawn")
        .withArgs(await testERC721.getAddress(), user.address, tokenId);
    });

    it("Should revert if user doesn't own the token", async function () {
      const tokenId = 1;
      
      await expect(withdrawManager.connect(user).withdrawERC721(await testERC721.getAddress(), tokenId))
        .to.be.reverted; // Will revert because token doesn't exist or user doesn't own it
    });
  });

  describe("ERC1155 Withdrawals", function () {
    it("Should withdraw ERC1155 tokens successfully", async function () {
      const tokenId = 1;
      const amount = 100;
      
      // Mint tokens to user
      await testERC1155.connect(owner).mint(user.address, tokenId, amount, "0x");
      
      // User approves WithdrawManager
      await testERC1155.connect(user).setApprovalForAll(await withdrawManager.getAddress(), true);
      
      // User withdraws tokens
      await expect(withdrawManager.connect(user).withdrawERC1155(await testERC1155.getAddress(), tokenId, amount))
        .to.emit(withdrawManager, "ERC1155Withdrawn")
        .withArgs(await testERC1155.getAddress(), user.address, tokenId, amount);
    });

    it("Should revert on insufficient balance", async function () {
      const tokenId = 1;
      const amount = 100;
      
      await expect(withdrawManager.connect(user).withdrawERC1155(await testERC1155.getAddress(), tokenId, amount))
        .to.be.revertedWithCustomError(withdrawManager, "InsufficientBalance");
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to pause and unpause", async function () {
      await withdrawManager.connect(owner).pause();
      expect(await withdrawManager.paused()).to.be.true;
      
      await withdrawManager.connect(owner).unpause();
      expect(await withdrawManager.paused()).to.be.false;
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(withdrawManager.connect(user).pause())
        .to.be.revertedWithCustomError(withdrawManager, "OwnableUnauthorizedAccount");
    });

    it("Should prevent operations when paused", async function () {
      await withdrawManager.connect(owner).pause();
      
      await expect(withdrawManager.connect(user).withdrawERC20(await testERC20.getAddress(), 100))
        .to.be.revertedWithCustomError(withdrawManager, "EnforcedPause");
    });
  });

  describe("Meta-transactions", function () {
    it("Should support ERC2771 trusted forwarder", async function () {
      expect(await withdrawManager.trustedForwarder()).to.equal(await forwarder.getAddress());
    });

    it("Should allow owner to update trusted forwarder", async function () {
      const newForwarder = user.address; // Just for testing
      
      await expect(withdrawManager.connect(owner).updateTrustedForwarder(newForwarder))
        .to.emit(withdrawManager, "TrustedForwarderUpdated")
        .withArgs(await forwarder.getAddress(), newForwarder);
      
      expect(await withdrawManager.trustedForwarder()).to.equal(newForwarder);
    });
  });
});

