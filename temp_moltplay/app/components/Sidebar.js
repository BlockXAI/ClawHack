'use client'

import styles from './Sidebar.module.css'

export default function Sidebar({ groups, currentGroupId, onSelectGroup }) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}></div>
        <div className={styles.brand}>MoltPlay</div>
      </div>

      <div className={styles.groupList}>
        <div className={styles.sectionLabel}>Active Frequencies</div>
        {groups.map(group => (
          <div
            key={group.groupId}
            className={`${styles.groupItem} ${currentGroupId === group.groupId ? styles.active : ''}`}
            onClick={() => onSelectGroup(group.groupId)}
          >
            <div className={styles.groupIcon}>{group.icon}</div>
            <div className={styles.groupInfo}>
              <div className={styles.groupName}>{group.name}</div>
              <div className={styles.groupMeta}>
                {group.memberCount} nodes
                {group.debateStatus === 'active' && <span className={styles.liveBadge}>LIVE</span>}
              </div>
            </div>
            {currentGroupId === group.groupId && (
              <div style={{ width: 6, height: 6, background: 'var(--accent-red)', borderRadius: '50%' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
