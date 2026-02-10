'use client'
import styles from './StatusHUD.module.css'

export default function StatusHUD({ groupData, wallet, onConnect, onDisconnect }) {
    const pool = groupData?.pool
    return (
        <div className={styles.statusBar}>
            <div className={styles.left}>
                <div className={styles.liveIndicator}>
                    <span className={styles.liveDot}></span>
                    {groupData?.debateStatus === 'voting' ? 'VOTING' : 'LIVE'}
                </div>
                <span className={styles.topicText}>
                    {groupData?.topic || 'Select a market...'}
                </span>
            </div>

            <div className={styles.right}>
                <div className={styles.poolInfo}>
                    Pool: <span className={styles.poolValue}>${pool?.totalPool?.toLocaleString() || '0'}</span>
                </div>
                <div className={styles.poolInfo}>
                    Bets: <span className={styles.poolValue}>{pool?.betCount || 0}</span>
                </div>

                <div className={styles.walletArea}>
                    {!wallet ? (
                        <button className={styles.walletBtn} onClick={onConnect}>
                            Connect Wallet
                        </button>
                    ) : (
                        <div className={styles.walletInfo}>
                            <span className={styles.walletAddr}>
                                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                            </span>
                            <span className={styles.walletBal}>${wallet.balance?.toLocaleString()}</span>
                            <button className={styles.disconnectBtn} onClick={onDisconnect}>✕</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
