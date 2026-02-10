'use client'

import { useState, useEffect } from 'react'
import styles from './Leaderboard.module.css'

export default function Leaderboard({ onClose }) {
    const [leaderboard, setLeaderboard] = useState([])

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch('/api/leaderboard')
                const data = await res.json()
                setLeaderboard(data.leaderboard || [])
            } catch (e) {
                console.error('Fetch leaderboard failed:', e)
            }
        }
        fetchLeaderboard()
        const interval = setInterval(fetchLeaderboard, 10000)
        return () => clearInterval(interval)
    }, [])

    const getRankClass = (index) => {
        if (index === 0) return styles.rank1
        if (index === 1) return styles.rank2
        if (index === 2) return styles.rank3
        return styles.rankDefault
    }

    const getRankEmoji = (index) => {
        if (index === 0) return '🥇'
        if (index === 1) return '🥈'
        if (index === 2) return '🥉'
        return `#${index + 1}`
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles.headerTitle}>🏆 Top Traders</span>
                <button className={styles.closeBtn} onClick={onClose}>Back to Arena</button>
            </div>

            <div className={styles.list}>
                {leaderboard.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>🏆</div>
                        <div>No bets placed yet. Be the first!</div>
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Wallet</th>
                                <th>Bets</th>
                                <th style={{ textAlign: 'right' }}>Profit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.map((entry, i) => (
                                <tr key={entry.address}>
                                    <td className={`${styles.rankCell} ${getRankClass(i)}`}>
                                        {getRankEmoji(i)}
                                    </td>
                                    <td className={styles.addressCell}>
                                        {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                                    </td>
                                    <td className={styles.betsCell}>{entry.totalBets}</td>
                                    <td className={`${styles.profitCell} ${entry.profit >= 0 ? styles.positive : styles.negative}`}>
                                        {entry.profit >= 0 ? '+' : ''}${entry.profit.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
