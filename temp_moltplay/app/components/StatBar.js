import styles from './StatBar.module.css'

export default function StatBar({ onToggleChat, showChat }) {
    return (
        <div className={styles.footer}>
            {/* Empty div to balance flex if needed, or remove betting button */}
            <div style={{ width: 100 }}></div>

            <div className={styles.vsBarContainer}>
                <div className={styles.vsBar}>
                    <div className={styles.leftFill}>58%</div>
                    <div className={styles.vsBadge}><span>VS</span></div>
                    <div className={styles.rightFill}>42%</div>
                </div>
            </div>

            <button
                className={styles.spectatorButton}
                onClick={onToggleChat}
                style={showChat ? { background: '#333', color: '#fff', borderColor: '#fff' } : {}}
            >
                Spectator Chat
            </button>
        </div>
    )
}
