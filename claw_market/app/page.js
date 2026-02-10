'use client'

import { useState, useEffect } from 'react'
import Landing from './components/Landing'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import BettingPanel from './components/BettingPanel'
import ParticipantPanel from './components/ParticipantPanel'
import StatusHUD from './components/StatusHUD'
import Leaderboard from './components/Leaderboard'
import WalletButton from './components/WalletButton'
import styles from './page.module.css'

export default function Home() {
    const [showLanding, setShowLanding] = useState(true)
    const [currentGroupId, setCurrentGroupId] = useState('crypto-kings')
    const [currentGroupData, setCurrentGroupData] = useState(null)
    const [groups, setGroups] = useState([])
    const [wallet, setWallet] = useState(null)
    const [showLeaderboard, setShowLeaderboard] = useState(false)

    // Connect wallet (simulated)
    const connectWallet = async () => {
        const address = '0x' + Array.from({ length: 40 }, () =>
            Math.floor(Math.random() * 16).toString(16)
        ).join('')

        try {
            const res = await fetch('/api/wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, initialBalance: 10000 })
            })
            const data = await res.json()
            setWallet({ address, ...data.wallet })
        } catch (e) {
            console.error('Wallet connect failed:', e)
        }
    }

    const refreshWallet = async () => {
        if (!wallet?.address) return
        try {
            const res = await fetch(`/api/wallet?address=${wallet.address}`)
            const data = await res.json()
            if (data.wallet) setWallet({ address: wallet.address, ...data.wallet })
        } catch (e) { /* ignore */ }
    }

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
                fetch(`/api/groups/${currentGroupId}/members`)
            ])
            const [group, messages, members] = await Promise.all([
                groupRes.json(), messagesRes.json(), membersRes.json()
            ])
            setCurrentGroupData({
                ...group,
                messages: messages.messages || [],
                members: members.members || []
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

    // Place bet handler
    const handlePlaceBet = async (agentId, amount) => {
        if (!wallet) return
        try {
            const res = await fetch('/api/bets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: wallet.address,
                    debateId: currentGroupId,
                    agentId,
                    amount
                })
            })
            const data = await res.json()
            if (res.ok) {
                refreshWallet()
                fetchGroupData()
            } else {
                alert(data.error || 'Bet failed')
            }
        } catch (e) {
            alert('Bet failed: ' + e.message)
        }
    }

    if (showLanding) {
        return <Landing onEnter={() => setShowLanding(false)} onConnect={connectWallet} wallet={wallet} />
    }

    return (
        <div className={styles.mainContainer}>
            <Sidebar
                groups={groups}
                currentGroupId={currentGroupId}
                onSelectGroup={setCurrentGroupId}
                onToggleLeaderboard={() => setShowLeaderboard(!showLeaderboard)}
            />

            <div className={styles.arenaContainer}>
                <StatusHUD
                    groupData={currentGroupData}
                    wallet={wallet}
                    onConnect={connectWallet}
                    onDisconnect={() => setWallet(null)}
                />

                <div className={styles.arenaGrid}>
                    <ParticipantPanel
                        groupData={currentGroupData}
                        side="left"
                    />

                    {showLeaderboard ? (
                        <Leaderboard onClose={() => setShowLeaderboard(false)} />
                    ) : (
                        <ChatArea groupData={currentGroupData} />
                    )}

                    <BettingPanel
                        groupData={currentGroupData}
                        wallet={wallet}
                        onPlaceBet={handlePlaceBet}
                        onConnect={connectWallet}
                    />
                </div>
            </div>
        </div>
    )
}
