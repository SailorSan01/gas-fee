const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Guardian", function () {
  let guardian;
  let owner;
  let proposer;
  let executor;
  let user;

  beforeEach(async function () {
    [owner, proposer, executor, user] = await ethers.getSigners();

    const Guardian = await ethers.getContractFactory("Guardian");
    guardian = await Guardian.deploy([proposer.address], [executor.address]);
    await guardian.waitForDeployment();
  });

  describe("Emergency Pause", function () {
    it("Should allow owner to emergency pause", async function () {
      await expect(guardian.connect(owner).emergencyPause())
        .to.emit(guardian, "EmergencyPause")
        .withArgs(owner.address);
      
      expect(await guardian.paused()).to.be.true;
    });

    it("Should prevent non-owner from emergency pause", async function () {
      await expect(guardian.connect(user).emergencyPause())
        .to.be.revertedWithCustomError(guardian, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to emergency unpause", async function () {
      await guardian.connect(owner).emergencyPause();
      
      await expect(guardian.connect(owner).emergencyUnpause())
        .to.emit(guardian, "EmergencyUnpause")
        .withArgs(owner.address);
      
      expect(await guardian.paused()).to.be.false;
    });
  });

  describe("Timelock Operations", function () {
    it("Should have correct minimum delay", async function () {
      expect(await guardian.MIN_DELAY()).to.equal(24 * 60 * 60); // 24 hours
    });

    it("Should allow scheduling operations with valid delay", async function () {
      const target = user.address;
      const value = 0;
      const data = "0x";
      const predecessor = ethers.ZeroHash;
      const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
      const delay = 24 * 60 * 60; // 24 hours

      await expect(guardian.connect(owner).scheduleOperation(target, value, data, predecessor, salt, delay))
        .to.emit(guardian, "TimelockProposalCreated");
    });

    it("Should reject operations with insufficient delay", async function () {
      const target = user.address;
      const value = 0;
      const data = "0x";
      const predecessor = ethers.ZeroHash;
      const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
      const delay = 1 * 60 * 60; // 1 hour (less than minimum)

      await expect(guardian.connect(owner).scheduleOperation(target, value, data, predecessor, salt, delay))
        .to.be.revertedWithCustomError(guardian, "InvalidDelay");
    });

    it("Should allow checking operation status", async function () {
      const target = user.address;
      const value = 0;
      const data = "0x";
      const predecessor = ethers.ZeroHash;
      const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
      const delay = 24 * 60 * 60;

      // Schedule operation
      await guardian.connect(owner).scheduleOperation(target, value, data, predecessor, salt, delay);
      
      // Get operation ID
      const timelock = await guardian.timelock();
      const timelockContract = await ethers.getContractAt("TimelockController", timelock);
      const id = await timelockContract.hashOperation(target, value, data, predecessor, salt);

      // Check if pending
      expect(await guardian.isOperationPending(id)).to.be.true;
      expect(await guardian.isOperationReady(id)).to.be.false;

      // Fast forward time
      await time.increase(delay);

      // Check if ready
      expect(await guardian.isOperationReady(id)).to.be.true;
    });
  });

  describe("Access Control", function () {
    it("Should prevent non-owner from scheduling operations", async function () {
      const target = user.address;
      const value = 0;
      const data = "0x";
      const predecessor = ethers.ZeroHash;
      const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
      const delay = 24 * 60 * 60;

      await expect(guardian.connect(user).scheduleOperation(target, value, data, predecessor, salt, delay))
        .to.be.revertedWithCustomError(guardian, "OwnableUnauthorizedAccount");
    });

    it("Should have correct timelock configuration", async function () {
      const timelock = await guardian.timelock();
      expect(timelock).to.not.equal(ethers.ZeroAddress);
      
      const timelockContract = await ethers.getContractAt("TimelockController", timelock);
      expect(await timelockContract.getMinDelay()).to.equal(24 * 60 * 60);
    });
  });
});

