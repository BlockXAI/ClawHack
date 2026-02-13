'use client'

import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { usePlaceBetOnChain, usePoolOnChain, useMonBalance, useClaimWinnings } from '../hooks/useEscrow'
import styles from './BettingPanel.module.css'

export default function BettingPanel({ groupData }) {
    const [selectedAgent, setSelectedAgent] = useState(null)
    const [betAmount, setBetAmount] = useState('')
    const { isConnected, address } = useAccount()
    const [txStatus, setTxStatus] = useState(null)

    const { balance, symbol } = useMonBalance()
    const { placeBet: placeBetOnChain, isPending, isConfirming, isSuccess, error: betError, hash } = usePlaceBetOnChain()
    const { claim, isPending: claimPending, isConfirming: claimConfirming, isSuccess: claimSuccess } = useClaimWinnings()
    const { pool: onChainPool, refetch: refetchPool } = usePoolOnChain(groupData?.groupId)

    const members = groupData?.members || []
    const stances = groupData?.stances || {}

    const debaters = members.filter(m => m.role === 'debater')
    const proAgent = debaters.find(d => stances[d.agentId] === 'pro')
    const conAgent = debaters.find(d => stances[d.agentId] === 'con')

    // Pure on-chain pool data
    const totalPool = onChainPool?.exists ? Number(onChainPool.totalPoolFormatted) : 0
    const proPercent = 50
    const conPercent = 50

    // Calculate potential payout (on-chain: 7% rake)
    const amount = parseFloat(betAmount) || 0
    const potentialPayout = amount > 0
        ? (amount * 1.86).toFixed(4)
        : '0.0000'

    // Handle tx status updates
    useEffect(() => {
        if (isPending) setTxStatus('Confirm in wallet...')
        else if (isConfirming) setTxStatus('Confirming on Monad...')
        else if (isSuccess) {
            setTxStatus('Bet placed on-chain!')
            setBetAmount('')
            setSelectedAgent(null)
            refetchPool()
            setTimeout(() => setTxStatus(null), 3000)
        }
        else if (betError) {
            setTxStatus(`Error: ${betError.shortMessage || betError.message}`)
            setTimeout(() => setTxStatus(null), 5000)
        }
    }, [isPending, isConfirming, isSuccess, betError])

    const handlePlaceBet = () => {
        if (!selectedAgent || amount <= 0) return

        // Agent addresses for on-chain (deterministic addresses based on stance)
        const agentAddr = selectedAgent === proAgent?.agentId
            ? '0x0000000000000000000000000000000000000001'
            : '0x0000000000000000000000000000000000000002'

        // Place on-chain bet with real MON
        placeBetOnChain(groupData?.groupId, agentAddr, amount)
    }

    if (!isConnected) {
        return (
            <div className={styles.panel}>
                <div className={styles.sectionLabel}>💰 Place Your Bet</div>
                <div className={styles.connectPrompt}>
                    <div className={styles.connectPromptText}>Connect wallet to bet with real MON on Monad</div>
                    <ConnectButton.Custom>
                        {({ openConnectModal, mounted }) => (
                            <div {...(!mounted && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none' } })}>
                                <button className={styles.connectBtn} onClick={openConnectModal}>Connect Wallet</button>
                            </div>
                        )}
                    </ConnectButton.Custom>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.panel}>
            <div className={styles.sectionLabel}>📊 Live Odds</div>

            {/* On-chain indicator */}
            {onChainPool?.exists && (
                <div style={{ fontSize: '10px', color: '#00FF88', textAlign: 'center', marginBottom: '8px' }}>
                    ⛓ On-chain pool active · {onChainPool.betCount} bets · {onChainPool.totalPoolFormatted} MON
                </div>
            )}

            {/* Odds Bar */}
            <div className={styles.oddsBar}>
                <div className={styles.oddsBarHeader}>
                    <span className={styles.pro}>PRO {proPercent.toFixed(0)}%</span>
                    <span className={styles.con}>CON {conPercent.toFixed(0)}%</span>
                </div>
                <div className={styles.oddsBarTrack}>
                    <div className={styles.oddsBarFillPro} style={{ width: `${proPercent}%` }}></div>
                    <div className={styles.oddsBarFillCon} style={{ width: `${conPercent}%` }}></div>
                </div>
                <div className={styles.oddsBarLabels}>
                    <span>{totalPool > 0 ? (totalPool / 2).toFixed(4) : '0'} MON</span>
                    <span>{totalPool > 0 ? (totalPool / 2).toFixed(4) : '0'} MON</span>
                </div>
            </div>

            {/* Bet Card */}
            <div className={styles.betCard}>
                <div className={styles.betCardTitle}>Place Your Bet</div>

                {/* Agent Selection */}
                <div className={styles.agentSelect}>
                    {proAgent && (
                        <button
                            className={`${styles.agentOption} ${selectedAgent === proAgent.agentId ? styles.agentOptionSelected : ''}`}
                            onClick={() => setSelectedAgent(proAgent.agentId)}
                        >
                            <span className={styles.agentOptionName}>{proAgent.name}</span>
                            <span className={`${styles.agentOptionStance} ${styles.pro}`}>▲ PRO</span>
                        </button>
                    )}
                    {conAgent && (
                        <button
                            className={`${styles.agentOption} ${selectedAgent === conAgent.agentId ? styles.agentOptionSelected : ''}`}
                            onClick={() => setSelectedAgent(conAgent.agentId)}
                        >
                            <span className={styles.agentOptionName}>{conAgent.name}</span>
                            <span className={`${styles.agentOptionStance} ${styles.con}`}>▼ CON</span>
                        </button>
                    )}
                    {!proAgent && !conAgent && (
                        <div className={styles.agentOption} style={{ flex: 1, cursor: 'default' }}>
                            <span className={styles.agentOptionName}>No agents yet</span>
                            <span className={styles.agentOptionStance}>Waiting...</span>
                        </div>
                    )}
                </div>

                {/* Amount Input */}
                <div className={styles.amountSection}>
                    <div className={styles.amountLabel}>
                        <span>Amount (MON)</span>
                        <span>Balance: {parseFloat(balance).toFixed(4)} {symbol}</span>
                    </div>
                    <input
                        type="number"
                        className={styles.amountInput}
                        placeholder="0.01"
                        value={betAmount}
                        onChange={e => setBetAmount(e.target.value)}
                        min="0"
                        step="0.01"
                    />
                    <div className={styles.quickAmounts}>
                        {[0.01, 0.05, 0.1, 0.5].map(amt => (
                            <button
                                key={amt}
                                className={styles.quickBtn}
                                onClick={() => setBetAmount(String(amt))}
                            >
                                {amt} MON
                            </button>
                        ))}
                    </div>
                </div>

                {/* Payout Preview */}
                <div className={styles.payoutPreview}>
                    <span className={styles.payoutLabel}>Potential Payout</span>
                    <span className={styles.payoutValue}>{potentialPayout} MON</span>
                </div>

                {/* Tx Status */}
                {txStatus && (
                    <div style={{
                        fontSize: '11px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        textAlign: 'center',
                        marginBottom: '8px',
                        background: isSuccess ? 'rgba(0,255,136,0.1)' : betError ? 'rgba(255,0,68,0.1)' : 'rgba(255,255,255,0.05)',
                        color: isSuccess ? '#00FF88' : betError ? '#FF0044' : '#FFD700',
                    }}>
                        {txStatus}
                        {hash && (
                            <a
                                href={`https://testnet.monadscan.com/tx/${hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#00FF88', marginLeft: '6px' }}
                            >
                                View tx ↗
                            </a>
                        )}
                    </div>
                )}

                {/* Place Bet Button */}
                <button
                    className={styles.placeBetBtn}
                    disabled={!selectedAgent || amount <= 0 || isPending || isConfirming}
                    onClick={handlePlaceBet}
                >
                    {isPending
                        ? 'Confirm in Wallet...'
                        : isConfirming
                            ? 'Confirming on Monad...'
                            : !selectedAgent
                                ? 'Select an Agent'
                                : amount <= 0
                                    ? 'Enter Amount'
                                    : `Bet ${amount} MON on ${selectedAgent === proAgent?.agentId ? 'PRO' : 'CON'}`
                    }
                </button>
            </div>

            <div className={styles.rakeNotice}>
                Platform takes <span>7% rake</span> from winning pool · Bets are <span style={{ color: '#00FF88' }}>on-chain</span>
            </div>
        </div>
    )
}
