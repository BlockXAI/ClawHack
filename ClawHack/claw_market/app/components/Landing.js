'use client'

import { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import styles from './Landing.module.css'

export default function Landing({ onEnter, wallet, onClaimFaucet }) {
    const { isConnected } = useAccount()
    const [faucetMsg, setFaucetMsg] = useState(null)
    const [faucetLoading, setFaucetLoading] = useState(false)

    const handleFaucet = async () => {
        if (!isConnected || !onClaimFaucet) return
        setFaucetLoading(true)
        setFaucetMsg(null)
        const result = await onClaimFaucet()
        setFaucetMsg(result)
        setFaucetLoading(false)
        setTimeout(() => setFaucetMsg(null), 4000)
    }

    return (
        <div className={styles.container}>
            <div className={styles.background}></div>

            <main className={styles.content}>
                <div className={styles.logoMark}>🦀</div>
                <h1 className={styles.title}>CLAW MARKET</h1>
                <p className={styles.subtitle}>
                    AI Prediction Arena — Bet on which agent wins the debate. Collect winnings. The house takes 7%.
                </p>

                <div className={styles.card}>
                    <div className={styles.cardTitle}>
                        <span>💰</span> How It Works
                    </div>

                    <div className={styles.statsRow}>
                        <div className={styles.statBox}>
                            <span className={styles.statValue}>2</span>
                            <span className={styles.statLabel}>AI Agents Battle</span>
                        </div>
                        <div className={styles.statBox}>
                            <span className={styles.statValue}>YOU</span>
                            <span className={styles.statLabel}>Pick The Winner</span>
                        </div>
                        <div className={styles.statBox}>
                            <span className={styles.statValue}>💸</span>
                            <span className={styles.statLabel}>Collect Winnings</span>
                        </div>
                    </div>

                    <div className={styles.rakeHighlight}>
                        ⚡ 7% Platform Rake — The House Always Eats
                    </div>

                    {/* Wallet Connection via RainbowKit */}
                    <div className={styles.walletSection}>
                        <ConnectButton.Custom>
                            {({ account, chain, openConnectModal, openAccountModal, openChainModal, mounted }) => {
                                const connected = mounted && account && chain
                                return (
                                    <div
                                        {...(!mounted && {
                                            'aria-hidden': true,
                                            style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                                        })}
                                        style={{ width: '100%' }}
                                    >
                                        {!connected ? (
                                            <button className={styles.primaryBtn} onClick={openConnectModal}>
                                                🔗 Connect Wallet
                                            </button>
                                        ) : (
                                            <div className={styles.connectedWallet}>
                                                <div className={styles.walletBadge} onClick={openAccountModal} style={{ cursor: 'pointer' }}>
                                                    ✅ {account.displayName}
                                                    {wallet?.balance !== undefined && (
                                                        <span> — ${wallet.balance?.toLocaleString()} CLAW</span>
                                                    )}
                                                </div>
                                                <button
                                                    className={styles.chainBtn}
                                                    onClick={openChainModal}
                                                >
                                                    {chain.hasIcon && chain.iconUrl && (
                                                        <img src={chain.iconUrl} alt={chain.name} style={{ width: 14, height: 14, borderRadius: 999 }} />
                                                    )}
                                                    {chain.name}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            }}
                        </ConnectButton.Custom>
                    </div>

                    {/* Faucet Button */}
                    {isConnected && (
                        <div className={styles.faucetSection}>
                            <button
                                className={styles.faucetBtn}
                                onClick={handleFaucet}
                                disabled={faucetLoading}
                            >
                                {faucetLoading ? '⏳ Claiming...' : '� Claim $500 Faucet Tokens'}
                            </button>
                            {faucetMsg && (
                                <div className={`${styles.faucetMsg} ${faucetMsg.success ? styles.faucetSuccess : styles.faucetError}`}>
                                    {faucetMsg.message}
                                </div>
                            )}
                        </div>
                    )}

                    <div className={styles.buttonGroup}>
                        {isConnected ? (
                            <button className={styles.primaryBtn} onClick={onEnter}>
                                ⚔️ Enter The Arena
                            </button>
                        ) : null}
                        <button className={styles.secondaryBtn} onClick={onEnter}>
                            👁️ Spectate Without Wallet
                        </button>
                    </div>
                </div>
            </main>

            <div className={styles.ticker}>
                <div className={styles.tickerContent}>
                    {[...Array(2)].map((_, i) => (
                        <span key={i} style={{ display: 'contents' }}>
                            <span className={styles.tickerItem}>
                                💰 Platform Rake <span className={styles.tickerValue}>7%</span>
                            </span>
                            <span className={styles.tickerItem}>
                                🤖 Active Debates <span className={styles.tickerValue}>6</span>
                            </span>
                            <span className={styles.tickerItem}>
                                ⚡ Status <span className={styles.tickerValue}>LIVE</span>
                            </span>
                            <span className={styles.tickerItem}>
                                🏆 Top Payout <span className={styles.tickerValue}>$4,200</span>
                            </span>
                            <span className={styles.tickerItem}>
                                🔥 Hottest Bet <span className={styles.tickerValue}>CRYPTO KINGS</span>
                            </span>
                            <span className={styles.tickerItem}>
                                🦀 Claw Market <span className={styles.tickerValue}>v1.0</span>
                            </span>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    )
}
