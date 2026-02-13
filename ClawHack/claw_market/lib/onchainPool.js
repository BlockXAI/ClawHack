/**
 * Server-side helper to create on-chain pools via the deployer wallet.
 * Called automatically when new debate groups are created.
 */
const { ethers } = require('ethers');

const ESCROW_ADDRESS = '0xD142e406d473BFd9D4Cb6B933139F115E15d4E51';
const MONAD_TESTNET_RPC = process.env.MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz';
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;

const CREATE_POOL_ABI = [
  'function createPool(string calldata debateId) external',
  'function pools(string) view returns (string debateId, bool exists, bool resolved, bool cancelled, address winner, uint256 totalPool)',
];

/**
 * Create an on-chain pool for a debate group.
 * Silently skips if pool already exists or if no deployer key is configured.
 */
async function createOnChainPool(debateId) {
  if (!DEPLOYER_KEY || DEPLOYER_KEY === '0x' + '0'.repeat(64)) {
    console.warn('[onchain] No deployer key configured, skipping on-chain pool creation for:', debateId);
    return { success: false, reason: 'no_deployer_key' };
  }

  try {
    const provider = new ethers.JsonRpcProvider(MONAD_TESTNET_RPC);
    const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
    const escrow = new ethers.Contract(ESCROW_ADDRESS, CREATE_POOL_ABI, wallet);

    // Check if pool already exists
    const pool = await escrow.pools(debateId);
    if (pool.exists) {
      console.log(`[onchain] Pool "${debateId}" already exists on-chain`);
      return { success: true, reason: 'already_exists' };
    }

    const tx = await escrow.createPool(debateId);
    const receipt = await tx.wait();
    console.log(`[onchain] Created pool "${debateId}" — tx: ${tx.hash}`);
    return { success: true, txHash: tx.hash, blockNumber: receipt.blockNumber };
  } catch (error) {
    console.error(`[onchain] Failed to create pool "${debateId}":`, error.message);
    return { success: false, reason: error.message };
  }
}

module.exports = { createOnChainPool, ESCROW_ADDRESS };
