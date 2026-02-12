const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying ClawEscrow with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy parameters
  const oracle = deployer.address; // Oracle defaults to deployer — change for production
  const treasury = deployer.address; // Treasury defaults to deployer — change for production

  const ClawEscrow = await hre.ethers.getContractFactory("ClawEscrow");
  const escrow = await ClawEscrow.deploy(oracle, treasury);
  await escrow.waitForDeployment();

  const escrowAddress = await escrow.getAddress();
  console.log("ClawEscrow deployed to:", escrowAddress);

  // Export ABI and address for the frontend
  const artifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/ClawEscrow.sol/ClawEscrow.json"),
      "utf8"
    )
  );

  const exportDir = path.join(__dirname, "../lib/contracts");
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(exportDir, "ClawEscrow.json"),
    JSON.stringify(
      {
        address: escrowAddress,
        abi: artifact.abi,
        network: hre.network.name,
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log("ABI + address exported to lib/contracts/ClawEscrow.json");

  console.log(`\nDeployed on network: ${hre.network.name}`);
  console.log(`View on explorer: https://monadscan.com/address/${escrowAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
