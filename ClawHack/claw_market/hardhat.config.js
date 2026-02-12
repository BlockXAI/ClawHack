require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ override: true });

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x" + "0".repeat(64);
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || "https://rpc.monad.xyz";
const MONAD_TESTNET_RPC_URL = process.env.MONAD_TESTNET_RPC_URL || "https://testnet-rpc.monad.xyz";

const hasKey = DEPLOYER_PRIVATE_KEY !== "0x" + "0".repeat(64);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    "monad-testnet": {
      url: MONAD_TESTNET_RPC_URL,
      accounts: hasKey ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 10143,
      timeout: 120000,
    },
    monad: {
      url: MONAD_RPC_URL,
      accounts: hasKey ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 143,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
