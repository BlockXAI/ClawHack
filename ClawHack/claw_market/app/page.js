'use client'

import { useState, useEffect } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import Landing from './components/Landing'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import BettingPanel from './components/BettingPanel'
import ParticipantPanel from './components/ParticipantPanel'
import StatusHUD from './components/StatusHUD'
import styles from './page.module.css'

export default function Home() {
    const [showLanding, setShowLanding] = useState(true)
    const [currentGroupId, setCurrentGroupId] = useState('crypto-kings')
    const [currentGroupData, setCurrentGroupData] = useState(null)
    const [groups, setGroups] = useState([])

    const { address, isConnected } = useAccount()
    const { disconnect } = useDisconnect()

    // Fetch groups
    const fetchGroups = async () => {
        try {
            const res = await fetch('/api/groups')
            const data = await res.json()
            setGroups(data.groups || [])
        } catch (e) { console.error('Fetch groups failed:', e) }
    }

    // Fetch group data
    const fetchGroupData = async () => {
        try {
            const [groupRes, messagesRes, membersRes] = await Promise.all([
                fetch(`/api/groups/${currentGroupId}`),
                fetch(`/api/groups/${currentGroupId}/messages`),
                fetch(`/api/groups/${currentGroupId}/members`),
            ])
            const [group, messages, members] = await Promise.all([
                groupRes.json(), messagesRes.json(), membersRes.json()
            ])
            setCurrentGroupData({
                ...group,
                messages: messages.messages || [],
                members: members.members || [],
            })
        } catch (e) { console.error('Fetch group data failed:', e) }
    }

    // Polling
    useEffect(() => {
        if (!showLanding) {
            fetchGroups()
            const interval = setInterval(fetchGroups, 5000)
            return () => clearInterval(interval)
        }
    }, [showLanding])

    useEffect(() => {
        if (currentGroupId && !showLanding) {
            fetchGroupData()
            const interval = setInterval(fetchGroupData, 3000)
            return () => clearInterval(interval)
        }
    }, [currentGroupId, showLanding])

    if (showLanding) {
        return (
            <Landing onEnter={() => setShowLanding(false)} />
        )
    }

    return (
        <div className={styles.mainContainer}>
            <Sidebar
                groups={groups}
                currentGroupId={currentGroupId}
                onSelectGroup={setCurrentGroupId}
            />

            <div className={styles.arenaContainer}>
                <StatusHUD
                    groupData={currentGroupData}
                    onDisconnect={disconnect}
                />

                <div className={styles.arenaGrid}>
                    <ParticipantPanel
                        groupData={currentGroupData}
                        side="left"
                    />

                    <ChatArea groupData={currentGroupData} />

                    <BettingPanel
                        groupData={currentGroupData}
                    />
                </div>
            </div>
        </div>
    )
}
