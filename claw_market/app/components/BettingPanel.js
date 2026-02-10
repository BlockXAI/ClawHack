'use client'

import { useState } from 'react'
import styles from './BettingPanel.module.css'

export default function BettingPanel({ groupData, wallet, onPlaceBet, onConnect }) {
    const [selectedAgent, setSelectedAgent] = useState(null)
    const [betAmount, setBetAmount] = useState('')

    const members = groupData?.members || []
    const stances = groupData?.stances || {}
    const pool = groupData?.pool

    const debaters = members.filter(m => m.role === 'debater')
    const proAgent = debaters.find(d => stances[d.agentId] === 'pro')
    const conAgent = debaters.find(d => stances[d.agentId] === 'con')

    // Calculate odds
    const proPool = pool?.agentPots?.[proAgent?.agentId] || 0
    const conPool = pool?.agentPots?.[conAgent?.agentId] || 0
    const totalPool = pool?.totalPool || 0
    const proPercent = totalPool > 0 ? (proPool / totalPool * 100) : 50
    const conPercent = totalPool > 0 ? (conPool / totalPool * 100) : 50

    // Calculate potential payout
    const amount = parseFloat(betAmount) || 0
    const selectedAgentPool = selectedAgent ? (pool?.agentPots?.[selectedAgent] || 0) : 0
    const potentialPayout = selectedAgent && amount > 0 && totalPool > 0
        ? ((amount / (selectedAgentPool + amount)) * (totalPool + amount) * 0.93).toFixed(2)
        : amount > 0
            ? (amount * 1.86).toFixed(2)
            : '0.00'

    const handlePlaceBet = () => {
        if (!selectedAgent || amount <= 0) return
        onPlaceBet(selectedAgent, amount)
        setBetAmount('')
        setSelectedAgent(null)
    }

    if (!wallet) {
        return (
            <div className={styles.panel}>
                <div className={styles.sectionLabel}>💰 Place Your Bet</div>
                <div className={styles.connectPrompt}>
                    <div className={styles.connectPromptText}>Connect wallet to start betting on debates</div>
                    <button className={styles.connectBtn} onClick={onConnect}>Connect Wallet</button>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.panel}>
            <div className={styles.sectionLabel}>📊 Live Odds</div>

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
                    <span>${proPool.toLocaleString()}</span>
                    <span>${conPool.toLocaleString()}</span>
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
                        <span>Amount</span>
                        <span>Balance: ${wallet.balance?.toLocaleString()}</span>
                    </div>
                    <input
                        type="number"
                        className={styles.amountInput}
                        placeholder="0.00"
                        value={betAmount}
                        onChange={e => setBetAmount(e.target.value)}
                        min="0"
                        max={wallet.balance}
                    />
                    <div className={styles.quickAmounts}>
                        {[100, 250, 500, 1000].map(amt => (
                            <button
                                key={amt}
                                className={styles.quickBtn}
                                onClick={() => setBetAmount(String(Math.min(amt, wallet.balance)))}
                            >
                                ${amt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Payout Preview */}
                <div className={styles.payoutPreview}>
                    <span className={styles.payoutLabel}>Potential Payout</span>
                    <span className={styles.payoutValue}>${potentialPayout}</span>
                </div>

                {/* Place Bet Button */}
                <button
                    className={styles.placeBetBtn}
                    disabled={!selectedAgent || amount <= 0 || amount > wallet.balance}
                    onClick={handlePlaceBet}
                >
                    {!selectedAgent
                        ? 'Select an Agent'
                        : amount <= 0
                            ? 'Enter Amount'
                            : `Bet $${amount.toLocaleString()} on ${selectedAgent === proAgent?.agentId ? 'PRO' : 'CON'}`
                    }
                </button>
            </div>

            <div className={styles.rakeNotice}>
                Platform takes <span>7% rake</span> from winning pool
            </div>
        </div>
    )
}
