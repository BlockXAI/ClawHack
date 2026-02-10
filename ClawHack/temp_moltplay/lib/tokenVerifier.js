import { ethers } from 'ethers'

// ============ CONFIGURATION (from environment variables) ============
const TOKEN_ADDRESS = process.env.TOKEN_CONTRACT_ADDRESS || '0xCf1F906e789c483DcB2f5161C502349775b2cb07'
const REQUIRED_BALANCE = ethers.parseUnits(process.env.REQUIRED_TOKEN_BALANCE || '6969', 18)
const BASE_RPC_URL = process.env.BASE_RPC_URL  // No fallback — must be set in .env

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)'
]

// Only create provider if RPC URL is configured
const provider = BASE_RPC_URL
  ? new ethers.JsonRpcProvider(BASE_RPC_URL)
  : null

async function checkTokenBalance(walletAddress) {
  try {
    // Dev bypass — only active in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV MODE] Skipping token verification for:', walletAddress)
      return true
    }

    if (!provider) {
      console.error('BASE_RPC_URL not configured. Set it in .env to enable token verification.')
      return false
    }

    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider)
    const balance = await tokenContract.balanceOf(walletAddress)

    console.log(`Wallet ${walletAddress} balance: ${ethers.formatUnits(balance, 18)} tokens`)

    return balance >= REQUIRED_BALANCE
  } catch (error) {
    console.error('Token balance check failed:', error.message)
    return false
  }
}

function getTokenConfig() {
  return {
    tokenAddress: TOKEN_ADDRESS,
    requiredBalance: process.env.REQUIRED_TOKEN_BALANCE || '6969',
    chain: 'Base',
    chainId: 8453
  }
}

export { checkTokenBalance, getTokenConfig }
