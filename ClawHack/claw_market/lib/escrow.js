/**
 * ClawEscrow contract config for wagmi/viem hooks
 * Auto-generated from deployment at 2026-02-13 (security-hardened v2)
 */

const ESCROW_ADDRESS = '0xD142e406d473BFd9D4Cb6B933139F115E15d4E51';

const ESCROW_ABI = [
  // --- Constructor ---
  {
    inputs: [
      { internalType: 'address', name: '_oracle', type: 'address' },
      { internalType: 'address', name: '_treasury', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  // --- Pool Management ---
  {
    inputs: [{ internalType: 'string', name: 'debateId', type: 'string' }],
    name: 'createPool',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: 'debateId', type: 'string' }],
    name: 'cancelPool',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // --- Betting ---
  {
    inputs: [
      { internalType: 'string', name: 'debateId', type: 'string' },
      { internalType: 'address', name: 'agent', type: 'address' },
    ],
    name: 'placeBet',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  // --- Resolution ---
  {
    inputs: [
      { internalType: 'string', name: 'debateId', type: 'string' },
      { internalType: 'address', name: 'winnerAgent', type: 'address' },
    ],
    name: 'resolvePool',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: 'debateId', type: 'string' },
      { internalType: 'uint256', name: 'betIndex', type: 'uint256' },
    ],
    name: 'claimWinnings',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // --- Refund ---
  {
    inputs: [
      { internalType: 'string', name: 'debateId', type: 'string' },
      { internalType: 'uint256', name: 'betIndex', type: 'uint256' },
    ],
    name: 'refundBet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // --- View: pools mapping (returns 6 fields now) ---
  {
    inputs: [{ internalType: 'string', name: '', type: 'string' }],
    name: 'pools',
    outputs: [
      { internalType: 'string', name: 'debateId', type: 'string' },
      { internalType: 'bool', name: 'exists', type: 'bool' },
      { internalType: 'bool', name: 'resolved', type: 'bool' },
      { internalType: 'bool', name: 'cancelled', type: 'bool' },
      { internalType: 'address', name: 'winner', type: 'address' },
      { internalType: 'uint256', name: 'totalPool', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // --- View: helpers ---
  {
    inputs: [{ internalType: 'string', name: 'debateId', type: 'string' }],
    name: 'getPoolBetCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: 'debateId', type: 'string' }],
    name: 'getPoolAgents',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: 'debateId', type: 'string' }],
    name: 'isPoolCancelled',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: 'debateId', type: 'string' }],
    name: 'isPoolResolved',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getPoolCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolIds',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  // --- View: state ---
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'oracle',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'rakePercent',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_RAKE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'treasury',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // --- Admin ---
  {
    inputs: [{ internalType: 'address', name: '_oracle', type: 'address' }],
    name: 'setOracle',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_rakePercent', type: 'uint256' }],
    name: 'setRake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_treasury', type: 'address' }],
    name: 'setTreasury',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // --- Events ---
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'string', name: 'debateId', type: 'string' }],
    name: 'PoolCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'string', name: 'debateId', type: 'string' }],
    name: 'PoolCancelled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'string', name: 'debateId', type: 'string' },
      { indexed: true, internalType: 'address', name: 'bettor', type: 'address' },
      { indexed: false, internalType: 'address', name: 'agent', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'BetPlaced',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'string', name: 'debateId', type: 'string' },
      { indexed: true, internalType: 'address', name: 'winner', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'totalPool', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'rake', type: 'uint256' },
    ],
    name: 'PoolResolved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'string', name: 'debateId', type: 'string' },
      { indexed: true, internalType: 'address', name: 'bettor', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'payout', type: 'uint256' },
    ],
    name: 'WinningsClaimed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'string', name: 'debateId', type: 'string' },
      { indexed: true, internalType: 'address', name: 'bettor', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'BetRefunded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256', name: 'oldRake', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'newRake', type: 'uint256' },
    ],
    name: 'RakeUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'address', name: 'oldOracle', type: 'address' },
      { indexed: false, internalType: 'address', name: 'newOracle', type: 'address' },
    ],
    name: 'OracleUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'address', name: 'oldTreasury', type: 'address' },
      { indexed: false, internalType: 'address', name: 'newTreasury', type: 'address' },
    ],
    name: 'TreasuryUpdated',
    type: 'event',
  },
  { stateMutability: 'payable', type: 'receive' },
];

module.exports = { ESCROW_ADDRESS, ESCROW_ABI };
