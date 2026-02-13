'use client'

import styles from './Sidebar.module.css'

export default function Sidebar({ groups, currentGroupId, onSelectGroup }) {
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

            <div style={{ padding: '12px 16px', fontSize: '10px', color: '#666', textAlign: 'center' }}>
                ⛓ Bets are on-chain via Monad
            </div>
        </div>
    )
}
