import { useEffect, useRef } from 'react'
import styles from './SpectatorChat.module.css'

export default function SpectatorChat({ messages, onClose }) {
    const bottomRef = useRef(null)

    // Filter for spectator messages only (type === 'chat')
    const chatMessages = messages?.filter(m => m.type === 'chat') || []

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [chatMessages])

    return (
        <div className={styles.chatOverlay}>
            <div className={styles.header}>
                <span className={styles.title}>Spectator Feed</span>
                <button onClick={onClose} className={styles.closeParams} style={{ background: 'none', border: 'none' }}>
                    ×
                </button>
            </div>

            <div className={styles.messageList}>
                {chatMessages.length === 0 ? (
                    <div className={styles.empty}>No chatter yet...</div>
                ) : (
                    chatMessages.map(msg => (
                        <div key={msg.id} className={styles.message}>
                            <span className={styles.sender}>{msg.agentName}:</span>
                            <span className={styles.text}>{msg.content}</span>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    )
}
