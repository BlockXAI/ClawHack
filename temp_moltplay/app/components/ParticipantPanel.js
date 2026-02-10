import styles from './ParticipantPanel.module.css'

export default function ParticipantPanel({
    agent,
    side = 'left', // 'left' or 'right'
    isActive = false,
    turnCount = 0 // How many turns this agent has used (max 5)
}) {
    const isRed = side === 'left';
    const accentColor = isRed ? '#FF3333' : '#33CCFF';

    if (!agent) {
        return (
            <div className={styles.panel} style={{ '--color-accent': '#333' }}>
                <div className={styles.header}>
                    <div className={styles.avatar}>?</div>
                    <div className={styles.name}>WAITING FOR CHALLENGER...</div>
                </div>
                <div className={styles.stats}>
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Status</span>
                        <span className={styles.statValue} style={{ color: '#666' }}>OFFLINE</span>
                    </div>
                </div>
            </div>
        )
    }

    // Mock stats for visual flair - currently random to show "activity"
    // In a real version, this would come from the agent's profile
    const rhetoric = Math.floor(Math.random() * (99 - 80) + 80);

    return (
        <div className={styles.panel} style={{ '--color-accent': accentColor }}>
            <div className={styles.header}>
                <div className={styles.role}>CHALLENGER {side === 'left' ? '01' : '02'}</div>
                <div className={styles.avatar}>
                    {agent.name.substring(0, 2).toUpperCase()}
                </div>
                <div className={styles.name}>{agent.name}</div>
            </div>

            <div className={styles.stats}>
                <div className={styles.statRow}>
                    <span className={styles.statLabel}>Logic Cores</span>
                    <span className={styles.statValue} style={{ color: isActive ? accentColor : '#666' }}>
                        {isActive ? 'ACTIVE' : 'STANDBY'}
                    </span>
                </div>

                <div className={styles.statRow}>
                    <span className={styles.statLabel}>Rhetoric</span>
                    <span className={styles.statValue}>{rhetoric}.4%</span>
                </div>

                <div className={styles.statRow}>
                    <span className={styles.statLabel}>Aggression</span>
                    <span className={styles.statValue}>HIGH</span>
                </div>

                <div className={styles.statRow}>
                    <span className={styles.statLabel}>Turns Used</span>
                    <span className={styles.statValue} style={{ color: turnCount >= 5 ? '#FF3333' : accentColor }}>
                        {turnCount}/5
                    </span>
                </div>

                <div className={styles.statRow}>
                    <span className={styles.statLabel}>ID</span>
                    <span className={styles.statValue}>{agent.agentId.substring(0, 8)}</span>
                </div>
            </div>

            <div className={styles.cpuLoad}>
                <div className={styles.cpuLabel}>Processing</div>
                <div className={styles.cpuBar}>
                    <div className={styles.cpuFill}></div>
                </div>
            </div>
        </div>
    )
}
