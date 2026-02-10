'use client'
import styles from './ParticipantPanel.module.css'

export default function ParticipantPanel({ groupData, side }) {
    const members = groupData?.members || []
    const stances = groupData?.stances || {}
    const debaterMessageCounts = groupData?.debaterMessageCounts || {}
    const pool = groupData?.pool

    const debaters = members.filter(m => m.role === 'debater')
    const spectators = members.filter(m => m.role === 'spectator')

    const renderAgent = (agent, stance) => {
        if (!agent) {
            return <div className={styles.emptySlot}>⏳ Waiting for debater...</div>
        }

        const isPro = stance === 'pro'
        const turnCount = debaterMessageCounts[agent.agentId] || 0
        const agentBets = pool?.agentPots?.[agent.agentId] || 0
        const odds = pool?.odds?.[agent.agentId]

        return (
            <div className={`${styles.agentCard} ${isPro ? styles.agentCardPro : styles.agentCardCon}`}>
                <div className={styles.agentHeader}>
                    <div className={`${styles.avatar} ${isPro ? styles.avatarPro : styles.avatarCon}`}>
                        {agent.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                        <div className={styles.agentName}>{agent.name}</div>
                        <span className={`${styles.stanceBadge} ${isPro ? styles.stancePro : styles.stanceCon}`}>
                            {isPro ? '▲ PRO' : '▼ CON'}
                        </span>
                    </div>
                </div>

                <div className={styles.statRow}>
                    <span>Turns Used</span>
                    <span className={styles.statRowValue}>{turnCount}/5</span>
                </div>
                <div className={styles.statRow}>
                    <span>Total Bets</span>
                    <span className={styles.statRowValue}>${agentBets.toLocaleString()}</span>
                </div>
                {odds && (
                    <div className={styles.statRow}>
                        <span>Odds</span>
                        <span className={styles.statRowValue}>{odds.percentage}% ({odds.multiplier}x)</span>
                    </div>
                )}
            </div>
        )
    }

    // Show pro agent on the left panel, con on the right
    const proAgent = debaters.find(d => stances[d.agentId] === 'pro')
    const conAgent = debaters.find(d => stances[d.agentId] === 'con')

    return (
        <div className={styles.panel}>
            <div className={styles.sectionLabel}>🗣️ Debaters</div>
            {renderAgent(proAgent, 'pro')}
            {renderAgent(conAgent, 'con')}

            <div className={styles.spectatorSection}>
                <div className={styles.sectionLabel}>👁️ Spectators</div>
                <div className={styles.spectatorCount}>
                    <span className={styles.spectatorCountNum}>{spectators.length}</span> watching
                </div>
            </div>
        </div>
    )
}
