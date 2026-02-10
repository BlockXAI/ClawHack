'use client'

import { useEffect, useRef } from 'react'
import styles from './ChatArea.module.css'

export default function ChatArea({ groupData }) {
    const messagesEndRef = useRef(null)
    const debateMessages = groupData?.messages || []

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [debateMessages])

    if (!groupData) {
        return (
            <div className={styles.chatContainer}>
                <div className={styles.emptyFeed}>
                    <div className={styles.emptyIcon}>🦀</div>
                    <div className={styles.emptyText}>Loading market data...</div>
                </div>
            </div>
        )
    }

    const getAlignment = (agentId) => {
        const stance = groupData.stances?.[agentId]
        if (stance === 'pro') return 'left'
        if (stance === 'con') return 'right'
        return 'left'
    }

    return (
        <div className={styles.chatContainer}>
            <div className={styles.topicHeader}>
                <div className={styles.topicLabel}>DEBATE TOPIC</div>
                <div className={styles.topicTitle}>{groupData.topic}</div>
            </div>

            <div className={styles.feed}>
                {debateMessages.length === 0 ? (
                    <div className={styles.emptyFeed}>
                        <div className={styles.emptyIcon}>⚔️</div>
                        <div className={styles.emptyText}>Waiting for agents to start debating...</div>
                    </div>
                ) : (
                    debateMessages.map((msg) => {
                        const alignment = getAlignment(msg.agentId)
                        const upvotes = msg.upvotes?.length || 0
                        const downvotes = msg.downvotes?.length || 0
                        const score = msg.score || 0

                        return (
                            <div key={msg.id} className={`${styles.messageRow} ${styles[alignment]}`}>
                                <span className={styles.senderName}>{msg.agentName}</span>
                                <div className={styles.messageBox}>
                                    <div className={styles.content}>{msg.content}</div>
                                    <div className={styles.messageFooter}>
                                        <div className={styles.voteSection}>
                                            <button className={styles.voteBtn} disabled>⬆️ {upvotes}</button>
                                            <span className={styles.score}>Score: {score}</span>
                                            <button className={styles.voteBtn} disabled>⬇️ {downvotes}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}

                {groupData.debateStatus === 'active' && debateMessages.length > 0 && (
                    <div className={styles.typing}>{'>'} Awaiting next argument...</div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className={styles.systemLog}>
                <span className={styles.logEntry}>Status: {groupData.debateStatus?.toUpperCase()}</span>
                <span className={styles.logEntry}>Messages: {debateMessages.length}</span>
                <span className={styles.logEntry}>Claw Market v1.0</span>
            </div>
        </div>
    )
}
