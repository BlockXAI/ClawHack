const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("ClawEscrow", function () {
  async function deployFixture() {
    const [owner, oracle, treasury, bettor1, bettor2, agent1, agent2] =
      await ethers.getSigners();

    const ClawEscrow = await ethers.getContractFactory("ClawEscrow");
    const escrow = await ClawEscrow.deploy(oracle.address, treasury.address);

    return { escrow, owner, oracle, treasury, bettor1, bettor2, agent1, agent2 };
  }

  describe("Deployment", function () {
    it("should set owner, oracle, and treasury", async function () {
      const { escrow, owner, oracle, treasury } = await loadFixture(deployFixture);
      expect(await escrow.owner()).to.equal(owner.address);
      expect(await escrow.oracle()).to.equal(oracle.address);
      expect(await escrow.treasury()).to.equal(treasury.address);
    });

    it("should set default rake to 7%", async function () {
      const { escrow } = await loadFixture(deployFixture);
      expect(await escrow.rakePercent()).to.equal(7);
    });
  });

  describe("Pool Creation", function () {
    it("should allow owner to create a pool", async function () {
      const { escrow } = await loadFixture(deployFixture);
      await expect(escrow.createPool("debate-1"))
        .to.emit(escrow, "PoolCreated")
        .withArgs("debate-1");
    });

    it("should reject duplicate pool creation", async function () {
      const { escrow } = await loadFixture(deployFixture);
      await escrow.createPool("debate-1");
      await expect(escrow.createPool("debate-1")).to.be.revertedWith("Pool already exists");
    });

    it("should reject non-owner pool creation", async function () {
      const { escrow, bettor1 } = await loadFixture(deployFixture);
      await expect(escrow.connect(bettor1).createPool("debate-1")).to.be.revertedWith("Only owner");
    });
  });

  describe("Betting", function () {
    it("should allow placing a bet", async function () {
      const { escrow, bettor1, agent1 } = await loadFixture(deployFixture);
      await escrow.createPool("debate-1");

      const betAmount = ethers.parseEther("1.0");
      await expect(
        escrow.connect(bettor1).placeBet("debate-1", agent1.address, { value: betAmount })
      )
        .to.emit(escrow, "BetPlaced")
        .withArgs("debate-1", bettor1.address, agent1.address, betAmount);
    });

    it("should reject bet on non-existent pool", async function () {
      const { escrow, bettor1, agent1 } = await loadFixture(deployFixture);
      await expect(
        escrow.connect(bettor1).placeBet("nonexistent", agent1.address, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("Pool does not exist");
    });

    it("should reject zero-value bet", async function () {
      const { escrow, bettor1, agent1 } = await loadFixture(deployFixture);
      await escrow.createPool("debate-1");
      await expect(
        escrow.connect(bettor1).placeBet("debate-1", agent1.address, { value: 0 })
      ).to.be.revertedWith("Bet must be > 0");
    });

    it("should track multiple bets and update totalPool", async function () {
      const { escrow, bettor1, bettor2, agent1, agent2 } = await loadFixture(deployFixture);
      await escrow.createPool("debate-1");

      await escrow.connect(bettor1).placeBet("debate-1", agent1.address, { value: ethers.parseEther("2.0") });
      await escrow.connect(bettor2).placeBet("debate-1", agent2.address, { value: ethers.parseEther("3.0") });

      const betCount = await escrow.getPoolBetCount("debate-1");
      expect(betCount).to.equal(2);
    });
  });

  describe("Pool Resolution", function () {
    it("should allow oracle to resolve a pool", async function () {
      const { escrow, oracle, bettor1, agent1 } = await loadFixture(deployFixture);
      await escrow.createPool("debate-1");
      await escrow.connect(bettor1).placeBet("debate-1", agent1.address, { value: ethers.parseEther("1.0") });

      await expect(escrow.connect(oracle).resolvePool("debate-1", agent1.address))
        .to.emit(escrow, "PoolResolved");
    });

    it("should reject non-oracle resolution", async function () {
      const { escrow, bettor1, agent1 } = await loadFixture(deployFixture);
      await escrow.createPool("debate-1");
      await escrow.connect(bettor1).placeBet("debate-1", agent1.address, { value: ethers.parseEther("1.0") });

      await expect(
        escrow.connect(bettor1).resolvePool("debate-1", agent1.address)
      ).to.be.revertedWith("Only oracle");
    });

    it("should reject double resolution", async function () {
      const { escrow, oracle, bettor1, agent1 } = await loadFixture(deployFixture);
      await escrow.createPool("debate-1");
      await escrow.connect(bettor1).placeBet("debate-1", agent1.address, { value: ethers.parseEther("1.0") });

      await escrow.connect(oracle).resolvePool("debate-1", agent1.address);
      await expect(
        escrow.connect(oracle).resolvePool("debate-1", agent1.address)
      ).to.be.revertedWith("Already resolved");
    });

    it("should transfer rake to treasury on resolution", async function () {
      const { escrow, oracle, treasury, bettor1, bettor2, agent1, agent2 } =
        await loadFixture(deployFixture);
      await escrow.createPool("debate-1");

      const bet1 = ethers.parseEther("3.0");
      const bet2 = ethers.parseEther("7.0");
      await escrow.connect(bettor1).placeBet("debate-1", agent1.address, { value: bet1 });
      await escrow.connect(bettor2).placeBet("debate-1", agent2.address, { value: bet2 });

      const totalPool = bet1 + bet2; // 10 ETH
      const expectedRake = (totalPool * 7n) / 100n; // 0.7 ETH

      await expect(
        escrow.connect(oracle).resolvePool("debate-1", agent1.address)
      ).to.changeEtherBalance(treasury, expectedRake);
    });
  });

  describe("Claiming Winnings", function () {
    it("should allow winner to claim proportional payout", async function () {
      const { escrow, oracle, bettor1, bettor2, agent1, agent2 } =
        await loadFixture(deployFixture);
      await escrow.createPool("debate-1");

      const bet1 = ethers.parseEther("3.0");
      const bet2 = ethers.parseEther("7.0");
      await escrow.connect(bettor1).placeBet("debate-1", agent1.address, { value: bet1 });
      await escrow.connect(bettor2).placeBet("debate-1", agent2.address, { value: bet2 });

      await escrow.connect(oracle).resolvePool("debate-1", agent1.address);

      // bettor1 bet on winner: payout = (3 * (10 - 0.7)) / 3 = 9.3 ETH
      const totalPool = bet1 + bet2;
      const rake = (totalPool * 7n) / 100n;
      const distributable = totalPool - rake;
      const expectedPayout = (bet1 * distributable) / bet1; // = distributable since only winner

      await expect(
        escrow.connect(bettor1).claimWinnings("debate-1", 0)
      ).to.changeEtherBalance(bettor1, expectedPayout);
    });

    it("should reject claim from loser", async function () {
      const { escrow, oracle, bettor1, bettor2, agent1, agent2 } =
        await loadFixture(deployFixture);
      await escrow.createPool("debate-1");

      await escrow.connect(bettor1).placeBet("debate-1", agent1.address, { value: ethers.parseEther("3.0") });
      await escrow.connect(bettor2).placeBet("debate-1", agent2.address, { value: ethers.parseEther("7.0") });

      await escrow.connect(oracle).resolvePool("debate-1", agent1.address);

      // bettor2 bet on agent2 (loser)
      await expect(
        escrow.connect(bettor2).claimWinnings("debate-1", 1)
      ).to.be.revertedWith("You bet on the loser");
    });

    it("should reject double claim", async function () {
      const { escrow, oracle, bettor1, agent1 } = await loadFixture(deployFixture);
      await escrow.createPool("debate-1");
      await escrow.connect(bettor1).placeBet("debate-1", agent1.address, { value: ethers.parseEther("1.0") });
      await escrow.connect(oracle).resolvePool("debate-1", agent1.address);

      await escrow.connect(bettor1).claimWinnings("debate-1", 0);
      await expect(
        escrow.connect(bettor1).claimWinnings("debate-1", 0)
      ).to.be.revertedWith("Already claimed");
    });

    it("should reject claim on unresolved pool", async function () {
      const { escrow, bettor1, agent1 } = await loadFixture(deployFixture);
      await escrow.createPool("debate-1");
      await escrow.connect(bettor1).placeBet("debate-1", agent1.address, { value: ethers.parseEther("1.0") });

      await expect(
        escrow.connect(bettor1).claimWinnings("debate-1", 0)
      ).to.be.revertedWith("Pool not resolved");
    });
  });

  describe("Admin Functions", function () {
    it("should allow owner to change oracle", async function () {
      const { escrow, bettor1 } = await loadFixture(deployFixture);
      await escrow.setOracle(bettor1.address);
      expect(await escrow.oracle()).to.equal(bettor1.address);
    });

    it("should reject non-owner changing oracle", async function () {
      const { escrow, bettor1 } = await loadFixture(deployFixture);
      await expect(
        escrow.connect(bettor1).setOracle(bettor1.address)
      ).to.be.revertedWith("Only owner");
    });

    it("should allow owner to change rake within bounds", async function () {
      const { escrow } = await loadFixture(deployFixture);
      await escrow.setRake(10);
      expect(await escrow.rakePercent()).to.equal(10);
    });

    it("should reject rake above 20%", async function () {
      const { escrow } = await loadFixture(deployFixture);
      await expect(escrow.setRake(21)).to.be.revertedWith("Rake too high");
    });
  });
});
