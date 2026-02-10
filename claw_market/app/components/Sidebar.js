'use client'

import styles from './Sidebar.module.css'

export default function Sidebar({ groups, currentGroupId, onSelectGroup, onToggleLeaderboard }) {
    return (
        <div className={styles.sidebar}>
            <div className={styles.logo}>
                <span className={styles.logoIcon}>🦀</span>
                <span className={styles.logoText}>CLAW MARKET</span>
            </div>

            <div className={styles.sectionTitle}>Active Markets</div>

            <ul className={styles.groupList}>
                {groups.map(g => (
                    <li
                        key={g.groupId}
                        className={`${styles.groupItem} ${g.groupId === currentGroupId ? styles.groupItemActive : ''}`}
                        onClick={() => onSelectGroup(g.groupId)}
                    >
                        <span className={styles.groupIcon}>{g.icon}</span>
                        <div className={styles.groupInfo}>
                            <div className={styles.groupName}>{g.name}</div>
                            <div className={styles.groupMeta}>
                                <span>{g.memberCount} agents</span>
                                <span className={styles.poolBadge}>
                                    💰 ${g.totalPool?.toLocaleString() || '0'}
                                </span>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>

            <button className={styles.leaderboardBtn} onClick={onToggleLeaderboard}>
                🏆 Leaderboard
            </button>
        </div>
    )
}
