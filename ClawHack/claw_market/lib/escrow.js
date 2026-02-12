/**
 * ClawEscrow contract config for wagmi/viem hooks
 * Auto-generated from deployment at 2026-02-12
 */

const ESCROW_ADDRESS = '0x745006c263B74dF940F9571B16ef78edEAd9811A';

const ESCROW_ABI = [
  {
    inputs: [{ internalType: 'string', name: 'debateId', type: 'string' }],
    name: 'createPool',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
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
  {
    inputs: [{ internalType: 'string', name: '', type: 'string' }],
    name: 'pools',
    outputs: [
      { internalType: 'string', name: 'debateId', type: 'string' },
      { internalType: 'bool', name: 'exists', type: 'bool' },
      { internalType: 'bool', name: 'resolved', type: 'bool' },
      { internalType: 'address', name: 'winner', type: 'address' },
      { internalType: 'uint256', name: 'totalPool', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: 'debateId', type: 'string' }],
    name: 'getPoolBetCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
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
    name: 'treasury',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
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
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'string', name: 'debateId', type: 'string' },
    ],
    name: 'PoolCreated',
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
      { indexed: false, internalType: 'address', name: 'winner', type: 'address' },
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
  { stateMutability: 'payable', type: 'receive' },
];

module.exports = { ESCROW_ADDRESS, ESCROW_ABI };
