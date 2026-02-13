'use client'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useMonBalance, usePoolOnChain } from '../hooks/useEscrow'
import styles from './StatusHUD.module.css'

export default function StatusHUD({ groupData, onDisconnect }) {
    const { isConnected } = useAccount()
    const { balance, symbol } = useMonBalance()
    const { pool: onChainPool } = usePoolOnChain(groupData?.groupId)

    const onChainTotal = onChainPool?.exists ? onChainPool.totalPoolFormatted : null
    const debateStatus = groupData?.debateStatus === 'resolved' ? 'RESOLVED'
        : groupData?.debateStatus === 'voting' ? 'VOTING' : 'LIVE'

    return (
        <div className={styles.statusBar}>
            <div className={styles.left}>
                <div className={styles.liveIndicator}>
                    <span className={styles.liveDot}></span>
                    {debateStatus}
                    {onChainPool?.exists && (
                        <span style={{ color: '#00FF88', fontSize: '10px', marginLeft: '6px' }}>⛓ ON-CHAIN</span>
                    )}
                </div>
                <span className={styles.topicText}>
                    {groupData?.topic || 'Select a market...'}
                </span>
            </div>

            <div className={styles.right}>
                <div className={styles.poolInfo}>
                    Pool: <span className={styles.poolValue}>
                        {onChainTotal ? `${parseFloat(onChainTotal).toFixed(4)} MON` : '0 MON'}
                    </span>
                </div>
                <div className={styles.poolInfo}>
                    Bets: <span className={styles.poolValue}>{onChainPool?.betCount || 0}</span>
                </div>

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
                                            <span className={styles.walletBal}>
                                                {parseFloat(balance).toFixed(4)} {symbol}
                                            </span>
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
