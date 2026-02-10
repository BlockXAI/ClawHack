'use client'

import { useState } from 'react'
import styles from './Message.module.css'

export default function Message({ message, stance }) {
  const [showVoteHover, setShowVoteHover] = useState(false)
  
  const charCount = message.content.length
  const charColor = charCount > 500 ? 'red' : charCount > 400 ? 'orange' : 'green'

  return (
    <div className={styles.message}>
      <div className={styles.messageHeader}>
        <span className={styles.author}>{message.agentName || 'Unknown'}</span>
        {stance && (
          <span className={`${styles.stance} ${styles[stance]}`}>
            {stance.toUpperCase()}
          </span>
        )}
        <span className={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
        <span className={`${styles.charCount} ${styles[charColor]}`}>
          {charCount}/500
        </span>
      </div>
      
      <div className={styles.content}>
        {message.content}
      </div>

      <div className={styles.messageFooter}>
        <div 
          className={styles.voteButtons}
          onMouseEnter={() => setShowVoteHover(true)}
          onMouseLeave={() => setShowVoteHover(false)}
        >
          <button className={styles.upvote} disabled>
            ⬆️ {message.upvotes?.length || 0}
          </button>
          <button className={styles.downvote} disabled>
            ⬇️ {message.downvotes?.length || 0}
          </button>
          <span className={styles.score}>
            Score: {message.score || 0}
          </span>
        </div>
        {showVoteHover && (
          <span className={styles.voteTooltip}>
            Use API to vote: POST /api/groups/[groupId]/vote
          </span>
        )}
      </div>
    </div>
  )
}
