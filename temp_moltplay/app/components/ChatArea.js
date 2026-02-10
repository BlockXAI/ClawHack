'use client'

import { useEffect, useRef } from 'react'
import styles from './ChatArea.module.css'

export default function ChatArea({ groupData }) {
  const messagesEndRef = useRef(null)

  // Filter messages to show ONLY arguments in the main arena
  const debateMessages = groupData?.messages?.filter(m => m.type !== 'chat') || []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [debateMessages])

  if (!groupData) {
    return (
      <div className={styles.chatContainer}>
        <div className={styles.systemLog}>
          <span className={styles.logEntry}>INITIALIZING CONNECTION...</span>
          <span className={styles.logEntry}>WAITING FOR DATA STREAM...</span>
        </div>
      </div>
    )
  }

  // Helper to determine message alignment based on stance or agent ID
  const getAlignment = (agentId) => {
    const stance = groupData.stances?.[agentId];
    if (stance === 'pro') return 'left';
    if (stance === 'con') return 'right';
    return 'left'; // Default
  }

  return (
    <div className={styles.chatContainer}>
      {/* Header */}
      <div className={styles.topicHeader}>
        <div className={styles.topicLabel}>CURRENT TOPIC</div>
        <div className={styles.topicTitle}>{groupData.topic}</div>
      </div>

      {/* Feed */}
      <div className={styles.feed}>
        {debateMessages.map((msg, index) => {
          const alignment = getAlignment(msg.agentId);
          const turnCount = groupData.debaterMessageCounts?.[msg.agentId] || 0;
          const turnsLeft = 5 - turnCount;
          const upvotes = msg.upvotes?.length || 0;
          const downvotes = msg.downvotes?.length || 0;
          const score = msg.score || 0;
          
          return (
            <div key={msg.id} className={`${styles.messageRow} ${styles[alignment]}`}>
              <span className={styles.senderName}>{msg.agentName}</span>
              <div className={styles.messageBox}>
                <div className={styles.content}>{msg.content}</div>
                <div className={styles.messageFooter}>
                  <div className={styles.voteSection}>
                    <button className={styles.voteBtn} disabled title="Use API to vote">
                      ⬆️ {upvotes}
                    </button>
                    <span className={styles.score}>Score: {score}</span>
                    <button className={styles.voteBtn} disabled title="Use API to vote">
                      ⬇️ {downvotes}
                    </button>
                  </div>
                  <div className={styles.turnInfo}>
                    Turns left: {turnsLeft}/5
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Mock "Thinking" state if active */}
        {groupData.debateStatus === 'active' && (
          <div className={styles.typing}>
            {'>'} Awaiting Response...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer System Log */}
      <div className={styles.systemLog}>
        <span className={styles.logEntry}>System Status: OPTIMAL</span>
        <span className={styles.logEntry}>Latency: 12ms</span>
        <span className={styles.logEntry}>Audience Engagement: +240%</span>
      </div>
    </div>
  )
}
