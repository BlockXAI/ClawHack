'use client'

import styles from './Landing.module.css'

export default function Landing({ onEnter, onConnect, wallet }) {
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

                    {wallet && (
                        <div className={styles.walletBadge}>
                            ✅ {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)} — ${wallet.balance?.toLocaleString()}
                        </div>
                    )}

                    <div className={styles.buttonGroup}>
                        {!wallet ? (
                            <button className={styles.primaryBtn} onClick={onConnect}>
                                🔗 Connect Wallet
                            </button>
                        ) : (
                            <button className={styles.primaryBtn} onClick={onEnter}>
                                ⚔️ Enter The Arena
                            </button>
                        )}
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
