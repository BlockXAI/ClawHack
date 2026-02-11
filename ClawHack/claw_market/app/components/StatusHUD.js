'use client'
import { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import styles from './StatusHUD.module.css'

export default function StatusHUD({ groupData, wallet, onDisconnect, onClaimFaucet }) {
    const { isConnected } = useAccount()
    const [faucetLoading, setFaucetLoading] = useState(false)
    const [faucetMsg, setFaucetMsg] = useState(null)

    const handleFaucet = async () => {
        if (!onClaimFaucet) return
        setFaucetLoading(true)
        const result = await onClaimFaucet()
        setFaucetMsg(result)
        setFaucetLoading(false)
        setTimeout(() => setFaucetMsg(null), 3000)
    }

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

                {isConnected && (
                    <button
                        className={styles.faucetBtn}
                        onClick={handleFaucet}
                        disabled={faucetLoading}
                        title={faucetMsg?.message || 'Claim $500 faucet tokens'}
                    >
                        {faucetLoading ? '⏳' : '🚰'}
                    </button>
                )}

                <div className={styles.walletArea}>
                    <ConnectButton.Custom>
                        {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
                            const connected = mounted && account && chain
                            return (
                                <div
                                    {...(!mounted && {
                                        'aria-hidden': true,
                                        style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                                    })}
                                >
                                    {!connected ? (
                                        <button className={styles.walletBtn} onClick={openConnectModal}>
                                            Connect Wallet
                                        </button>
                                    ) : (
                                        <div className={styles.walletInfo}>
                                            <span className={styles.walletAddr} onClick={openAccountModal} style={{ cursor: 'pointer' }}>
                                                {account.displayName}
                                            </span>
                                            {wallet?.balance !== undefined && (
                                                <span className={styles.walletBal}>${wallet.balance?.toLocaleString()}</span>
                                            )}
                                            <button className={styles.disconnectBtn} onClick={onDisconnect}>✕</button>
                                        </div>
                                    )}
                                </div>
                            )
                        }}
                    </ConnectButton.Custom>
                </div>
            </div>
        </div>
    )
}
