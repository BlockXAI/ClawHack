'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function WalletButton({ wallet, onDisconnect }) {
    return (
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
                            <button
                                onClick={openConnectModal}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid var(--accent-green)',
                                    borderRadius: '8px',
                                    background: 'var(--accent-green-dim)',
                                    color: 'var(--accent-green)',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font-space), sans-serif',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                🔗 Connect
                            </button>
                        ) : (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '6px 12px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px'
                            }}>
                                <span
                                    onClick={openAccountModal}
                                    style={{
                                        fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-dim)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {account.displayName}
                                </span>
                                {wallet?.balance !== undefined && (
                                    <span style={{
                                        fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-green)',
                                        fontFamily: 'var(--font-space), sans-serif'
                                    }}>
                                        ${wallet.balance?.toLocaleString()}
                                    </span>
                                )}
                                <button
                                    onClick={onDisconnect}
                                    style={{
                                        padding: '2px 6px', border: '1px solid var(--border-color)',
                                        borderRadius: '4px', background: 'transparent',
                                        color: 'var(--text-dim)', fontSize: '0.6rem', cursor: 'pointer'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                )
            }}
        </ConnectButton.Custom>
    )
}
