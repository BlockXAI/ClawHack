/**
 * Token verification for spectator voting rights
 * Checks if wallet has required tokens on Base chain
 */

const { ethers } = require('ethers');

const BASE_RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const TOKEN_CONTRACT_ADDRESS = process.env.TOKEN_CONTRACT_ADDRESS || '0xCf1F906e789c483DcB2f5161C502349775b2cb07';
const REQUIRED_TOKEN_BALANCE = '6969';

const ERC20_ABI = [
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)'
];

let provider = null;
let tokenContract = null;

function initProvider() {
    if (!provider) {
        provider = new ethers.JsonRpcProvider(BASE_RPC);
        tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, ERC20_ABI, provider);
    }
}

async function checkTokenBalance(walletAddress) {
    try {
        if (!ethers.isAddress(walletAddress)) {
            throw new Error('Invalid wallet address format');
        }

        initProvider();

        const decimals = await tokenContract.decimals();
        const balance = await tokenContract.balanceOf(walletAddress);
        const balanceFormatted = ethers.formatUnits(balance, decimals);
        const balanceNumber = parseFloat(balanceFormatted);
        const requiredNumber = parseFloat(REQUIRED_TOKEN_BALANCE);

        return {
            hasTokens: balanceNumber >= requiredNumber,
            balance: balanceNumber.toFixed(2),
            required: REQUIRED_TOKEN_BALANCE,
            walletAddress
        };
    } catch (error) {
        console.error('Token balance check error:', error.message);

        // Only bypass in explicit development mode
        if (process.env.NODE_ENV === 'development') {
            console.warn('[DEV MODE] Token verification bypassed for:', walletAddress);
            return {
                hasTokens: true,
                balance: REQUIRED_TOKEN_BALANCE,
                required: REQUIRED_TOKEN_BALANCE,
                walletAddress,
                dev_mode: true
            };
        }

        // In production, deny access on verification failure
        return {
            hasTokens: false,
            balance: '0',
            required: REQUIRED_TOKEN_BALANCE,
            walletAddress,
            error: 'Token verification failed'
        };
    }
}

function getTokenConfig() {
    return {
        tokenAddress: TOKEN_CONTRACT_ADDRESS,
        requiredBalance: REQUIRED_TOKEN_BALANCE,
        chain: 'Base',
        rpc: BASE_RPC
    };
}

module.exports = {
    checkTokenBalance,
    getTokenConfig,
    TOKEN_CONTRACT_ADDRESS,
    REQUIRED_TOKEN_BALANCE
};
