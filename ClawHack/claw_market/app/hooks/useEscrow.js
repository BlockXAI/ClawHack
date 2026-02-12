'use client'

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useBalance } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/escrow'

const MONAD_TESTNET_ID = 10143

/**
 * Hook to read on-chain pool state
 */
export function usePoolOnChain(debateId) {
    const { data, isLoading, refetch } = useReadContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'pools',
        args: [debateId || ''],
        chainId: MONAD_TESTNET_ID,
        query: { enabled: !!debateId },
    })

    const { data: betCount, refetch: refetchBetCount } = useReadContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'getPoolBetCount',
        args: [debateId || ''],
        chainId: MONAD_TESTNET_ID,
        query: { enabled: !!debateId },
    })

    // data = [debateId, exists, resolved, winner, totalPool]
    const pool = data ? {
        debateId: data[0],
        exists: data[1],
        resolved: data[2],
        winner: data[3],
        totalPool: data[4],
        totalPoolFormatted: formatEther(data[4] || 0n),
        betCount: betCount ? Number(betCount) : 0,
    } : null

    return {
        pool,
        isLoading,
        refetch: () => { refetch(); refetchBetCount(); },
    }
}

/**
 * Hook to place an on-chain bet (sends real MON)
 */
export function usePlaceBetOnChain() {
    const { writeContract, data: hash, isPending, error } = useWriteContract()

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

    const placeBet = (debateId, agentAddress, amountInMON) => {
        writeContract({
            address: ESCROW_ADDRESS,
            abi: ESCROW_ABI,
            functionName: 'placeBet',
            args: [debateId, agentAddress],
            value: parseEther(String(amountInMON)),
            chainId: MONAD_TESTNET_ID,
        })
    }

    return {
        placeBet,
        hash,
        isPending,
        isConfirming,
        isSuccess,
        error,
    }
}

/**
 * Hook to claim winnings after resolution
 */
export function useClaimWinnings() {
    const { writeContract, data: hash, isPending, error } = useWriteContract()

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

    const claim = (debateId, betIndex) => {
        writeContract({
            address: ESCROW_ADDRESS,
            abi: ESCROW_ABI,
            functionName: 'claimWinnings',
            args: [debateId, BigInt(betIndex)],
            chainId: MONAD_TESTNET_ID,
        })
    }

    return { claim, hash, isPending, isConfirming, isSuccess, error }
}

/**
 * Hook to create a pool (owner only)
 */
export function useCreatePool() {
    const { writeContract, data: hash, isPending, error } = useWriteContract()

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

    const createPool = (debateId) => {
        writeContract({
            address: ESCROW_ADDRESS,
            abi: ESCROW_ABI,
            functionName: 'createPool',
            args: [debateId],
            chainId: MONAD_TESTNET_ID,
        })
    }

    return { createPool, hash, isPending, isConfirming, isSuccess, error }
}

/**
 * Hook to get real MON balance
 */
export function useMonBalance() {
    const { address } = useAccount()
    const { data, refetch } = useBalance({
        address,
        chainId: MONAD_TESTNET_ID,
    })

    return {
        balance: data ? formatEther(data.value) : '0',
        balanceRaw: data?.value || 0n,
        symbol: data?.symbol || 'MON',
        refetch,
    }
}

/**
 * Hook to read contract owner/oracle
 */
export function useContractInfo() {
    const { data: owner } = useReadContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'owner',
        chainId: MONAD_TESTNET_ID,
    })

    const { data: oracle } = useReadContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'oracle',
        chainId: MONAD_TESTNET_ID,
    })

    const { data: rakePercent } = useReadContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'rakePercent',
        chainId: MONAD_TESTNET_ID,
    })

    return {
        owner,
        oracle,
        rakePercent: rakePercent ? Number(rakePercent) : 7,
        escrowAddress: ESCROW_ADDRESS,
    }
}
