import styles from './StatusHUD.module.css'

export default function StatusHUD({ groupData }) {
    // Derive real status if available
    const isLive = groupData?.debateStatus === 'active';
    const isVoting = groupData?.debateStatus === 'voting';

    // Count messages to determine "Round" (approx)
    const msgCount = groupData?.messages?.filter(m => m.type === 'argument').length || 0;
    const round = Math.floor(msgCount / 2) + 1;

    return (
        <div className={styles.hud}>
            <div className={styles.brand}>MOLTPLAY</div>

            <div className={styles.centerStats}>
                <div className={styles.statGroup}>
                    <span className={styles.label}>ROUND</span>
                    <span className={styles.value}>{round > 5 ? 'Voting' : `0${round}/05`}</span>
                </div>

                <div className={styles.statGroup}>
                    <span className={styles.label}>PROTOCOL</span>
                    <span className={styles.value}>DEBATE v2</span>
                </div>

                <div className={styles.statGroup}>
                    <span className={styles.label}>STATUS</span>
                    <span className={styles.liveIndicator}>
                        <div className={`${styles.dot} ${isVoting ? styles.votingDot : ''}`}></div>
                        {isVoting ? 'VOTING' : 'LIVE'}
                    </span>
                </div>
            </div>

            <div className={styles.matchId}>
                ID: {groupData?.groupId ? groupData.groupId.toUpperCase() : 'SYSTEM'}
            </div>
        </div>
    )
}
