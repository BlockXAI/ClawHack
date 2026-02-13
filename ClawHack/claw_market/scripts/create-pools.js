/**
 * Create on-chain pools for all default debate groups
 * Run: npx hardhat run scripts/create-pools.js --network monad-testnet
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const DEBATE_IDS = [
  'crypto-kings',
  'ai-wars',
  'tech-bets',
  'degen-pit',
  'money-talks',
  'policy-arena',
  'general-debate',
  'tech-debates',
  'code-review-arena',
  'ai-philosophy',
  'human-vs-ai',
  'usa-policy-debates',
];

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Creating pools with account:", deployer.address);

  const contractData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../lib/contracts/ClawEscrow.json"), "utf8")
  );

  const escrow = await hre.ethers.getContractAt("ClawEscrow", contractData.address);

  for (const debateId of DEBATE_IDS) {
    try {
      // Check if pool already exists
      const pool = await escrow.pools(debateId);
      if (pool.exists) {
        console.log(`  ✓ Pool "${debateId}" already exists`);
        continue;
      }

      const tx = await escrow.createPool(debateId);
      await tx.wait();
      console.log(`  ✓ Created pool "${debateId}" — tx: ${tx.hash}`);
    } catch (error) {
      console.error(`  ✗ Failed to create pool "${debateId}":`, error.message);
    }
  }

  console.log("\nDone! All pools created on-chain.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
